import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (used by statement-import.ts) pulls in pdfjs-dist and its
  // native @napi-rs/canvas binding. Without this, Next's Server Components
  // bundler inlines pdf-parse instead of externalizing it - confirmed via
  // `next build`'s .nft.json trace: pdf-parse's own files (and pdfjs-dist)
  // are only listed as copied deployment dependencies once they're on this
  // list, so a bundled build silently omits runtime assets these packages
  // read from disk. That's why every PDF statement upload failed in
  // production (working in `next dev`, which runs against node_modules
  // directly) with the generic "Couldn't read this PDF" error - the parser's
  // catch swallowed whatever the real underlying failure was.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
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
