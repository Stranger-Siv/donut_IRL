/**
 * Detect Mongoose / MongoDB connection failures (no server, wrong URI, network).
 */
export function isMongoConnectionError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const any = e as { name?: string; message?: string; code?: string | number };
  const name = String(any.name || "");
  const msg = String(any.message || e);
  if (name === "MongooseServerSelectionError" || /MongoServerSelectionError|MongoNetworkError/i.test(name)) {
    return true;
  }
  return /ECONNREFUSED|getaddrinfo|ETIMEDOUT|ENOTFOUND|mongoserverselection|replica set|not connected|closed/i.test(
    msg
  );
}

export const DB_UNAVAILABLE_USER_MESSAGE =
  "Database is not running or cannot be reached. From the project folder run: docker compose up -d — or set MONGODB_URI in .env.local to a MongoDB Atlas connection string, then restart the dev server.";
