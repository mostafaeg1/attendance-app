"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Attendee = {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
};

type EnrollmentRow = {
  enrolled_at: string;
  attendee: { id: string; name: string; email: string } | null;
};

export async function getAttendeesForCourse(courseId: string): Promise<Attendee[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("course_enrollments")
    .select("enrolled_at, attendee:users(id, name, email)")
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as EnrollmentRow[])
    .filter((row) => row.attendee !== null)
    .map((row) => ({
      id: row.attendee!.id,
      name: row.attendee!.name,
      email: row.attendee!.email,
      enrolledAt: row.enrolled_at,
    }));
}

export type AttendanceStatusRow = {
  sessionId: string;
  attendeeId: string;
  status: string;
};

export async function getAttendanceStatusesForCourse(
  sessionIds: string[],
): Promise<AttendanceStatusRow[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("session_id, attendee_id, status")
    .in("session_id", sessionIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    sessionId: row.session_id,
    attendeeId: row.attendee_id,
    status: row.status,
  }));
}

/** Manually marks a student present for a session — e.g. a teacher covering
 * for a student who was there but didn't/couldn't scan. RLS scopes this to
 * sessions the calling teacher owns, so the insert silently affects nothing
 * if courseId/sessionId aren't actually theirs. */
export async function markPresent(
  courseId: string,
  sessionId: string,
  attendeeId: string,
) {
  const supabase = await createClient();

  const { error } = await supabase.from("attendance").upsert(
    {
      session_id: sessionId,
      attendee_id: attendeeId,
      status: "present",
      scan_method: "manual",
    },
    { onConflict: "session_id,attendee_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/courses/${courseId}/attendees`);
}

export async function getEnrollmentCount(courseId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("course_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
