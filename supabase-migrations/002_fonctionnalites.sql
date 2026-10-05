-- 002_fonctionnalites.sql
-- Ouvre les fonctionnalités qui manquaient au site. À lancer UNE fois dans le SQL Editor, après 001_securite.sql.
-- Tout est dans une transaction : en cas d'erreur, rien n'est appliqué.
--
--  1. Profil      : chacun peut modifier son nom, son affiliation, son pays et son expertise
--                   (l'expertise servira au matching reviewer-article). Le rôle reste protégé (trigger de 001).
--  2. Salles      : CRUD par l'organisateur, lecture publique quand l'événement est publié.
--  3. Sessions    : détection des conflits de salle ; liens de visioconférence (mode en ligne / hybride)
--                   dans une table à part, lisible seulement par les membres de l'événement.
--  4. Articles    : l'auteur peut retirer son article tant qu'il est en attente et que la phase est ouverte.
--  5. Notifications : créées automatiquement par la base (triggers), lues et marquées lues par leur destinataire.

begin;

-- ============================================================================
-- 1. Profil
-- ============================================================================
alter table public.profiles add column if not exists expertise text;

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================================
-- 2. Salles
-- ============================================================================
drop policy if exists rooms_select on public.rooms;
drop policy if exists rooms_insert on public.rooms;
drop policy if exists rooms_update on public.rooms;
drop policy if exists rooms_delete on public.rooms;

create policy rooms_select on public.rooms
  for select
  using (
    is_event_organizer(event_id)
    or exists (select 1 from events e where e.id = rooms.event_id and e.status not in ('draft', 'pending_approval'))
  );
create policy rooms_insert on public.rooms for insert with check (is_event_organizer(event_id));
create policy rooms_update on public.rooms for update using (is_event_organizer(event_id)) with check (is_event_organizer(event_id));
create policy rooms_delete on public.rooms for delete using (is_event_organizer(event_id));

-- ============================================================================
-- 3. Sessions : liens de visio et conflits de salle
-- ============================================================================
-- Le lien n'est PAS une colonne de sessions : les sessions d'un événement publié sont lisibles par tous,
-- et la RLS filtre des lignes, pas des colonnes. Une table séparée permet de réserver le lien aux membres.
create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_event_organizer(p_event_id) or exists (
    select 1 from event_participants
    where event_id = p_event_id and user_id = auth.uid()
      and (role_in_event in ('organizer', 'reviewer') or registration_status = 'validated')
  );
$$;

create table if not exists public.session_links (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  url text not null check (url ~* '^https?://'),
  updated_at timestamptz not null default now()
);
alter table public.session_links enable row level security;

drop policy if exists session_links_select on public.session_links;
drop policy if exists session_links_write on public.session_links;
create policy session_links_select on public.session_links
  for select
  using (is_event_member((select event_id from sessions where id = session_links.session_id)));
create policy session_links_write on public.session_links
  for all
  using (is_event_organizer((select event_id from sessions where id = session_links.session_id)))
  with check (is_event_organizer((select event_id from sessions where id = session_links.session_id)));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_time_order') then
    alter table public.sessions
      add constraint sessions_time_order check (start_time is null or end_time is null or end_time > start_time);
  end if;
end $$;

-- Refuse : une salle d'un autre événement, ou deux sessions qui se chevauchent dans la même salle.
create or replace function public.check_session_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room record;
  v_clash record;
begin
  if new.room_id is null then
    return new;
  end if;

  select id, name, event_id into v_room from rooms where id = new.room_id;
  if v_room.id is null or v_room.event_id <> new.event_id then
    raise exception 'Cette salle n''appartient pas à l''événement';
  end if;

  if new.start_time is not null and new.end_time is not null then
    select s.title, s.start_time, s.end_time into v_clash
    from sessions s
    where s.room_id = new.room_id
      and s.id <> new.id
      and s.start_time is not null and s.end_time is not null
      and s.start_time < new.end_time
      and new.start_time < s.end_time
    limit 1;

    if found then
      raise exception 'Conflit de salle : « % » occupe déjà la salle « % » sur ce créneau', v_clash.title, v_room.name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_session_room on public.sessions;
create trigger trg_check_session_room
  before insert or update of room_id, start_time, end_time on public.sessions
  for each row execute function public.check_session_room();

-- ============================================================================
-- 4. Articles : retrait par l'auteur
-- ============================================================================
drop policy if exists submissions_delete_own on public.submissions;
create policy submissions_delete_own on public.submissions
  for delete
  using (author_id = auth.uid() and status = 'submitted' and event_in_scientific_phase(event_id));

-- ============================================================================
-- 5. Notifications
-- ============================================================================
drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;

create policy notifications_select_own on public.notifications for select using (recipient_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete using (recipient_id = auth.uid());
-- Pas de policy INSERT : seules les fonctions ci-dessous (SECURITY DEFINER) créent des notifications.

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, read_at);

create or replace function public.notify(p_recipient uuid, p_event uuid, p_type text, p_title text, p_message text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into notifications (recipient_id, event_id, type, title, message)
  select p_recipient, p_event, p_type, p_title, p_message
  where p_recipient is not null and p_recipient is distinct from auth.uid();
$$;

-- tous les organisateurs d'un événement (créateur + co-organisateurs)
create or replace function public.notify_organizers(p_event uuid, p_type text, p_title text, p_message text)
returns void
language sql
security definer
set search_path = public
as $$
  select notify(u.id, p_event, p_type, p_title, p_message)
  from (
    select organizer_id as id from events where id = p_event
    union
    select user_id from event_participants where event_id = p_event and role_in_event = 'organizer'
  ) u;
$$;

-- a. Décision sur un article -> l'auteur
create or replace function public.trg_notify_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_msg text;
begin
  select s.author_id, s.title, s.event_id, e.title as event_title into v_sub
  from submissions s join events e on e.id = s.event_id
  where s.id = new.submission_id;

  v_msg := case new.status
    when 'accepted' then 'Ton article est accepté. Tu recevras une invitation à t''inscrire à la clôture de la phase scientifique.'
    when 'rejected' then 'Ton article n''a pas été retenu.'
    else 'Une révision est demandée. Consulte les commentaires des reviewers et resoumets ton article.'
  end;

  perform notify(v_sub.author_id, v_sub.event_id, 'decision', format('Décision sur « %s »', v_sub.title), v_msg);
  return new;
end;
$$;

drop trigger if exists trg_notify_decision on public.decisions;
create trigger trg_notify_decision after insert on public.decisions
  for each row execute function public.trg_notify_decision();

-- b. Nouvel article -> les organisateurs
create or replace function public.trg_notify_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform notify_organizers(new.event_id, 'submission', 'Nouvel article déposé', format('« %s »', new.title));
  return new;
end;
$$;

drop trigger if exists trg_notify_submission on public.submissions;
create trigger trg_notify_submission after insert on public.submissions
  for each row execute function public.trg_notify_submission();

-- c. Membres : invitation, ajout comme reviewer, paiement déclaré, validé ou refusé
create or replace function public.trg_notify_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text;
  v_name text;
begin
  select title into v_event from events where id = new.event_id;

  if tg_op = 'INSERT' then
    if new.role_in_event = 'participant' and new.registration_status = 'invited' then
      perform notify(new.user_id, new.event_id, 'invitation', format('Invitation à « %s »', v_event),
        'Tu es invité à t''inscrire. Règle les frais puis déclare la référence de ton bordereau.');
    elsif new.role_in_event = 'reviewer' then
      perform notify(new.user_id, new.event_id, 'role', format('Reviewer de « %s »', v_event),
        'Tu peux maintenant relire les articles soumis à cet événement.');
    end if;
    return new;
  end if;

  if new.registration_status is distinct from old.registration_status then
    if new.registration_status = 'payment_submitted' then
      select full_name into v_name from profiles where id = new.user_id;
      perform notify_organizers(new.event_id, 'payment', 'Paiement à vérifier', format('%s a déclaré son paiement pour « %s ».', v_name, v_event));
    elsif new.registration_status = 'validated' then
      perform notify(new.user_id, new.event_id, 'registration', format('Inscription validée à « %s »', v_event),
        'Ton badge, ton accusé de paiement et ton certificat sont dans la fiche de l''événement.');
    elsif old.registration_status = 'payment_submitted' and new.registration_status = 'invited' then
      perform notify(new.user_id, new.event_id, 'payment', format('Paiement refusé pour « %s »', v_event),
        'L''organisateur n''a pas pu vérifier ton bordereau. Vérifie la référence et déclare-la à nouveau.');
    end if;
  end if;

  if new.role_in_event is distinct from old.role_in_event and new.role_in_event = 'organizer' then
    perform notify(new.user_id, new.event_id, 'role', format('Organisateur de « %s »', v_event),
      'Tu peux maintenant gérer cet événement.');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_participant on public.event_participants;
create trigger trg_notify_participant after insert or update on public.event_participants
  for each row execute function public.trg_notify_participant();

-- d. Publication : demande -> admins ; validation ou refus -> organisateurs
create or replace function public.trg_notify_event_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'pending_approval' then
    perform notify(p.id, new.id, 'moderation', 'Demande de publication', format('« %s » attend ta validation.', new.title))
    from profiles p where p.role = 'admin';
  elsif old.status = 'pending_approval' and new.status = 'published' then
    perform notify_organizers(new.id, 'moderation', 'Événement publié', format('« %s » est maintenant visible par tous.', new.title));
  elsif old.status = 'pending_approval' and new.status = 'draft' then
    perform notify_organizers(new.id, 'moderation', 'Publication refusée', format('« %s » est revenu en brouillon. Corrige-le puis redemande la publication.', new.title));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_event_status on public.events;
create trigger trg_notify_event_status after update of status on public.events
  for each row execute function public.trg_notify_event_status();

commit;

-- Vérification (après) :
--   select tgname from pg_trigger where tgname like 'trg_notify%' or tgname = 'trg_check_session_room';
--   select tablename, policyname, cmd from pg_policies where tablename in ('rooms','notifications','profiles') order by 1, 3;
