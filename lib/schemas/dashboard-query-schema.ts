import { z } from "zod";

import { dashboardPeriods } from "@/lib/dashboard/periods";
import {
  isDashboardDataMode,
  type DashboardDataMode,
} from "@/lib/dashboard/types";

export const dashboardQuerySchema = z
  .object({
    period: z.enum(dashboardPeriods).default("today"),
    compare: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    mode: z
      .string()
      .optional()
      .transform<DashboardDataMode>((value) =>
        value && isDashboardDataMode(value) ? value : "home",
      ),
  })
  .strict();

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
