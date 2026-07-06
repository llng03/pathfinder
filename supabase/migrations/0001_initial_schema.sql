-- ============================================================
-- Pathfinder — Initiales Datenbankschema
-- Ausführen im Supabase SQL Editor (einmalig, als Ganzes).
-- ============================================================

-- ------------------------------------------------------------
-- Helper: updated_at automatisch pflegen
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Ideas — Ideenpool ("Parkplatz" vor der Zielsetzung)
-- ------------------------------------------------------------
create table public.ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  note        text,
  -- Freitext-Reflexion: "Warum jetzt (nicht)?" / Relevanz / Zeitaufwand
  reflection  text,
  status      text not null default 'open'
              check (status in ('open', 'converted', 'discarded')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger ideas_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Goals — aktive Ziele
-- ------------------------------------------------------------
create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Herkunft, falls das Ziel aus einer Idee "befördert" wurde
  idea_id      uuid references public.ideas (id) on delete set null,
  title        text not null,
  description  text,
  target_date  date,
  status       text not null default 'active'
               check (status in ('active', 'completed', 'archived')),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Steps — unbegrenzt tief verschachtelbare Teilschritte
--
-- * parent_step_id = null  =>  Root-Schritt des Ziels
-- * goal_id ist auf JEDER Ebene gesetzt (denormalisiert) — so lädt
--   ein einziges  SELECT * FROM steps WHERE goal_id = ?  den ganzen
--   Baum, und die "Braucht Klärung"-Logik auf Zielebene braucht
--   keine Rekursion.
-- * origin: vorbereitet für spätere KI-Zerlegung (v1 nur 'manual')
-- ------------------------------------------------------------
create table public.steps (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id         uuid not null references public.goals (id) on delete cascade,
  parent_step_id  uuid references public.steps (id) on delete cascade,
  title           text not null,
  description     text,
  is_done         boolean not null default false,
  done_at         timestamptz,
  sort_order      integer not null default 0,
  origin          text not null default 'manual'
                  check (origin in ('manual', 'ai')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint steps_no_self_parent check (parent_step_id <> id)
);

create index steps_goal_idx   on public.steps (goal_id);
create index steps_parent_idx on public.steps (parent_step_id);

create trigger steps_updated_at
  before update on public.steps
  for each row execute function public.set_updated_at();

-- Konsistenz: Elternschritt muss zum selben Ziel gehören
create or replace function public.enforce_step_parent_goal()
returns trigger
language plpgsql
as $$
begin
  if new.parent_step_id is not null then
    if not exists (
      select 1 from public.steps p
      where p.id = new.parent_step_id
        and p.goal_id = new.goal_id
    ) then
      raise exception 'Elternschritt gehoert nicht zum selben Ziel';
    end if;
  end if;
  return new;
end;
$$;

create trigger steps_parent_goal
  before insert or update on public.steps
  for each row execute function public.enforce_step_parent_goal();

-- ------------------------------------------------------------
-- Sprints — feste 2-Wochen-Zeiträume
-- total_tasks / done_tasks: Snapshot der Zusammenfassung,
-- wird beim Sprintabschluss von der App befüllt.
-- ------------------------------------------------------------
create table public.sprints (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date   date not null,
  end_date     date not null,
  status       text not null default 'active'
               check (status in ('active', 'completed')),
  completed_at timestamptz,
  total_tasks  integer,
  done_tasks   integer,
  created_at   timestamptz not null default now(),
  constraint sprints_valid_range check (end_date > start_date)
);

-- Es kann immer nur EINEN aktiven Sprint geben
create unique index one_active_sprint_per_user
  on public.sprints (user_id)
  where status = 'active';

-- ------------------------------------------------------------
-- SprintTasks — eingeplante Schritte (beliebige Baumtiefe!)
--
-- * step_id referenziert einen Step auf beliebiger Ebene
-- * is_today_focus + focus_date: Fokus gilt nur, wenn
--   focus_date = heutiges Datum (kein automatisches Verfallen
--   nötig — die App prüft das Datum beim Anzeigen)
-- ------------------------------------------------------------
create table public.sprint_tasks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sprint_id      uuid not null references public.sprints (id) on delete cascade,
  step_id        uuid not null references public.steps (id) on delete cascade,
  is_today_focus boolean not null default false,
  focus_date     date,
  created_at     timestamptz not null default now(),
  unique (sprint_id, step_id)
);

create index sprint_tasks_sprint_idx on public.sprint_tasks (sprint_id);

-- ------------------------------------------------------------
-- Habits — Gewohnheiten (getrennt von Zielen, kein Enddatum)
-- ------------------------------------------------------------
create table public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);

-- ------------------------------------------------------------
-- HabitLogs — ein Eintrag pro Gewohnheit und Tag
-- (Zeile vorhanden = an diesem Tag erledigt)
-- ------------------------------------------------------------
create table public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id   uuid not null references public.habits (id) on delete cascade,
  log_date   date not null default current_date,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index habit_logs_habit_idx on public.habit_logs (habit_id, log_date);

-- ------------------------------------------------------------
-- ActivityDays — Basis für den App-weiten Streak
-- (Zeile vorhanden = an diesem Tag aktiv gewesen;
--  Streaks werden daraus berechnet, Heatmap aus habit_logs)
-- ------------------------------------------------------------
create table public.activity_days (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_date date not null default current_date,
  primary key (user_id, activity_date)
);

-- ------------------------------------------------------------
-- Badges — verdiente Erfolge
-- badge_key z. B. 'first_sprint_completed', 'streak_7', ...
-- ------------------------------------------------------------
create table public.badges (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

-- ============================================================
-- "Braucht Klärung"-Logik
--
-- Definition: Ein Ziel/Schritt braucht Klärung, wenn er offen ist
-- UND in seinem gesamten Unterbaum (inkl. seiner selbst bei Steps)
-- kein einziger offener, kindloser Schritt existiert — also
-- nirgendwo eine konkrete nächste Handlung erkennbar ist.
-- ============================================================

-- Offene Blatt-Schritte = konkrete nächste Handlungen
create view public.open_leaf_steps
with (security_invoker = true) as
select s.*
from public.steps s
where s.is_done = false
  and not exists (
    select 1 from public.steps c where c.parent_step_id = s.id
  );

-- Ziele, die Klärung brauchen (kein offener Blatt-Schritt im Ziel —
-- dank denormalisiertem goal_id ohne Rekursion möglich)
create view public.goals_needing_clarification
with (security_invoker = true) as
select g.*
from public.goals g
where g.status = 'active'
  and not exists (
    select 1 from public.open_leaf_steps l where l.goal_id = g.id
  );

-- Rekursive Prüfung auf Schritt-Ebene (für gezielte Abfragen;
-- die App berechnet das client-seitig, wenn der Baum ohnehin
-- geladen ist — diese Funktion dient als serverseitige Referenz)
create or replace function public.step_has_open_leaf(root_id uuid)
returns boolean
language sql
stable
as $$
  with recursive subtree as (
    select id, is_done from public.steps where id = root_id
    union all
    select s.id, s.is_done
    from public.steps s
    join subtree t on s.parent_step_id = t.id
  )
  select exists (
    select 1
    from subtree st
    where st.is_done = false
      and not exists (
        select 1 from public.steps c where c.parent_step_id = st.id
      )
  );
$$;

-- ============================================================
-- Row Level Security — jede:r sieht nur die eigenen Daten
-- (Single-User-App, aber sauber abgesichert)
-- ============================================================
alter table public.ideas         enable row level security;
alter table public.goals         enable row level security;
alter table public.steps         enable row level security;
alter table public.sprints       enable row level security;
alter table public.sprint_tasks  enable row level security;
alter table public.habits        enable row level security;
alter table public.habit_logs    enable row level security;
alter table public.activity_days enable row level security;
alter table public.badges        enable row level security;

create policy "own rows" on public.ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.steps
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.sprints
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.sprint_tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.habit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.activity_days
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.badges
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
