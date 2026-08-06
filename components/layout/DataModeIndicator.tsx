import { BadgeInfo } from "lucide-react";

import type { DashboardDataMode } from "@/lib/dashboard/types";

export type DataModeIndicatorContext =
  | "mode"
  | "settings"
  | "devices";

type DataModeIndicatorProps = {
  mode: DashboardDataMode;
  context: DataModeIndicatorContext;
};

export function resolveDataModeIndicatorContext(
  pathname: string,
): DataModeIndicatorContext {
  if (pathname === "/settings") {
    return "settings";
  }

  return pathname === "/devices" ? "devices" : "mode";
}

export function getDataModeIndicatorCopy(
  mode: DashboardDataMode,
  context: DataModeIndicatorContext = "mode",
) {
  if (context === "settings") {
    return {
      title: "Preferências locais",
      description: "Configurações salvas somente neste navegador.",
    };
  }

  if (context === "devices") {
    return {
      title: "Dispositivos da conta",
      description:
        "Cadastro persistente vinculado à sua conta e separado dos cenários demonstrativos.",
    };
  }

  return mode === "demo"
    ? {
        title: "Modo demonstração",
        description:
          "Cenários simulados, sem monitoramento em tempo real.",
      }
    : {
        title: "Minha residência",
        description:
          "Estimativas baseadas somente nos dispositivos vinculados à sua conta.",
      };
}

export function DataModeIndicator({
  mode,
  context,
}: DataModeIndicatorProps) {
  const copy = getDataModeIndicatorCopy(mode, context);

  return (
    <div className="m-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <BadgeInfo aria-hidden="true" className="size-4 text-emerald-300" />
        {copy.title}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {copy.description}
      </p>
    </div>
  );
}
