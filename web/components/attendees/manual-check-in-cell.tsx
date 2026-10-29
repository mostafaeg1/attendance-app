"use client";

import { useState } from "react";
import { markPresent } from "@/actions/attendees";

export function ManualCheckInCell({
  courseId,
  sessionId,
  sessionTitle,
  attendeeId,
  studentName,
}: {
  courseId: string;
  sessionId: string;
  sessionTitle: string;
  attendeeId: string;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await markPresent(courseId, sessionId, attendeeId);
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Mark ${studentName} present for ${sessionTitle}`}
        className="text-red-600 hover:underline"
      >
        ✕
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isSaving && setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-foreground/10 bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Check in manually?</h2>
            <p className="mt-2 text-sm text-foreground/70">
              Mark <span className="font-medium">{studentName}</span> present
              for <span className="font-medium">{sessionTitle}</span>?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isSaving}
                className="rounded-lg border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
              >
                {isSaving ? "Checking in…" : "Check in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
