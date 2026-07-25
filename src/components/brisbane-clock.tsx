"use client";

import { useEffect, useState } from "react";

function formatBrisbaneTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", {
    timeZone: "Australia/Brisbane",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Ticks client-side since Server Components render once at request time and
// can't stay live. Initial state matches what SSR would have produced (same
// formatBrisbaneTime call), so no hydration mismatch - the display just
// starts updating once mounted.
export function BrisbaneClock() {
  const [time, setTime] = useState(() => formatBrisbaneTime(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatBrisbaneTime(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return <span suppressHydrationWarning>{time} AEST</span>;
}
