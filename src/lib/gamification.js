import { supabase } from './supabaseClient'
import { todayStr } from './dates'
import { currentStreak } from './streaks'
import { BADGES } from './badges'

// Badge vergeben; gibt den Key zurück, wenn er NEU verdient wurde
export async function awardBadge(badgeKey) {
  const { data, error } = await supabase
    .from('badges')
    .upsert(
      { badge_key: badgeKey },
      { onConflict: 'user_id,badge_key', ignoreDuplicates: true }
    )
    .select()
  if (error) {
    console.error('Badge-Vergabe fehlgeschlagen:', error.message)
    return null
  }
  return data && data.length > 0 ? badgeKey : null
}

// Heutigen Tag als "aktiv" verbuchen und Streak-Badges prüfen.
// Gibt neu verdiente Badge-Keys zurück.
export async function recordActivity() {
  await supabase
    .from('activity_days')
    .upsert(
      { activity_date: todayStr() },
      { onConflict: 'user_id,activity_date', ignoreDuplicates: true }
    )

  const { data } = await supabase.from('activity_days').select('activity_date')
  const dates = (data ?? []).map((r) => r.activity_date)
  const streak = currentStreak(dates)

  const earned = []
  if (streak >= 3) earned.push(await awardBadge('streak_3'))
  if (streak >= 7) earned.push(await awardBadge('streak_7'))
  if (streak >= 30) earned.push(await awardBadge('streak_30'))
  if (streak >= 60) earned.push(await awardBadge('streak_60'))

  // "Jahreszeiten im Wald": erste Aktivität liegt mindestens ein Jahr zurück
  if (dates.length > 0) {
    const first = dates.reduce((a, b) => (a < b ? a : b))
    if (first <= todayStr(new Date(Date.now() - 365 * 86400000))) {
      earned.push(await awardBadge('one_year_active'))
    }
  }
  return earned.filter(Boolean)
}

// Gewohnheits-Serien: 14 Tage + "Voller Mond" (ein Monat ohne Lücke)
export async function habitStreakBadges(streak) {
  const earned = []
  if (streak >= 14) earned.push(await awardBadge('habit_streak_14'))
  if (streak >= 30) earned.push(await awardBadge('habit_streak_full_month'))
  return earned.filter(Boolean)
}

// "Klare Sicht": an jedem der letzten 7 Tage gab es mindestens eine
// Fokusaufgabe, und alle Fokusaufgaben dieser Tage sind erledigt
async function checkPerfectWeek() {
  const since = todayStr(new Date(Date.now() - 6 * 86400000))
  const { data } = await supabase
    .from('sprint_tasks')
    .select('focus_date, steps ( is_done )')
    .gte('focus_date', since)
  const rows = data ?? []
  const focusDays = new Set(rows.map((r) => r.focus_date))
  if (focusDays.size < 7) return null
  if (!rows.every((r) => r.steps?.is_done)) return null
  return awardBadge('perfect_week')
}

// Nach dem Erledigen eines Schritts: Gesamt-Meilenstein + perfekte Woche
export async function checkStepCompletionBadges() {
  const earned = []
  const { count } = await supabase
    .from('steps')
    .select('id', { count: 'exact', head: true })
    .eq('is_done', true)
  if ((count ?? 0) >= 100) earned.push(await awardBadge('steps_completed_100'))
  if ((count ?? 0) >= 500) earned.push(await awardBadge('steps_completed_500'))
  if ((count ?? 0) >= 1000) earned.push(await awardBadge('steps_completed_1000'))
  earned.push(await checkPerfectWeek())
  return earned.filter(Boolean)
}

// Nach Trail-Abschluss: 5 / 10 abgeschlossene Trails
export async function checkTrailBadges() {
  const earned = []
  const { count } = await supabase
    .from('sprints')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
  if ((count ?? 0) >= 5) earned.push(await awardBadge('trails_completed_5'))
  if ((count ?? 0) >= 10) earned.push(await awardBadge('trails_completed_10'))
  return earned.filter(Boolean)
}

// Beim Anlegen einer Idee: 10 gesammelte Ideen (Status egal —
// auch konvertierte/verworfene wurden gesammelt)
export async function checkIdeaBadges() {
  const { count } = await supabase
    .from('ideas')
    .select('id', { count: 'exact', head: true })
  const earned = []
  if ((count ?? 0) >= 10) earned.push(await awardBadge('ideas_collected_10'))
  return earned.filter(Boolean)
}

export function badgeToastText(badgeKey) {
  const badge = BADGES[badgeKey]
  return badge ? `Erfolg freigeschaltet: ${badge.title}` : null
}
