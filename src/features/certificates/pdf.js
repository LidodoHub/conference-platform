import jsPDF from 'jspdf'

// Couleurs de la charte (RVB)
const NAVY = [27, 42, 74]
const GOLD = [200, 150, 62]
const MUTED = [90, 100, 120]

// jsPDF (police standard) ne connaît pas les espaces fines insécables produites par toLocaleString('fr-FR')
const clean = (text) =>
  String(text ?? '')
    .replace(new RegExp('[\u202F\u00A0]', 'g'), ' ')
    .replace(new RegExp('[\u2013\u2014]', 'g'), '-')

const longDate = (d) =>
  d ? clean(new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })) : ''

export const dateRangeText = (start, end) => {
  if (!end || String(end).slice(0, 10) === String(start).slice(0, 10)) return `le ${longDate(start)}`
  return `du ${longDate(start)} au ${longDate(end)}`
}

export const slug = (text) =>
  String(text || 'document')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60)

export function certificatePDF({ participantName, eventTitle, start, end, location, organizer }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // cadre
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 14, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 14, W, 1.5, 'F')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.4)
  doc.rect(12, 24, W - 24, H - 36)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('CONFERA', 16, 9.5)

  doc.setTextColor(...GOLD)
  doc.setFontSize(12)
  doc.text('CERTIFICAT DE PARTICIPATION', W / 2, 48, { align: 'center', charSpace: 1.2 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(...MUTED)
  doc.text('Ce certificat atteste que', W / 2, 66, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(...NAVY)
  doc.text(clean(participantName), W / 2, 84, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(...MUTED)
  doc.text('a participé à', W / 2, 100, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...NAVY)
  const titleLines = doc.splitTextToSize(clean(eventTitle), W - 70)
  doc.text(titleLines, W / 2, 114, { align: 'center', lineHeightFactor: 1.3 })

  const afterTitle = 114 + titleLines.length * 8.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...MUTED)
  doc.text(clean(`${dateRangeText(start, end)}${location ? `, ${location}` : ''}`), W / 2, afterTitle + 4, { align: 'center' })

  // pied
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.6)
  doc.line(W / 2 - 40, H - 34, W / 2 + 40, H - 34)
  doc.setFontSize(10)
  doc.text(clean(organizer ? `L'organisateur, ${organizer}` : "L'organisateur"), W / 2, H - 28, { align: 'center' })
  doc.setFontSize(8)
  doc.text(clean(`Délivré le ${longDate(new Date().toISOString())}`), W - 16, H - 16, { align: 'right' })

  return doc
}

export function receiptPDF({ eventTitle, participantName, reference, amount, declaredAt, validatedAt }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 26, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 26, W, 1.2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text('CONFERA', 20, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Accusé de paiement', W - 20, 16, { align: 'right' })

  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Accusé de paiement', 20, 48)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...MUTED)
  const intro = doc.splitTextToSize(
    clean(`Le paiement des frais d'inscription ci-dessous a été vérifié et validé par l'organisateur de « ${eventTitle} ».`),
    W - 40,
  )
  doc.text(intro, 20, 60)

  const rows = [
    ['Participant', participantName],
    ['Événement', eventTitle],
    ['Référence du bordereau', reference],
    ['Montant', `${Number(amount || 0).toLocaleString('fr-FR')} DA`],
    ['Déclaré le', longDate(declaredAt)],
    ['Validé le', longDate(validatedAt)],
  ]
  let y = 60 + intro.length * 6 + 10
  rows.forEach(([label, value]) => {
    doc.setDrawColor(220, 224, 232)
    doc.line(20, y + 4, W - 20, y + 4)
    doc.setTextColor(...MUTED)
    doc.text(label, 20, y)
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    const lines = doc.splitTextToSize(clean(value || '-'), W - 100)
    doc.text(lines, 80, y)
    doc.setFont('helvetica', 'normal')
    y += Math.max(12, lines.length * 6 + 6)
  })

  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(clean(`Document généré le ${longDate(new Date().toISOString())} par CONFERA.`), 20, 285)
  return doc
}
