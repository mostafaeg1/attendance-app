"use client";

import { useActionState, useState } from "react";
import { resumeSession, type SessionActionState } from "@/actions/sessions";
import { SESSION_DURATION_OPTIONS } from "@/constants/sessions";
import { Button } from "@/components/ui/button";

const initialState: SessionActionState = {};

export function ResumeSessionButton({
  courseId,
  sessionId,
  disabled,
  disabledReason,
}: {
  courseId: string;
  sessionId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const resumeSessionForSession = resumeSession.bind(null, courseId, sessionId);
  const [state, formAction, isPending] = useActionState(
    resumeSessionForSession,
    initialState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-medium hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Resume session
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-foreground/10 bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resume session</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-foreground/50 hover:bg-foreground/5"
              >
                ✕
              </button>
            </div>
            <form action={formAction} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Session duration
                <select
                  name="duration"
                  defaultValue="unlimited"
                  className="rounded-lg border border-foreground/20 px-3 py-2"
                >
                  {SESSION_DURATION_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} {minutes === 1 ? "minute" : "minutes"}
                    </option>
                  ))}
                  <option value="unlimited">Unlimited</option>
                </select>
              </label>
              {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}
              <div>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Resuming…" : "Resume session"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
