-- CreateEnum
CREATE TYPE "ProfileChangeField" AS ENUM ('email', 'usdt_wallet');

-- CreateEnum
CREATE TYPE "ProfileChangeStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'IN_PROCESS', 'SUCCESS', 'ERROR', 'SERVER_ERROR');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "admin_telegram_username" TEXT NOT NULL DEFAULT '',
    "bot_token" TEXT NOT NULL DEFAULT '',
    "payment_system_commission" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "last_usdt_rate" DECIMAL(10,4),
    "last_usdt_rate_at" TIMESTAMP(3),
    "withdrawal_limit" DECIMAL(12,2) NOT NULL DEFAULT 400000.00,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managers" (
    "id" TEXT NOT NULL,
    "telegram_id" TEXT NOT NULL DEFAULT '',
    "telegram_username" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "usdt_wallet" TEXT NOT NULL DEFAULT '',
    "commission" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_change_requests" (
    "id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "field" "ProfileChangeField" NOT NULL,
    "new_value" TEXT NOT NULL,
    "status" "ProfileChangeStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "manager_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "order_id" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "transaction_id" TEXT NOT NULL DEFAULT '',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "is_settled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "usdt_amount" DECIMAL(12,2),
    "usdt_rate" DECIMAL(10,4),
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_dialog_states" (
    "chat_id" TEXT NOT NULL,
    "state" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_dialog_states_pkey" PRIMARY KEY ("chat_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "profile_change_requests_manager_id_idx" ON "profile_change_requests"("manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_is_settled_idx" ON "payments"("is_settled");

-- CreateIndex
CREATE INDEX "payments_manager_id_idx" ON "payments"("manager_id");

-- CreateIndex
CREATE INDEX "withdrawals_manager_id_idx" ON "withdrawals"("manager_id");

-- AddForeignKey
ALTER TABLE "profile_change_requests" ADD CONSTRAINT "profile_change_requests_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
