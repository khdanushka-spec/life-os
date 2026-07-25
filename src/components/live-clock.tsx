"use client";

import { useEffect, useState } from "react";

export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    // Deferred via setTimeout(0) rather than called directly, so the
    // effect only ever triggers state updates from inside a callback.
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  // Renders nothing server-side / on first client paint to avoid a
  // hydration mismatch between server time and client time.
  if (!now) return null;

  return (
    <span className={className}>
      {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
    </span>
  );
}
