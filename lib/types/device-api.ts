import type { DeviceView } from "@/lib/devices/types";

export type DeviceApiErrorDetail = {
  field: string;
  code: string;
  message: string;
};

export type DeviceApiErrorResponse = {
  error: {
    code:
      | "UNAUTHORIZED"
      | "INVALID_BODY"
      | "INVALID_DEVICE_ID"
      | "DEVICE_NOT_FOUND"
      | "DEVICE_NAME_CONFLICT"
      | "INTERNAL_ERROR";
    message: string;
    details?: readonly DeviceApiErrorDetail[];
  };
};

export type DeviceListApiSuccessResponse = {
  data: readonly DeviceView[];
};

export type DeviceApiSuccessResponse = {
  data: DeviceView;
};
