import { connectDB } from "./mongodb";
import { AppSettings } from "@/models/AppSettings.model";

export async function getOrCreateAppSettings() {
  await connectDB();
  let doc = await AppSettings.findById("global").lean();
  if (!doc) {
    await AppSettings.create({ _id: "global" });
    doc = (await AppSettings.findById("global").lean())!;
  }
  return doc;
}
