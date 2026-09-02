create extension if not exists pgcrypto;

create type public.arena_asset as enum ('BTC', 'ETH');
create type public.arena_access_type as enum ('PRIVATE', 'PUBLIC');
create type public.arena_status as enum ('JOINING', 'LIVE', 'COMPLETED', 'CANCELLED');
create type public.round_status as enum ('SCHEDULED', 'TRADING', 'LOCKED', 'SETTLED', 'MISSED');
create type public.side as enum ('UP', 'DOWN');
create type public.pick_status as enum ('PENDING', 'CONFIRMED', 'REJECTED', 'MISSED');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_challenges (
  wallet_address text primary key,
  nonce text not null,
  message text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.arenas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_profile_id uuid not null references public.profiles(id),
  asset public.arena_asset not null,
  access_type public.arena_access_type not null,
  invite_code text not null,
  status public.arena_status not null default 'JOINING',
  round_count integer not null,
  contract_quantity integer not null default 10,
  maximum_participants integer not null,
  round_interval_minutes integer not null,
  entry_fee numeric(20, 8) not null,
  start_at timestamptz not null,
  description text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.arena_participants (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  wallet_address text not null,
  joined_at timestamptz not null default now(),
  total_score numeric(20, 8) not null default 0,
  correct_rounds integer not null default 0,
  missed_rounds integer not null default 0,
  total_testnet_pnl numeric(20, 8) not null default 0,
  final_rank integer
);

create table public.arena_rounds (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  round_number integer not null,
  dreamdex_market_id text,
  market_symbol text,
  opening_price numeric(38, 18),
  closing_price numeric(38, 18),
  opens_at timestamptz not null,
  locks_at timestamptz not null,
  settles_at timestamptz,
  winning_side public.side,
  status public.round_status not null default 'SCHEDULED'
);

create table public.arena_picks (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  round_id uuid not null references public.arena_rounds(id) on delete cascade,
  participant_id uuid not null references public.arena_participants(id) on delete cascade,
  wallet_address text not null,
  selected_side public.side not null,
  order_transaction_hash text,
  average_fill_price numeric(38, 18),
  filled_quantity numeric(38, 18),
  actual_cost numeric(38, 18),
  settlement_value numeric(38, 18),
  round_score numeric(20, 8),
  actual_testnet_pnl numeric(38, 18),
  submitted_at timestamptz,
  verified_at timestamptz,
  status public.pick_status not null default 'PENDING'
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.arena_participants(id) on delete cascade,
  arena_id uuid not null references public.arenas(id) on delete cascade,
  type text not null,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now(),
  is_visible boolean not null default true
);

create unique index profiles_wallet_address_idx on public.profiles(wallet_address);
create unique index auth_sessions_token_hash_idx on public.auth_sessions(token_hash);
create unique index arenas_invite_code_idx on public.arenas(invite_code);
create index arenas_status_asset_idx on public.arenas(status, asset);
create index arenas_start_at_idx on public.arenas(start_at);
create unique index arena_participants_arena_profile_idx on public.arena_participants(arena_id, profile_id);
create index arena_participants_arena_score_idx on public.arena_participants(arena_id, total_score);
create unique index arena_rounds_arena_number_idx on public.arena_rounds(arena_id, round_number);
create index arena_rounds_market_id_idx on public.arena_rounds(dreamdex_market_id);
create unique index arena_picks_round_participant_idx on public.arena_picks(round_id, participant_id);
create unique index arena_picks_transaction_hash_idx on public.arena_picks(order_transaction_hash);
create index arena_picks_wallet_idx on public.arena_picks(wallet_address);
create unique index achievements_participant_arena_type_idx on public.achievements(participant_id, arena_id, type);
