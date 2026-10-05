# 07. Tests et recette

Il n'y a pas de tests automatisés. La recette est manuelle, par scénarios, avec plusieurs comptes de test (un admin, un organisateur, deux reviewers, deux auteurs). Chaque scénario donne le résultat attendu ; la colonne "État" est à remplir lors de la recette finale (date, OK / KO, capture).

## Vérifications techniques à chaque étape

```bash
npm run build
```

```bash
npx eslint src
```

Le build doit passer et le lint ne doit signaler aucune erreur. Contrôle visuel à 375, 768 et 1280 px, en mode clair et sombre.

## Scénarios fonctionnels

| # | Scénario | Résultat attendu | État |
|---|---|---|---|
| F1 | Créer un compte, se connecter, se déconnecter | Profil créé avec le rôle `participant` | |
| F2 | Mot de passe oublié | E-mail reçu ; le lien ouvre l'écran "Nouveau mot de passe" | |
| F3 | Modifier son profil (nom, affiliation, expertise) | Enregistré, nom mis à jour dans l'en-tête | |
| F4 | Créer un événement | Créé en brouillon, ouvert directement, créateur organisateur | |
| F5 | Demander la publication, puis valider en admin | Notification à l'admin ; publié ; notification à l'organisateur | |
| F6 | Refuser une publication | Retour en brouillon, notification à l'organisateur | |
| F7 | Ajouter un reviewer par e-mail | Rôle reviewer, notification au reviewer | |
| F8 | Déposer un article | Visible par l'auteur, l'organisateur et les reviewers ; notification aux organisateurs | |
| F9 | Relire un article | Review visible par l'organisateur ; le bouton disparaît pour ce reviewer | |
| F10 | Demander une révision mineure | Auteur notifié, commentaires anonymes visibles, resoumission possible | |
| F11 | Accepter un 3e article d'un même auteur | Bouton désactivé ; refus de la base si appel direct | |
| F12 | Retirer son article en attente | Article supprimé | |
| F13 | Clore la phase scientifique | Dépôt, review, décision gelés ; invitations ouvertes | |
| F14 | Inviter les auteurs acceptés (en une fois) | Statut "Invité", notifications envoyées | |
| F15 | Déclarer un paiement, le refuser, le redéclarer, le valider | Statuts successifs corrects, notifications à chaque étape | |
| F16 | Après validation | Badge QR, accusé de paiement PDF ; certificat seulement à partir du premier jour | |
| F17 | Créer des salles, des sessions, placer les articles | Suggestion des reviewers préremplie ; un article dans une seule session | |
| F18 | Créer deux sessions qui se chevauchent dans la même salle | Avertissement dans le formulaire ; refus de la base | |
| F19 | Événement en ligne : lien de visio | Bouton "Rejoindre" pour les membres seulement | |
| F20 | Pointer à la main, annuler, scanner un badge | Compteurs mis à jour ; double scan signalé | |
| F21 | Démarrer, clôturer, archiver l'événement | Transitions dans l'ordre uniquement | |
| F22 | Statistiques de l'événement et de la plateforme | Chiffres cohérents avec les données | |

## Scénarios de sécurité (appels directs à l'API)

À exécuter dans la console du navigateur, connecté avec un compte **non administrateur**, après avoir exposé le client dans la console de développement (par exemple temporairement `window.sb = supabase` dans `lib/supabaseClient.js`, à retirer ensuite).

| # | Tentative | Résultat attendu |
|---|---|---|
| S1 | `sb.from('profiles').update({ role: 'admin' }).eq('id', monId)` | Erreur "Le rôle d'un compte ne peut être modifié que par un administrateur" |
| S2 | `sb.from('events').update({ status: 'published' }).eq('id', monBrouillon).select()` | Erreur "Changement de statut non autorisé" |
| S3 | `sb.from('events').insert({ ..., status: 'published' }).select()` | Événement créé mais en `draft` |
| S4 | `sb.from('submissions').insert({ ..., status: 'accepted' })` | Refus (policy : statut `submitted` imposé) |
| S5 | `sb.from('reviews').insert(...)` sur son propre article | Erreur "Tu ne peux pas relire ton propre article" |
| S6 | `sb.from('certificates').insert({ event_id, user_id: autreId })` | Refus RLS |
| S7 | `sb.from('payments').select()` | Liste vide |
| S8 | `sb.from('session_links').select()` sans être membre | Liste vide |
| S9 | `sb.rpc('decide_submission', ...)` sans être organisateur | Erreur "Seul un organisateur..." |
| S10 | `sb.from('sponsors').select()` sur un événement dont on n'est pas organisateur | Seulement les sponsors publiés |

## Requêtes de vérification de la base

```sql
-- seuls ces comptes sont administrateurs
select id, email, full_name from profiles where role = 'admin';
```

```sql
-- triggers de sécurité et de notification en place
select tgrelid::regclass, tgname from pg_trigger
where tgname like 'trg_guard%' or tgname like 'trg_notify%' or tgname = 'trg_check_session_room';
```

```sql
-- reviews en double (créées avant la migration 001)
select submission_id, reviewer_id, count(*) from reviews group by 1, 2 having count(*) > 1;
```

## Bugs trouvés et corrigés pendant la refonte

| Bug | Cause | Correction |
|---|---|---|
| Rejet d'un article en un clic, sans confirmation | appel direct à la décision | confirmation, avertissement "définitif" |
| Badge QR en chargement infini | jeton vide non géré | message d'erreur explicite |
| Validation admin silencieuse en cas d'échec | pas de contrôle du nombre de lignes modifiées | `writeError()` |
| Certificat téléchargeable avant l'événement | aucune condition | disponible à partir du premier jour |
| Reviews en double, auto-review | aucune contrainte | interface + trigger |
| "Dépôts par jour" vide | jours calculés en UTC (minuit à Alger tombe la veille) | jour local |
| Dates d'horodatage décalées d'un jour la nuit | découpe de la chaîne ISO en UTC | conversion en heure locale |
| Pastille de phase vide sur les cartes | colonne `phase` non demandée | ajoutée à la requête |
| Filtres d'articles hors cadre, compteurs invisibles | segments qui défilent dans une colonne étroite | segments qui passent à la ligne |
| Lien de visio lisible par tous | la RLS filtre des lignes, pas des colonnes | table `session_links` réservée aux membres |
