import { describe, it, expect } from "vitest";

describe("Net Received Display Feature", () => {
  // Test 1: Verify the component exists and exports
  it("should export NetReceivedDisplay component", async () => {
    const mod = await import("@/components/NetReceivedDisplay");
    expect(mod.default).toBeDefined();
  });

  // Test 2: Verify stream new page imports
  it("should have NetReceivedDisplay imported in stream new page", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      `${process.cwd()}/src/app/stream/new/page.tsx`,
      "utf-8"
    );

    expect(content).toContain("NetReceivedDisplay");
    expect(content).toContain("import NetReceivedDisplay");
  });

  // Test 3: Verify translation keys exist
  it("should have all translation keys for net received display", async () => {
    const locales = await import("@/src/locales/en.json");
    const translations = locales.default;

    expect(translations.stream_new.net_received_label).toBeDefined();
    expect(translations.stream_new.net_received_fee_desc).toBeDefined();
  });

  // Test 4: Verify fee calculation
  it("should calculate net received amount correctly", () => {
    // Mock calcWithdrawBreakdown function behavior
    const calculateNetReceived = (
      amountStroops: number,
      basisPoints: number
    ) => {
      const feePercent = basisPoints / 100;
      const fee = Math.floor((amountStroops * basisPoints) / 10_000);
      const net = amountStroops - fee;
      return { net, fee, feePercent };
    };

    // Test case 1: 100 USDC with 50 bps (0.5%) fee
    const amount1 = 100 * 10_000_000; // 100 USDC in stroops
    const result1 = calculateNetReceived(amount1, 50);
    const net1 = result1.net / 10_000_000;
    expect(net1).toBeCloseTo(99.5, 5);

    // Test case 2: 1000 USDC with 50 bps (0.5%) fee
    const amount2 = 1000 * 10_000_000;
    const result2 = calculateNetReceived(amount2, 50);
    const net2 = result2.net / 10_000_000;
    expect(net2).toBeCloseTo(995, 5);

    // Test case 3: 50 USDC with 100 bps (1%) fee
    const amount3 = 50 * 10_000_000;
    const result3 = calculateNetReceived(amount3, 100);
    const net3 = result3.net / 10_000_000;
    expect(net3).toBeCloseTo(49.5, 5);
  });

  // Test 5: Verify translations across languages
  it("should have translations in all three languages", async () => {
    const en = await import("@/src/locales/en.json");
    const pt = await import("@/src/locales/pt.json");
    const es = await import("@/src/locales/es.json");

    const keys = ["net_received_label", "net_received_fee_desc"];
    keys.forEach((key) => {
      expect((en.default.stream_new as Record<string, unknown>)[key]).toBeDefined();
      expect((pt.default.stream_new as Record<string, unknown>)[key]).toBeDefined();
      expect((es.default.stream_new as Record<string, unknown>)[key]).toBeDefined();
    });
  });
});

describe("NetReceivedDisplay bigint precision (#538)", () => {
  it("converts the amount to stroops without precision loss", async () => {
    const { parseStroops } = await import("@/src/lib/sorostream");

    expect(parseStroops("100")).toBe(BigInt(1_000_000_000));
    expect(parseStroops("0.0000001")).toBe(BigInt(1));
    expect(parseStroops("1234.5678901")).toBe(BigInt(12_345_678_901));
    expect(parseStroops("")).toBeNull();
    expect(parseStroops("abc")).toBeNull();
  });

  it("keeps exact stroops for amounts beyond Number.MAX_SAFE_INTEGER / 10", async () => {
    const { parseStroops, formatUSDC } = await import("@/src/lib/sorostream");

    // 1,000,000,000.1234567 USDC → 10000000001234567 stroops, well above
    // Number.MAX_SAFE_INTEGER / 10. Round-tripping through `number` corrupts it.
    const amount = "1000000000.1234567";
    const stroops = parseStroops(amount);

    expect(stroops).not.toBeNull();
    expect(stroops! > 900719925474099n).toBe(true);
    expect(stroops).toBe(BigInt("10000000001234567"));
    // The lossy `number` path is off by one stroop.
    expect(BigInt(Math.round(parseFloat(amount) * 10_000_000))).not.toBe(stroops);

    // formatUSDC accepts the bigint directly and yields a numeric string
    // (grouping stripped so the assertion is locale independent).
    expect(formatUSDC(stroops!).replace(/[^\d.]/g, "")).toMatch(
      /^1000000000\.123456\d$/,
    );
  });

  it("computes the net amount with bigint arithmetic for large amounts", async () => {
    const { parseStroops } = await import("@/src/lib/sorostream");

    const amountStroops = parseStroops("1000000000.1234567")!;
    const fee = (amountStroops * 50n) / 10_000n; // 0.5% of 10000000001234567
    const net = amountStroops - fee;

    expect(fee).toBe(BigInt("50000000006172"));
    expect(net).toBe(BigInt("9950000001228395"));
  });
});
