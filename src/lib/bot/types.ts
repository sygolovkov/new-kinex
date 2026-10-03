import type { Context, SessionFlavor } from "grammy";
import type { Manager } from "@/generated/prisma/client";
import type { SessionData } from "@/lib/bot/session";

export type MyContext = Context &
  SessionFlavor<SessionData> & {
    manager?: Manager;
  };
