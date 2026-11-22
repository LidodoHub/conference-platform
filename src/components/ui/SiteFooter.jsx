import { MapPinIcon, EnvelopeSimpleIcon, GraduationCapIcon } from '@phosphor-icons/react'
import Logo from './Logo'
import { SITE } from '../../lib/site'

function FooterLink({ onClick, href, children }) {
  const cls = 'text-sm text-muted hover:text-fg dark:hover:text-white underline-offset-4 hover:underline decoration-fg/30 dark:decoration-white/40 transition-colors'
  if (href)
    return (
      <a href={href} className={cls} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
        {children}
      </a>
    )
  return (
    <button type="button" onClick={onClick} className={`${cls} text-left`}>
      {children}
    </button>
  )
}

function Column({ title, children }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold tracking-wide text-fg dark:text-white mb-4">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  )
}

// Pied de page : liens secondaires (à propos, aide, confidentialité, contact), à l'écart de la navigation principale.
export default function SiteFooter({ onNavigate }) {
  return (
    <footer className="mt-auto bg-surface text-fg border-t border-black/[0.06] dark:bg-[#18181B] dark:border-white/[0.06] transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-x-8 gap-y-10">
          <div className="col-span-2 md:col-span-1 max-w-sm">
            <Logo inverted={false} />
            <p className="mt-4 text-sm text-muted leading-relaxed">{SITE.tagline}</p>
            <p className="mt-4 flex items-start gap-2 text-[13px] text-faint">
              <GraduationCapIcon size={16} className="shrink-0 mt-0.5 text-muted dark:text-white/80" aria-hidden="true" />
              {SITE.project}
            </p>
          </div>

          <Column title="Plateforme">
            <li><FooterLink onClick={() => onNavigate('home')}>Tableau de bord</FooterLink></li>
            <li><FooterLink onClick={() => onNavigate('archives')}>Actes & Archives</FooterLink></li>
            <li><FooterLink onClick={() => onNavigate('researchers')}>Chercheurs & Labos</FooterLink></li>
            <li><FooterLink onClick={() => onNavigate('profile')}>Mon profil</FooterLink></li>
          </Column>

          <Column title="Aide">
            <li><FooterLink onClick={() => onNavigate('about')}>À propos</FooterLink></li>
            <li><FooterLink onClick={() => onNavigate('faq')}>Questions fréquentes</FooterLink></li>
            <li><FooterLink onClick={() => onNavigate('privacy')}>Confidentialité</FooterLink></li>
          </Column>

          <Column title="Contact">
            <li className="flex items-start gap-2 text-sm text-muted">
              <MapPinIcon size={16} className="shrink-0 mt-0.5 text-muted dark:text-white/80" aria-hidden="true" />
              <span>
                USTO-MB
                <br />
                {SITE.city}
              </span>
            </li>
            {SITE.contactEmail && (
              <li className="flex items-center gap-2">
                <EnvelopeSimpleIcon size={16} className="shrink-0 text-muted dark:text-white/80" aria-hidden="true" />
                <FooterLink href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</FooterLink>
              </li>
            )}
            <li>
              <FooterLink onClick={() => onNavigate('about', 'contact')}>Nous écrire</FooterLink>
            </li>
          </Column>
        </div>

        <div className="mt-12 pt-6 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted">
          <p>
            © {SITE.year} {SITE.name}. Tous droits réservés.
          </p>
          <p>Photos : Wikimedia Commons, crédits sur chaque image.</p>
        </div>
      </div>
    </footer>
  )
}
