export const ADMIN_SESSION_COOKIE = "aura_admin_session";
export const ADMIN_SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const ADMIN_SESSION_RENEW_THRESHOLD_MS =
  ADMIN_SESSION_DURATION_MS / 2; // renew once half the lifetime remains
