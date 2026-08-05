import {
  malformedJsonResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/app/api/devices/route-helpers";
import { requireUser } from "@/lib/supabase/require-user";
import { deviceService } from "@/lib/devices/application";
import { deviceInputSchema } from "@/lib/schemas/device-schema";
import type {
  DeviceApiSuccessResponse,
  DeviceListApiSuccessResponse,
} from "@/lib/types/device-api";

export async function GET() {
  try {
    const user = await requireUser();
    const response: DeviceListApiSuccessResponse = {
      data: await deviceService.listDevices(user.id),
    };

    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let userId: string;

  try {
    userId = (await requireUser()).id;
  } catch (error) {
    return serviceErrorResponse(error);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return malformedJsonResponse();
  }

  const result = deviceInputSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(
      result.error,
      "INVALID_BODY",
      "Os dados do dispositivo são inválidos.",
    );
  }

  try {
    const response: DeviceApiSuccessResponse = {
      data: await deviceService.createDevice(userId, result.data),
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
