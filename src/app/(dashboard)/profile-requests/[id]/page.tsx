import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileRequestForm } from "../ProfileRequestForm";
import { updateProfileRequest } from "../actions";

export default async function EditProfileRequestPage({
  params,
}: PageProps<"/profile-requests/[id]">) {
  const { id } = await params;
  const request = await prisma.profileChangeRequest.findUnique({
    where: { id },
    include: { manager: true },
  });
  if (!request) notFound();

  const boundUpdate = updateProfileRequest.bind(null, id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-100">
        Заявка на изменение профиля: {request.manager.name || request.manager.telegramUsername}
      </h1>
      <ProfileRequestForm request={request} manager={request.manager} action={boundUpdate} />
    </div>
  );
}
