import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Keypair,
  Account,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
  hash,
} from "@stellar/stellar-sdk";

const keypair = Keypair.random();

const { transport, openConnected, create, getPublicKey, signTransaction, StrMock } = vi.hoisted(() => {
  const getPublicKey = vi.fn();
  const signTransaction = vi.fn();
  return {
    transport: { close: vi.fn() },
    openConnected: vi.fn(),
    create: vi.fn(),
    getPublicKey,
    signTransaction,
    StrMock: vi.fn(() => ({ getPublicKey, signTransaction })),
  };
});

vi.mock("@ledgerhq/hw-transport-webusb", () => ({
  default: { openConnected, create },
}));

vi.mock("@ledgerhq/hw-app-str", () => ({
  default: StrMock,
}));

import { ledgerAdapter, LEDGER_STELLAR_PATH } from "@/src/lib/wallets";

function buildXdr() {
  const tx = new TransactionBuilder(new Account(keypair.publicKey(), "1"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: Keypair.random().publicKey(),
        asset: Asset.native(),
        amount: "1",
      }),
    )
    .setTimeout(30)
    .build();
  return tx.toXDR();
}

describe("ledgerAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ledgerAdapter.disconnect();
    transport.close.mockResolvedValue(undefined);
    openConnected.mockResolvedValue(null);
    create.mockResolvedValue(transport);
    getPublicKey.mockResolvedValue({ rawPublicKey: keypair.rawPublicKey() });
    // A real Ledger device hashes the signature base internally before
    // signing (mirrors Transaction.sign()/tx.hash() in the SDK) — the mock
    // must do the same or the returned signature won't verify against
    // signed.hash().
    signTransaction.mockImplementation(async (_path: string, base: Buffer) => ({
      signature: keypair.sign(hash(base)),
    }));
  });

  it("getPublicKey() reads the Stellar public key from the device", async () => {
    const key = await ledgerAdapter.getPublicKey();

    expect(key).toBe(keypair.publicKey());
    expect(create).toHaveBeenCalledTimes(1);
    expect(StrMock).toHaveBeenCalledWith(transport);
    expect(getPublicKey).toHaveBeenCalledWith(LEDGER_STELLAR_PATH);
    expect(transport.close).toHaveBeenCalled();
  });

  it("reuses an already-authorised device instead of prompting", async () => {
    openConnected.mockResolvedValue(transport);

    await ledgerAdapter.getPublicKey();

    expect(openConnected).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });

  it("signTransaction() signs the XDR on the device and returns it", async () => {
    const xdr = buildXdr();

    const signedXdr = await ledgerAdapter.signTransaction(xdr);

    // tx.signatureBase() returns a Node Buffer; in this jsdom test
    // environment Buffer is not `instanceof` the global Uint8Array, so match
    // against Buffer directly instead.
    expect(signTransaction).toHaveBeenCalledWith(LEDGER_STELLAR_PATH, expect.any(Buffer));
    const signed = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    expect(signed.signatures).toHaveLength(1);
    expect(keypair.verify(signed.hash(), signed.signatures[0].signature())).toBe(true);
    expect(transport.close).toHaveBeenCalled();
  });

  it("closes the transport even when the device rejects", async () => {
    getPublicKey.mockRejectedValue(new Error("Locked device"));

    await expect(ledgerAdapter.getPublicKey()).rejects.toThrow("Locked device");
    expect(transport.close).toHaveBeenCalled();
  });
});
