import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "../PaymentForm";
import { updatePayment } from "../actions";

export default async function EditPaymentPage({
  params,
}: PageProps<"/payments/[id]">) {
  const { id } = await params;
  const [payment, managers] = await Promise.all([
    prisma.payment.findUnique({ where: { id } }),
    prisma.manager.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  if (!payment) notFound();

  const boundUpdate = updatePayment.bind(null, id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-100">
        Платёж: {payment.orderId}
      </h1>
      <PaymentForm payment={payment} managers={managers} action={boundUpdate} />
    </div>
  );
}
