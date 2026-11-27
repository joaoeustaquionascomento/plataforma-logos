-- Plataforma Logos: esquema inicial (semanas 1 e 2)
-- Cada cliente só enxerga os próprios dados. A equipe Logos enxerga tudo.


-- Clientes da Logos (empresas atendidas)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  inbox_slug text not null unique,           -- usado no e-mail de entrada: <slug>@<domínio>
  drive_folder_id text,                       -- pasta do Google Drive do cliente
  whatsapp_number text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Usuários (equipe Logos e usuários dos clientes)
create type public.user_role as enum ('logos_admin', 'logos_analyst', 'client');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'client',
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint client_users_have_client check (role <> 'client' or client_id is not null)
);

-- Planos da Logos (internos)
create table public.plans (
  code text primary key,
  name text not null,
  monthly_price numeric(10,2) not null,
  cp_limit integer not null,
  cr_limit integer not null,
  account_limit integer not null,
  cnpj_limit integer not null default 1,
  sort_order integer not null
);

insert into public.plans (code, name, monthly_price, cp_limit, cr_limit, account_limit, sort_order) values
  ('basic_service', 'Basic Service',  950.00,   25,   25, 1, 1),
  ('basic_1',       'Basic 1',       1250.00,   50,   50, 2, 2),
  ('basic_2',       'Basic 2',       1470.00,  100,  100, 2, 3),
  ('work_1',        'Work 1',        2249.00,  200,  200, 2, 4),
  ('work_2',        'Work 2',        2949.00,  400,  400, 2, 5),
  ('flow_1',        'Flow 1',        3449.00,  500,  500, 2, 6),
  ('flow_2',        'Flow 2',        5249.00, 1000, 1000, 2, 7);

-- Contrato do cliente (interno: nunca visível para o cliente)
create table public.client_contracts (
  client_id uuid primary key references public.clients(id) on delete cascade,
  plan_code text not null references public.plans(code),
  started_on date not null default current_date,
  notes text
);

-- Contas bancárias do cliente
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  bank_name text not null,
  agency text,
  account_number text,
  label text,
  created_at timestamptz not null default now()
);

-- Documentos recebidos (boletos, notas, recibos, comprovantes)
create type public.document_source as enum ('portal', 'email', 'drive', 'whatsapp', 'analyst');
create type public.document_status as enum ('received', 'extracting', 'extracted', 'needs_review', 'processed', 'discarded', 'error');
create type public.document_kind as enum ('boleto', 'nota_fiscal', 'recibo', 'comprovante', 'fatura', 'outro');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  source public.document_source not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer,
  sender text,                                 -- e-mail ou telefone de quem enviou
  note text,                                   -- observação do cliente
  status public.document_status not null default 'received',
  kind public.document_kind,
  extracted jsonb,                             -- campos lidos pelo agente
  extraction_error text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index documents_client_status on public.documents (client_id, status, created_at desc);

-- Contas a pagar
create type public.payable_status as enum (
  'to_schedule',               -- cadastrada, falta agendar no banco
  'awaiting_bank_approval',    -- agendada pelo analista, aguardando o cliente aprovar no banco
  'scheduled',                 -- aprovada no banco, aguardando o débito
  'paid',                      -- comprovante recebido
  'confirmed',                 -- débito conferido no extrato
  'canceled'
);

create table public.payables (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  receipt_document_id uuid references public.documents(id) on delete set null,
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  supplier_name text not null,
  supplier_document text,                      -- CPF ou CNPJ do favorecido
  description text,
  category text,
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  barcode text,                                -- linha digitável ou código de barras
  pix_key text,
  status public.payable_status not null default 'to_schedule',
  scheduled_at timestamptz,
  paid_at timestamptz,
  confirmed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payables_client_due on public.payables (client_id, due_date);
create index payables_status on public.payables (status, due_date);

-- Contas a receber (lançamentos de CR, para o medidor; emissão de NF e boletos vem na fase 2)
create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  customer_name text not null,
  customer_document text,
  description text,
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  received_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Perguntas da Logos para o cliente
create table public.client_questions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  question text not null,
  answer text,
  asked_by uuid references auth.users(id),
  answered_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

-- Histórico de eventos (auditoria simples)
create table public.events (
  id bigint generated always as identity primary key,
  client_id uuid references public.clients(id) on delete cascade,
  actor uuid references auth.users(id),
  entity text not null,
  entity_id uuid,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Funções de apoio para as regras de acesso
create or replace function public.is_logos_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('logos_admin', 'logos_analyst')
  );
$$;

create or replace function public.my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- Atualiza updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger payables_touch before update on public.payables
  for each row execute function public.touch_updated_at();

-- Cria o perfil quando um usuário é criado
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, client_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'client'),
    nullif(new.raw_app_meta_data->>'client_id', '')::uuid
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Regras de acesso (RLS)
alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.client_contracts enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.documents enable row level security;
alter table public.payables enable row level security;
alter table public.receivables enable row level security;
alter table public.client_questions enable row level security;
alter table public.events enable row level security;

-- Equipe Logos: acesso total
create policy staff_all on public.clients for all using (public.is_logos_staff()) with check (public.is_logos_staff());
create policy staff_all on public.profiles for all using (public.is_logos_staff()) with check (public.is_logos_staff());
create policy staff_all on public.plans for all using (public.is_logos_staff()) with check (public.is_logos_staff());
create policy staff_all on public.client_contracts for all using (public.is_logos_staff()) with check (public.is_logos_staff());
create policy staff_all on public.bank_accounts for all using (public.is_logos_staff()) with check (public.is_logos_staff());
create policy staff_all on public.documents for all using (public.is_logos_staff()) with check (public.is_logos_staff());
create policy staff_all on public.payables for all using (public.is_logos_staff()) with check (public.is_logos_staff());
create policy staff_all on public.receivables for all using (public.is_logos_staff()) with check (public.is_logos_staff());
create policy staff_all on public.client_questions for all using (public.is_logos_staff()) with check (public.is_logos_staff());
create policy staff_all on public.events for all using (public.is_logos_staff()) with check (public.is_logos_staff());

-- Cliente: só os próprios dados. Planos, contratos e eventos não aparecem para o cliente.
create policy client_read on public.clients for select using (id = public.my_client_id());
create policy own_profile on public.profiles for select using (id = auth.uid());
create policy client_read on public.bank_accounts for select using (client_id = public.my_client_id());
create policy client_read on public.documents for select using (client_id = public.my_client_id());
create policy client_upload on public.documents for insert
  with check (client_id = public.my_client_id() and source = 'portal' and uploaded_by = auth.uid());
create policy client_read on public.payables for select using (client_id = public.my_client_id());
create policy client_read on public.receivables for select using (client_id = public.my_client_id());
create policy client_read on public.client_questions for select using (client_id = public.my_client_id());
create policy client_answer on public.client_questions for update
  using (client_id = public.my_client_id()) with check (client_id = public.my_client_id());

-- Arquivos: bucket privado "documents", caminho <client_id>/<arquivo>
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;

create policy staff_files on storage.objects for all
  using (bucket_id = 'documents' and public.is_logos_staff())
  with check (bucket_id = 'documents' and public.is_logos_staff());
create policy client_files_read on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = public.my_client_id()::text);
create policy client_files_upload on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = public.my_client_id()::text);

-- Medidor de volume (interno): lançamentos do mês por cliente, ao lado do plano.
-- Função em vez de view para garantir que só a equipe Logos consiga consultar.
create or replace function public.volume_this_month()
returns table (
  client_id uuid, client_name text, plan_code text,
  cp_limit integer, cr_limit integer, account_limit integer,
  cp_count bigint, cr_count bigint, account_count bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_logos_staff() then
    raise exception 'acesso restrito à equipe Logos';
  end if;
  return query
  select
    c.id, c.name, cc.plan_code, p.cp_limit, p.cr_limit, p.account_limit,
    (select count(*) from public.payables x
       where x.client_id = c.id and x.status <> 'canceled'
         and date_trunc('month', x.created_at) = date_trunc('month', now())),
    (select count(*) from public.receivables r
       where r.client_id = c.id
         and date_trunc('month', r.created_at) = date_trunc('month', now())),
    (select count(*) from public.bank_accounts b where b.client_id = c.id)
  from public.clients c
  left join public.client_contracts cc on cc.client_id = c.id
  left join public.plans p on p.code = cc.plan_code
  where c.active
  order by c.name;
end $$;
revoke all on function public.volume_this_month() from public, anon;
grant execute on function public.volume_this_month() to authenticated;
