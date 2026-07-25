import { brisbaneHour } from "@/lib/date";

export function greeting(): string {
  const hour = brisbaneHour();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
