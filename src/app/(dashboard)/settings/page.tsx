import { getSettings } from "@/lib/settings";
import { fmtRub } from "@/lib/fmt";
import { formatMskDateTime } from "@/lib/time";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-100">Настройки</h1>

      {settings.lastUsdtRate && (
        <p className="text-sm text-neutral-500">
          Текущий закэшированный курс: {fmtRub(settings.lastUsdtRate)} RUB
          {settings.lastUsdtRateAt ? ` (на ${formatMskDateTime(settings.lastUsdtRateAt)})` : ""}
        </p>
      )}

      <SettingsForm
        settings={{
          adminTelegramUsername: settings.adminTelegramUsername,
          botToken: settings.botToken,
          paymentSystemCommission: settings.paymentSystemCommission.toString(),
          withdrawalLimit: settings.withdrawalLimit.toString(),
        }}
      />
    </div>
  );
}
