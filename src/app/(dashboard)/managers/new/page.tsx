import { ManagerForm } from "../ManagerForm";
import { createManager } from "../actions";

export default function NewManagerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-100">Новый менеджер</h1>
      <ManagerForm action={createManager} />
    </div>
  );
}
