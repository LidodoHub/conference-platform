// Export universel vers agendas (RFC 5545 iCalendar et Google Calendar)

const formatICSDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function downloadICS({ title, description, location, start, end, filename = 'conference.ics' }) {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CONFERA//USTO-MB Conference Platform//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@confera.usto-mb.dz`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end || start)}`,
    `SUMMARY:${String(title || 'Conférence USTO').replace(/\n/g, ' ')}`,
    `DESCRIPTION:${String(description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${String(location || 'Campus USTO-MB, Oran').replace(/\n/g, ' ')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function googleCalendarUrl({ title, description, location, start, end }) {
  const s = formatICSDate(start)
  const e = formatICSDate(end || start)
  const dates = `${s}/${e}`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Conférence USTO',
    dates,
    details: description || 'Conférence sur la plateforme CONFERA (USTO-MB).',
    location: location || 'Campus USTO-MB, Oran',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
