import type { PlanTier } from "@/types";

export const PLAN_LIMITS: Record<
  PlanTier,
  { courses: number; sessionsPerMonth: number; studentsPerCourse: number }
> = {
  free: { courses: 2, sessionsPerMonth: 10, studentsPerCourse: 30 },
  pro: { courses: Infinity, sessionsPerMonth: Infinity, studentsPerCourse: Infinity },
};

export const PLAN_FEATURES = [
  { label: "Courses", free: "Up to 2", pro: "Unlimited" },
  { label: "Sessions / month", free: "Up to 10", pro: "Unlimited" },
  { label: "Students / course", free: "Up to 30", pro: "Unlimited" },
  { label: "Static QR", free: true, pro: true },
  { label: "Rotating QR (2s)", free: false, pro: true },
  { label: "Location constraint", free: false, pro: true },
  { label: "PDF / Excel export", free: false, pro: true },
] as const;
