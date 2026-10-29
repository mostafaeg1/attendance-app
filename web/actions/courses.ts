"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/constants/plans";
import type { Course, CourseSchedule } from "@/types";

export type CourseActionState = {
  error?: string;
  message?: string;
};

type CourseRow = {
  id: string;
  teacher_id: string;
  name: string;
  subject_code: string | null;
  max_absences: number | null;
  fixed_checkin_enabled: boolean;
  checkin_window_before_minutes: number;
  checkin_window_after_minutes: number;
  timezone: string;
  created_at: string;
};

const COURSE_COLUMNS =
  "id, teacher_id, name, subject_code, max_absences, fixed_checkin_enabled, checkin_window_before_minutes, checkin_window_after_minutes, timezone, created_at";

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    name: row.name,
    subjectCode: row.subject_code,
    maxAbsences: row.max_absences,
    fixedCheckinEnabled: row.fixed_checkin_enabled,
    checkinWindowBeforeMinutes: row.checkin_window_before_minutes,
    checkinWindowAfterMinutes: row.checkin_window_after_minutes,
    timezone: row.timezone,
    createdAt: row.created_at,
  };
}

export async function getCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_COLUMNS)
    .eq("teacher_id", user.id)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapCourse);
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_COLUMNS)
    .eq("id", courseId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapCourse(data) : null;
}

function parseMaxAbsences(formData: FormData): number | null {
  const raw = formData.get("maxAbsences")?.toString().trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

function parseWindowMinutes(formData: FormData, name: string): number | null {
  const raw = formData.get(name)?.toString().trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

/** The browser's IANA timezone (e.g. "Asia/Jerusalem"), captured client-side
 * so fixed_check_in() can evaluate the schedule in the classroom's actual
 * local time instead of the database server's (which runs in UTC). Falls
 * back to UTC if missing or not a real timezone name. */
function parseTimezone(formData: FormData): string {
  const raw = formData.get("timezone")?.toString().trim();
  if (!raw) return "UTC";
  try {
    Intl.DateTimeFormat(undefined, { timeZone: raw });
    return raw;
  } catch {
    return "UTC";
  }
}

type ScheduleEntry = { dayOfWeek: number; startTime: string };

function parseSchedule(formData: FormData): ScheduleEntry[] {
  const raw = formData.get("schedule")?.toString();
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter((entry): entry is ScheduleEntry => {
    if (!entry || typeof entry !== "object") return false;
    const { dayOfWeek, startTime } = entry as Record<string, unknown>;
    return (
      Number.isInteger(dayOfWeek) &&
      (dayOfWeek as number) >= 0 &&
      (dayOfWeek as number) <= 6 &&
      typeof startTime === "string" &&
      /^\d{2}:\d{2}$/.test(startTime)
    );
  });
}

export async function getCourseSchedules(
  courseId: string,
): Promise<CourseSchedule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_schedules")
    .select("id, course_id, day_of_week, start_time")
    .eq("course_id", courseId)
    .order("day_of_week")
    .order("start_time");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    courseId: row.course_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
  }));
}

export async function createCourse(
  _prevState: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const name = formData.get("name")?.toString().trim();
  const subjectCode = formData.get("subjectCode")?.toString().trim() || null;
  const maxAbsences = parseMaxAbsences(formData);
  const fixedCheckinEnabled = formData.get("fixedCheckin") === "on";
  const schedule = fixedCheckinEnabled ? parseSchedule(formData) : [];
  const windowBeforeMinutes = parseWindowMinutes(formData, "checkinWindowBeforeMinutes");
  const windowAfterMinutes = parseWindowMinutes(formData, "checkinWindowAfterMinutes");

  if (!name) {
    return { error: "Course name is required." };
  }
  if (fixedCheckinEnabled && schedule.length === 0) {
    return {
      error: "Add at least one day and time for the fixed check-in schedule.",
    };
  }
  if (fixedCheckinEnabled && (windowBeforeMinutes === null || windowAfterMinutes === null)) {
    return {
      error: "Enter how many minutes before and after the scheduled time students can check in.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a course." };
  }

  const { count, error: countError } = await supabase
    .from("courses")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", user.id)
    .eq("is_archived", false);

  if (countError) {
    return { error: countError.message };
  }

  const courseLimit = PLAN_LIMITS.free.courses;
  if ((count ?? 0) >= courseLimit) {
    return {
      error: `Free plan allows up to ${courseLimit} courses. Upgrade to Pro for unlimited courses.`,
    };
  }

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      teacher_id: user.id,
      name,
      subject_code: subjectCode,
      max_absences: maxAbsences,
      fixed_checkin_enabled: fixedCheckinEnabled,
      ...(fixedCheckinEnabled
        ? {
            checkin_window_before_minutes: windowBeforeMinutes,
            checkin_window_after_minutes: windowAfterMinutes,
            timezone: parseTimezone(formData),
          }
        : {}),
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (schedule.length > 0) {
    const { error: scheduleError } = await supabase.from("course_schedules").insert(
      schedule.map((entry) => ({
        course_id: course.id,
        day_of_week: entry.dayOfWeek,
        start_time: entry.startTime,
      })),
    );

    if (scheduleError) {
      // Don't leave a half-created course behind — fixed_checkin_enabled
      // with zero schedule rows is an inconsistent state.
      await supabase.from("courses").delete().eq("id", course.id);
      return { error: scheduleError.message };
    }
  }

  revalidatePath("/dashboard", "layout");
  return { message: "Course created." };
}

export async function updateCourse(
  courseId: string,
  _prevState: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const name = formData.get("name")?.toString().trim();
  const maxAbsences = parseMaxAbsences(formData);
  const fixedCheckinEnabled = formData.get("fixedCheckin") === "on";
  const schedule = fixedCheckinEnabled ? parseSchedule(formData) : [];
  const windowBeforeMinutes = parseWindowMinutes(formData, "checkinWindowBeforeMinutes");
  const windowAfterMinutes = parseWindowMinutes(formData, "checkinWindowAfterMinutes");

  if (!name) {
    return { error: "Course name is required." };
  }
  if (fixedCheckinEnabled && schedule.length === 0) {
    return {
      error: "Add at least one day and time for the fixed check-in schedule.",
    };
  }
  if (fixedCheckinEnabled && (windowBeforeMinutes === null || windowAfterMinutes === null)) {
    return {
      error: "Enter how many minutes before and after the scheduled time students can check in.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to edit a course." };
  }

  const { error } = await supabase
    .from("courses")
    .update({
      name,
      max_absences: maxAbsences,
      fixed_checkin_enabled: fixedCheckinEnabled,
      ...(fixedCheckinEnabled
        ? {
            checkin_window_before_minutes: windowBeforeMinutes,
            checkin_window_after_minutes: windowAfterMinutes,
            timezone: parseTimezone(formData),
          }
        : {}),
    })
    .eq("id", courseId)
    .eq("teacher_id", user.id);

  if (error) {
    return { error: error.message };
  }

  if (fixedCheckinEnabled) {
    const { data: oldRows } = await supabase
      .from("course_schedules")
      .select("id")
      .eq("course_id", courseId);

    const { error: scheduleError } = await supabase.from("course_schedules").insert(
      schedule.map((entry) => ({
        course_id: courseId,
        day_of_week: entry.dayOfWeek,
        start_time: entry.startTime,
      })),
    );

    if (scheduleError) {
      return { error: scheduleError.message };
    }

    // Insert-then-delete rather than delete-then-insert, so a failed insert
    // above never leaves the course with its schedule wiped out.
    const oldIds = (oldRows ?? []).map((row) => row.id);
    if (oldIds.length > 0) {
      await supabase.from("course_schedules").delete().in("id", oldIds);
    }
  }

  revalidatePath("/dashboard", "layout");
  return { message: "Course updated." };
}

export async function archiveCourse(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from("courses")
    .update({ is_archived: true })
    .eq("id", courseId)
    .eq("teacher_id", user.id);

  revalidatePath("/dashboard", "layout");
}
