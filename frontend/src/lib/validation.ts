import type { UserRole } from "./constants";

const EDU_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.edu$/i;

export function isEduEmail(email: string): boolean {
  return EDU_EMAIL_REGEX.test(email.trim());
}

export function isValidRole(role: string | null): role is UserRole {
  return role === "student" || role === "professor";
}

export function gpaRangeToMin(gpaRange: string): number {
  if (gpaRange.startsWith("3.8")) return 3.8;
  if (gpaRange.startsWith("3.5")) return 3.5;
  if (gpaRange.startsWith("3.0")) return 3.0;
  if (gpaRange.startsWith("2.5")) return 2.5;
  return 0;
}
