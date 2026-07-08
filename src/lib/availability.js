// Verfügbarkeits-Logik für Schritte: Zeitbindung + Abhängigkeiten.
//
// Ein Schritt ist "bereit" (Kandidat für die "Nächster Schritt"-Karte), wenn
//   1. er offen ist,
//   2. er ein Blatt ist (keine Unterschritte),
//   3. keine Zeitbindung hat ODER die aktuelle Zeit im Vorlauffenster
//      [Termin - lead_time_minutes, Termin] liegt,
//   4. alle Schritte, von denen er abhängt, erledigt sind.
//
// Wichtig: Blockierung ist ein Timing-Problem, kein Klarheits-Problem —
// die "Braucht Klärung"-Logik in tree.js bleibt davon unberührt.

import { todayStr, weekdayShort } from './dates'

const DEFAULT_LEAD_MINUTES = 120

// step_dependencies-Zeilen -> Map step_id -> [depends_on_step_id, ...]
export function buildDepsByStep(dependencies) {
  const map = new Map()
  for (const dep of dependencies) {
    if (!map.has(dep.step_id)) map.set(dep.step_id, [])
    map.get(dep.step_id).push(dep.depends_on_step_id)
  }
  return map
}

// Terminzeitpunkt als Date; nur Datum ohne Uhrzeit = Ende des Tages
export function scheduledAt(step) {
  if (!step.scheduled_date) return null
  const [y, m, d] = step.scheduled_date.split('-').map(Number)
  if (step.scheduled_time) {
    const [hh, mm] = step.scheduled_time.split(':').map(Number)
    return new Date(y, m - 1, d, hh, mm)
  }
  return new Date(y, m - 1, d, 23, 59, 59)
}

// 'none' | 'early' (vor dem Vorlauffenster) | 'due' (im Fenster) | 'missed'
export function scheduleState(step, now = new Date()) {
  const at = scheduledAt(step)
  if (!at) return 'none'
  const leadMs = (step.lead_time_minutes ?? DEFAULT_LEAD_MINUTES) * 60000
  // Nur-Datum-Termine gelten den ganzen Tag als "dran"
  const windowStart = step.scheduled_time
    ? new Date(at.getTime() - leadMs)
    : new Date(at.getFullYear(), at.getMonth(), at.getDate())
  if (now > at) return 'missed'
  if (now < windowStart) return 'early'
  return 'due'
}

// z. B. "heute 14:00", "Mo 13.07. 14:00", "Mo 13.07."
export function formatSchedule(step) {
  if (!step.scheduled_date) return ''
  const time = step.scheduled_time ? ` ${step.scheduled_time.slice(0, 5)}` : ''
  if (step.scheduled_date === todayStr()) return `heute${time}`
  const [, m, d] = step.scheduled_date.split('-')
  return `${weekdayShort(step.scheduled_date)} ${d}.${m}.${time}`
}

// ctx = { depsByStep, stepById (ALLE Schritte, Ziel-übergreifend), now }
export function unmetDependencies(step, ctx) {
  const ids = ctx.depsByStep.get(step.id) ?? []
  return ids.map((id) => ctx.stepById.get(id)).filter((s) => s && !s.is_done)
}

// null = sofort machbar; sonst warum nicht:
// { type: 'dependency', waitingOn: [steps] } | { type: 'time', state: 'early'|'missed' }
export function blockReason(step, ctx) {
  const waitingOn = unmetDependencies(step, ctx)
  if (waitingOn.length > 0) return { type: 'dependency', waitingOn }
  const state = scheduleState(step, ctx.now)
  if (state === 'early' || state === 'missed') return { type: 'time', state }
  return null
}

export function blockReasonText(reason, step) {
  if (!reason) return ''
  if (reason.type === 'dependency') {
    return `Wartet auf: ${reason.waitingOn.map((s) => s.title).join(', ')}`
  }
  if (reason.state === 'missed') return `Termin verpasst (${formatSchedule(step)})`
  return `Termin: ${formatSchedule(step)}`
}

// Erster offener Blatt-Schritt in DFS-Reihenfolge, der JETZT machbar ist
export function firstAvailableLeaf(nodes, ctx) {
  for (const n of nodes) {
    if (n.children.length === 0) {
      if (!n.is_done && !blockReason(n, ctx)) return n
    } else {
      const found = firstAvailableLeaf(n.children, ctx)
      if (found) return found
    }
  }
  return null
}

// Alle offenen, aber blockierten Blatt-Schritte — für den Hinweis,
// warum gerade kein "nächster Schritt" frei ist
export function collectBlockedLeaves(nodes, ctx, out = []) {
  for (const n of nodes) {
    if (n.children.length === 0) {
      if (!n.is_done) {
        const reason = blockReason(n, ctx)
        if (reason) out.push({ step: n, reason })
      }
    } else {
      collectBlockedLeaves(n.children, ctx, out)
    }
  }
  return out
}

// Würde "stepId hängt ab von dependsOnId" einen Kreis erzeugen?
// (Erreicht man von dependsOnId aus über Abhängigkeiten stepId?)
export function wouldCreateCycle(stepId, dependsOnId, depsByStep) {
  const stack = [dependsOnId]
  const seen = new Set()
  while (stack.length > 0) {
    const current = stack.pop()
    if (current === stepId) return true
    if (seen.has(current)) continue
    seen.add(current)
    for (const next of depsByStep.get(current) ?? []) stack.push(next)
  }
  return false
}
