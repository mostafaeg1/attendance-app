"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StartSessionForm } from "@/components/sessions/start-session-form";

type StartSessionButtonProps = {
  courseId: string;
  nextSessionNumber: number;
};

export function StartSessionButton({
  courseId,
  nextSessionNumber,
}: StartSessionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 shadow-lg"
      >
        Start session
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-foreground/10 bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Start session</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-foreground/50 hover:bg-foreground/5"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <StartSessionForm
                courseId={courseId}
                defaultTitle={`Session ${nextSessionNumber}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
