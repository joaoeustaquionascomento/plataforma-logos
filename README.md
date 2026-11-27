# Plataforma Logos

Portal do cliente e mesa do analista da LógosBPO.

- **Portal do cliente** (`/portal`): envio de documentos, pagamentos com status e comprovantes, perguntas da Logos.
- **Mesa do analista** (`/logos`): fila do dia, conferência dos documentos lidos pelo agente, clientes, volume x plano (interno).
- **Entrada de documentos**: portal, e-mail (`<cliente>@docs.logosbpo.com.br`, via `workers/email-inbound`), Google Drive e WhatsApp (próximas etapas).
- **Agente de leitura** (`src/lib/agents/document-reader.ts`): lê boletos, notas e recibos com a API do Claude e preenche os campos para o analista conferir.

## Tecnologia

Next.js 16, Supabase (banco, login e arquivos), API do Claude, Tailwind. Hospedagem prevista no Cloudflare.

## Como rodar

1. Copie `.env.example` para `.env.local` e preencha as chaves.
2. Aplique `supabase/migrations/0001_inicial.sql` no projeto Supabase.
3. `npm install` e `npm run dev`.

O primeiro usuário da equipe Logos precisa ter `role = 'logos_admin'` na tabela `profiles`.

## Regras de acesso

- Cada cliente só vê os próprios dados (regras RLS no banco).
- Planos, contratos e o medidor de volume são só da equipe Logos.
- Clientes aprovam pagamentos direto no banco; a plataforma só acompanha o status.
