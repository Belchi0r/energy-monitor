import {
  malformedJsonResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/app/api/devices/route-helpers";
import { deviceService } from "@/lib/devices/application";
import {
  deviceIdSchema,
  deviceInputSchema,
} from "@/lib/schemas/device-schema";
import type { DeviceApiSuccessResponse } from "@/lib/types/device-api";

type DeviceRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function parseDeviceId(context: DeviceRouteContext) {
  return deviceIdSchema.safeParse((await context.params).id);
}

export async function PATCH(
  request: Request,
  context: DeviceRouteContext,
) {
  const idResult = await parseDeviceId(context);

  if (!idResult.success) {
    return validationErrorResponse(
      idResult.error,
      "INVALID_DEVICE_ID",
      "O identificador do dispositivo é inválido.",
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return malformedJsonResponse();
  }

  const bodyResult = deviceInputSchema.safeParse(body);

  if (!bodyResult.success) {
    return validationErrorResponse(
      bodyResult.error,
      "INVALID_BODY",
      "Os dados do dispositivo são inválidos.",
    );
  }

  try {
    const response: DeviceApiSuccessResponse = {
      data: await deviceService.updateDevice(
        idResult.data,
        bodyResult.data,
      ),
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: DeviceRouteContext,
) {
  const idResult = await parseDeviceId(context);

  if (!idResult.success) {
    return validationErrorResponse(
      idResult.error,
      "INVALID_DEVICE_ID",
      "O identificador do dispositivo é inválido.",
    );
  }

  try {
    await deviceService.deleteDevice(idResult.data);

    return new Response(null, { status: 204 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
