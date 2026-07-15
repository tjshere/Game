-- Stonewake database schema.
-- One-time setup: paste this whole file into the Supabase SQL editor and run it.
-- Also required in the dashboard (Authentication -> Sign In / Providers -> Email):
--   * disable "Confirm email" (accounts use synthetic addresses)
--   * set minimum password length to 8

-- The global username registry. Uniqueness of username_lower is what makes
-- duplicate names impossible; a signup race loses with a constraint error.
create table public.profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    username text not null
        check (username ~ '^[A-Za-z0-9_ ]{1,12}$' and username = btrim(username)),
    username_lower text not null unique,
    created_at timestamptz not null default now()
);

-- One save per account. data holds the game's versioned { v, state } JSON.
create table public.saves (
    user_id uuid primary key references auth.users (id) on delete cascade,
    data jsonb not null,
    updated_at timestamptz not null default now()
);

-- Signup sends the display username in metadata; this trigger materializes the
-- profile row, so clients never write profiles directly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (user_id, username, username_lower)
    values (new.id, new.raw_user_meta_data ->> 'username', lower(new.raw_user_meta_data ->> 'username'));
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger saves_touch_updated_at
    before update on public.saves
    for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

-- Usernames are public (login-screen availability checks read them while
-- logged out); rows are only ever created by the signup trigger.
create policy "profiles are readable by everyone" on public.profiles
    for select using (true);

create policy "players read their own save" on public.saves
    for select using (auth.uid() = user_id);
create policy "players create their own save" on public.saves
    for insert with check (auth.uid() = user_id);
create policy "players update their own save" on public.saves
    for update using (auth.uid() = user_id);
create policy "players delete their own save" on public.saves
    for delete using (auth.uid() = user_id);
