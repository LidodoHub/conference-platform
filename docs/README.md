# Documentation de CONFERA

CONFERA est une plateforme web de gestion de conférences scientifiques, réalisée comme projet de fin d'études (Master 2 Intelligence Artificielle). Elle couvre le cycle complet d'un événement en deux phases : une **phase scientifique** (dépôt, relecture et sélection des articles) puis une **phase organisationnelle** (inscriptions, programme, présences, certificats).

Cette documentation décrit l'état réel du code et de la base. Elle est écrite pour servir de matière première au mémoire.

## Sommaire

| Document | Contenu |
|---|---|
| [01 Architecture](01-architecture.md) | Pile technique, organisation du code, flux de données, choix structurants |
| [02 Modèle de données](02-donnees.md) | Tables, relations, énumérations, diagramme entité-association |
| [03 Sécurité](03-securite.md) | RLS, fonctions RPC, triggers, failles trouvées et corrigées |
| [04 Fonctionnalités](04-fonctionnalites.md) | Rôles, parcours, règles métier, machines à états |
| [05 Interface](05-interface.md) | Système de design, composants, accessibilité, responsive |
| [06 Intelligence artificielle](06-ia.md) | Modules Python, résultats, conception de l'intégration |
| [07 Tests et recette](07-tests.md) | Scénarios de test, requêtes de vérification, résultats |
| [08 Journal des décisions](08-decisions.md) | Décisions de conception et leur justification |
| [09 Déploiement](09-deploiement.md) | Variables d'environnement, migrations, mise en ligne |

## Correspondance avec un plan de mémoire

Un mémoire de Master en informatique suit en général ce plan. Chaque chapitre peut s'appuyer sur les documents indiqués.

| Chapitre du mémoire | Ce qu'il faut y mettre | Source |
|---|---|---|
| Introduction générale | Contexte (organisation des conférences scientifiques, charge des comités), problématique, objectifs, plan | 04 (rôles et besoins) |
| 1. État de l'art | Outils existants (EasyChair, OpenReview, Indico, ConfTool) et leurs limites ; affectation reviewer-article, topic modeling, optimisation combinatoire et QAOA | 06 (méthodes IA) |
| 2. Analyse et conception | Besoins fonctionnels et non fonctionnels, acteurs et cas d'utilisation, modèle de données, machines à états, architecture | 02, 04, 01 |
| 3. Sécurité | Modèle d'autorisation par événement, RLS, fonctions RPC, audit et corrections | 03 |
| 4. Réalisation | Pile technique, organisation du code, interface et accessibilité, captures d'écran | 01, 05 |
| 5. Intelligence artificielle | Matching (Sentence-BERT), clustering (BERTopic vs LDA, ARI), planification (QUBO, QAOA vs solveur exact), intégration | 06 |
| 6. Tests et évaluation | Scénarios de recette, résultats, limites | 07, 06 |
| Conclusion et perspectives | Bilan, limites, travaux futurs | 08, 06 |

## Conventions

- Les chemins de fichiers sont relatifs au dossier `web/`.
- Les migrations SQL sont dans `supabase-migrations/`, numérotées et à lancer dans l'ordre.
- Toutes les captures d'écran du mémoire doivent être prises en mode clair et en mode sombre, à 375 px (téléphone), 768 px (tablette) et 1280 px (ordinateur).
