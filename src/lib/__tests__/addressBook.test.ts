import { describe, expect, it, beforeEach } from "vitest";
import {
  getContacts,
  saveContact,
  updateContact,
  deleteContact,
  isRecipientApproved,
  isWhitelistEnforced,
  setWhitelistEnforced,
  MAX_CONTACTS,
  type AddressBookContact,
} from "../addressBook";

const SENDER_A = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
const SENDER_B = "GAS4V6O5CL7GW5V5QKGWRHDOQUZDDJL3VK2DGBEJHKGNP6YEXCJQ7GWC";

let nextId = 0;
function makeContact(overrides: Partial<AddressBookContact> = {}): AddressBookContact {
  return {
    id: `c${nextId++}`,
    name: `Contact ${nextId}`,
    address: "GBNXCYRRNEDAWVGXPPZJMMDTVZTHKVOZRAAS6UEOLSKFPBJBLXJJFAYU",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("per-sender scoping", () => {
  it("keeps contacts isolated between senders", () => {
    const a = makeContact({ name: "Alice" });
    const b = makeContact({ name: "Bob" });

    expect(saveContact(a, SENDER_A)).toBe(true);
    expect(saveContact(b, SENDER_B)).toBe(true);

    const forA = getContacts(SENDER_A);
    expect(forA).toHaveLength(1);
    expect(forA[0].name).toBe("Alice");
    expect(getContacts(SENDER_B)[0].name).toBe("Bob");
  });

  it("returns an isolated copy (mutations do not hit storage)", () => {
    saveContact(makeContact(), SENDER_A);
    const copy = getContacts(SENDER_A);
    copy.push(makeContact());
    expect(getContacts(SENDER_A)).toHaveLength(1);
  });

  it("updateContact and deleteContact respect the owner", () => {
    const a = makeContact();
    saveContact(a, SENDER_A);

    updateContact(a.id, { name: "Renamed" }, SENDER_A);
    expect(getContacts(SENDER_A)[0].name).toBe("Renamed");

    // Other sender cannot see or mutate it
    expect(updateContact(a.id, { name: "Nope" }, SENDER_B)).toBe(false);
    deleteContact(a.id, SENDER_B);
    expect(getContacts(SENDER_A)).toHaveLength(1);

    deleteContact(a.id, SENDER_A);
    expect(getContacts(SENDER_A)).toHaveLength(0);
  });

  it("enforces MAX_CONTACTS per sender", () => {
    for (let i = 0; i < MAX_CONTACTS; i++) {
      expect(
        saveContact(makeContact({ id: `id${i}` }), SENDER_A),
      ).toBe(true);
    }
    expect(saveContact(makeContact(), SENDER_A)).toBe(false);
    // Other sender unaffected
    expect(saveContact(makeContact(), SENDER_B)).toBe(true);
  });

  it("rejects invalid owners and falls back to legacy behaviour", () => {
    const c = makeContact();
    expect(saveContact(c, "not-a-key")).toBe(false);
    // Legacy mode: owner omitted
    expect(saveContact(c)).toBe(true);
    expect(getContacts()).toHaveLength(1);
  });
});

describe("legacy migration", () => {
  it("seeds a new sender's book from the legacy global list on first access", () => {
    const legacy = makeContact({ name: "Legacy" });
    saveContact(legacy); // writes to old global key

    const migrated = getContacts(SENDER_A);
    expect(migrated).toHaveLength(1);
    expect(migrated[0].name).toBe("Legacy");
  });

  it("does not overwrite an existing per-sender book with legacy data", () => {
    saveContact(makeContact({ name: "Legacy" }));
    saveContact(makeContact({ name: "Mine" }), SENDER_A);

    expect(getContacts(SENDER_A).map((c) => c.name)).toEqual(["Mine"]);
  });
});

describe("recipient whitelist (#432)", () => {
  it("defaults to disabled", () => {
    expect(isWhitelistEnforced(SENDER_A)).toBe(false);
  });

  it("persists enforcement state per sender", () => {
    setWhitelistEnforced(true, SENDER_A);
    expect(isWhitelistEnforced(SENDER_A)).toBe(true);
    expect(isWhitelistEnforced(SENDER_B)).toBe(false);

    setWhitelistEnforced(false, SENDER_A);
    expect(isWhitelistEnforced(SENDER_A)).toBe(false);
  });

  it("approves anything when whitelist is off or owner unknown", () => {
    expect(isRecipientApproved("GBNXCYRRNEDAWVGXPPZJMMDTVZTHKVOZRAAS6UEOLSKFPBJBLXJJFAYU", SENDER_A)).toBe(true);
    expect(isRecipientApproved(undefined as unknown as string)).toBe(true);
  });

  it("only approves saved recipients when enforced", () => {
    const saved = makeContact({ address: "GBNXCYRRNEDAWVGXPPZJMMDTVZTHKVOZRAAS6UEOLSKFPBJBLXJJFAYU" });
    saveContact(saved, SENDER_A);
    setWhitelistEnforced(true, SENDER_A);

    expect(isRecipientApproved(saved.address.toUpperCase(), SENDER_A)).toBe(true);
    expect(isRecipientApproved("GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO", SENDER_A)).toBe(false);

    // Sender B has no whitelist → unrestricted
    expect(isRecipientApproved("GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO", SENDER_B)).toBe(true);
  });

  it("ignores invalid owners when toggling", () => {
    setWhitelistEnforced(true, "bogus");
    expect(isWhitelistEnforced("bogus")).toBe(false);
  });
});
