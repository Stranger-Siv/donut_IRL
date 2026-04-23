import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as { mongoose: MongooseCache };

if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in your environment");
  }
  if (globalForMongoose.mongoose.conn) {
    return globalForMongoose.mongoose.conn;
  }
  if (!globalForMongoose.mongoose.promise) {
    globalForMongoose.mongoose.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      /* Atlas + slow cold starts (e.g. first request on a host) */
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 20_000,
      connectTimeoutMS: 20_000,
    });
  }
  globalForMongoose.mongoose.conn = await globalForMongoose.mongoose.promise;
  return globalForMongoose.mongoose.conn;
}
