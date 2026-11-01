import { useEffect } from 'react'
import {
  ArticleIcon,
  NotePencilIcon,
  GavelIcon,
  TicketIcon,
  PresentationChartIcon,
  QrCodeIcon,
  CertificateIcon,
  EnvelopeSimpleIcon,
  ArrowRightIcon,
} from '@phosphor-icons/react'
import PageHeader from '../../components/ui/PageHeader'
import { SITE } from '../../lib/site'
import { MAX_ACCEPTED_PER_AUTHOR } from '../../lib/constants'

const STEPS = [
  { icon: ArticleIcon, title: 'Dépôt', text: 'Les auteurs soumettent le titre et le résumé de leurs articles.' },
  { icon: NotePencilIcon, title: 'Relecture', text: 'Les reviewers notent, recommandent et commentent, de façon anonyme pour l’auteur.' },
  { icon: GavelIcon, title: 'Décision', text: 'L’organisateur accepte, rejette ou demande une révision.' },
  { icon: TicketIcon, title: 'Inscription', text: 'Les auteurs acceptés sont invités, paient par bordereau, l’organisateur valide.' },
  { icon: PresentationChartIcon, title: 'Programme', text: 'Sessions, salles et horaires ; chaque article est placé dans une session.' },
  { icon: QrCodeIcon, title: 'Présences', text: 'Badge QR personnel scanné à l’entrée de chaque session.' },
  { icon: CertificateIcon, title: 'Certificat', text: 'Accusé de paiement et certificat de participation en PDF.' },
]

function AboutPage({ anchor }) {
  useEffect(() => {
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })
  }, [anchor])

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        title="À propos de CONFERA"
        description="Une plateforme pour organiser une conférence scientifique de bout en bout : sélectionner les travaux, puis préparer l'événement."
      />

      <section className="card-panel">
        <h2 className="text-lg font-semibold tracking-tight text-fg">Deux phases, un seul outil</h2>
        <p className="mt-2 text-muted leading-relaxed max-w-[70ch]">
          Une conférence se déroule en deux temps. La <span className="text-fg font-medium">phase scientifique</span> sert à
          sélectionner les travaux. La <span className="text-fg font-medium">phase organisationnelle</span> prépare l'événement
          lui-même. CONFERA accompagne les deux, avec un rôle distinct pour chaque personne dans chaque événement : auteur,
          reviewer, organisateur ou participant.
        </p>

        <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className={`rounded-xl border border-line bg-surface-2/50 p-4 ${i < 3 ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-accent/15 text-accent-ink">
                  <Icon size={18} weight="duotone" aria-hidden="true" />
                </span>
                <span className="text-xs text-faint num">{i < 3 ? 'Phase scientifique' : 'Phase organisationnelle'}</span>
              </div>
              <h3 className="mt-3 font-semibold text-fg">{title}</h3>
              <p className="mt-1 text-sm text-muted leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="card-panel">
          <h2 className="text-lg font-semibold tracking-tight text-fg">Le projet</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Cadre</dt>
              <dd className="text-fg">{SITE.project}</dd>
            </div>
            <div>
              <dt className="text-muted">Établissement</dt>
              <dd className="text-fg">{SITE.institution}</dd>
            </div>
            {SITE.author && (
              <div>
                <dt className="text-muted">Réalisation</dt>
                <dd className="text-fg">{SITE.author}</dd>
              </div>
            )}
            {SITE.supervisor && (
              <div>
                <dt className="text-muted">Encadrement</dt>
                <dd className="text-fg">{SITE.supervisor}</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-sm text-muted leading-relaxed">
            Des modules d'intelligence artificielle sont en cours d'intégration : proposition de reviewers selon leur expertise,
            regroupement thématique des articles, aide à la planification des sessions et détection de similarités.
          </p>
        </section>

        <section id="contact" className="card-panel scroll-mt-24">
          <h2 className="text-lg font-semibold tracking-tight text-fg">Contact</h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li>
              <p className="font-medium text-fg">Une question sur un événement ?</p>
              <p className="text-muted mt-0.5">
                Écris à son organisateur : son adresse est dans l'aperçu de chaque événement, rubrique « Organisateur ».
              </p>
            </li>
            <li>
              <p className="font-medium text-fg">Une question sur la plateforme ?</p>
              {SITE.contactEmail ? (
                <a href={`mailto:${SITE.contactEmail}`} className="mt-1 btn-outline btn-sm">
                  <EnvelopeSimpleIcon size={15} aria-hidden="true" />
                  {SITE.contactEmail}
                </a>
              ) : (
                <p className="text-muted mt-0.5">Contacte l'administrateur de la plateforme de ton établissement.</p>
              )}
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

const FAQ = [
  {
    group: 'Auteurs',
    items: [
      ['Comment soumettre un article ?', 'Ouvre un événement en phase scientifique, onglet Articles, puis « Soumettre un article » : un titre et un résumé suffisent.'],
      ['Puis-je modifier ou retirer mon article ?', 'Tu peux le retirer tant qu’il est en attente. Si une révision est demandée, tu le corriges et le resoumets depuis le même onglet.'],
      ['Qui voit mon article ?', 'L’organisateur et les reviewers de l’événement. Une fois accepté et l’événement publié, il apparaît dans le programme public.'],
      [`Combien d’articles peuvent être acceptés ?`, `Au plus ${MAX_ACCEPTED_PER_AUTHOR} articles par auteur et par événement.`],
    ],
  },
  {
    group: 'Reviewers',
    items: [
      ['Comment devenir reviewer ?', 'L’organisateur t’ajoute par ton adresse e-mail. Renseigne tes domaines d’expertise dans « Mon profil ».'],
      ['Mes commentaires sont-ils anonymes ?', 'Oui : l’auteur voit « Reviewer 1 », « Reviewer 2 »… Tu ne peux pas relire ton propre article, ni deux fois le même.'],
    ],
  },
  {
    group: 'Participants',
    items: [
      ['Comment m’inscrire à un événement ?', 'L’inscription se fait sur invitation, après acceptation de ton article. Tu reçois une notification.'],
      ['Comment payer les frais ?', 'Règle les frais selon les modalités indiquées, puis déclare la référence de ton bordereau dans « Ma participation ». L’organisateur la vérifie.'],
      ['Où trouver mon badge et mon certificat ?', 'Dans l’aperçu de l’événement, rubrique « Ma participation », une fois ton inscription validée. Le certificat est disponible à partir du premier jour.'],
    ],
  },
  {
    group: 'Organisateurs',
    items: [
      ['Comment créer un événement ?', 'Page Événements, « Créer un événement ». Il reste en brouillon jusqu’à ce qu’un administrateur valide ta demande de publication.'],
      ['Quand inviter les participants ?', 'Après la clôture de la phase scientifique (onglet Organisation, Événement). La clôture gèle les dépôts, reviews et décisions ; elle est réversible.'],
      ['Comment éviter les conflits de salle ?', 'Crée les salles dans Organisation, Salles. Deux sessions ne peuvent pas occuper la même salle au même moment : la plateforme le refuse.'],
    ],
  },
]

function FaqPage() {
  return (
    <div className="page-container max-w-5xl">
      <PageHeader title="Questions fréquentes" description="Les réponses aux questions les plus courantes, selon ton rôle." />
      <div className="space-y-10">
        {FAQ.map(({ group, items }) => (
          <section key={group}>
            <h2 className="text-sm font-semibold text-accent-ink mb-3">{group}</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(([q, a]) => (
                <div key={q} className="card p-5">
                  <dt className="font-semibold text-fg leading-snug">{q}</dt>
                  <dd className="mt-2 text-sm text-muted leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  )
}

function PrivacyPage({ onNavigate }) {
  const rows = [
    ['Données collectées', 'Nom, adresse e-mail, affiliation, pays et domaines d’expertise ; articles, reviews, inscriptions, références de paiement et présences.'],
    ['Pourquoi', 'Uniquement pour organiser les conférences : évaluation des articles, inscriptions, programme, badges et certificats.'],
    ['Qui y a accès', 'Chaque information n’est visible que des personnes concernées (règles appliquées par la base de données) : par exemple, une référence de paiement n’est vue que par son auteur et les organisateurs de l’événement.'],
    ['Hébergement', 'Base de données et authentification hébergées par Supabase ; site hébergé par Vercel.'],
    ['Tes droits', 'Tu peux corriger tes informations dans « Mon profil ». Pour supprimer ton compte, contacte l’administrateur de la plateforme.'],
  ]
  return (
    <div className="page-container max-w-3xl">
      <PageHeader title="Confidentialité" description="Ce que CONFERA conserve, pourquoi, et qui peut le voir." />
      <dl className="card divide-y divide-line overflow-hidden">
        {rows.map(([t, d]) => (
          <div key={t} className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-1 sm:gap-6">
            <dt className="font-semibold text-fg">{t}</dt>
            <dd className="text-sm text-muted leading-relaxed">{d}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={() => onNavigate('about', 'contact')} className="btn-ghost mt-6 -ml-3">
        Une question ? Nous contacter
        <ArrowRightIcon size={15} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function InfoPage({ page, anchor, onNavigate }) {
  if (page === 'faq') return <FaqPage />
  if (page === 'privacy') return <PrivacyPage onNavigate={onNavigate} />
  return <AboutPage anchor={anchor} />
}
