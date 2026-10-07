-- Norma Alvarás — migração inicial (Fase 0)
create extension if not exists pgcrypto;

create type license_type as enum ('lf','bombeiros','outro');
create type validity_mode as enum ('dated','indefinite','exempt','unknown');
create type license_flag as enum ('pending','urgent','reissue');
create type user_role as enum ('norma_admin','norma_staff','client_manager','client_reader');

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  cnpj_root text,
  drive_folder_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  label text not null,
  cnpj text,
  municipality text,
  created_at timestamptz not null default now(),
  unique (company_id, label)
);

create table licenses (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  type license_type not null,
  issuing_body text,
  number text,
  issued_on date,
  valid_until date,
  validity_mode validity_mode not null default 'unknown',
  documentary_status text,
  owner_name text,
  owner_email text,
  notes text,
  flag license_flag,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (validity_mode <> 'dated' or valid_until is not null)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references licenses(id) on delete cascade,
  drive_file_id text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (drive_file_id)
);

create table extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  model text not null,
  result jsonb not null,
  status text not null default 'pending_review'
    check (status in ('pending_review','accepted','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null,
  company_id uuid references companies(id),
  active boolean not null default true,
  check (role in ('norma_admin','norma_staff') or company_id is not null)
);

create table app_settings (
  key text primary key,
  value jsonb not null
);

create table alerts_sent (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references licenses(id) on delete cascade,
  kind text not null,
  reference_date date not null,
  channel text not null default 'email',
  recipient text not null,
  provider_message_id text,
  created_at timestamptz not null default now(),
  unique (license_id, kind, reference_date, channel, recipient)
);

create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid references auth.users(id),
  action text not null,
  entity text,
  entity_id uuid,
  company_id uuid,
  ip inet,
  user_agent text,
  details jsonb
);

create table license_history (
  id bigint generated always as identity primary key,
  license_id uuid not null references licenses(id) on delete cascade,
  at timestamptz not null default now(),
  changed_by uuid,
  operation text not null,
  old_values jsonb,
  new_values jsonb
);

-- Índices
create index licenses_valid_until_idx on licenses (valid_until);
create index licenses_unit_id_idx on licenses (unit_id);
create index documents_license_id_idx on documents (license_id);
create index audit_log_company_at_idx on audit_log (company_id, at);
create index license_history_license_idx on license_history (license_id, at);

-- updated_at
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger licenses_set_updated_at before update on licenses
  for each row execute function set_updated_at();

-- Histórico de alterações (valores antes/depois)
create function log_license_history() returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into license_history (license_id, changed_by, operation, new_values)
    values (new.id, auth.uid(), 'insert', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    if to_jsonb(new) - 'updated_at' is distinct from to_jsonb(old) - 'updated_at' then
      insert into license_history (license_id, changed_by, operation, old_values, new_values)
      values (new.id, auth.uid(), 'update', to_jsonb(old), to_jsonb(new));
    end if;
  end if;
  return new;
end $$;

create trigger licenses_history after insert or update on licenses
  for each row execute function log_license_history();

-- View com dias e status calculados (o status nunca é coluna).
-- Cortes lidos de app_settings.due_thresholds; padrão 30/60 se ausente.
create view licenses_with_status with (security_invoker = true) as
with cfg as (
  select
    coalesce((select (value->>'due_30')::int from app_settings where key = 'due_thresholds'), 30) as due_30,
    coalesce((select (value->>'due_60')::int from app_settings where key = 'due_thresholds'), 60) as due_60
),
base as (
  select
    l.*,
    u.company_id,
    u.label as unit_label,
    u.cnpj as unit_cnpj,
    u.municipality,
    c.name as company_name,
    (l.valid_until - (now() at time zone 'America/Sao_Paulo')::date) as days_to_expire
  from licenses l
  join units u on u.id = l.unit_id
  join companies c on c.id = u.company_id
)
select
  b.*,
  case
    when b.validity_mode in ('indefinite','exempt') then 'no_term'
    when b.validity_mode = 'unknown' or b.valid_until is null then 'pending'
    when b.days_to_expire < 0 then 'expired'
    when b.days_to_expire <= cfg.due_30 then 'due_30'
    when b.days_to_expire <= cfg.due_60 then 'due_60'
    else 'valid'
  end as status
from base b cross join cfg;

-- RLS ligado em todas as tabelas; as políticas por papel chegam na Fase 2 (F2-01).
-- Até lá, sem política: acesso apenas via service role (servidor).
alter table companies enable row level security;
alter table units enable row level security;
alter table licenses enable row level security;
alter table documents enable row level security;
alter table extractions enable row level security;
alter table profiles enable row level security;
alter table app_settings enable row level security;
alter table alerts_sent enable row level security;
alter table audit_log enable row level security;
alter table license_history enable row level security;
