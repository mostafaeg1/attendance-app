"use client";

import { useState } from "react";
import Link from "next/link";
import { formatSessionDateTime } from "@/lib/session-format";
import { ResumeSessionButton } from "@/components/sessions/resume-session-button";
import { endSession, deleteSession } from "@/actions/sessions";

export type SessionRow = {
  id: string;
  number: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  checkIns: number;
  attendanceRate: number | null;
};

export function SessionsTable({
  rows,
  courseId,
}: {
  rows: SessionRow[];
  courseId: string;
}) {
  const [query, setQuery] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const filtered = rows.filter((row) =>
    row.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleDelete = async (row: SessionRow) => {
    const checkInWarning =
      row.checkIns > 0
        ? ` This also permanently deletes its ${row.checkIns} check-in record${row.checkIns === 1 ? "" : "s"}.`
        : "";
    if (window.confirm(`Delete "${row.title}"?${checkInWarning}`)) {
      await deleteSession(courseId, row.id);
    }
  };

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sessions…"
        className="w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm"
      />

      <div className="mt-3 overflow-x-auto rounded-xl border border-foreground/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-xs uppercase tracking-wide text-foreground/50">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                Session title
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                Date &amp; time
              </th>
              <th className="px-4 py-3 font-medium">Check-ins</th>
              <th className="px-4 py-3 font-medium">Attendance rate</th>
              <th className="px-4 py-3" />
              <th className="w-full" />
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-foreground/60"
                >
                  No sessions found.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const canResume = !row.isActive && row.date === today;
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-foreground/60">
                      {row.number}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {row.title}
                      {row.isActive && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Live
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground/60">
                      {formatSessionDateTime(row)}
                    </td>
                    <td className="px-4 py-3">{row.checkIns}</td>
                    <td className="px-4 py-3">
                      {row.attendanceRate === null
                        ? "—"
                        : `${row.attendanceRate}%`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.isActive ? (
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/session/${row.id}`}
                            className="rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
                          >
                            View QR
                          </Link>
                          <form action={endSession.bind(null, courseId, row.id)}>
                            <button
                              type="submit"
                              className="rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
                            >
                              End session
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <ResumeSessionButton
                            courseId={courseId}
                            sessionId={row.id}
                            disabled={!canResume}
                            disabledReason="Sessions can only be resumed on the day they were held"
                          />
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                    <td />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
