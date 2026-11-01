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
  d
    ? clean(
        new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      )
    : ''

export const dateRangeText = (start, end) => {
  if (!end || String(end).slice(0, 10) === String(start).slice(0, 10)) return `le ${longDate(start)}`
  return `du ${longDate(start)} au ${longDate(end)}`
}

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

// Reçu officiel de paiement et attestation d'inscription universitaire (Norme comptable USTO-MB)
export function receiptPDF({
  eventTitle,
  participantName,
  affiliation,
  reference,
  paymentRef,
  amount = 5000,
  declaredAt,
  validatedAt,
  start,
  end,
  location,
  paidAt,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Bandeau supérieur marine & or
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 22, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 22, W, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('CONFERA • USTO-MB', 18, 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text("Université des Sciences et de la Technologie d'Oran Mohamed-Boudiaf", W - 18, 14, { align: 'right' })

  // Titre du document
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...NAVY)
  doc.text('REÇU OFFICIEL DE PAIEMENT', 18, 38)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text("Attestation d'inscription et justificatif comptable pour ordre de mission", 18, 44)

  // Ligne de séparation
  doc.setDrawColor(220, 225, 235)
  doc.setLineWidth(0.5)
  doc.line(18, 50, W - 18, 50)

  // Métadonnées du reçu
  const finalRef = reference || paymentRef || `REF-USTO-${new Date().getFullYear()}-001`
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text('RÉFÉRENCE DU PAIEMENT', 18, 58)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text(clean(finalRef), 18, 64)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text('DATE DE VALIDATION', W - 70, 58)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text(longDate(validatedAt || paidAt || declaredAt || new Date()), W - 70, 64)

  // Encadré Participant & Conférence
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(18, 74, W - 36, 46, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  doc.text('BÉNÉFICIAIRE / PARTICIPANT', 24, 83)

  doc.setFontSize(12)
  doc.text(clean(participantName), 24, 91)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(`Affiliation : ${clean(affiliation || "Université d'Oran / Laboratoire de recherche")}`, 24, 98)
  doc.text('Statut : Enseignant-Chercheur / Participant accrédité', 24, 104)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  doc.text('CONFÉRENCE / ÉVÉNEMENT', W / 2 + 10, 83)

  doc.setFontSize(10.5)
  const titleLines = doc.splitTextToSize(clean(eventTitle), W / 2 - 25)
  doc.text(titleLines, W / 2 + 10, 91, { lineHeightFactor: 1.2 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  const afterEv = 91 + titleLines.length * 5.5
  doc.text(clean(`${start ? dateRangeText(start, end) : 'Session universitaire'}${location ? ` • ${location}` : ''}`), W / 2 + 10, afterEv)

  // Tableau récapitulatif
  const tableY = 132
  doc.setFillColor(...NAVY)
  doc.rect(18, tableY, W - 36, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('DÉSIGNATION DES PRESTATIONS', 24, tableY + 6)
  doc.text('MONTANT', W - 36, tableY + 6, { align: 'right' })

  doc.setFillColor(255, 255, 255)
  doc.rect(18, tableY + 9, W - 36, 24, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(18, tableY + 9, W - 36, 24, 'D')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  doc.text("Droits d'inscription au colloque & Actes scientifiques", 24, tableY + 17)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text('Accès aux sessions plénières, ateliers thématiques, recueil des abstracts et pause-café', 24, tableY + 23)

  const formattedAmount = typeof amount === 'number' ? `${amount.toLocaleString('fr-FR')} DZD` : String(amount || '5 000 DZD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text(clean(formattedAmount), W - 36, tableY + 20, { align: 'right' })

  // Total
  doc.setFillColor(241, 245, 249)
  doc.rect(18, tableY + 33, W - 36, 12, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(18, tableY + 33, W - 36, 12, 'D')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  doc.text('TOTAL ACQUITTÉ (TTC)', 24, tableY + 41)
  doc.setFontSize(12)
  doc.setTextColor(42, 142, 102) // vert ok
  doc.text(clean(formattedAmount), W - 36, tableY + 41, { align: 'right' })

  // Tampon et mention légale
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text(
    "Ce document tient lieu de justificatif de paiement acquitté pour la prise en charge des frais de mission et le remboursement par l'établissement de rattachement ou le laboratoire de recherche.",
    18,
    tableY + 56,
    { maxWidth: W - 36, lineHeightFactor: 1.3 }
  )

  // Cachet d'authentification numérique
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1)
  doc.roundedRect(W - 85, tableY + 70, 67, 30, 2, 2, 'D')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GOLD)
  doc.text('RÉPUBLIQUE ALGÉRIENNE', W - 51.5, tableY + 76, { align: 'center' })
  doc.text('UNIVERSITÉ USTO-MB', W - 51.5, tableY + 81, { align: 'center' })
  doc.setTextColor(42, 142, 102)
  doc.text('PAIEMENT VALIDÉ', W - 51.5, tableY + 88, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text("Comité d'Organisation CONFERA", W - 51.5, tableY + 94, { align: 'center' })

  // Pied de page
  doc.setDrawColor(226, 232, 240)
  doc.line(18, H - 18, W - 18, H - 18)
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text("Plateforme CONFERA • Université des Sciences et de la Technologie d'Oran Mohamed-Boudiaf (USTO-MB)", 18, H - 12)
  doc.text(`Émis le ${longDate(new Date())}`, W - 18, H - 12, { align: 'right' })

  doc.save(`recu_inscription_${clean(participantName.slice(0, 15)).replace(/\s+/g, '_')}.pdf`)
  return doc
}

export function exportProceedingsPDF({ eventTitle, submissions = [] }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Page de garde
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 40, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 40, W, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('CONFERA • USTO-MB', 20, 25)

  doc.setTextColor(...GOLD)
  doc.setFontSize(13)
  doc.text('ACTES OFFICIELS & RECUEIL DES COMMUNICATIONS', 20, 58)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...NAVY)
  const titleLines = doc.splitTextToSize(clean(eventTitle), W - 40)
  doc.text(titleLines, 20, 75)

  const accepted = submissions.filter((s) => s.status === 'accepted')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...MUTED)
  doc.text(clean(`Volume officiel des résumés scientifiques acceptés (${accepted.length} communication${accepted.length > 1 ? 's' : ''})`), 20, 105)
  doc.text(clean(`Édition universitaire générée le ${longDate(new Date().toISOString())}`), 20, 113)

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(20, 124, W - 20, 124)

  // Pages d'articles
  accepted.forEach((sub, i) => {
    doc.addPage()

    doc.setFillColor(...NAVY)
    doc.rect(0, 0, W, 10, 'F')
    doc.setFillColor(...GOLD)
    doc.rect(0, 10, W, 1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(clean(eventTitle).slice(0, 60), 15, 7)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...GOLD)
    doc.text(`ARTICLE #${i + 1} • COMMUNICATION SCIENTIFIQUE ACCEPTÉE`, 15, 25)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...NAVY)
    const subTitleLines = doc.splitTextToSize(clean(sub.title), W - 30)
    doc.text(subTitleLines, 15, 34)

    let curY = 34 + subTitleLines.length * 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...MUTED)
    const authorName = sub.profiles?.full_name || 'Auteur'
    doc.text(clean(`Auteur principal : ${authorName}`), 15, curY)
    curY += 8

    doc.setDrawColor(220, 224, 232)
    doc.line(15, curY, W - 15, curY)
    curY += 8

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text('RÉSUMÉ :', 15, curY)
    curY += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 35, 45)
    const abstractLines = doc.splitTextToSize(clean(sub.abstract || 'Aucun résumé déposé.'), W - 30)
    doc.text(abstractLines, 15, curY)

    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`CONFERA Proceedings • Page ${i + 2}`, W / 2, H - 10, { align: 'center' })
  })

  doc.save(`actes_${clean(eventTitle.slice(0, 15)).replace(/\s+/g, '_')}.pdf`)
  return doc
}
