"use client";
/**
 * useRpcFetch — React hook that wraps rpcFetch with toast notifications.
 *
 * On a 429 rate-limit it shows:
 *   "Rate limited — retrying in Xs"
 * The message updates every second as the countdown progresses.
 * On successful retry the toast is dismissed and a brief success notice shown.
 */
import { useCallback } from "react";
import { rpcFetch, type RpcClientOptions } from "./rpcClient";
import { useToast } from "./toast";

const RATE_LIMIT_TOAST_KEY = "rpc-rate-limit";

// Calls across hook instances share one toast and report their remaining backoff.
const countdowns = new Map<symbol, number>();
let activeToastId: number | null = null;

/**
 * Wrap RPC calls with retry handling and rate-limit toast notifications.
 *
 * @returns {<T>(fn: () => Promise<T>) => Promise<T>} A function that executes the given RPC call.
 */
export function useRpcFetch() {
  const { upsertPersistentToast, removeToast, addToast } = useToast();

  const fetch = useCallback(
    <T>(fn: () => Promise<T>): Promise<T> => {
      const caller = Symbol("rpc-caller");
      const update = () => {
        if (countdowns.size === 0) {
          if (activeToastId !== null) removeToast(activeToastId);
          activeToastId = null;
          return;
        }
        const remaining = Math.max(...countdowns.values());
        activeToastId = upsertPersistentToast(
          RATE_LIMIT_TOAST_KEY,
          remaining > 0 ? `Rate limited — retrying in ${remaining}s` : "Rate limited — retrying…",
          "warning",
        );
      };
      const release = () => {
        if (countdowns.delete(caller)) update();
      };
      const opts: RpcClientOptions = {
        onRateLimit(secondsLeft) {
          countdowns.set(caller, secondsLeft);
          update();
        },
        onRetrySuccess() {
          release();
          if (countdowns.size === 0) addToast("Request succeeded after rate-limit retry", "success");
        },
      };

      return rpcFetch(fn, opts).finally(release);
    },
    [upsertPersistentToast, removeToast, addToast],
  );

  return fetch;
}
