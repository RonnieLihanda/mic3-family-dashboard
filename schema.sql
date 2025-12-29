-- Enable Row Level Security (RLS) is standard for Supabase
-- 1. Create a table to store the monthly budget snapshots
create table public.budget_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date_key text not null,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date_key)
);

-- 2. Enable RLS
alter table public.budget_logs enable row level security;

-- 3. Create Policy: Users can only see their own data
create policy "Users can view their own budget logs"
on public.budget_logs for select
using (auth.uid() = user_id);

-- 4. Create Policy: Users can insert/update their own data
create policy "Users can insert their own budget logs"
on public.budget_logs for insert
with check (auth.uid() = user_id);

create policy "Users can update their own budget logs"
on public.budget_logs for update
using (auth.uid() = user_id);

-- 5. Optional: Profiles table if you want to store extra user info
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
on public.profiles for select
using ( true );

create policy "Users can insert their own profile"
on public.profiles for insert
with check ( auth.uid() = id );

create policy "Users can update own profile"
on public.profiles for update
using ( auth.uid() = id );

-- 6. Trigger to create profile on signup (Optional but recommended)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
