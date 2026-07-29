import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 0s for dynamic routes (nearly every page in this app),
    // meaning the client Router Cache never reuses a page you just
    // visited - every back/forward or repeat navigation re-fetches from
    // the server. 30s makes recently-visited pages feel instant on
    // re-visit; server actions already call revalidatePath() on mutation,
    // so this doesn't risk showing stale data after an edit.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
