/**
 * Stream Notification Watcher (#76)
 *
 * Monitors streams in real-time and dispatches browser push notifications
 * via the service worker when:
 *   1. A stream is 24 hours before expiry.
 *   2. A stream is 1 hour before expiry.
 *   3. Claimable balance crosses a user-configured threshold.
 *
 * Honors per-stream and global notification preferences.
 * Notifications are dispatched via the Service Worker so they display
 * reliably even when the tab is in the background.
 */

import {
  getNotificationPrefs,
  getStreamNotificationPref,
  isPushSupported,
} from "./notificationPrefs";
import { dispatchPushNotification } from "./pushSubscription";
import {
  getStreamsForWallet,
  claimableNow,
  formatStellarAmount,
  type StreamData,
} from "./sorostream";

/**
 * Evaluates all user streams against expiry and claimable threshold criteria,
 * dispatching push notifications via the service worker when criteria are met.
 *
 * Will NOT prompt for permission — only runs if permission is already granted.
 */
export async function checkStreamNotifications(providedStreams?: StreamData[]): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isPushSupported() || Notification.permission !== "granted") return;

  const prefs = getNotificationPrefs();
  if (!prefs.enabled || !prefs.pushEnabled) return;

  const streams = providedStreams ?? getStreamsForWallet(null);
  const now = Date.now();

  for (const stream of streams) {
    if (stream.status === "Cancelled" || stream.status === "Ended") continue;

    const streamPref = getStreamNotificationPref(stream.id);
    if (!streamPref.enabled) continue;

    // 1. Expiry alerts (24h and 1h before stream expiry)
    const endMs = new Date(stream.endTime).getTime();
    if (!isNaN(endMs)) {
      const diffMs = endMs - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // 24 hours before expiry
      const allow24h =
        (streamPref.notifyExpiry24h ?? true) &&
        (prefs.events.expiring24h ?? prefs.events.expiringSoon ?? true);

      if (allow24h && diffHours > 1 && diffHours <= 24) {
        const key24 = `sorostream_notified_${stream.id}_24h_${stream.endTime}`;
        if (!localStorage.getItem(key24)) {
          localStorage.setItem(key24, "true");
          void dispatchPushNotification({
            title: `Stream #${stream.id} Expiring Soon`,
            body: `Stream #${stream.id} (${stream.token}) is scheduled to expire in 24 hours.`,
            tag: `stream-expiry-24h-${stream.id}`,
            url: `/stream/${stream.id}`,
          });
        }
      }

      // 1 hour before expiry
      const allow1h =
        (streamPref.notifyExpiry1h ?? true) &&
        (prefs.events.expiring1h ?? true);

      if (allow1h && diffHours > 0 && diffHours <= 1) {
        const key1 = `sorostream_notified_${stream.id}_1h_${stream.endTime}`;
        if (!localStorage.getItem(key1)) {
          localStorage.setItem(key1, "true");
          void dispatchPushNotification({
            title: `Stream #${stream.id} Expiring Soon`,
            body: `Stream #${stream.id} (${stream.token}) is scheduled to expire in 1 hour.`,
            tag: `stream-expiry-1h-${stream.id}`,
            url: `/stream/${stream.id}`,
          });
        }
      }
    }

    // 2. Claimable balance threshold alerts
    const allowClaimable =
      (streamPref.notifyClaimableThreshold ?? true) &&
      (prefs.events.claimableThresholdEnabled ?? prefs.events.withdrawalAvailable ?? true);

    if (allowClaimable) {
      const threshold =
        streamPref.claimableThreshold ?? prefs.events.claimableThreshold ?? 100;
      const claimableRaw = Number(claimableNow(stream));
      const claimableTokens = claimableRaw / 10_000_000;
      const isCrossed =
        claimableTokens >= threshold || (threshold > 100_000 && claimableRaw >= threshold);

      const keyClaimable = `sorostream_notified_claimable_${stream.id}_${threshold}`;

      if (isCrossed) {
        if (!localStorage.getItem(keyClaimable)) {
          localStorage.setItem(keyClaimable, "true");
          const formatted = formatStellarAmount(claimableRaw);
          void dispatchPushNotification({
            title: "Withdrawal Available",
            body: `Claimable balance on Stream #${stream.id} has reached ${formatted} ${stream.token}.`,
            tag: `stream-claimable-${stream.id}`,
            url: `/stream/${stream.id}`,
          });
        }
      } else {
        // Reset when balance drops below threshold (e.g. following a withdrawal)
        localStorage.removeItem(keyClaimable);
      }
    }
  }
}
