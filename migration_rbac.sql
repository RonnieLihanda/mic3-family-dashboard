-- Migration: Add Roles for RBAC

-- 1. Create the Enum Type for consistency
create type public.user_role as enum ('admin', 'member');

-- 2. Add 'role' column to profiles table
alter table public.profiles 
add column role public.user_role default 'member';

-- 3. Set your email as the specific admin (Replace with your actual email if different)
-- This logic assumes we trigger it or run it manually. 
-- For the user to run in SQL Editor:

update public.profiles
set role = 'admin'
where email = 'ronniewritepro@gmail.com'; 
-- ^^^ CHANGE THIS to your email if it differs!

-- 4. Enable RLS policy updates if needed (policies usually rely on auth.uid(), 
-- but we can add policies that check the 'role' column if we want strict DB enforcement.
-- For now, we will handle the "Smart UI" hiding in the frontend app.js).
