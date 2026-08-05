import type { DashboardViewData } from "@/lib/services/dashboard-service";

export type DashboardApiSuccessResponse = {
  data: DashboardViewData;
  meta: {
    period: DashboardViewData["period"];
    compare: boolean;
    generatedAt: string;
  };
};

export type DashboardApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_QUERY"
  | "INTERNAL_ERROR";

export type DashboardApiErrorDetail = {
  field: string;
  code: string;
  message: string;
};

export type DashboardApiErrorResponse = {
  error: {
    code: DashboardApiErrorCode;
    message: string;
    details?: readonly DashboardApiErrorDetail[];
  };
};
