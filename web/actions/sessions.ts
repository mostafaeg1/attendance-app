"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/constants/plans";
import { getSessionEndTimestamp } from "@/lib/session-format";
import type { Session } from "@/types";

export type SessionActionState = {
  error?: string;
  message?: string;
};

type SessionRow = {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  qr_mode: "static" | "rotating";
  static_token: string | null;
  location_enabled: boolean;
  location_lat: number | null;
  location_lng: number | null;
  location_radius_m: number | null;
  is_active: boolean;
  created_at: string;
};

const SESSION_COLUMNS =
  "id, course_id, teacher_id, title, date, start_time, end_time, qr_mode, static_token, location_enabled, location_lat, location_lng, location_radius_m, is_active, created_at";

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    courseId: row.course_id,
    teacherId: row.teacher_id,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    qrMode: row.qr_mode,
    staticToken: row.static_token,
    locationEnabled: row.location_enabled,
    locationLat: row.location_lat,
    locationLng: row.location_lng,
    locationRadiusM: row.location_radius_m,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function getSessionsForCourse(courseId: string): Promise<Session[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("course_id", courseId)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const sessions = (data ?? []).map(mapSession);

  // A session's is_active flag only flips via an explicit teacher action
  // (end/resume), so a session whose end_time has already passed would
  // otherwise sit in "current" indefinitely until someone clicks "End
  // session". Self-heal it here so it's reclassified as past the moment
  // anyone (re)loads this course's sessions.
  const now = Date.now();
  const expiredIds = sessions
    .filter((session) => session.isActive)
    .filter((session) => {
      const endsAt = getSessionEndTimestamp(session);
      return endsAt !== null && endsAt.getTime() < now;
    })
    .map((session) => session.id);

  if (expiredIds.length > 0) {
    await supabase.from("sessions").update({ is_active: false }).in("id", expiredIds);
    const expired = new Set(expiredIds);
    for (const session of sessions) {
      if (expired.has(session.id)) {
        session.isActive = false;
      }
    }
  }

  return sessions;
}

export async function getCheckInCounts(
  sessionIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (sessionIds.length === 0) {
    return counts;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("session_id")
    .eq("status", "present")
    .in("session_id", sessionIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    counts[row.session_id] = (counts[row.session_id] ?? 0) + 1;
  }

  return counts;
}

export async function getCheckInCount(sessionId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("attendance")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "present");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export type CheckInStatus = {
  count: number;
  latestStudentName: string | null;
};

export async function getCheckInStatus(sessionId: string): Promise<CheckInStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("scanned_at, attendee:users(name)")
    .eq("session_id", sessionId)
    .eq("status", "present")
    .order("scanned_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as {
    attendee: { name: string } | null;
  }[];

  return {
    count: rows.length,
    latestStudentName: rows[0]?.attendee?.name ?? null,
  };
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapSession(data) : null;
}

export async function createSession(
  courseId: string,
  _prevState: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const title = formData.get("title")?.toString().trim() || null;
  const duration = formData.get("duration")?.toString() || "unlimited";
  const qrMode = formData.get("qrMode")?.toString() === "rotating" ? "rotating" : "static";

  const locationEnabled = formData.get("locationEnabled") === "on";
  let locationLat: number | null = null;
  let locationLng: number | null = null;
  let locationRadiusM: number | null = null;

  if (locationEnabled) {
    const lat = Number(formData.get("locationLat"));
    const lng = Number(formData.get("locationLng"));
    const radius = Number(formData.get("locationRadiusM"));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { error: "Couldn't get your current location. Try again." };
    }
    if (!Number.isFinite(radius) || radius <= 0) {
      return { error: "Enter a valid check-in radius." };
    }

    locationLat = lat;
    locationLng = lng;
    locationRadiusM = Math.round(radius);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a session." };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (courseError) {
    return { error: courseError.message };
  }
  if (!course) {
    return { error: "Course not found." };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error: countError } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  if (countError) {
    return { error: countError.message };
  }

  const sessionLimit = PLAN_LIMITS.free.sessionsPerMonth;
  if ((count ?? 0) >= sessionLimit) {
    return {
      error: `Free plan allows up to ${sessionLimit} sessions per month. Upgrade to Pro for unlimited sessions.`,
    };
  }

  await supabase
    .from("sessions")
    .update({ is_active: false })
    .eq("course_id", courseId)
    .eq("is_active", true);

  const toTimetz = (d: Date) => `${d.toISOString().slice(11, 19)}+00`;

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const startTime = toTimetz(now);
  const durationMinutes = Number(duration);
  const endTime =
    duration !== "unlimited" && Number.isFinite(durationMinutes)
      ? toTimetz(new Date(now.getTime() + durationMinutes * 60_000))
      : null;

  const sessionId = crypto.randomUUID();

  const { error } = await supabase.from("sessions").insert({
    id: sessionId,
    course_id: courseId,
    teacher_id: user.id,
    title,
    date,
    start_time: startTime,
    end_time: endTime,
    qr_mode: qrMode,
    static_token: crypto.randomUUID(),
    location_enabled: locationEnabled,
    location_lat: locationLat,
    location_lng: locationLng,
    location_radius_m: locationRadiusM,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/courses/${courseId}`, "layout");
  redirect(`/session/${sessionId}`);
}

export async function endSession(courseId: string, sessionId: string) {
  const supabase = await createClient();
  await supabase.from("sessions").update({ is_active: false }).eq("id", sessionId);
  revalidatePath(`/dashboard/courses/${courseId}`, "layout");
  redirect(`/dashboard/courses/${courseId}/sessions`);
}

/** Permanently deletes a session and its attendance records (cascade). RLS
 * scopes this to sessions the calling teacher owns. */
export async function deleteSession(courseId: string, sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("teacher_id", user.id);

  revalidatePath(`/dashboard/courses/${courseId}`, "layout");
}

export async function resumeSession(
  courseId: string,
  sessionId: string,
  _prevState: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const duration = formData.get("duration")?.toString() || "unlimited";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to resume a session." };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("id", sessionId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!session) {
    return { error: "Session not found." };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (session.date !== today) {
    return { error: "Sessions can only be resumed on the day they were held." };
  }

  const toTimetz = (d: Date) => `${d.toISOString().slice(11, 19)}+00`;
  const now = new Date();
  const durationMinutes = Number(duration);
  const endTime =
    duration !== "unlimited" && Number.isFinite(durationMinutes)
      ? toTimetz(new Date(now.getTime() + durationMinutes * 60_000))
      : null;

  await supabase
    .from("sessions")
    .update({ is_active: false })
    .eq("course_id", courseId)
    .eq("is_active", true);

  await supabase
    .from("sessions")
    .update({ is_active: true, end_time: endTime })
    .eq("id", sessionId);

  revalidatePath(`/dashboard/courses/${courseId}`, "layout");
  redirect(`/session/${sessionId}`);
}
