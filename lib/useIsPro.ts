"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { readIsPro } from "./pro";

/**
 * Pro status from Clerk, refreshed on mount.
 *
 * useUser() serves a cached User object, so the publicMetadata.isPro written by
 * the Stripe / RevenueCat webhook doesn't show up in the browser until the
 * session token refreshes. That locked paying users out of Detailed mode: the
 * client gate blocked the request before the server check — which reads Clerk
 * directly and is always fresh — ever got to allow it.
 *
 * Reloading once on mount closes that window; the server remains the authority.
 */
export function useIsPro(): boolean {
  const { user, isLoaded } = useUser();
  // Clerk mutates the user resource in place, so nudge a re-render after reload.
  const [, bump] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!isLoaded || !userId || !user) return;
    let cancelled = false;
    user
      .reload()
      .then(() => {
        if (!cancelled) bump((n) => n + 1);
      })
      .catch(() => {
        // Offline or rate limited — fall back to the cached value. The server
        // still gates correctly, so a stale `false` costs a round trip, not access.
      });
    return () => {
      cancelled = true;
    };
    // Intentionally keyed on the id: `user` is a new object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId]);

  return readIsPro(user?.publicMetadata);
}
