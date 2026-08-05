import { DevicesWorkspace } from "@/components/dashboard/DevicesWorkspace";
import { deviceService } from "@/lib/devices/application";
import { requireUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const user = await requireUser();
  const devices = await deviceService.listDevices(user.id);

  return <DevicesWorkspace initialDevices={devices} />;
}
