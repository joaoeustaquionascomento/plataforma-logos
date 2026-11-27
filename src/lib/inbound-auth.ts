import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Confere o segredo compartilhado enviado pelos serviços de entrada (e-mail, Drive, WhatsApp). */
export function isAuthorizedInbound(request: Request): boolean {
  const given = request.headers.get("x-logos-secret") ?? "";
  const expected = env.inboundSecret();
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
