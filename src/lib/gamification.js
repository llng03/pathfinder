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
  const streak = currentStreak((data ?? []).map((r) => r.activity_date))

  const earned = []
  if (streak >= 3) earned.push(await awardBadge('streak_3'))
  if (streak >= 7) earned.push(await awardBadge('streak_7'))
  if (streak >= 30) earned.push(await awardBadge('streak_30'))
  return earned.filter(Boolean)
}

export function badgeToastText(badgeKey) {
  const badge = BADGES[badgeKey]
  return badge ? `Erfolg freigeschaltet: ${badge.title}` : null
}
