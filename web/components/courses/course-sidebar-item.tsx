"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  updateCourse,
  archiveCourse,
  getCourseSchedules,
  type CourseActionState,
} from "@/actions/courses";
import { Button } from "@/components/ui/button";
import { TimezoneInput } from "./timezone-input";
import type { Course } from "@/types";

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

export function CourseSidebarItem({ course }: { course: Course }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [fixedCheckin, setFixedCheckin] = useState(course.fixedCheckinEnabled);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const updateCourseForCourse = updateCourse.bind(null, course.id);
  const [state, formAction, isPending] = useActionState(
    updateCourseForCourse,
    initialState,
  );

  useEffect(() => {
    if (state.message) {
      setEditOpen(false);
    }
  }, [state.message]);

  useEffect(() => {
    if (!editOpen) return;
    setFixedCheckin(course.fixedCheckinEnabled);
    if (!course.fixedCheckinEnabled) {
      setSchedule([{ dayOfWeek: 1, startTime: "09:00" }]);
      return;
    }
    setScheduleLoading(true);
    getCourseSchedules(course.id)
      .then((rows) => {
        setSchedule(
          rows.length > 0
            ? rows.map((row) => ({
                dayOfWeek: row.dayOfWeek,
                startTime: row.startTime.slice(0, 5),
              }))
            : [{ dayOfWeek: 1, startTime: "09:00" }],
        );
      })
      .finally(() => setScheduleLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the modal opens
  }, [editOpen]);

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

  const handleDelete = async () => {
    setMenuOpen(false);
    if (
      window.confirm(
        `Delete "${course.name}"? It will be removed from your course list.`,
      )
    ) {
      await archiveCourse(course.id);
    }
  };

  return (
    <div className="relative">
      <Link
        href={`/dashboard/courses/${course.id}/sessions`}
        className="block rounded-md bg-foreground/5 py-2 pl-3 pr-9 hover:bg-foreground/10"
      >
        <p className="text-base font-medium">{course.name}</p>
        {course.subjectCode && (
          <p className="text-xs text-foreground/50">{course.subjectCode}</p>
        )}
      </Link>

      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Course options"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
      >
        ⋮
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-1 top-full z-20 mt-1 w-32 rounded-lg border border-foreground/10 bg-background py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditOpen(true);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-foreground/5"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-foreground/5"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl border border-foreground/10 bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit course</h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-foreground/50 hover:bg-foreground/5"
              >
                ✕
              </button>
            </div>
            <form action={formAction} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Course name
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={course.name}
                  className="rounded-lg border border-foreground/20 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Maximum absences
                <input
                  name="maxAbsences"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={course.maxAbsences ?? ""}
                  placeholder="Optional — no limit"
                  className="rounded-lg border border-foreground/20 px-3 py-2"
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
                  {scheduleLoading ? (
                    <p className="text-xs text-foreground/60">Loading schedule…</p>
                  ) : (
                    <>
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
                            onChange={(e) =>
                              updateEntry(i, { startTime: e.target.value })
                            }
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
                            defaultValue={course.checkinWindowBeforeMinutes}
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
                            defaultValue={course.checkinWindowAfterMinutes}
                            className="rounded-lg border border-foreground/20 px-3 py-2"
                          />
                        </label>
                      </div>
                      <p className="text-xs text-foreground/60">
                        How long before and after the scheduled time students
                        can scan the fixed QR code.
                      </p>
                    </>
                  )}
                </div>
              )}

              {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}
              <div>
                <Button type="submit" disabled={isPending || scheduleLoading}>
                  {isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
