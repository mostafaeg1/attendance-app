export type AttendanceStatus = "present" | "absent" | "excused";
export type ScanMethod = "app" | "web" | "manual";
export type QrMode = "static" | "rotating";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";
export type PlanTier = "free" | "pro";

export interface Teacher {
  id: string;
  name: string;
  email: string;
}

export interface Course {
  id: string;
  teacherId: string;
  name: string;
  subjectCode: string | null;
  maxAbsences: number | null;
  fixedCheckinEnabled: boolean;
  checkinWindowBeforeMinutes: number;
  checkinWindowAfterMinutes: number;
  timezone: string;
  createdAt: string;
}

export interface CourseSchedule {
  id: string;
  courseId: string;
  dayOfWeek: number;
  startTime: string;
}

export interface Session {
  id: string;
  courseId: string;
  teacherId: string;
  title: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  qrMode: QrMode;
  staticToken: string | null;
  locationEnabled: boolean;
  locationLat: number | null;
  locationLng: number | null;
  locationRadiusM: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  scannedAt?: string;
  scanMethod?: ScanMethod;
  locationValid?: boolean;
  timeValid?: boolean;
}

export interface Plan {
  id: string;
  name: PlanTier;
  priceMonthly: number;
  priceAnnual: number;
  features: Record<string, boolean | number>;
}
