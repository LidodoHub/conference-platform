# 08. Journal des décisions

Chaque décision suit le format : contexte, décision, raison, conséquence. Ce journal sert à justifier les choix dans le mémoire.

### D1. Supabase sans serveur applicatif
- **Contexte** : site à livrer seul, dans un temps limité, avec authentification et base relationnelle.
- **Décision** : React côté client, Supabase (PostgreSQL + Auth + API REST) côté données, sans serveur intermédiaire.
- **Raison** : moins de code à maintenir ; PostgreSQL permet d'exprimer les règles d'accès près des données.
- **Conséquence** : la sécurité repose entièrement sur la RLS, les fonctions et les triggers (D2).

### D2. La base est la seule barrière de sécurité
- **Contexte** : la clé anon est publique ; l'API est appelable sans l'interface.
- **Décision** : toute règle d'accès est écrite en SQL ; le front ne fait que refléter les droits.
- **Conséquence** : audit des policies (`000_diagnostic.sql`) et corrections (`001_securite.sql`), voir [03](03-securite.md).

### D3. Écritures sensibles par fonctions RPC
- **Contexte** : décider, valider un paiement ou pointer une présence touche plusieurs tables et suit des états.
- **Décision** : pas de policy d'écriture directe sur ces données ; des fonctions `SECURITY DEFINER` vérifient les droits et écrivent d'un bloc.
- **Raison** : atomicité (tout ou rien) et règles impossibles à contourner.

### D4. Rôles par événement
- **Décision** : `event_participants.role_in_event` ; seul `admin` est global.
- **Raison** : un chercheur est auteur ici, reviewer là, organisateur ailleurs.

### D5. Inscription sur invitation
- **Décision** : seuls les auteurs acceptés sont invités ; paiement déclaré par bordereau puis validé à la main.
- **Raison** : fonctionnement réel des conférences académiques algériennes (virement ou CCP, pas de paiement en ligne).
- **Conséquence** : données de paiement isolées dans `registration_payments`, car `event_participants` est lisible par tous les connectés.

### D6. Deux phases, clôture réversible
- **Raison** : demandé par l'encadrante ; la réversibilité évite de bloquer un événement après une erreur.

### D7. Code mort supprimé, stand-ins IA retirés
- **Contexte** : le dépôt contenait des "algorithmes IA" en JavaScript (tri glouton et k-means maison, présentés avec le vocabulaire QUBO / BERTopic), du code Next.js d'un autre projet et une fausse sauvegarde en localStorage.
- **Décision** : tout supprimer.
- **Raison** : ne présenter que du travail réel et vérifiable ; éviter qu'une démonstration affiche des données qui ne sont pas en base.

### D8. Refonte visuelle guidée par taste-skill
- **Décision** : tokens sémantiques clair / sombre, une seule couleur d'accent, Geist, icônes Phosphor, entités à bande de statut au lieu de cartes marine sur fond clair, couvertures d'événement générées.
- **Raison** : cohérence (un seul thème par page), lisibilité, identité "badge de conférence" conservée sans cliché.
- **Écarté** : télécharger et exécuter le paquet du skill (`npx skills add`) ; ses consignes ont été lues et appliquées à la main.

### D9. Graphiques faits main
- **Décision** : CSS et SVG, sans librairie de graphiques.
- **Raison** : poids, contrôle total du rendu en clair et en sombre, contrainte posée au départ.

### D10. Articles en vue liste + détail
- **Contexte** : les cartes empilées devenaient illisibles au-delà de quelques articles.
- **Décision** : liste compacte filtrable à gauche, article complet à droite ; liste puis détail sur mobile.
- **Raison** : modèle éprouvé (messagerie) pour traiter un flux d'éléments ; les actions en attente remontent en tête.

### D11. Notifications créées par la base
- **Décision** : triggers SQL qui écrivent dans `notifications` ; pas d'insertion depuis le site.
- **Raison** : impossible d'oublier une notification ou d'en forger une ; fonctionne même si l'action vient d'une fonction RPC.
- **Limite** : pas d'e-mail ; notifications visibles dans le site uniquement (rafraîchies toutes les minutes).

### D12. Liens de visio dans une table séparée
- **Contexte** : les sessions d'un événement publié sont lisibles par tous ; la RLS filtre des lignes, pas des colonnes.
- **Décision** : `session_links`, lisible par les seuls membres (`is_event_member`).

### D13. L'IA reste en Python et propose, l'organisateur décide
- **Décision** : script Python qui écrit des propositions ; le site les lit ; validation humaine.
- **Raison** : les modèles ne tournent pas dans un navigateur ; traçabilité ; responsabilité scientifique laissée au comité.

### D14. Pas de routeur
- **Décision** : navigation par état dans `App.jsx`.
- **Raison** : simplicité au départ du projet.
- **Limite** : pas d'URL partageable par page ; évolution possible avec `react-router`.
