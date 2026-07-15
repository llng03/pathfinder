// Datums-Helfer — alle Funktionen arbeiten mit lokalen 'YYYY-MM-DD'-Strings,
// damit Habit-Logs und Fokus-Tage der lokalen Zeitzone folgen.

export function todayStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Logischer Tag: der Tag wechselt erst um 03:30 Uhr, nicht um Mitternacht —
// alles davor zählt noch zum Vortag (lokale Zeitzone). Gilt überall, wo die
// aktuelle Aktivität einem Tag zugeordnet wird (Gewohnheiten, "Heute"-Ansicht,
// Streaks); nutzerdefinierte Termine (scheduled_date/scheduled_time) bleiben
// reale Kalenderzeit.
export const DAY_BOUNDARY_HOUR = 3
export const DAY_BOUNDARY_MINUTE = 30

export function getLogicalDate(date = new Date()) {
  const shifted = new Date(date)
  shifted.setMinutes(shifted.getMinutes() - (DAY_BOUNDARY_HOUR * 60 + DAY_BOUNDARY_MINUTE))
  return todayStr(shifted)
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  return todayStr(date)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

export function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export function weekdayShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}
