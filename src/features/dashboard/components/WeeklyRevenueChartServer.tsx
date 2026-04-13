import { getWeeklyRevenueDataAction } from "@/features/finance/serverActions";
import { WeeklyRevenueChart } from "./WeeklyRevenueChart";

export async function WeeklyRevenueChartServer() {
  const data = await getWeeklyRevenueDataAction();

  return <WeeklyRevenueChart data={data} />;
}
