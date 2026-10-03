import { prisma } from "@/lib/prisma";
import { ensureAdminUser } from "@/lib/bootstrapAdmin";

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error(
      "Укажите ADMIN_USERNAME и ADMIN_PASSWORD в переменных окружения."
    );
    process.exit(1);
  }

  const admin = await ensureAdminUser(username, password);
  console.log(`Администратор "${admin.username}" создан/обновлён.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
