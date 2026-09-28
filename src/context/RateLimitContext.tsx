"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onRateLimit, type RateLimitInfo } from "@/src/lib/rpcClient";

interface RateLimitContextValue {
  /** True when an RPC 429 backoff is currently counting down. */
  active: boolean;
  /** Seconds remaining in the current backoff. */
  secondsLeft: number;
  /** Retry attempt index in progress. */
  attempt: number;
}

const RateLimitContext = createContext<RateLimitContextValue | undefined>(undefined);

const INITIAL: RateLimitContextValue = { active: false, secondsLeft: 0, attempt: 0 };

export function RateLimitProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RateLimitContextValue>(INITIAL);

  useEffect(() => {
    // Only subscribe in the browser; the emitter is a no-op on the server.
    if (typeof window === "undefined") return;
    return onRateLimit((info: RateLimitInfo) => {
      setState({
        // Auto-dismiss once the retry window has elapsed.
        active: info.active && info.secondsLeft > 0,
        secondsLeft: info.secondsLeft,
        attempt: info.attempt,
      });
    });
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <RateLimitContext.Provider value={value}>{children}</RateLimitContext.Provider>
  );
}

export function useRateLimit(): RateLimitContextValue {
  const ctx = useContext(RateLimitContext);
  if (!ctx) throw new Error("useRateLimit must be used within RateLimitProvider");
  return ctx;
}
