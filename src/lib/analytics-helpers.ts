import { connectDB } from "./mongodb";
import { AnalyticsDaily } from "@/models/AnalyticsDaily.model";
import { subDays, format, startOfDay } from "date-fns";

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export async function recordCompletedOrder(
  day: Date,
  spentInr: number,
  earnedInr: number,
  completionMinutes: number
) {
  await connectDB();
  const key = dayKey(day);
  await AnalyticsDaily.findOneAndUpdate(
    { day: key },
    {
      $inc: {
        totalSpentInr: spentInr,
        totalEarnedInr: earnedInr,
        ordersCompleted: 1,
        sumCompletionMinutes: completionMinutes,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export { subDays, startOfDay, dayKey, format };
