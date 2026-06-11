# sorostream-app

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green)

Next.js 14 streaming dashboard for **SoroStream** — real-time USDC payment streaming on Stellar Soroban.

## Live Demo

https://sorostream-app.vercel.app

## Screenshots

_Coming soon_

## Local Setup

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your contract ID

# 3. Run dev server
npm run dev
# Open http://localhost:3000
```

## Env Vars

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | Yes | `testnet` or `mainnet` |
| `NEXT_PUBLIC_CONTRACT_ID` | Yes | Deployed StreamContract address |
| `NEXT_PUBLIC_RPC_URL` | No | Custom Soroban RPC (defaults to testnet) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Web3 | @sorostream/sdk, @stellar/freighter-api |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero and how-it-works |
| `/dashboard` | Stream list with live balances |
| `/stream/new` | Create stream form |
| `/stream/[id]` | Stream detail with withdraw/cancel |

## Contributing via Drips Wave

This project participates in the **Stellar Wave Program** on [Drips Wave](https://drips.network/wave). Earn rewards for resolving issues during weekly Wave sprints.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

## Open Issues

### Issue #1 — [Trivial] Add copy-to-clipboard button for stream share link on detail page

**Description:** On the stream detail page (`/stream/[id]`), add a small copy icon button next to the stream ID heading. Clicking it copies the full URL to the clipboard and briefly shows a "Copied!" tooltip.

**Acceptance Criteria:**
- [ ] Copy button renders next to the stream ID
- [ ] Clicking copies `window.location.href` to clipboard
- [ ] Visual feedback shown for ~2 seconds
- [ ] Accessible: `aria-label="Copy stream link"`
- [ ] `npm run build` passes

**Complexity:** `trivial` | `good first issue`

---

### Issue #2 — [Trivial] Add loading skeleton to stream list while fetching from RPC

**Description:** The dashboard shows a 3-card placeholder skeleton while loading (`StreamListSkeleton`). Improve it to match the actual `StreamCard` layout more closely — include placeholder lines for status chip, addresses, flow rate, and progress bar.

**Acceptance Criteria:**
- [ ] Skeleton matches StreamCard layout sections
- [ ] Uses `animate-pulse` Tailwind class
- [ ] Responsive at all breakpoints
- [ ] `npm run build` passes

**Complexity:** `trivial` | `good first issue`

---

### Issue #3 — [Trivial] Show flow rate in multiple denominations on StreamCard

**Description:** `StreamCard` currently only shows USDC/day. Add per-second and per-hour rates below in a smaller font, toggling between them on click or displaying all three stacked.

**Acceptance Criteria:**
- [ ] Per-second, per-hour, per-day all shown on StreamCard
- [ ] Visually compact — doesn't bloat the card
- [ ] `npm run build` passes

**Complexity:** `trivial` | `good first issue`

---

### Issue #4 — [Medium] Build StreamTimeline component with animated progress indicator

**Description:** Enhance the existing `StreamTimeline` component with a moving "now" marker dot that animates along the progress bar in real time (updates every second using `setInterval`).

**Acceptance Criteria:**
- [ ] Animated dot moves along the bar in real time
- [ ] Dot position updates every second
- [ ] Accessible: dot has `aria-label` with current time
- [ ] Works correctly when stream is paused or completed
- [ ] `npm run build` passes

**Complexity:** `medium`

---

### Issue #5 — [Medium] Add "Top Up" modal on stream detail page

**Description:** Add a "Top Up" button on the stream detail page. Clicking opens a modal with an amount input and a live preview of the new end date. On confirm, calls `client.topUp()` and refreshes the stream.

**Acceptance Criteria:**
- [ ] Top Up button visible on active stream detail page
- [ ] Modal with amount input and new end date preview
- [ ] Calls `client.topUp()` on confirm
- [ ] Refreshes stream data after success
- [ ] Accessible modal with focus trap and `aria-modal`
- [ ] `npm run build` passes

**Complexity:** `medium`

---

### Issue #6 — [High] Implement real-time LiveCounter using @sorostream/sdk polling

**Description:** Replace the local timer-based `LiveCounter` with one that polls `client.getClaimable()` every 10 seconds to stay in sync with on-chain state, while still ticking locally between polls using the flow rate.

**Acceptance Criteria:**
- [ ] `LiveCounter` polls `getClaimable()` every 10s for ground truth
- [ ] Continues ticking locally between polls
- [ ] Gracefully handles RPC errors (keeps last known value)
- [ ] Stops polling when component unmounts
- [ ] `npm run build` passes

**Complexity:** `high`

---

### Issue #7 — [High] Add stream sharing: public /stream/[id] page viewable without wallet

**Description:** Make `/stream/[id]` accessible without a wallet connection. Non-connected visitors should be able to view stream details (status, flow rate, timeline, claimable amount) but not perform actions (withdraw/cancel buttons hidden). Use a server component to fetch public stream data via RPC.

**Acceptance Criteria:**
- [ ] Page renders stream info without requiring wallet connection
- [ ] Withdraw/Cancel buttons only visible when wallet connected
- [ ] Server-side data fetch using `getStream()` with a read-only adapter
- [ ] Proper `<meta>` tags for social sharing (og:title, og:description)
- [ ] `npm run build` passes

**Complexity:** `high`
