# Project Context: CONFERA (Conference Management Platform)

## 1. Project Summary
CONFERA is an end-to-end academic conference management platform designed for universities and research colloquiums. It bridges the entire lifecycle from call-for-papers to on-site event badges and long-term academic archives.
- **Working Features**:
  - Multi-role auth with 1-click evaluation demo profiles (Organizer, Reviewer, Researcher, Campus Admin).
  - Conference lifecycle management: `draft` -> `pending_approval` -> `published` -> `ongoing` -> `closed` / `archived`.
  - Double-blind peer-review system powered by the official **IDEAS'2027 Review Form** (Sections A-F, 18 criteria, confidential chair comments, Best Paper & IGI Global Book nomination).
  - Author workflow: paper submissions, status tracking, resubmissions on revisions.
  - Registration & Badges: dynamic QR code badges (`get_my_badge`), perforation card layout, and check-in scanning (`html5-qrcode`).
  - Event proceedings: « Actes & Archives » page with BibTeX export and Scientific Posters Lightbox gallery.
  - Directory: « Chercheurs & Laboratoires » directory and campus map integration.
  - PDF generation (`jspdf`): official certificates of participation and payment receipts.
  - UI/UX: Dark/Light theme toggle, Command Palette (Ctrl+K), instant SWR client cache.
- **In Progress / Future Work**:
  - Direct database integration of the Python AI/quantum matching scripts into automated assignment tables.
  - Wizard stepper for multi-step conference creation.

## 2. Tech Stack
- **Frontend**:
  - React `19.2.7`, React DOM `19.2.7`
  - Vite `8.1.1` (`@vitejs/plugin-react` `6.0.3`)
  - Tailwind CSS `4.3.2` (`@tailwindcss/vite` `4.3.2`)
  - Phosphor Icons: `@phosphor-icons/react` `2.1.10`
  - Utilities: `jspdf` `4.2.1`, `qrcode` `1.5.4`, `html5-qrcode` `2.3.8`
  - Tooling: ESLint `10.6.0`, `@eslint/js` `10.0.1`, `eslint-plugin-react-hooks` `7.1.1`
- **Backend & Database**:
  - Supabase (`@supabase/supabase-js` `2.110.2`) on PostgreSQL with Row Level Security (RLS), database triggers, and RPC stored procedures.
- **AI & Quantum Computing (`ai/`)**:
  - Python `3.14.5`
  - Quantum: `qiskit` `2.5.2`, `qiskit-aer` `0.17.2`, `qiskit-algorithms` `0.4.0`, `qiskit-optimization` `0.7.0`, `docplex` `2.32.264`
  - ML & Embeddings: `torch` `2.11.0+cu128`, `transformers` `5.15.1`, `sentence-transformers` `6.0.0`, `bertopic` `0.17.4`, `umap-learn` `0.5.12`, `hdbscan` `0.8.44`, `scikit-learn` `1.9.0`
  - Data: `numpy` `2.5.2`, `pandas` `3.0.5`, `scipy` `1.18.0`, `networkx` `3.6.1`, `matplotlib` `3.11.1`

## 3. Directory Tree
```
conference-platform/
├── ai/                              # Research notebooks & quantum algorithms
│   ├── clustering.ipynb             # BERTopic / UMAP session clustering
│   ├── matching.ipynb               # Reviewer-submission semantic matching
│   └── qubo.ipynb                   # QAOA / QUBO optimization for reviewer assignment
├── supabase-schema.json             # Database schema export
├── web/                             # React SPA web client
│   ├── .env                         # Supabase connection credentials
│   ├── docs/                        # Complete technical documentation (01-09)
│   ├── public/                      # Static assets (favicons, icons)
│   ├── src/
│   │   ├── main.jsx                 # Client entry point & early theme bootstrap
│   │   ├── App.jsx                  # Root component, auth state & master router
│   │   ├── index.css                # Tailwind v4 @theme, custom components & palettes
│   │   ├── components/
│   │   │   ├── charts/Charts.jsx    # Custom SVG / HTML academic charts
│   │   │   └── ui/                  # Reusable UI primitives (Avatar, Pill, Tabs, Modal...)
│   │   ├── features/
│   │   │   ├── admin/               # Campus admin moderation & platform stats
│   │   │   ├── archives/            # Actes & Archives page (BibTeX, Posters Lightbox)
│   │   │   ├── attendance/          # QR code generation & camera check-in scanning
│   │   │   ├── auth/                # Sign-in/up form & 1-click prototype demo profiles
│   │   │   ├── certificates/        # jsPDF generators for certificates & receipts
│   │   │   ├── dashboard/           # Main hub (Explorer, Next Event, Myspace, Actions)
│   │   │   ├── directory/           # Researchers & laboratories directory
│   │   │   ├── events/              # Event detail, forms, settings & phase stepper
│   │   │   ├── info/                # Static informational pages (About, FAQ, Privacy)
│   │   │   ├── profile/             # Researcher profile & expertise settings
│   │   │   ├── registrations/       # Inscription passes, fee payments & validations
│   │   │   ├── reviews/             # IDEAS'2027 review modal studio & utils
│   │   │   ├── sessions/            # Scientific presentation schedules & rooms
│   │   │   ├── sponsors/            # Partner logos & sponsorships management
│   │   │   ├── stats/               # Platform analytics & KPI counters
│   │   │   └── submissions/         # Paper submission, revisions & decision panels
│   │   └── lib/                     # Helpers (Supabase client, constants, calendar, theme)
│   ├── supabase-migrations/         # SQL diagnostic, security & functional migrations
│   ├── package.json                 # Web dependencies & scripts
│   └── vite.config.js               # Vite build configuration
└── PROJECT_CONTEXT.md               # This context file
```

## 4. Data & System Flow
1. **Frontend to Database**: Browser executes React 19 SPA, communicating directly via HTTPS with Supabase REST API (PostgREST) and Auth using the public anonymous key.
2. **Security & Authorization**: No intermediate backend server. Authorization logic is enforced in PostgreSQL via Row Level Security (RLS) policies and RPC functions (`invite_member`, `declare_payment`, `validate_registration`, `decide_submission`, `get_my_badge`, `check_in_by_token`, `assign_submission_to_session`).
3. **AI Pipeline Flow**: Papers extracted from database/arXiv -> Embedded via Sentence-BERT -> Clustered into thematic sessions via BERTopic/UMAP -> Reviewer assignments optimized through QUBO/QAOA formulations using Qiskit and Docplex.

## 5. Run & Test Commands
- **Install Frontend Dependencies**: `npm --prefix web install`
- **Start Development Server**: `npm --prefix web run dev` (Runs Vite on `http://localhost:5173`)
- **Lint Codebase**: `npm --prefix web run lint` (ESLint on `web/`)
- **Production Build**: `npm --prefix web run build` (Outputs optimized bundles to `web/dist/`)
- **Preview Production Build**: `npm --prefix web run preview`
- **Run AI Notebooks**: `./ai/venv/Scripts/jupyter lab` (From project root)

## 6. Git Status
- **Repository Location**: Initialized inside `web/.git` (linked to `https://github.com/LidodoHub/conference-platform.git`).
- **Current Branch**: `main` (clean working tree).
- **Secondary Branches**: `demo-encadrante` (frozen deployment branch connected to Vercel preview for supervisor evaluation).
- **Git Ignore (`web/.gitignore`)**: Ignores `node_modules`, `dist`, `dist-ssr`, `*.local`, `*.log`, `.vscode/*`, `.idea`, `.DS_Store`, and `.env`.

## 7. Antigravity Rules & Design Conventions
- **Color System (`web/src/index.css`)**:
  - Academic & mature palette: deep navy (`#1B2A4A`, `#23365E`), refined stone/paper surfaces (`--c-bg`, `--c-surface`), subtle borders (`--c-line`).
  - Warm academic gold/amber accent (`--c-accent`, `--c-accent-ink`).
  - Strict semantic status tokens: `--color-ok` (emerald), `--color-warn` (amber), `--color-bad` (crimson), `--color-info` (sky).
- **Anti-Slop & Taste Rules**:
  - No bright or neon gradients; no generic purple AI cards.
  - Zero emoji clutter in UI text (Phosphor icons exclusively, 14-18px).
  - High accessible contrast ratios compliant with Web Interface Guidelines.
  - Buttons use sober semantic styles: `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-info`, `.btn-warning`, `.btn-success`, `.btn-danger`.
