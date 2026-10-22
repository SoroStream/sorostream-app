# Browser storage keys

Every `localStorage` and `sessionStorage` key SoroStream reads or writes,
and the module that owns it. Modules define their keys locally, so this
page is the only place to check before adding a new one.

`node scripts/check-storage-keys.mjs` (run by `npm run lint`, and by
`__tests__/storageKeyPrefix.test.ts`) scans the source for storage calls.
Use it to regenerate this list: it prints every key it can resolve, and a
warning for each one it can't.

`*` marks a prefix. The rest of the key is dynamic (a stream id, an
address, …).

## localStorage

| Key | Owner | Holds |
| --- | --- | --- |
| `sorostream-settings` | `src/context/SettingsContext.tsx` | App settings (language, USD display, withdraw threshold, …) |
| `sorostream-preferences` | `src/context/PreferencesContext.tsx` | User preferences |
| `sorostream-notifications` | `src/context/NotificationContext.tsx` | Per-section unread counts and last seen event id. Also the cross-tab sync channel (`storage` events) |
| `sorostream_notification_prefs` | `src/lib/notificationPrefs.ts` | Per-stream notification preferences and webhook settings |
| `sorostream_notified_*` | `src/lib/streamNotificationWatcher.ts` | One key per (stream, expiry threshold, end time) already notified |
| `sorostream_notified_claimable_*` | `src/lib/streamNotificationWatcher.ts` | One key per (stream, claimable threshold) already notified |
| `sorostream_push_subscription` | `src/lib/pushSubscription.ts` | Web Push subscription |
| `sorostream_push_device` | `src/lib/pushSubscription.ts` | Registered push device record |
| `sorostream_push_device_id` | `src/lib/pushSubscription.ts` | Push device id |
| `sorostream_milestones_push_*` | `src/app/stream/[id]/page.tsx` | Per-stream milestone push opt-in |
| `sorostream-network` | `src/lib/network.tsx` | Selected network (testnet/mainnet) |
| `sorostream_theme` | `src/lib/theme.tsx` (also read by the inline script in `src/app/layout.tsx`) | Theme |
| `theme` | `src/lib/theme.tsx`, `src/app/layout.tsx` | **Legacy**. Read once, migrated to `sorostream_theme`, removed |
| `sorostream_wallet_connected` | `components/WalletConnect.tsx` | Whether to reconnect on load |
| `sorostream_wallet_type` | `components/WalletConnect.tsx`, `src/context/WalletContext.tsx` | Last wallet adapter |
| `sorostream_wallet_secret` | `components/WalletConnect.tsx`, `src/context/WalletContext.tsx` | Secret key for the `server-keypair` adapter (see findings) |
| `sorostream-bookmarks-*` | `src/context/BookmarksContext.tsx` | Bookmarked streams, per wallet address |
| `sorostream_address_book` | `src/lib/addressBook.ts` | Contacts saved with no wallet owner (the original global address book; still read and written) |
| `sorostream_address_book_v2` | `src/lib/addressBook.ts` | Contacts per wallet owner |
| `sorostream_recipient_whitelist_v1` | `src/lib/addressBook.ts` | Recipient whitelist |
| `addressBook`, `stellarAddressBook`, `stellar-address-book`, `address-book`, `stellar_address_book`, `contacts` | `components/StreamCreationForm.tsx` | **Read only.** Address books written by other tools, offered as recipient suggestions |
| `sorostream_templates` | `src/lib/streamTemplates.ts` | Saved stream templates |
| `sorostream-stream-tags` | `src/lib/streamTags.ts` | Tags, keyed by stream id |
| `sorostream-watchlist` | `components/WatchlistTab.tsx` | Watched streams |
| `sorostream-delegates` | `components/DelegatesSection.tsx` | Delegates |
| `sorostream-gift-messages` | `components/GiftStreamModal.tsx` | Gift stream messages |
| `sorostream-expiry-dismissed` | `components/StreamExpiryAlerts.tsx` | Dismissed expiry alerts |
| `sorostream-legend-open` | `components/StatusLegend.tsx` | Status legend expanded |
| `sorostream-onboarding-complete` | `components/OnboardingWizard.tsx` | Onboarding finished |
| `sorostream-changelog-seen` | `components/ChangelogModal.tsx` | Last changelog version seen |
| `sorostream_visit_count` | `src/components/InstallPrompt.tsx` | Visit count for the install prompt |
| `analytics_events` | `src/lib/analytics.ts` | Queued analytics events (**unprefixed**, see findings) |

## sessionStorage

| Key | Owner | Holds |
| --- | --- | --- |
| `sorostream_create_stream_draft` | `src/lib/useFormPersist.ts` | Create-stream form draft |
| `sorostream_stream_error_*` | `src/lib/errorPersist.ts` | Last load error per stream (capped at 50, oldest dropped) |
| `sorostream-fed-*` | `src/lib/federation.ts` | Federation lookup cache, per address |
| `sorostream-toml-*` | `src/lib/stellarToml.ts` | stellar.toml lookup cache, per address |
| `sorostream-addr-verify-*` | `src/lib/addressVerification.ts` | Address verification cache |
| `sorostream-deep-link` | `src/app/stream/[id]/page.tsx` | Stream URL to return to after connecting a wallet |
| `sorostream-deep-link-count` | `src/app/stream/[id]/page.tsx` | Redirect counter for the above (loop guard) |
| `sorostream-new-banner-shown` | `src/app/stream/[id]/page.tsx` | "Stream created" banner already shown this session |
| `sorostream-pwa-dismissed` | `src/components/InstallPrompt.tsx` | Install prompt dismissed this session |
| `sorostream_session_counted` | `src/components/InstallPrompt.tsx` | This session already counted in `sorostream_visit_count` |

Related same-origin storage (not checked by the script): IndexedDB
databases `sorostream_balance_cache` (`src/lib/balanceCache.ts`) and
`SoroStreamBalanceHistory` (`src/lib/balanceHistory.ts`).

## Findings

Issues found while compiling the list. None are fixed here.

1. **Two separators.** About half the keys use `sorostream-` and half
   `sorostream_`, sometimes in the same file (`InstallPrompt.tsx` has
   `sorostream-pwa-dismissed` next to `sorostream_visit_count`). Nothing
   collides today, but a reader can't tell from one key how another is
   spelled, so `sorostream-notifications` and `sorostream_notifications`
   could both come to exist.
2. **Near-collision: notifications.** `sorostream-notifications` (unread
   counts, NotificationContext) and `sorostream_notification_prefs`
   (per-stream preferences, notificationPrefs.ts) differ only by
   separator and suffix and are owned by different modules. The
   per-stream `sorostream_notified_*` family belongs to a third module.
3. **Overlapping prefix families.** `sorostream_notified_*` also matches
   every `sorostream_notified_claimable_*` key, and `sorostream-deep-link`
   is a prefix of `sorostream-deep-link-count`. Harmless as long as
   nothing clears or scans by prefix. `errorPersist.ts` already scans
   `sorostream_stream_error_`, so a future key starting with that would be
   trimmed as if it were an error entry.
4. **Unprefixed keys.** `analytics_events` is written without a prefix and
   could collide with any script on the origin. `theme` is a legacy key
   that is only read and removed. `StreamCreationForm.tsx` *reads* six
   generic keys (`contacts`, `addressBook`, …) that belong to other tools.
   Any same-origin script writing `contacts` would have its data parsed
   as an address book.
5. **Unbounded per-entity keys.** `sorostream_notified_*`,
   `sorostream_notified_claimable_*` and `sorostream_milestones_push_*` add
   one localStorage key per stream and threshold, and nothing removes
   them. (`sorostream_stream_error_*` is capped.)
6. **Inconsistent versioning.** `sorostream_address_book_v2` and
   `sorostream_recipient_whitelist_v1` carry a version suffix, and no other
   key does. `_v2` isn't a replacement for `sorostream_address_book`
   either: both are live (owner-scoped vs global contacts), which the
   names don't convey.
7. **A secret in localStorage.** `sorostream_wallet_secret` stores the
   `server-keypair` adapter's secret key in plain localStorage, readable by
   any script on the origin. Not a naming problem, but it showed up here
   and deserves its own issue.

## Convention for new keys

- **Prefix:** `sorostream-`. The older `sorostream_` is accepted for
  existing keys only. Enforced by `scripts/check-storage-keys.mjs`.
- **Shape:** `sorostream-<area>-<name>` in kebab-case, where `<area>` is
  the owning feature (`sorostream-notifications-unread`,
  `sorostream-wallet-type`). Owning modules then can't pick the same
  name.
- **Dynamic keys:** end the fixed part with `-` and put the variable
  part last (`sorostream-bookmarks-<address>`). Don't make one family's
  prefix the start of another family's.
- **Versions:** add `-v2` only when the stored format changes
  incompatibly, and migrate or remove the old key.
- **Define once:** a named constant at the top of the owning module (as
  most modules already do). Add the key to the tables above in the same
  PR.
- **Bounded:** if a key is per stream/address, say what removes or caps
  it.
