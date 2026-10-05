# 03. Sécurité

## Modèle de menace

Le site utilise la **clé anon** de Supabase, publique par nature : elle est dans le JavaScript envoyé au navigateur. N'importe quel utilisateur connecté peut donc appeler l'API directement (console du navigateur, `curl`, Postman) en contournant entièrement l'interface. Conséquence :

> Cacher un bouton ne protège rien. Toute règle d'autorisation doit être vérifiée **par la base**.

La clé `service_role` (qui contourne la RLS) n'apparaît jamais dans le front. Elle ne sert qu'aux scripts Python d'IA, exécutés en local.

## Trois mécanismes

### 1. Row Level Security (RLS)

Chaque table a la RLS activée. Sans policy, une table est **fermée** : aucune lecture ni écriture. Chaque policy est une condition SQL évaluée pour chaque ligne :

- `USING` : quelles lignes l'utilisateur peut voir, modifier ou supprimer ;
- `WITH CHECK` : à quoi doit ressembler la ligne après insertion ou modification.

Fonctions d'aide (toutes `SECURITY DEFINER` avec `search_path` fixé) :

| Fonction | Vrai si l'utilisateur courant... |
|---|---|
| `is_platform_admin()` | a `profiles.role = 'admin'` |
| `is_event_organizer(event)` | est le créateur, un co-organisateur (rôle `organizer` dans `event_participants`) ou l'admin |
| `has_event_role(event, role)` | a ce rôle dans l'événement |
| `is_event_member(event)` | est organisateur, reviewer, ou inscrit validé |
| `event_in_scientific_phase(event)` | l'événement est en phase scientifique |

### 2. Fonctions RPC pour les écritures sensibles

Les opérations qui touchent plusieurs tables ou qui doivent respecter un enchaînement d'états ne sont **pas** permises en écriture directe : elles passent par des fonctions `SECURITY DEFINER` qui vérifient elles-mêmes les droits, puis font tout ou rien.

| Fonction | Qui | Ce qu'elle garantit |
|---|---|---|
| `decide_submission` | organisateur | statut + ligne dans `decisions` en une transaction ; seulement en phase scientifique ; seulement si l'article est en attente |
| `resubmit_submission` | auteur | seulement si une révision est demandée et la phase ouverte |
| `invite_member` | organisateur | participants invités seulement après la phase scientifique ; refuse les doublons |
| `declare_payment` | invité | uniquement pour soi, montant recopié depuis l'événement (pas fourni par le client) |
| `validate_registration` / `reject_payment` | organisateur | uniquement depuis l'état "paiement déclaré" |
| `assign_submission_to_session` | organisateur | article accepté, phase organisationnelle, session du même événement |
| `get_my_badge` | inscrit validé | crée et renvoie son propre jeton |
| `check_in_member` / `check_in_by_token` | organisateur | la personne doit avoir une inscription validée ; pas de double pointage |

### 3. Triggers

| Trigger | Effet |
|---|---|
| `trg_add_event_creator_as_organizer` | le créateur d'un événement devient organisateur |
| `trg_max_accepted_per_author` | refuse un 3e article accepté pour un même auteur et un même événement |
| `trg_check_review_session` | la session suggérée doit appartenir à l'événement de l'article |
| `trg_guard_profile_role` | un rôle ne peut être ni choisi à l'inscription ni changé, sauf par un admin |
| `trg_guard_event_changes` | création forcée en brouillon ; seules les transitions de statut prévues sont permises ; l'organisateur ne peut pas changer `organizer_id` |
| `trg_guard_review_insert` | pas de review de son propre article, pas deux reviews du même article |
| `trg_check_session_room` | salle du même événement, pas de chevauchement dans une salle |
| `trg_notify_*` | crée les notifications (décision, invitation, paiement, publication...) |

## Synthèse des droits

| Action | Admin | Organisateur | Reviewer | Auteur / participant | Public connecté |
|---|---|---|---|---|---|
| Voir un événement publié | oui | oui | oui | oui | oui |
| Voir un brouillon | oui | le sien | non | non | non |
| Publier un événement | oui | demande seulement | non | non | non |
| Déposer un article | oui | oui | oui | oui (phase scientifique) | oui |
| Voir les articles d'un événement | tous | tous | tous | les siens + acceptés publiés | acceptés publiés |
| Relire | via rôle | via rôle | oui, pas les siens, une fois | non | non |
| Voir les reviews | toutes | de son événement | les siennes | les siennes après décision | non |
| Décider | oui | oui | non | non | non |
| Valider un paiement | oui | oui | non | non | non |
| Voir les paiements | tous | de son événement | non | le sien | non |
| Lien de visio | oui | oui | oui | si inscription validée | non |

## Audit et corrections (octobre 2026)

L'audit a comparé ce que le front envoie avec ce que les policies autorisent réellement (requête `000_diagnostic.sql`). Failles trouvées puis corrigées par `001_securite.sql` :

| # | Faille | Exploitation | Correction |
|---|---|---|---|
| 1 | La policy `INSERT` de `profiles` ne contrôlait que `auth.uid() = id`, pas le rôle | S'inscrire via l'API avec `role: 'admin'` et devenir administrateur | Trigger `guard_profile_role` qui force `participant` à l'inscription et bloque tout changement de rôle hors admin |
| 2 | Les policies `UPDATE` de `events` n'avaient pas de `WITH CHECK` | Un organisateur passe lui-même son événement en `published`, ou le crée déjà publié | Trigger `guard_event_changes` (transitions autorisées) + policy unique avec `WITH CHECK` |
| 3 | Une seconde policy `DELETE` sur `events` permettait de tout supprimer à l'organisateur | Supprimer un événement publié avec tous ses inscrits | Policy supprimée : l'organisateur ne supprime que ses brouillons |
| 4 | `certificates` : insertion permise à tout compte connecté, pour n'importe qui | Créer des traces de certificats au nom d'autres personnes | Insertion réservée à soi-même et aux inscrits validés |
| 5 | Ancienne table `payments` lisible par tous | Fuite de montants et d'identifiants | Policies supprimées (table fermée) |
| 6 | Reviews : ni auto-review ni doublon empêchés | Un reviewer note son propre article, ou plusieurs fois le même (moyenne faussée) | Trigger `guard_review_insert` |
| 7 | `is_event_organizer` et `has_event_role` sans `search_path` fixé | Détournement possible d'une fonction `SECURITY DEFINER` par un objet homonyme | `SET search_path = public` |

Le front a aussi été corrigé là où il suppose des droits : le rôle n'est plus envoyé à l'inscription, les liens de sponsors sont limités à `http(s)` à l'affichage, les écritures vérifient le nombre de lignes modifiées.

## Risques résiduels connus

| Risque | Gravité | Piste |
|---|---|---|
| `profiles` et `event_participants` lisibles par tout compte connecté, e-mails compris | moyenne | Vue publique sans e-mail, ou policy restreinte aux membres d'un même événement |
| Un auteur peut lire `reviewer_id` sur les reviews de son article après la décision (l'interface affiche "Reviewer 1", mais l'API renvoie l'identifiant) | moyenne (anonymat) | Exposer les reviews à l'auteur via une vue sans `reviewer_id` |
| Un organisateur peut changer directement `registration_status` (policy `UPDATE` de `event_participants`) | faible (il valide déjà les paiements) | Restreindre l'`UPDATE` à la colonne `role_in_event` |
| Le certificat PDF est généré dans le navigateur : il n'est pas vérifiable | faible | Numéro de certificat + page de vérification publique |
| Pas de limitation de débit propre au site | faible | Limites de Supabase Auth ; à surveiller si le site est ouvert |
