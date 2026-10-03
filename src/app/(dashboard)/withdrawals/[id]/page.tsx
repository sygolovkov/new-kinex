import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtRub, fmtUsdt } from "@/lib/fmt";
import { WithdrawalForm } from "../WithdrawalForm";
import { updateWithdrawal } from "../actions";

export default async function EditWithdrawalPage({
  params,
}: PageProps<"/withdrawals/[id]">) {
  const { id } = await params;
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id },
    include: { manager: true },
  });
  if (!withdrawal) notFound();

  const boundUpdate = updateWithdrawal.bind(null, id);
  const managerLabel =
    withdrawal.manager.name ||
    withdrawal.manager.telegramUsername ||
    withdrawal.manager.telegramId;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-100">Заявка на вывод: {managerLabel}</h1>
      <WithdrawalForm
        managerLabel={managerLabel}
        amountDisplay={`${fmtRub(withdrawal.amount)} RUB`}
        usdtAmountDisplay={
          withdrawal.usdtAmount !== null ? `${fmtUsdt(withdrawal.usdtAmount)} USDT` : "—"
        }
        usdtRateDisplay={withdrawal.usdtRate !== null ? fmtRub(withdrawal.usdtRate) : "—"}
        status={withdrawal.status}
        action={boundUpdate}
      />
    </div>
  );
}
