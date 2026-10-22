import { signTransaction as signWithFreighter } from "@/src/lib/freighter";

export type WalletType = "freighter" | "lobstr" | "ledger" | "server-keypair";

export interface WalletAdapter {
  type: WalletType;
  isAvailable(): Promise<boolean>;
  getPublicKey(): Promise<string>;
  signTransaction(xdr: string): Promise<string>;
  disconnect(): void;
}

// ── Freighter ──────────────────────────────────────────────────────────────
export const freighterAdapter: WalletAdapter = {
  type: "freighter",
  async isAvailable() {
    if (typeof window === "undefined") return false;
    return !!(window as any).freighter;
  },
  async getPublicKey() {
    return (window as any).freighter.getPublicKey();
  },
  async signTransaction(xdr) {
    return signWithFreighter(xdr);
  },
  disconnect() {},
};

// ── Lobstr (shares the Freighter-shaped mock API in this codebase) ────────
export const lobstrAdapter: WalletAdapter = {
  type: "lobstr",
  async isAvailable() {
    if (typeof window === "undefined") return false;
    return !!(window as any).freighter;
  },
  async getPublicKey() {
    return (window as any).freighter?.getPublicKey?.();
  },
  async signTransaction(xdr) {
    return signWithFreighter(xdr);
  },
  disconnect() {},
};

// ── Ledger (WebUSB transport + Stellar app) ───────────────────────────────
/** BIP-44 derivation path for the first Stellar account (SEP-0005). */
export const LEDGER_STELLAR_PATH = "44'/148'/0'";

function stellarNetworkPassphrase(Networks: { PUBLIC: string; TESTNET: string }) {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

/** True when the browser exposes the WebUSB API needed to talk to a Ledger. */
export function isWebUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator && !!(navigator as any).usb;
}

/**
 * Open a WebUSB transport, run `fn` against the Stellar app, then close the
 * transport. Reuses an already-authorised device when possible so the browser
 * device picker is only shown on first use.
 */
async function withLedgerStellarApp<T>(
  fn: (app: import("@ledgerhq/hw-app-str").default) => Promise<T>,
): Promise<T> {
  const { default: TransportWebUSB } = await import("@ledgerhq/hw-transport-webusb");
  const { default: Str } = await import("@ledgerhq/hw-app-str");
  const transport =
    (await TransportWebUSB.openConnected()) ?? (await TransportWebUSB.create());
  try {
    return await fn(new Str(transport));
  } finally {
    await transport.close();
  }
}

let ledgerPublicKey: string | null = null;

export const ledgerAdapter: WalletAdapter = {
  type: "ledger",
  async isAvailable() {
    return typeof window !== "undefined" && isWebUsbSupported();
  },
  async getPublicKey() {
    const { StrKey } = await import("@stellar/stellar-sdk");
    const { rawPublicKey } = await withLedgerStellarApp((app) =>
      app.getPublicKey(LEDGER_STELLAR_PATH),
    );
    ledgerPublicKey = StrKey.encodeEd25519PublicKey(rawPublicKey);
    return ledgerPublicKey;
  },
  async signTransaction(xdr) {
    const { TransactionBuilder, Networks } = await import("@stellar/stellar-sdk");
    const tx = TransactionBuilder.fromXDR(xdr, stellarNetworkPassphrase(Networks));
    const publicKey = ledgerPublicKey ?? (await ledgerAdapter.getPublicKey());
    const { signature } = await withLedgerStellarApp((app) =>
      app.signTransaction(LEDGER_STELLAR_PATH, tx.signatureBase()),
    );
    tx.addSignature(publicKey, signature.toString("base64"));
    return tx.toEnvelope().toXDR("base64");
  },
  disconnect() {
    ledgerPublicKey = null;
  },
};

// ── Server Keypair (insecure — for testing / server-side use only) ─────────
export class ServerKeypairAdapter implements WalletAdapter {
  type: WalletType = "server-keypair";
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  async isAvailable() {
    return !!this.secret;
  }

  async getPublicKey() {
    const { Keypair } = await import("@stellar/stellar-sdk");
    return Keypair.fromSecret(this.secret).publicKey();
  }

  async signTransaction(xdr: string) {
    const { Keypair, Transaction, Networks } = await import("@stellar/stellar-sdk");
    const kp = Keypair.fromSecret(this.secret);
    const tx = new Transaction(xdr, stellarNetworkPassphrase(Networks));
    tx.sign(kp);
    return tx.toEnvelope().toXDR("base64");
  }

  disconnect() {
    this.secret = "";
  }
}

export const WALLET_LABELS: Record<WalletType, string> = {
  freighter: "Freighter",
  lobstr: "LOBSTR",
  ledger: "Ledger",
  "server-keypair": "Server Keypair",
};
