import { addDays, todayStr } from './dates'

// Aktuelle Serie aufeinanderfolgender Tage, rückwärts ab heute gezählt.
// Ist heute (noch) nicht dabei, zählt die Serie ab gestern weiter —
// der Streak "reißt" also erst, wenn ein ganzer Tag ausgelassen wurde.
export function currentStreak(dateStrings, today = todayStr()) {
  const set = new Set(dateStrings)
  let cursor = set.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (set.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

// "Never miss twice": true, wenn gestern UND vorgestern verpasst wurden.
// Ein einzelner verpasster Tag bleibt neutral.
export function missedTwice(dateStrings, today = todayStr()) {
  const set = new Set(dateStrings)
  const yesterday = addDays(today, -1)
  const dayBefore = addDays(today, -2)
  return !set.has(yesterday) && !set.has(dayBefore)
}
