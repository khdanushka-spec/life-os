import "server-only";

// Brisbane, Australia - fixed coordinates, no geocoding round-trip needed.
const LATITUDE = -27.4698;
const LONGITUDE = 153.0251;

export type Weather = {
  tempC: number;
  condition: string;
  icon: string;
  location: string;
};

// WMO weather codes -> short label + emoji.
// https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")
const WEATHER_CODES: Record<number, { condition: string; icon: string }> = {
  0: { condition: "Clear sky", icon: "☀️" },
  1: { condition: "Mostly clear", icon: "\u{1F324}️" },
  2: { condition: "Partly cloudy", icon: "⛅" },
  3: { condition: "Overcast", icon: "☁️" },
  45: { condition: "Fog", icon: "\u{1F32B}️" },
  48: { condition: "Fog", icon: "\u{1F32B}️" },
  51: { condition: "Light drizzle", icon: "\u{1F326}️" },
  53: { condition: "Drizzle", icon: "\u{1F326}️" },
  55: { condition: "Heavy drizzle", icon: "\u{1F327}️" },
  61: { condition: "Light rain", icon: "\u{1F327}️" },
  63: { condition: "Rain", icon: "\u{1F327}️" },
  65: { condition: "Heavy rain", icon: "\u{1F327}️" },
  71: { condition: "Light snow", icon: "\u{1F328}️" },
  73: { condition: "Snow", icon: "\u{1F328}️" },
  75: { condition: "Heavy snow", icon: "❄️" },
  80: { condition: "Rain showers", icon: "\u{1F326}️" },
  81: { condition: "Rain showers", icon: "\u{1F326}️" },
  82: { condition: "Violent showers", icon: "⛈️" },
  95: { condition: "Thunderstorm", icon: "⛈️" },
  96: { condition: "Thunderstorm", icon: "⛈️" },
  99: { condition: "Thunderstorm", icon: "⛈️" },
};

// Free, keyless API - no account or credentials needed. Fails soft: the
// header simply omits weather rather than breaking the page, same
// graceful-degradation pattern as isSupabaseConfigured()/resolveAiModel().
export async function getBrisbaneWeather(): Promise<Weather | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weather_code`,
      { signal: AbortSignal.timeout(3000), next: { revalidate: 1800 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const code = data?.current?.weather_code;
    const temp = data?.current?.temperature_2m;
    if (typeof temp !== "number") return null;
    const meta = WEATHER_CODES[code] ?? { condition: "—", icon: "\u{1F324}️" };
    return { tempC: Math.round(temp), condition: meta.condition, icon: meta.icon, location: "Brisbane" };
  } catch {
    return null;
  }
}
