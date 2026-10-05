# 09. Installation et déploiement

## Prérequis

- Node.js 20 ou plus récent
- Un projet Supabase
- (IA) Python 3.10+, le venv de `ai/`

## Variables d'environnement

Fichier `web/.env`, **jamais commité** (il est dans `.gitignore`) :

```
VITE_SUPABASE_URL=https://<projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<clé anon>
```

Seule la clé **anon** va dans le site. La clé `service_role` contourne toute la sécurité : elle ne doit apparaître que dans les scripts Python lancés en local (`ai/.env`).

## Lancer en local

```bash
npm install
```

```bash
npm run dev
```

Le site est servi sur `http://localhost:5173`.

## Base de données

Les scripts de `supabase-migrations/` se lancent **dans l'ordre**, dans le SQL Editor de Supabase :

| Fichier | Effet | Statut |
|---|---|---|
| `000_diagnostic.sql` | Lecture seule : photographie des policies, fonctions, triggers, contraintes, colonnes | à relancer à volonté |
| `001_securite.sql` | Corrige les failles d'autorisation (voir [03](03-securite.md)) | appliqué |
| `002_fonctionnalites.sql` | Profil modifiable et expertise, salles, conflits de salle, liens de visio, retrait d'article, notifications | à appliquer |

Chaque migration est dans une transaction : si une instruction échoue, rien n'est appliqué. Les vérifications sont en commentaire à la fin de chaque fichier.

Le schéma de départ (tables, fonctions RPC d'origine) a été créé directement dans Supabase avant ces migrations ; `000_diagnostic.sql` permet d'en obtenir l'état exact.

## Nommer un administrateur

Depuis le SQL Editor uniquement (le site l'interdit) :

```sql
update profiles set role = 'admin' where email = 'adresse@exemple.dz';
```

## Mise en ligne (Vercel)

1. Le dépôt GitHub est relié à Vercel.
2. Dans Vercel, déclarer `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Chaque `git push` sur `main` déclenche un build (`npm run build`, dossier `dist/`) et un déploiement.
4. Dans Supabase, Authentication > URL Configuration : ajouter l'URL Vercel aux URL de redirection (nécessaire pour le lien "mot de passe oublié").

## Avant une démonstration

- Appliquer toutes les migrations.
- Créer les comptes de démonstration (admin, organisateur, 2 reviewers, 2 auteurs) et un événement complet.
- Supprimer les reviews en double créées avant la migration 001 (requête dans [07](07-tests.md)).
- Tester le scan QR sur un téléphone (caméra arrière) : la page doit être servie en HTTPS, ce qui est le cas sur Vercel.
