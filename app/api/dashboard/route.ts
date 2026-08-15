import type { NextRequest } from "next/server";

import { dashboardService } from "@/lib/dashboard/application";
import { getEffectiveEnergyTariff } from "@/lib/energy/energy-tariff.server";
import {
  AuthenticationRequiredError,
  requireUser,
} from "@/lib/supabase/require-user";
import { dashboardQuerySchema } from "@/lib/schemas/dashboard-query-schema";
import type {
  DashboardApiErrorDetail,
  DashboardApiErrorResponse,
  DashboardApiSuccessResponse,
} from "@/lib/types/dashboard-api";

function readQuery(searchParams: URLSearchParams) {
  const query: Record<string, string | string[]> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    query[key] = values.length === 1 ? values[0] : values;
  }

  return query;
}

export async function GET(request: NextRequest) {
  const result = dashboardQuerySchema.safeParse(
    readQuery(request.nextUrl.searchParams),
  );

  if (!result.success) {
    const details: DashboardApiErrorDetail[] = result.error.issues.map(
      (issue) => ({
        field: issue.path.map(String).join(".") || "query",
        code: issue.code,
        message: issue.message,
      }),
    );
    const response: DashboardApiErrorResponse = {
      error: {
        code: "INVALID_QUERY",
        message: "Os parâmetros da consulta são inválidos.",
        details,
      },
    };

    return Response.json(response, { status: 400 });
  }

  try {
    const user = await requireUser();
    const tariffBrlPerKwh = await getEffectiveEnergyTariff(user.id);
    const data = await dashboardService.getDashboard(
      result.data,
      user.id,
      tariffBrlPerKwh,
    );
    const response: DashboardApiSuccessResponse = {
      data,
      meta: {
        period: result.data.period,
        compare: result.data.compare,
        mode: result.data.mode,
        generatedAt: new Date().toISOString(),
      },
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      const response: DashboardApiErrorResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Autenticação necessária.",
        },
      };

      return Response.json(response, { status: 401 });
    }

    const response: DashboardApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Não foi possível carregar os dados da dashboard.",
      },
    };

    return Response.json(response, { status: 500 });
  }
}
