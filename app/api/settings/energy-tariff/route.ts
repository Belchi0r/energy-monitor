import { NextResponse } from "next/server";

import {
  ENERGY_TARIFF_COOKIE_MAX_AGE_SECONDS,
  ENERGY_TARIFF_COOKIE_NAME,
  energyTariffRequestSchema,
  formatEnergyTariffInput,
  serializeEnergyTariff,
} from "@/lib/energy/energy-tariff";
import {
  AuthenticationRequiredError,
  requireUser,
} from "@/lib/supabase/require-user";

type ErrorResponse = {
  success: false;
  message: string;
};

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch (error) {
    const response: ErrorResponse = {
      success: false,
      message:
        error instanceof AuthenticationRequiredError
          ? "Autenticação necessária."
          : "Não foi possível salvar a tarifa agora.",
    };

    return Response.json(response, {
      status: error instanceof AuthenticationRequiredError ? 401 : 500,
    });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    const response: ErrorResponse = {
      success: false,
      message: "Não foi possível ler a tarifa informada.",
    };

    return Response.json(response, { status: 400 });
  }

  const result = energyTariffRequestSchema.safeParse(body);

  if (!result.success) {
    const response: ErrorResponse = {
      success: false,
      message:
        result.error.issues[0]?.message ??
        "Informe uma tarifa válida.",
    };

    return Response.json(response, { status: 400 });
  }

  const response = NextResponse.json(
    {
      success: true,
      tariff: result.data.tariff,
      tariffInput: formatEnergyTariffInput(result.data.tariff),
      message: "Tarifa salva neste navegador.",
    },
    { status: 200 },
  );

  response.cookies.set({
    name: ENERGY_TARIFF_COOKIE_NAME,
    value: serializeEnergyTariff(result.data.tariff),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ENERGY_TARIFF_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
