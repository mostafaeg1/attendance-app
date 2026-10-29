"use client";

import { useActionState, useEffect, useState } from "react";
import { createCourse, type CourseActionState } from "@/actions/courses";
import { Button } from "@/components/ui/button";
import { TimezoneInput } from "./timezone-input";

const initialState: CourseActionState = {};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type ScheduleEntry = { dayOfWeek: number; startTime: string };

type CreateCourseFormProps = {
  hideHeading?: boolean;
  onSuccess?: () => void;
};

export function CreateCourseForm({
  hideHeading = false,
  onSuccess,
}: CreateCourseFormProps = {}) {
  const [state, formAction, isPending] = useActionState(
    createCourse,
    initialState,
  );
  const [fixedCheckin, setFixedCheckin] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([
    { dayOfWeek: 1, startTime: "09:00" },
  ]);

  useEffect(() => {
    if (state.message) {
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.message]);

  const updateEntry = (index: number, patch: Partial<ScheduleEntry>) => {
    setSchedule((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addEntry = () => {
    setSchedule((rows) => [...rows, { dayOfWeek: 1, startTime: "09:00" }]);
  };

  const removeEntry = (index: number) => {
    setSchedule((rows) => rows.filter((_, i) => i !== index));
  };

  return (
    <form
      action={formAction}
      className={
        hideHeading ? undefined : "rounded-xl border border-foreground/10 p-4"
      }
    >
      {!hideHeading && <h2 className="text-sm font-medium">New course</h2>}
      <div
        className={hideHeading ? "flex flex-col gap-4" : "mt-4 flex flex-col gap-4"}
      >
        <label className="flex flex-col gap-1 text-sm">
          Course name
          <input
            name="name"
            type="text"
            required
            className="rounded-lg border border-foreground/20 px-3 py-2"
            placeholder="Introduction to Biology"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Maximum absences
          <input
            name="maxAbsences"
            type="number"
            min={0}
            step={1}
            className="rounded-lg border border-foreground/20 px-3 py-2"
            placeholder="Optional — no limit"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="fixedCheckin"
            checked={fixedCheckin}
            onChange={(e) => setFixedCheckin(e.target.checked)}
            className="h-4 w-4 rounded border-foreground/30"
          />
          Fixed check-in schedule (printable QR code)
        </label>

        {fixedCheckin && (
          <div className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-3">
            <p className="text-xs text-foreground/60">
              Prints one permanent QR code to put up in the room — students
              scan the same code every class, no need to start a session by
              hand each time.
            </p>
            {schedule.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={entry.dayOfWeek}
                  onChange={(e) =>
                    updateEntry(i, { dayOfWeek: Number(e.target.value) })
                  }
                  className="rounded-lg border border-foreground/20 px-2 py-1.5 text-sm"
                >
                  {DAY_LABELS.map((label, day) => (
                    <option key={day} value={day}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={entry.startTime}
                  onChange={(e) => updateEntry(i, { startTime: e.target.value })}
                  className="rounded-lg border border-foreground/20 px-2 py-1.5 text-sm"
                />
                {schedule.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(i)}
                    aria-label="Remove day"
                    className="rounded-md p-1 text-foreground/50 hover:bg-foreground/5"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <div>
              <button
                type="button"
                onClick={addEntry}
                className="text-sm font-medium underline"
              >
                + Add another day
              </button>
            </div>
            <input
              type="hidden"
              name="schedule"
              value={JSON.stringify(schedule)}
            />
            <TimezoneInput />

            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Minutes before
                <input
                  name="checkinWindowBeforeMinutes"
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={15}
                  className="rounded-lg border border-foreground/20 px-3 py-2"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Minutes after
                <input
                  name="checkinWindowAfterMinutes"
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={15}
                  className="rounded-lg border border-foreground/20 px-3 py-2"
                />
              </label>
            </div>
            <p className="text-xs text-foreground/60">
              How long before and after the scheduled time students can scan
              the fixed QR code.
            </p>
          </div>
        )}

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.message && (
          <p className="text-sm text-green-700">{state.message}</p>
        )}
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create course"}
          </Button>
        </div>
      </div>
    </form>
  );
}
