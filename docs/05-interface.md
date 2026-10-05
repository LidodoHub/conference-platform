# 05. Interface et système de design

## Direction

> Refonte d'une application de conférences académiques pour chercheurs et organisateurs, langage sobre et fiable, mouvement retenu.

Identité de départ conservée : le **badge de conférence** (billet perforé, bande dorée), le marine `#1B2A4A` et l'or `#C8963E`. La refonte s'appuie sur les règles d'audit du skill *taste-skill* (Leonxlnx/taste-skill), appliquées à une application plutôt qu'à une page vitrine :

- une seule couleur d'accent (l'or) ; vert, orange, rouge et bleu réservés aux statuts ;
- pas de police "par défaut des IA" : Geist (texte et titres) et Geist Mono (libellés), à la place d'Inter et de Fraunces ;
- un seul thème par page : plus de cartes marine posées sur un fond clair, mais des surfaces qui changent ensemble entre clair et sombre ;
- pas de tiret cadratin dans les textes, pas de pastilles décoratives, pas de faux visuels en `div` ;
- états vides, de chargement et d'erreur pour chaque liste.

Réglages retenus (échelle du skill, de 1 à 10) : variance de mise en page 4, intensité du mouvement 3, densité 5.

## Tokens

Définis dans `src/index.css`. Les composants n'utilisent **que** des tokens sémantiques ; les valeurs changent selon le thème.

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `bg` | `#DDE1E8` | `#0C1322` | fond de page (pas de blanc éblouissant) |
| `surface` | `#EEF0F4` | `#131D31` | cartes, champs |
| `surface-2` | `#E4E7ED` | `#1A2740` | zones en retrait |
| `fg` | `#16233F` | `#E7EBF2` | texte principal |
| `muted` / `faint` | `#4F5B74` / `#6E7891` | `#A2ACC0` / `#7C879D` | texte secondaire |
| `accent` / `accent-ink` | `#C8963E` / `#8A5F1C` | `#D2A24E` / `#E3BC72` | or (fond) / or lisible en texte |
| `ok` `warn` `bad` `info` | vert, orange, rouge, bleu | versions éclaircies | statuts uniquement |

Le marine (`navy`) reste fixe : barre du haut, bouton principal.

Sémantique des statuts d'article (conservée) : **neutre = soumis, vert = accepté, orange = révision, rouge = rejeté**. Une couleur n'est jamais seule : le libellé est toujours écrit à côté.

## Typographie

| Rôle | Police | Détail |
|---|---|---|
| Titres | Geist 600 | interlettrage négatif, `text-wrap: balance` |
| Texte | Geist 400 / 500 | 15 à 16 px, lignes de 65 à 75 caractères au plus |
| Chiffres | Geist, `tabular-nums` | alignement des colonnes et compteurs |
| Libellés techniques | Geist Mono | rare : compteurs, étiquettes de section |

## Formes

- Conteneurs : rayon 16 px ; contrôles (boutons, champs) : 10 px ; pastilles : pilule.
- Ombres teintées marine, jamais noires.
- Entités (article, session, sponsor, salle) : surface + **bande de couleur à gauche** (`.entity`, variable `--stripe`).
- Lignes de liste (personnes, inscriptions) : `.row`, même principe en plus fin.

## Couverture d'événement

Chaque événement a une couverture graphique **générée** à partir de son identifiant (`src/lib/cover.js`) : palette tirée parmi six ambiances de la charte, dégradés, trame de points, cercles concentriques en rappel d'un tampon de conférence. Même événement, même couverture, partout (liste, fiche, tableau de bord). Aucune image externe, aucun poids ajouté.

## Photographies

Deux photos d'Oran, chargées depuis Wikimedia Commons et passées en bichromie marine par CSS (noir et blanc, fusion `luminosity`, halo doré en lumière, dégradé qui protège la lisibilité du texte) :

| Écran | Photo | Licence |
|---|---|---|
| Accueil (bandeau) | Tour de l'USTO-MB, par Araibia Amine (Artistou) | CC BY-SA 4.0 : auteur cité sur le bandeau, avec lien |
| Connexion / inscription | Santa Cruz (clocher de la chapelle) dominant le port et la baie d'Oran, par habib kaki | CC BY 3.0 : auteur cité sous le panneau, avec lien |

Les adresses et crédits sont centralisés dans `HERO_PHOTO` et `AUTH_PHOTO` (`src/lib/constants.js`). Sans connexion internet, le bandeau garde son fond marine animé.

## Composants partagés

| Composant | Rôle |
|---|---|
| `PageHeader`, `SectionTitle` | titres de page et de section, avec compteur et actions |
| `Tabs` | onglets soulignés ou segmentés, navigables aux flèches, option `wrap` pour les colonnes étroites |
| `Pill` | pastille de statut (couleur + libellé) |
| `Stat` | chiffre clé |
| `Avatar` | initiales dans un carré arrondi |
| `EmptyState` | état vide avec explication et action |
| `EventCover` | couverture générée |
| `NotificationsMenu`, `ThemeToggle`, `Logo` | en-tête |
| `Charts` | `StackedBar`, `BarList`, `Columns`, `Ratio`, `DataTable` |

## Graphiques

Dessinés à la main en CSS et SVG, sans librairie. Règles appliquées (skill *dataviz*) :

- la forme suit la question : répartition = barre empilée ; classement ou entonnoir = barres horizontales ; évolution = colonnes ; un chiffre seul = tuile ;
- marques fines, extrémités arrondies à 4 px, 2 px d'écart entre les segments ;
- une seule teinte quand la longueur porte l'information ;
- couleurs de statut vérifiées avec le script de validation daltonisme : la paire vert-rouge tombe dans la zone tolérée **à condition** d'avoir un encodage secondaire, d'où libellés et valeurs toujours écrits ;
- info-bulle au survol et au clavier sur les colonnes ; tableau de données accessible ("Voir les données").

## Accessibilité

- Contrastes AA pour le texte (l'or n'est utilisé en texte que dans sa version foncée `accent-ink`).
- Lien d'évitement "Aller au contenu", focus visible doré sur tous les éléments.
- Tous les champs ont un `label` ; aides sous les champs ; erreurs annoncées (`role="alert"`).
- Les cartes cliquables sont de vrais `button` (utilisables au clavier).
- `prefers-reduced-motion` respecté : toutes les animations sont coupées.
- Zones tactiles d'au moins 40 px sur mobile.

## Responsive

Testé à 375 px, 768 px et 1280 px. Sur téléphone et tablette (moins de 1024 px) : barre de navigation en bas, comme une application mobile (Accueil, Événements, Admin, Profil avec l'avatar), en-tête réduit au logo, à la cloche et au thème, déconnexion dans la page Profil ; puis, listes en une colonne, articles en "liste puis détail" avec bouton retour, notifications en panneau pleine largeur.

## Mode sombre

Suit le système par défaut et change en direct si le système change ; bouton système / clair / sombre dans l'en-tête (préférence gardée dans le navigateur). Le thème est appliqué avant le premier rendu pour éviter un flash.
