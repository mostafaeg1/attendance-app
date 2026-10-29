import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourse, getCourseSchedules } from "@/actions/courses";
import { CourseTabs } from "@/components/courses/course-tabs";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Formats a course_schedules.start_time ("HH:MM:SS") as a 12-hour clock
 * time. This is a naive wall-clock value the teacher typed, not a UTC
 * timestamp, so it's rendered as-is rather than converted like session
 * times in lib/session-format.ts. */
function formatScheduleTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

type CourseLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function CourseLayout({
  children,
  params,
}: CourseLayoutProps) {
  const { id } = await params;

  let course;
  try {
    course = await getCourse(id);
  } catch {
    notFound();
  }

  if (!course) {
    notFound();
  }

  const schedules = course.fixedCheckinEnabled
    ? await getCourseSchedules(id)
    : [];

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{course.name}</h1>
          {course.subjectCode && (
            <p className="mt-1 text-sm text-foreground/60">
              {course.subjectCode}
            </p>
          )}
          {schedules.length > 0 && (
            <p className="mt-2 text-sm text-foreground/60">
              Scheduled:{" "}
              {schedules
                .map(
                  (s) => `${DAY_LABELS[s.dayOfWeek]} ${formatScheduleTime(s.startTime)}`,
                )
                .join(", ")}{" "}
              — check-in opens {course.checkinWindowBeforeMinutes} min before,
              closes {course.checkinWindowAfterMinutes} min after
            </p>
          )}
        </div>
        {course.fixedCheckinEnabled && (
          <Link
            href={`/fixed-qr/${id}`}
            target="_blank"
            className="shrink-0 rounded-lg border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
          >
            Print fixed QR
          </Link>
        )}
      </div>

      <CourseTabs courseId={id} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
