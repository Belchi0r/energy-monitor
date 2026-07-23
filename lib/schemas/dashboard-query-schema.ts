import { z } from "zod";

import { dashboardPeriods } from "@/lib/dashboard/periods";

export const dashboardQuerySchema = z
  .object({
    period: z.enum(dashboardPeriods).default("today"),
    compare: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .strict();

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
