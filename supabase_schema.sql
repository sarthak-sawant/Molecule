-- Molecule: Chemistry Q&A App Database Schema
-- Run this in the Supabase SQL Editor to set up your tables, triggers, and Row Level Security (RLS).

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
-- Stores user information. Linked to auth.users.
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  points integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint username_length check (char_length(username) >= 3)
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select 
  using (true);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Trigger: Automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url, points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'chemist_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || new.id::text),
    0
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. GROUPS TABLE (Sub-molecules/Subreddits)
-- Chemistry sub-communities (e.g. Organic, Inorganic)
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint group_name_length check (char_length(name) >= 3)
);

-- Enable RLS for Groups
alter table public.groups enable row level security;

-- Groups Policies
create policy "Groups are viewable by everyone" 
  on public.groups for select 
  using (true);

create policy "Authenticated users can create a group" 
  on public.groups for insert 
  with check (auth.role() = 'authenticated');


-- 3. QUESTIONS TABLE
-- Chemistry questions uploaded by students
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  group_id uuid references public.groups(id) on delete cascade, -- can be null if general
  author_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Questions
alter table public.questions enable row level security;

-- Questions Policies
create policy "Questions are viewable by everyone" 
  on public.questions for select 
  using (true);

create policy "Authenticated users can ask a question" 
  on public.questions for insert 
  with check (auth.uid() = author_id);

create policy "Users can delete their own questions" 
  on public.questions for delete 
  using (auth.uid() = author_id);


-- 4. ANSWERS TABLE
-- Answers posted by students to chemistry questions
create table public.answers (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  content text not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  is_accepted boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Answers
alter table public.answers enable row level security;

-- Answers Policies
create policy "Answers are viewable by everyone" 
  on public.answers for select 
  using (true);

create policy "Authenticated users can answer a question" 
  on public.answers for insert 
  with check (auth.uid() = author_id);

create policy "Users can update/delete their own answers" 
  on public.answers for update 
  using (auth.uid() = author_id);

create policy "Users can delete their own answers" 
  on public.answers for delete 
  using (auth.uid() = author_id);


-- 5. UPVOTES TABLE
-- Stores answer upvotes to calculate points
create table public.upvotes (
  id uuid default gen_random_uuid() primary key,
  answer_id uuid references public.answers(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (answer_id, user_id)
);

-- Enable RLS for Upvotes
alter table public.upvotes enable row level security;

-- Upvotes Policies
create policy "Upvotes are viewable by everyone" 
  on public.upvotes for select 
  using (true);

create policy "Authenticated users can upvote an answer" 
  on public.upvotes for insert 
  with check (auth.uid() = user_id);

create policy "Users can remove their upvote" 
  on public.upvotes for delete 
  using (auth.uid() = user_id);


-- 6. KNOWLEDGE BASE TABLE
-- Stores textbook & notes PDF metadata
create table public.knowledge_base (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text not null, -- Organic, Inorganic, Physical, High School, College, etc.
  pdf_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Knowledge Base
alter table public.knowledge_base enable row level security;

-- Knowledge Base Policies
create policy "Knowledge base is viewable by everyone" 
  on public.knowledge_base for select 
  using (true);

-- Only database admins can modify the knowledge base table directly
create policy "Only admin can write/update/delete knowledge base"
  on public.knowledge_base for all
  using (false);


-- 7. SECURE TRIGGERS & FUNCTIONS FOR POINTS (GAMIFICATION)
-- Award 10 points for an upvote, deduct 10 points when upvote is removed.
-- Award 50 points when an answer is marked as accepted/helpful.

-- A. Trigger for Upvotes (Points allocation)
create or replace function public.handle_upvote_change()
returns trigger as $$
declare
  target_author_id uuid;
begin
  if (TG_OP = 'INSERT') then
    -- Find the author of the answer
    select author_id into target_author_id from public.answers where id = new.answer_id;
    -- Add 10 points to the author
    update public.profiles 
    set points = points + 10 
    where id = target_author_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    select author_id into target_author_id from public.answers where id = old.answer_id;
    update public.profiles 
    set points = points - 10 
    where id = target_author_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_upvote_changed
  after insert or delete on public.upvotes
  for each row execute procedure public.handle_upvote_change();

-- B. Function and RPC for Question Owner to accept/helpful mark an answer
-- This is secure because we check if the user calling the RPC is indeed the owner of the question.
create or replace function public.accept_answer(answer_id_param uuid)
returns void as $$
declare
  question_owner_id uuid;
  answer_author_id uuid;
  current_accepted_status boolean;
begin
  -- Get question details & author of the answer
  select q.author_id, a.author_id, a.is_accepted 
  into question_owner_id, answer_author_id, current_accepted_status
  from public.answers a
  join public.questions q on q.id = a.question_id
  where a.id = answer_id_param;

  -- Security check: ONLY the question owner can mark an answer as accepted
  if (auth.uid() = question_owner_id) then
    if (current_accepted_status = false) then
      -- Mark as accepted
      update public.answers set is_accepted = true where id = answer_id_param;
      -- Reward 50 points to the answerer
      update public.profiles set points = points + 50 where id = answer_author_id;
    else
      -- Un-mark as accepted (toggle)
      update public.answers set is_accepted = false where id = answer_id_param;
      -- Deduct 50 points from the answerer
      update public.profiles set points = points - 50 where id = answer_author_id;
    end if;
  else
    raise exception 'Unauthorized: Only the creator of the question can mark this answer as helpful.';
  end if;
end;
$$ language plpgsql security definer;


-- 8. INITIAL SEED DATA FOR KNOWLEDGE BASE (OPTIONAL but helpful)
insert into public.knowledge_base (title, description, category, pdf_url) values
('OpenStax Chemistry 2e Textbook', 'Full-length introductory chemistry college textbook from OpenStax. Complete guide.', 'Textbook', 'https://openstax.org/details/books/chemistry-2e'),
('Organic Chemistry Basics', 'Comprehensive study guide on organic chemical reactions, hybridization, and IUPAC nomenclature.', 'Organic Chemistry', 'https://chem.libretexts.org/@api/deki/pages/10041/pdf/Organic%2520Chemistry%2520Basics.pdf'),
('Inorganic Coordination Compounds', 'Introduction to d-block chemistry, ligand field theory, and structural isomerism.', 'Inorganic Chemistry', 'https://chem.libretexts.org/@api/deki/pages/10103/pdf/Inorganic%2520Chemistry.pdf'),
('Thermodynamics & Kinetics Note Sheet', 'Equations, state functions, laws of thermodynamics, and chemical kinetics formulas.', 'Physical Chemistry', 'https://chem.libretexts.org/@api/deki/pages/10200/pdf/Physical%2520Chemistry.pdf'),
('General Chemistry I Lecture Notes', 'Complete introductory notes covering atomic structures, stoichiometry, gas laws, and bonding.', 'High School & Intro', 'https://chem.libretexts.org/@api/deki/pages/9850/pdf/General%2520Chemistry.pdf')
on conflict do nothing;
