-- 001_securite.sql
-- Corrige les failles trouvées par 000_diagnostic.sql. À lancer UNE fois dans le SQL Editor.
-- Tout est dans une transaction : en cas d'erreur, rien n'est appliqué.
--
-- Failles corrigées :
--  A. profiles  : n'importe quel inscrit pouvait se créer un profil avec role = 'admin' (policy INSERT sans contrôle du rôle).
--  B. events    : un organisateur pouvait passer lui-même son événement en 'published' (UPDATE sans WITH CHECK),
--                 ou le créer directement publié (INSERT), ou changer organizer_id.
--                 Une 2e policy DELETE laissait l'organisateur supprimer un événement publié.
--  C. reviews   : un reviewer pouvait relire son propre article et envoyer plusieurs reviews sur le même article.
--  D. certificates : tout utilisateur connecté pouvait créer un certificat pour n'importe qui.
--  E. payments (ancienne table inutilisée) : lisible par tous les utilisateurs connectés.
--  F. is_event_organizer / has_event_role : SECURITY DEFINER sans search_path fixé (risque de détournement).
--     is_event_organizer ignorait les co-organisateurs (rôle 'organizer' dans event_participants) et l'admin.

begin;

-- ============================================================================
-- F. Fonctions d'aide : search_path fixé, co-organisateurs et admin reconnus
-- ============================================================================
create or replace function public.is_event_organizer(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from events where id = p_event_id and organizer_id = auth.uid())
      or exists (select 1 from event_participants
                 where event_id = p_event_id and user_id = auth.uid() and role_in_event = 'organizer')
      or exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_event_role(p_event_id uuid, p_role user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from event_participants
    where event_id = p_event_id and user_id = auth.uid() and role_in_event = p_role
  );
$$;

-- ============================================================================
-- A. profiles : le rôle ne peut être choisi ni changé depuis l'application
-- ============================================================================
-- auth.role() vaut 'anon' ou 'authenticated' pour une requête du site ;
-- il est NULL dans le SQL Editor, ce qui te laisse nommer un admin à la main.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.role := 'participant';
    elsif new.role is distinct from old.role and not is_platform_admin() then
      raise exception 'Le rôle d''un compte ne peut être modifié que par un administrateur';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

-- ============================================================================
-- B. events : statut et organisateur protégés
-- ============================================================================
-- Transitions permises à un organisateur (l'admin peut tout faire) :
--   draft -> pending_approval (demander la publication)
--   pending_approval -> draft (retirer la demande)
--   published -> ongoing -> closed -> archived (cycle de vie)
create or replace function public.guard_event_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') or is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.phase := 'scientific';
    return new;
  end if;

  if new.organizer_id is distinct from old.organizer_id then
    raise exception 'Seul un administrateur peut changer l''organisateur d''un événement';
  end if;

  if new.status is distinct from old.status and not (
       (old.status = 'draft' and new.status = 'pending_approval')
    or (old.status = 'pending_approval' and new.status = 'draft')
    or (old.status = 'published' and new.status = 'ongoing')
    or (old.status = 'ongoing' and new.status = 'closed')
    or (old.status = 'closed' and new.status = 'archived')
  ) then
    raise exception 'Changement de statut non autorisé (% vers %) : la publication est validée par un administrateur', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_event_changes on public.events;
create trigger trg_guard_event_changes
  before insert or update on public.events
  for each row execute function public.guard_event_changes();

-- Une seule policy UPDATE claire (les deux anciennes faisaient la même chose sans WITH CHECK)
drop policy if exists "Only admins can update event status to published" on public.events;
drop policy if exists "Organizers can update their own events" on public.events;
drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update
  using (is_event_organizer(id))
  with check (is_event_organizer(id));

-- Suppression : brouillon par son organisateur, ou admin (policy delete_events déjà en place).
-- La policy ci-dessous permettait en plus de supprimer un événement publié : on la retire.
drop policy if exists "Organizers can delete their own events" on public.events;

-- Lecture : l'admin voit aussi les brouillons (pour la modération)
drop policy if exists "Published events are visible to all" on public.events;
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select
  using (status <> 'draft' or organizer_id = auth.uid() or is_event_organizer(id));

-- ============================================================================
-- C. reviews : pas de review de son propre article, une seule review par article
-- ============================================================================
create or replace function public.guard_review_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from submissions where id = new.submission_id and author_id = new.reviewer_id) then
    raise exception 'Tu ne peux pas relire ton propre article';
  end if;
  if exists (select 1 from reviews where submission_id = new.submission_id and reviewer_id = new.reviewer_id) then
    raise exception 'Tu as déjà envoyé une review pour cet article';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_review_insert on public.reviews;
create trigger trg_guard_review_insert
  before insert on public.reviews
  for each row execute function public.guard_review_insert();

-- ============================================================================
-- D. certificates : seulement pour soi, et seulement si l'inscription est validée
-- ============================================================================
drop policy if exists "Authenticated users can create certificates" on public.certificates;
drop policy if exists "Certificates are visible to authenticated users" on public.certificates;
drop policy if exists certificates_insert_own on public.certificates;
drop policy if exists certificates_select on public.certificates;

create policy certificates_insert_own on public.certificates
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from event_participants
      where event_id = certificates.event_id and user_id = auth.uid() and registration_status = 'validated'
    )
  );

create policy certificates_select on public.certificates
  for select
  using (user_id = auth.uid() or is_event_organizer(event_id));

-- ============================================================================
-- E. payments (ancien paiement simulé, plus utilisé) : on ferme l'accès
-- ============================================================================
drop policy if exists "Authenticated users can create their own payments" on public.payments;
drop policy if exists "Payments are visible to authenticated users" on public.payments;
drop policy if exists organizers_can_view_event_payments on public.payments;
-- RLS reste activée sans policy : plus personne ne lit ni n'écrit cette table depuis le site.

commit;

-- ============================================================================
-- Vérifications (à lancer après, une par une)
-- ============================================================================
-- 1. Les admins actuels (vérifie qu'il n'y a que toi) :
--    select id, email, full_name from profiles where role = 'admin';
-- 2. Les nouvelles policies :
--    select tablename, policyname, cmd from pg_policies
--    where tablename in ('events','certificates','payments') order by 1, 3;
-- 3. Les nouveaux triggers :
--    select tgrelid::regclass, tgname from pg_trigger
--    where tgname in ('trg_guard_profile_role','trg_guard_event_changes','trg_guard_review_insert');
