"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QrDisplay } from "@/components/session/qr-display";
import { getSessionEndTimestamp } from "@/lib/session-format";
import { getCheckInStatus, endSession } from "@/actions/sessions";
import type { Session } from "@/types";

const CHECK_IN_POLL_MS = 4000;
const IDLE_STATUS = "Waiting for students to check-in.";
const WELCOME_FLASH_MS = 1000;

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type SessionLiveViewProps = {
  session: Session;
  initialCheckInCount: number;
};

export function SessionLiveView({
  session,
  initialCheckInCount,
}: SessionLiveViewProps) {
  const router = useRouter();
  const endsAt = getSessionEndTimestamp(session);
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    endsAt ? endsAt.getTime() - Date.now() : null,
  );
  const [checkInCount, setCheckInCount] = useState(initialCheckInCount);
  const [statusMessage, setStatusMessage] = useState(IDLE_STATUS);
  const lastCountRef = useRef(initialCheckInCount);

  useEffect(() => {
    if (!endsAt) return;

    const tick = () => {
      const ms = endsAt.getTime() - Date.now();
      setRemainingMs(ms);
      if (ms <= 0) {
        router.push(`/dashboard/courses/${session.courseId}/sessions`);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt, router, session.courseId]);

  useEffect(() => {
    let cancelled = false;
    let revertTimer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const status = await getCheckInStatus(session.id);
        if (cancelled) return;

        if (status.count > lastCountRef.current && status.latestStudentName) {
          setStatusMessage(`Welcome, ${status.latestStudentName}!`);
          if (revertTimer) clearTimeout(revertTimer);
          revertTimer = setTimeout(() => {
            if (!cancelled) setStatusMessage(IDLE_STATUS);
          }, WELCOME_FLASH_MS);
        }

        lastCountRef.current = status.count;
        setCheckInCount(status.count);
      } catch {
        // Transient network/refresh hiccup — the next poll will retry.
      }
    };

    const interval = setInterval(poll, CHECK_IN_POLL_MS);
    return () => {
      cancelled = true;
      if (revertTimer) clearTimeout(revertTimer);
      clearInterval(interval);
    };
  }, [session.id]);

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">
        {session.title || "Session"} QR Code
      </h1>
      <p className="mb-6 text-sm text-foreground/60">
        {remainingMs === null
          ? "Unlimited session"
          : remainingMs > 0
            ? `${formatRemaining(remainingMs)} left`
            : "Session ended"}
      </p>
      <QrDisplay token={session.staticToken} />
      <p className="mt-6 text-sm font-medium text-foreground/80">
        {statusMessage}
      </p>
      <div className="mt-2 rounded-xl border border-foreground/10 px-6 py-3 text-sm">
        <span className="font-semibold">{checkInCount}</span>
        <span className="text-foreground/60">
          {` ${checkInCount === 1 ? "student" : "students"} checked in`}
        </span>
      </div>
      <form
        action={endSession.bind(null, session.courseId, session.id)}
        className="mt-6"
      >
        <button
          type="submit"
          className="rounded-lg border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
        >
          End session
        </button>
      </form>
    </>
  );
}
