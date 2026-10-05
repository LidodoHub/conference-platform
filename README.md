# CONFERA

Plateforme de gestion de conférences scientifiques, projet de fin d'études (Master 2 Intelligence Artificielle).

Un événement se déroule en deux phases :

1. **Phase scientifique** : dépôt des articles, relecture (note, recommandation, commentaire), décision de l'organisateur, révision et resoumission.
2. **Phase organisationnelle** : invitation des auteurs acceptés, paiement par bordereau et validation, programme (salles, sessions, placement des articles), badge QR, pointage des présences, accusé de paiement et certificat.

Autour : tableau de bord personnel, notifications, statistiques par événement et pour la plateforme, modération par un administrateur, mode clair et sombre, interface adaptée au téléphone.

## Démarrer

```bash
npm install
```

```bash
npm run dev
```

Créer `web/.env` avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, puis appliquer les scripts de `supabase-migrations/` dans l'ordre. Détails dans [docs/09-deploiement.md](docs/09-deploiement.md).

## Pile

React 19, Vite, Tailwind CSS v4, Supabase (PostgreSQL, Auth, RLS), Phosphor Icons, jsPDF, qrcode, html5-qrcode. Modules d'IA en Python (Sentence-BERT, BERTopic, Qiskit) dans le dossier `ai/` voisin.

## Documentation

Toute la documentation est dans [docs/](docs/README.md) : architecture, modèle de données, sécurité, fonctionnalités, interface, IA, tests, journal des décisions, déploiement.
