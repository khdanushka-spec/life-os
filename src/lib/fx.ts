import "server-only";

const FX_BASE = "AUD";

// currency code -> AUD value of 1 unit of that currency (e.g. LKR: 0.00426)
export type FxRates = Record<string, number>;

export type FxSnapshot = {
  rates: FxRates;
  updatedAtUtc: string;
};

// Free, keyless API - no account/credentials needed, same graceful-degradation
// pattern as getBrisbaneWeather() (fails soft to null rather than breaking a
// page). The provider refreshes once a day, so a 24h Next fetch-cache window
// matches its own update cadence instead of re-fetching on every request.
export async function getAudFxSnapshot(): Promise<FxSnapshot | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${FX_BASE}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.result !== "success" || typeof data?.rates !== "object" || !data.rates) return null;

    // The API returns "units of X per 1 AUD" - invert to "AUD value of 1
    // unit of X", which is what every net-worth/display calculation needs.
    const rates: FxRates = { AUD: 1 };
    for (const [code, perAud] of Object.entries(data.rates as Record<string, unknown>)) {
      if (typeof perAud === "number" && perAud > 0) rates[code] = 1 / perAud;
    }
    const updatedAtUtc = typeof data.time_last_update_utc === "string" ? data.time_last_update_utc : new Date().toUTCString();
    return { rates, updatedAtUtc };
  } catch {
    return null;
  }
}

// Returns null (rather than a wrong number) when the currency isn't AUD and
// no rate is available - callers should exclude the item from totals in
// that case instead of silently treating a foreign amount as if it were AUD.
export function convertToAud(amount: number, currency: string, rates: FxRates | null | undefined): number | null {
  if (currency === "AUD") return amount;
  const rate = rates?.[currency];
  return rate == null ? null : amount * rate;
}
