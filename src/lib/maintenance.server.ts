import { getOrCreateAppSettings } from "./app-settings.server";

type Snapshot = { active: boolean; supportUrl: string };

let cache: { at: number; data: Snapshot } | null = null;
const TTL_MS = 2500;

/** For layout + /api/maintenance/status; short in-memory cache to cut DB hits. */
export async function getMaintenanceSnapshot(): Promise<Snapshot> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return cache.data;
  }
  const s = await getOrCreateAppSettings();
  const data: Snapshot = {
    active: Boolean(s.maintenanceMode),
    supportUrl: typeof s.supportUrl === "string" ? s.supportUrl : "",
  };
  cache = { at: now, data };
  return data;
}

export function invalidateMaintenanceCache() {
  cache = null;
}
