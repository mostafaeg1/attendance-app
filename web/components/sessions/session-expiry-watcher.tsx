"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refreshes the page at the exact moment the current session's end_time
 * arrives, so it moves into "Past sessions" without a manual reload. */
export function SessionExpiryWatcher({ endsAt }: { endsAt: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!endsAt) return;

    const msRemaining = new Date(endsAt).getTime() - Date.now();
    const timer = setTimeout(() => router.refresh(), Math.max(msRemaining, 0));
    return () => clearTimeout(timer);
  }, [endsAt, router]);

  return null;
}
