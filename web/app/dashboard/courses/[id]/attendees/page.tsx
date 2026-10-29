import {
  getAttendeesForCourse,
  getAttendanceStatusesForCourse,
} from "@/actions/attendees";
import { getCourse } from "@/actions/courses";
import { getSessionsForCourse } from "@/actions/sessions";
import { AttendanceMatrix } from "@/components/attendees/attendance-matrix";

type CourseAttendeesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseAttendeesPage({
  params,
}: CourseAttendeesPageProps) {
  const { id } = await params;

  const [course, attendees, sessions] = await Promise.all([
    getCourse(id),
    getAttendeesForCourse(id),
    getSessionsForCourse(id),
  ]);

  const orderedSessions = [...sessions].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  const attendanceRows = await getAttendanceStatusesForCourse(
    orderedSessions.map((session) => session.id),
  );

  const presentKeys = new Set(
    attendanceRows
      .filter((row) => row.status === "present")
      .map((row) => `${row.attendeeId}:${row.sessionId}`),
  );

  const students = attendees.map((attendee) => {
    const present = orderedSessions.map((session) =>
      presentKeys.has(`${attendee.id}:${session.id}`),
    );
    const presentCount = present.filter(Boolean).length;
    const absences = orderedSessions.length - presentCount;
    const attendanceRate =
      orderedSessions.length > 0
        ? Math.round((presentCount / orderedSessions.length) * 100)
        : null;

    return {
      id: attendee.id,
      name: attendee.name,
      absences,
      attendanceRate,
      present,
    };
  });

  return (
    <section>
      <h2 className="text-sm font-medium text-foreground/80">Attendees</h2>
      {attendees.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/60">
          No attendees enrolled yet.
        </p>
      ) : (
        <div className="mt-3">
          <AttendanceMatrix
            courseId={id}
            students={students}
            sessions={orderedSessions.map((session) => ({
              id: session.id,
              title: session.title || "Untitled session",
            }))}
            maxAbsences={course?.maxAbsences ?? null}
          />
        </div>
      )}
    </section>
  );
}
