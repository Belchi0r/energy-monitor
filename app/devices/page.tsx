import { DevicesWorkspace } from "@/components/dashboard/DevicesWorkspace";
import { deviceService } from "@/lib/devices/application";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const devices = await deviceService.listDevices();

  return <DevicesWorkspace initialDevices={devices} />;
}
