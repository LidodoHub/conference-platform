import { useState } from 'react'

// Graphiques dessinés à la main (CSS + SVG), sans librairie.
// Règles : marques fines, extrémités arrondies 4px, 2px d'écart entre segments,
// la couleur n'est jamais seule (libellé + valeur toujours écrits), textes en couleurs de texte.

const pct = (v, total) => (total ? Math.round((100 * v) / total) : 0)

// Barre empilée 100 % (répartition d'un total), avec légende chiffrée.
export function StackedBar({ segments, label }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const visible = segments.filter((s) => s.value > 0)

  return (
    <figure>
      <div className="flex h-3 w-full gap-[2px]" role="img" aria-label={label}>
        {total === 0 ? (
          <div className="flex-1 rounded-[4px] bg-fg/8" />
        ) : (
          visible.map((s) => (
            <div
              key={s.label}
              className="h-full rounded-[4px] min-w-[4px] transition-[flex-grow] duration-500"
              style={{ flexGrow: s.value, background: s.color }}
              title={`${s.label} : ${s.value} (${pct(s.value, total)} %)`}
            />
          ))
        )}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-2 text-[13px] text-muted">
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
            <span className="num font-medium text-fg">{s.value}</span>
            {total > 0 && <span className="num text-faint">{pct(s.value, total)} %</span>}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

// Liste de barres horizontales (classement, entonnoir). Une seule teinte : la longueur porte l'info.
export function BarList({ items, color = 'var(--color-accent)', max, format = (v) => v, emptyText = 'Aucune donnée.' }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value))
  if (items.length === 0) return <p className="text-sm text-muted">{emptyText}</p>

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key ?? item.label}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-fg truncate">{item.label}</span>
            <span className="num shrink-0 text-fg font-medium">
              {format(item.value)}
              {item.detail && <span className="text-faint font-normal"> {item.detail}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2">
            <div
              className="h-full rounded-[4px] transition-[width] duration-500"
              style={{ width: `${Math.max(item.value > 0 ? 1.5 : 0, (100 * item.value) / top)}%`, background: item.color || color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Colonnes verticales (série temporelle courte ou distribution) avec info-bulle au survol / focus.
export function Columns({ points, color = 'var(--color-accent)', height = 140, label, unit = '' }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...points.map((p) => p.value))
  const n = points.length
  if (n === 0) return <p className="text-sm text-muted">Aucune donnée.</p>

  const gap = n > 20 ? 2 : 6
  const active = hover != null ? points[hover] : null
  const ticks = n <= 8 ? points.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1]

  return (
    <figure>
      <div className="relative" style={{ height }} role="img" aria-label={label}>
        {/* repère : la valeur maximale */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden="true" />
        <span className="absolute right-0 -top-5 text-[11px] num text-faint" aria-hidden="true">
          {max}
        </span>
        <div className="absolute inset-0 flex items-end" style={{ gap }}>
          {points.map((p, i) => (
            <button
              key={p.key ?? p.label}
              type="button"
              className="relative flex-1 h-full flex items-end focus:outline-none group"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${p.label} : ${p.value}${unit}`}
            >
              <span
                className="w-full max-w-14 mx-auto rounded-t-[4px] transition-[height,opacity] duration-500 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-accent"
                style={{
                  height: `${p.value > 0 ? Math.max(3, (100 * p.value) / max) : 0}%`,
                  background: color,
                  opacity: hover == null || hover === i ? 1 : 0.45,
                }}
              />
            </button>
          ))}
        </div>
        {active && (
          <div
            className="pointer-events-none absolute -top-2 -translate-y-full -translate-x-1/2 rounded-lg bg-fg text-bg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg z-10"
            style={{ left: `${((hover + 0.5) / n) * 100}%` }}
          >
            <span className="font-medium num">
              {active.value}
              {unit}
            </span>
            <span className="opacity-75"> {active.label}</span>
          </div>
        )}
      </div>
      <div className="mt-2 border-t border-line pt-1.5 relative h-5 text-[11px] text-faint num" aria-hidden="true">
        {ticks.map((i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${((i + 0.5) / n) * 100}%` }}
          >
            {points[i].short ?? points[i].label}
          </span>
        ))}
      </div>
    </figure>
  )
}

// Grand chiffre + jauge fine (sans piste de fond pleine).
export function Ratio({ value, total, label, color = 'var(--color-ok)' }) {
  const p = pct(value, total)
  return (
    <div>
      <p className="num text-4xl font-semibold tracking-tight text-fg">
        {total ? `${p} %` : '-'}
      </p>
      <p className="text-[13px] text-muted mt-1">{label}</p>
      <div className="mt-3 h-1.5 w-full rounded-full bg-fg/6 overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  )
}

// Petit tableau de données (alternative accessible aux graphiques).
export function DataTable({ columns, rows, caption }) {
  return (
    <details className="mt-4 group">
      <summary className="text-[13px] text-muted cursor-pointer hover:text-fg select-none">Voir les données</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-left text-muted">
              {columns.map((c) => (
                <th key={c} className="font-medium py-1.5 pr-4 border-b border-line">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j} className="py-1.5 pr-4 border-b border-line/60 num text-fg">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
