import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Cliente com a chave de serviço: ignora as regras de acesso.
 * Usar só em rotas de servidor que já validaram quem está chamando
 * (entrada de e-mail, leitura de documentos pelo agente).
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
