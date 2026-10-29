/** Combines a DATE with a TIMETZ string (e.g. "14:30:00+00") into a real
 * timestamp — Postgres sometimes omits the offset's minutes ("+00" instead
 * of "+00:00"), which `Date` can't parse without this normalization. */
function combineDateAndTime(date: string, time: string): Date {
  const normalized = /[+-]\d{2}$/.test(time) ? `${time}:00` : time;
  return new Date(`${date}T${normalized}`);
}

/** Formats a session's stored (UTC) time in the viewer's local timezone. */
export function formatTime(date: string, time: string) {
  return combineDateAndTime(date, time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatSessionDateTime(session: {
  date: string;
  startTime: string;
  endTime: string | null;
}) {
  const datePart = new Date(session.date).toLocaleDateString();
  const timePart = session.endTime
    ? `${formatTime(session.date, session.startTime)} – ${formatTime(session.date, session.endTime)}`
    : formatTime(session.date, session.startTime);
  return `${datePart} · ${timePart}`;
}

/** Combines a session's `date` with its `end_time` (TIMETZ, e.g. "14:30:00+00")
 * into a real timestamp. Returns null for "unlimited" sessions (no end_time). */
export function getSessionEndTimestamp(session: {
  date: string;
  endTime: string | null;
}): Date | null {
  if (!session.endTime) return null;
  return combineDateAndTime(session.date, session.endTime);
}
