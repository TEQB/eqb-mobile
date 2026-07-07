import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSession(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

export function daysRemaining(lastUploadAt: string | null, obligationDays: number): number {
  if (!lastUploadAt) return 0;
  const deadline = new Date(lastUploadAt);
  deadline.setDate(deadline.getDate() + obligationDays);
  const diff = deadline.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function validateUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
