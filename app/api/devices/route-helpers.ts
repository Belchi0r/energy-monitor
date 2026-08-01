import type { ZodError } from "zod";

import {
  DeviceNameConflictError,
  DeviceNotFoundError,
} from "@/lib/services/device-service";
import type {
  DeviceApiErrorDetail,
  DeviceApiErrorResponse,
} from "@/lib/types/device-api";

export function validationErrorResponse(
  error: ZodError,
  code: "INVALID_BODY" | "INVALID_DEVICE_ID",
  message: string,
) {
  const details: DeviceApiErrorDetail[] = error.issues.map((issue) => ({
    field: issue.path.map(String).join(".") || "body",
    code: issue.code,
    message: issue.message,
  }));
  const response: DeviceApiErrorResponse = {
    error: {
      code,
      message,
      details,
    },
  };

  return Response.json(response, { status: 400 });
}

export function malformedJsonResponse() {
  const response: DeviceApiErrorResponse = {
    error: {
      code: "INVALID_BODY",
      message: "O corpo da requisição deve conter JSON válido.",
    },
  };

  return Response.json(response, { status: 400 });
}

export function serviceErrorResponse(error: unknown) {
  if (error instanceof DeviceNotFoundError) {
    const response: DeviceApiErrorResponse = {
      error: {
        code: "DEVICE_NOT_FOUND",
        message: error.message,
      },
    };

    return Response.json(response, { status: 404 });
  }

  if (error instanceof DeviceNameConflictError) {
    const response: DeviceApiErrorResponse = {
      error: {
        code: "DEVICE_NAME_CONFLICT",
        message: error.message,
      },
    };

    return Response.json(response, { status: 409 });
  }

  const response: DeviceApiErrorResponse = {
    error: {
      code: "INTERNAL_ERROR",
      message: "Não foi possível concluir a operação com o dispositivo.",
    },
  };

  return Response.json(response, { status: 500 });
}
