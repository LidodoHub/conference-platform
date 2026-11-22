import Logo from './Logo'
import { SITE } from '../../lib/site'

function FooterLink({ onClick, href, children }) {
  const cls = 'text-xs text-muted dark:text-[#A1A1AA] hover:text-fg dark:hover:text-white transition-colors'
  if (href)
    return (
      <a href={href} className={cls} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
        {children}
      </a>
    )
  return (
    <button type="button" onClick={onClick} className={`${cls} text-left cursor-pointer`}>
      {children}
    </button>
  )
}

function Column({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-fg dark:text-white mb-3">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

// Pied de page : liens secondaires (à propos, aide, confidentialité, contact), à l'écart de la navigation principale.
export default function SiteFooter({ onNavigate }) {
  return (
    <footer className="mt-auto bg-surface text-fg border-t border-black/[0.06] dark:bg-transparent dark:border-white/10 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 pt-12 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-x-8 gap-y-10">
          <div className="col-span-2 md:col-span-1 max-w-sm">
            <Logo inverted={false} />
            <p className="mt-3 text-xs text-muted dark:text-[#71717A] leading-relaxed max-w-xs">{SITE.tagline}</p>
          </div>

          <Column title="Plateforme">
            <li><FooterLink onClick={() => onNavigate('home')}>Conférences</FooterLink></li>
            <li><FooterLink onClick={() => onNavigate('archives')}>Actes & Archives</FooterLink></li>
            <li><FooterLink onClick={() => onNavigate('researchers')}>Chercheurs & Labos</FooterLink></li>
          </Column>

          <Column title="Aide">
            <li><FooterLink onClick={() => onNavigate('about')}>À propos</FooterLink></li>
            <li><FooterLink onClick={() => onNavigate('about', 'guide')}>Guide auteurs</FooterLink></li>
            <li><FooterLink onClick={() => onNavigate('privacy')}>Confidentialité</FooterLink></li>
          </Column>

          <Column title="Contact">
            <li className="text-xs text-muted dark:text-[#A1A1AA] leading-relaxed">
              USTO-MB, Oran
              <br />
              Algérie
            </li>
          </Column>
        </div>
      </div>
    </footer>
  )
}
