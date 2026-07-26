import jsPDF from 'jspdf'

export function generateCertificatePDF({ participantName, eventTitle, eventDates }) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Bordure décorative
  doc.setDrawColor(30, 64, 175) // bleu foncé
  doc.setLineWidth(2)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)

  // Titre
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(30, 64, 175)
  doc.text('CERTIFICAT DE PARTICIPATION', pageWidth / 2, 45, { align: 'center' })

  // Texte intro
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(60, 60, 60)
  doc.text('Ce certificat est décerné à', pageWidth / 2, 65, { align: 'center' })

  // Nom du participant
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(0, 0, 0)
  doc.text(participantName, pageWidth / 2, 80, { align: 'center' })

  // Détails événement
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(60, 60, 60)
  doc.text(`pour sa participation à`, pageWidth / 2, 95, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(30, 64, 175)
  doc.text(eventTitle, pageWidth / 2, 108, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(eventDates, pageWidth / 2, 118, { align: 'center' })

  return doc
}