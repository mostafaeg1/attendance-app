import {
  getSessionsForCourse,
  getCheckInCounts,
} from "@/actions/sessions";
import { getEnrollmentCount } from "@/actions/attendees";
import { StartSessionButton } from "@/components/sessions/start-session-button";
import { SessionsTable } from "@/components/sessions/sessions-table";
import { SessionExpiryWatcher } from "@/components/sessions/session-expiry-watcher";
import { getSessionEndTimestamp } from "@/lib/session-format";

type CourseSessionsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseSessionsPage({
  params,
}: CourseSessionsPageProps) {
  const { id } = await params;

  const sessions = await getSessionsForCourse(id);
  const currentSession = sessions.find((session) => session.isActive) ?? null;

  const sessionNumberById = new Map(
    [...sessions]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((session, index) => [session.id, index + 1]),
  );

  const [checkInCounts, enrollmentCount] = await Promise.all([
    getCheckInCounts(sessions.map((session) => session.id)),
    getEnrollmentCount(id),
  ]);

  const sessionRows = sessions.map((session) => {
    const checkIns = checkInCounts[session.id] ?? 0;
    return {
      id: session.id,
      number: sessionNumberById.get(session.id) ?? 0,
      title: session.title || "Untitled session",
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      isActive: session.isActive,
      checkIns,
      attendanceRate:
        enrollmentCount > 0
          ? Math.round((checkIns / enrollmentCount) * 100)
          : null,
    };
  });

  return (
    <div>
      {currentSession && (
        <SessionExpiryWatcher
          endsAt={getSessionEndTimestamp(currentSession)?.toISOString() ?? null}
        />
      )}

      <StartSessionButton
        courseId={id}
        nextSessionNumber={sessions.length + 1}
      />

      <section>
        <h2 className="text-sm font-medium text-foreground/80">Sessions</h2>
        {sessionRows.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/60">
            No sessions yet. Start one below.
          </p>
        ) : (
          <div className="mt-3">
            <SessionsTable rows={sessionRows} courseId={id} />
          </div>
        )}
      </section>
    </div>
  );
}
