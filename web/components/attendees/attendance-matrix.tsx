import { ManualCheckInCell } from "@/components/attendees/manual-check-in-cell";

export type AttendanceMatrixRow = {
  id: string;
  name: string;
  absences: number;
  attendanceRate: number | null;
  present: boolean[];
};

export type AttendanceMatrixSession = {
  id: string;
  title: string;
};

function rowClassName(absences: number, maxAbsences: number | null) {
  if (maxAbsences === null) return "";
  if (absences > maxAbsences) return "bg-red-50";
  if (absences === maxAbsences) return "bg-yellow-50";
  return "";
}

export function AttendanceMatrix({
  courseId,
  students,
  sessions,
  maxAbsences,
}: {
  courseId: string;
  students: AttendanceMatrixRow[];
  sessions: AttendanceMatrixSession[];
  maxAbsences: number | null;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-xs uppercase tracking-wide text-foreground/50">
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Absences</th>
            <th className="px-4 py-3 font-medium">Attendance rate</th>
            {sessions.map((_, i) => (
              <th key={i} className="px-3 py-3 text-center font-medium">
                {i + 1}
              </th>
            ))}
            <th className="w-full" />
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {students.map((student) => (
            <tr
              key={student.id}
              className={rowClassName(student.absences, maxAbsences)}
            >
              <td className="px-4 py-3 font-medium">{student.name}</td>
              <td className="px-4 py-3">{student.absences}</td>
              <td className="px-4 py-3">
                {student.attendanceRate === null
                  ? "—"
                  : `${student.attendanceRate}%`}
              </td>
              {student.present.map((present, i) => (
                <td key={i} className="px-3 py-3 text-center">
                  {present ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <ManualCheckInCell
                      courseId={courseId}
                      sessionId={sessions[i].id}
                      sessionTitle={sessions[i].title}
                      attendeeId={student.id}
                      studentName={student.name}
                    />
                  )}
                </td>
              ))}
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
