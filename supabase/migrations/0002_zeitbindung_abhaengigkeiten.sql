-- ============================================================
-- Pathfinder — Migration 0002: Zeitbindung & Abhängigkeiten
-- Ausführen im Supabase SQL Editor (einmalig, als Ganzes).
-- ============================================================

-- ------------------------------------------------------------
-- Zeitbindung: Schritte können optional an Datum + Uhrzeit
-- gebunden sein (z. B. Vorlesungstermin). Sie werden dann nur
-- im Vorlauffenster [Termin - lead_time_minutes, Termin] als
-- "nächster Schritt" vorgeschlagen. Beeinflusst NUR die
-- Vorschlagslogik, nicht "Braucht Klärung".
-- ------------------------------------------------------------
alter table public.steps
  add column scheduled_date     date,
  add column scheduled_time     time,
  add column lead_time_minutes  integer default 120;

-- ------------------------------------------------------------
-- Abhängigkeiten: n:m zwischen Schritten, auch über Ziel-Grenzen
-- hinweg. Ein Schritt ist erst "bereit", wenn alle Schritte,
-- von denen er abhängt, is_done = true haben.
-- ------------------------------------------------------------
create table public.step_dependencies (
  step_id            uuid not null references public.steps (id) on delete cascade,
  depends_on_step_id uuid not null references public.steps (id) on delete cascade,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at         timestamptz not null default now(),
  primary key (step_id, depends_on_step_id),
  constraint no_self_dependency check (step_id <> depends_on_step_id)
);

create index step_dependencies_depends_idx
  on public.step_dependencies (depends_on_step_id);

-- Zyklen verhindern (Sicherheitsnetz — die App prüft ebenfalls
-- und liefert die verständliche Fehlermeldung):
-- Verboten, wenn der Voraussetzungs-Schritt selbst direkt oder
-- indirekt vom abhängigen Schritt abhängt.
create or replace function public.prevent_dependency_cycle()
returns trigger
language plpgsql
as $$
begin
  if exists (
    with recursive upstream as (
      select sd.depends_on_step_id
      from public.step_dependencies sd
      where sd.step_id = new.depends_on_step_id
      union
      select sd.depends_on_step_id
      from public.step_dependencies sd
      join upstream u on sd.step_id = u.depends_on_step_id
    )
    select 1 from upstream where depends_on_step_id = new.step_id
  ) then
    raise exception 'Zyklische Abhaengigkeit: Schritt haengt bereits (indirekt) vom Voraussetzungs-Schritt ab';
  end if;
  return new;
end;
$$;

create trigger step_dependencies_no_cycle
  before insert or update on public.step_dependencies
  for each row execute function public.prevent_dependency_cycle();

-- RLS wie bei allen anderen Tabellen
alter table public.step_dependencies enable row level security;

create policy "own rows" on public.step_dependencies
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
