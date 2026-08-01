import { SettingsPreferences } from "@/components/dashboard/SettingsPreferences";
import { PageHeader } from "@/components/layout/PageHeader";
import { getEffectiveEnergyTariff } from "@/lib/energy/energy-tariff.server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const tariffBrlPerKwh = await getEffectiveEnergyTariff();

  return (
    <>
      <PageHeader
        eyebrow="Preferências da experiência"
        title="Configurações"
        description="Visualize como tarifa, período inicial e comparação poderão ser personalizados futuramente."
        demoDescription="As preferências desta tela são apenas locais e não são salvas no banco de dados."
        showBackLink
      />

      <div className="mt-8">
        <SettingsPreferences
          initialTariff={tariffBrlPerKwh}
        />
      </div>
    </>
  );
}
