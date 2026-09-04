# Playwright End-to-End Testing Guide

This guide explains how to run the existing Playwright suite, how to add new
coverage for the stream creation flow, and how to configure a dedicated wallet
and testnet environment so contributors can write reliable tests without prior
Playwright experience.

## Prerequisites

- Node.js 18+ and `npm`
- Project dependencies installed with `npm install`
- A `.env.local` file with the same contract and network values used by the app

At minimum, the E2E suite expects:

- `NEXT_PUBLIC_STELLAR_NETWORK=testnet`
- `NEXT_PUBLIC_CONTRACT_ID=<your deployed testnet contract id>`
- `NEXT_PUBLIC_RPC_URL=<optional custom Soroban RPC endpoint>`

`playwright.config.ts` starts the app automatically unless you set
`PLAYWRIGHT_SKIP_WEB_SERVER=1`.

## Running the Existing Tests

Run the full suite:

```bash
npm run test:e2e
```

Run the suite with the interactive Playwright UI:

```bash
npm run test:e2e:ui
```

Run a single spec while you are iterating on a flow:

```bash
npx playwright test e2e/create-stream.spec.ts
```

Show the latest HTML report after a run:

```bash
npx playwright show-report
```

## How the App Is Started for E2E

By default, `playwright.config.ts` launches:

```bash
cross-env NEXT_PUBLIC_CONTRACT_ID=TEST_CONTRACT_ID_12345 NEXT_PUBLIC_STELLAR_NETWORK=testnet next dev -H 127.0.0.1 -p 3000
```

If you want to point Playwright at an already-running app, set:

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

`BASE_URL` should match the host where the app is already running.

## Writing New Tests for the Stream Creation Flow

The existing stream-creation coverage lives in `e2e/create-stream.spec.ts` and
`e2e/stream-flow.spec.ts`. Use those files as the template for new scenarios.

Recommended approach:

1. Start on `/stream/new`.
2. Fill the recipient, amount, and duration controls with `getByLabel()`.
3. Submit the form with `getByRole('button', { name: 'Create Stream' })`.
4. Assert that the app redirects to the new stream detail page.
5. Verify the dashboard or detail page shows the expected stream metadata.

Prefer user-facing locators over CSS selectors:

- `page.getByRole(...)`
- `page.getByLabel(...)`
- `page.getByText(...)`
- `page.getByTestId(...)` only when the UI has no accessible alternative

Example skeleton:

```ts
import { test, expect } from "@playwright/test";

test("creates a stream end to end", async ({ page }) => {
  await page.goto("/stream/new");

  await page.getByLabel("Recipient Address").fill("G...");
  await page.getByLabel("Amount (USDC)").fill("10");
  await page.getByLabel("Days").fill("1");

  await page.getByRole("button", { name: "Create Stream" }).click();

  await expect(page).toHaveURL(/\/stream\/\d+/);
  await expect(page.locator("h1")).toContainText("Stream #");
});
```

When adding a new case, try to cover:

- the happy path
- at least one validation failure
- one wallet-disconnected or wallet-switching branch if the flow depends on it

## Wallet Setup for E2E

There are two practical ways to provide a wallet for tests:

### 1. Mock Freighter for deterministic browser tests

The repo already uses a Freighter-shaped mock in tests such as
`e2e/wallet-reconnect.spec.ts`.

That pattern does two things:

- injects `window.freighter` with `page.addInitScript()`
- seeds localStorage with:
  - `sorostream_wallet_connected=true`
  - `sorostream_wallet_type=freighter`
  - `sorostream_mock_wallet_address=<test address>`

This is the best option for UI tests because it avoids depending on a browser
extension during CI.

### 2. Dedicated testnet wallet for real-wallet runs

If you want to validate the flow against an actual Freighter installation:

- create a dedicated testnet account
- keep it separate from any personal wallet
- fund it with testnet assets
- make sure Freighter is set to the same network as
  `NEXT_PUBLIC_STELLAR_NETWORK`

Use a wallet address that is stable across runs so test fixtures and seeded
localStorage values remain predictable.

## Testnet Configuration Checklist

Before running the stream creation flow locally, confirm:

- the app is pointed at `testnet`
- `NEXT_PUBLIC_CONTRACT_ID` is set to the test deployment
- `NEXT_PUBLIC_RPC_URL` is reachable from your machine
- the test wallet is connected to the same network
- the wallet has enough testnet balance for the stream amount plus fees

If the app and wallet are on different networks, the UI will flag the mismatch
and creation/signing flows may fail.

## Troubleshooting

- If Playwright hangs on startup, make sure nothing else is already using port
  `3000`, or set `BASE_URL` and `PLAYWRIGHT_SKIP_WEB_SERVER=1`.
- If a test fails because the wallet is disconnected, verify the mock Freighter
  script ran before `page.goto()`.
- If the create-stream flow fails after signing, check that the contract id and
  network values in `.env.local` match the testnet deployment.

## Related Files

- `playwright.config.ts`
- `e2e/create-stream.spec.ts`
- `e2e/stream-flow.spec.ts`
- `e2e/wallet-reconnect.spec.ts`
- `e2e/wallet-session.spec.ts`

