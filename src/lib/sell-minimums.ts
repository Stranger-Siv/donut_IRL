import { connectDB } from "./mongodb";
import { AppSettings } from "@/models/AppSettings.model";

export type SellMinimums = {
  minSellQuantityM: number;
  minSellItemUnits: number;
};

export async function getSellMinimums(): Promise<SellMinimums> {
  await connectDB();
  const d = await AppSettings.findById("global").lean();
  return {
    minSellQuantityM: d?.minSellQuantityM ?? 1,
    minSellItemUnits: d?.minSellItemUnits ?? 1,
  };
}
