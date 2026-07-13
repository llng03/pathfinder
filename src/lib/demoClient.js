// Demo-Modus: bildet die im Projekt genutzte Teilmenge der Supabase-API
// (Query-Builder + Auth) auf localStorage ab. Es wird nichts an die
// Datenbank geschickt — alle Daten bleiben im Browser.

import { todayStr, addDays } from './dates.js'

const FLAG_KEY = 'pathfinder-demo-mode'
const DB_KEY = 'pathfinder-demo-db'
const DEMO_USER_ID = 'demo-user'

export function isDemoMode() {
  try {
    return localStorage.getItem(FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function enterDemoMode() {
  localStorage.setItem(FLAG_KEY, '1')
  // Beim ersten Betreten mit Beispieldaten füllen, damit die App
  // nicht leer wirkt; bei Rückkehr bleibt der bisherige Stand erhalten.
  if (!localStorage.getItem(DB_KEY)) {
    saveDb(buildSeedDb())
  }
}

export function exitDemoMode() {
  localStorage.removeItem(FLAG_KEY)
}

// ------------------------------------------------------------
// Persistenz
// ------------------------------------------------------------

const TABLES = [
  'ideas',
  'goals',
  'steps',
  'sprints',
  'sprint_tasks',
  'habits',
  'habit_logs',
  'activity_days',
  'badges',
  'step_dependencies',
]

function emptyDb() {
  return Object.fromEntries(TABLES.map((t) => [t, []]))
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return buildSeedDb()
    return { ...emptyDb(), ...JSON.parse(raw) }
  } catch {
    return buildSeedDb()
  }
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

// ------------------------------------------------------------
// Schema-Wissen: Defaults, Unique-Constraints, Kaskaden, Relationen
// (Spiegel der Migrationen in supabase/migrations)
// ------------------------------------------------------------

const TABLE_DEFAULTS = {
  ideas: () => ({ note: null, reflection: null, status: 'open' }),
  goals: () => ({
    idea_id: null,
    description: null,
    target_date: null,
    status: 'active',
    completed_at: null,
  }),
  steps: () => ({
    parent_step_id: null,
    description: null,
    is_done: false,
    done_at: null,
    sort_order: 0,
    origin: 'manual',
    scheduled_date: null,
    scheduled_time: null,
    lead_time_minutes: 120,
  }),
  sprints: () => ({ status: 'active', completed_at: null, total_tasks: null, done_tasks: null }),
  sprint_tasks: () => ({ is_today_focus: false, focus_date: null }),
  habits: () => ({ archived_at: null }),
  habit_logs: () => ({ log_date: todayStr() }),
  activity_days: () => ({ activity_date: todayStr() }),
  badges: () => ({ earned_at: new Date().toISOString() }),
  step_dependencies: () => ({}),
}

const HAS_UPDATED_AT = new Set(['ideas', 'goals', 'steps'])

const UNIQUE_KEYS = {
  badges: [['user_id', 'badge_key']],
  activity_days: [['user_id', 'activity_date']],
  habit_logs: [['habit_id', 'log_date']],
  sprint_tasks: [['sprint_id', 'step_id']],
  step_dependencies: [['step_id', 'depends_on_step_id']],
}

const CASCADES = {
  goals: [{ table: 'steps', fk: 'goal_id' }],
  steps: [
    { table: 'steps', fk: 'parent_step_id' },
    { table: 'sprint_tasks', fk: 'step_id' },
    { table: 'step_dependencies', fk: 'step_id' },
    { table: 'step_dependencies', fk: 'depends_on_step_id' },
  ],
  sprints: [{ table: 'sprint_tasks', fk: 'sprint_id' }],
  habits: [{ table: 'habit_logs', fk: 'habit_id' }],
}

// Eingebettete Selects wie select('focus_date, steps ( is_done )')
const RELATIONS = {
  sprint_tasks: {
    steps: { table: 'steps', localKey: 'step_id' },
    sprints: { table: 'sprints', localKey: 'sprint_id' },
  },
  steps: {
    goals: { table: 'goals', localKey: 'goal_id' },
  },
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function withDefaults(table, row) {
  const now = new Date().toISOString()
  const base = {
    id: makeId(),
    user_id: DEMO_USER_ID,
    created_at: now,
    ...(HAS_UPDATED_AT.has(table) ? { updated_at: now } : {}),
    ...(TABLE_DEFAULTS[table]?.() ?? {}),
  }
  return { ...base, ...row }
}

function findConflict(db, table, row, conflictCols = null) {
  const keySets = conflictCols ? [conflictCols] : (UNIQUE_KEYS[table] ?? [])
  for (const cols of keySets) {
    const hit = db[table].find((r) => cols.every((c) => r[c] === row[c]))
    if (hit) return hit
  }
  // Partieller Unique-Index: nur ein aktiver Sprint gleichzeitig
  if (table === 'sprints' && row.status === 'active') {
    return db[table].find((r) => r.status === 'active') ?? null
  }
  return null
}

function duplicateError(table) {
  return {
    code: '23505',
    message: `duplicate key value violates unique constraint (Demo: ${table})`,
  }
}

// ------------------------------------------------------------
// Spaltenauswahl inkl. eingebetteter Relationen
// ------------------------------------------------------------

function splitTopLevel(columns) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of columns) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function projectRows(db, table, rows, columns) {
  if (!columns || columns === '*') return rows.map((r) => ({ ...r }))
  const parts = splitTopLevel(columns)
  return rows.map((row) => {
    const out = {}
    for (const part of parts) {
      const relMatch = part.match(/^(\w+)\s*\(\s*([\s\S]*?)\s*\)$/)
      if (relMatch) {
        const rel = RELATIONS[table]?.[relMatch[1]]
        const related = rel ? db[rel.table].find((r) => r.id === row[rel.localKey]) : null
        out[relMatch[1]] = related
          ? projectRows(db, rel.table, [related], relMatch[2] || '*')[0]
          : null
      } else if (part === '*') {
        Object.assign(out, row)
      } else {
        out[part] = row[part]
      }
    }
    return out
  })
}

// ------------------------------------------------------------
// Query-Builder (thenable, damit `await supabase.from(...)...` klappt)
// ------------------------------------------------------------

class DemoQueryBuilder {
  constructor(db, table) {
    this.db = db
    this.table = table
    this.action = { type: 'select', columns: '*', count: null, head: false }
    this.filters = []
    this.orderings = []
    this.limitN = null
    this.wantSingle = false
    this.returning = null
  }

  select(columns = '*', { count = null, head = false } = {}) {
    if (this.action.type === 'select') {
      this.action = { type: 'select', columns, count, head }
    } else {
      this.returning = columns
    }
    return this
  }

  insert(rows) {
    this.action = { type: 'insert', rows: [].concat(rows) }
    return this
  }

  update(patch) {
    this.action = { type: 'update', patch }
    return this
  }

  upsert(rows, options = {}) {
    this.action = { type: 'upsert', rows: [].concat(rows), options }
    return this
  }

  delete() {
    this.action = { type: 'delete' }
    return this
  }

  eq(col, val) {
    this.filters.push((r) => r[col] === val)
    return this
  }

  is(col, val) {
    this.filters.push((r) => r[col] === val)
    return this
  }

  gte(col, val) {
    this.filters.push((r) => r[col] != null && r[col] >= val)
    return this
  }

  order(col, { ascending = true } = {}) {
    this.orderings.push({ col, ascending })
    return this
  }

  limit(n) {
    this.limitN = n
    return this
  }

  single() {
    this.wantSingle = true
    return this
  }

  then(onFulfilled, onRejected) {
    let result
    try {
      result = this.#run()
    } catch (e) {
      result = { data: null, error: { message: e.message }, count: null }
    }
    return Promise.resolve(result).then(onFulfilled, onRejected)
  }

  #matches() {
    return this.db[this.table].filter((r) => this.filters.every((f) => f(r)))
  }

  #finish(rows) {
    let data = projectRows(this.db, this.table, rows, this.returning ?? '*')
    if (this.wantSingle) {
      if (data.length !== 1) {
        return {
          data: null,
          error: { code: 'PGRST116', message: 'Erwartete genau eine Zeile (Demo)' },
          count: null,
        }
      }
      data = data[0]
    }
    return { data, error: null, count: null }
  }

  #run() {
    const db = this.db
    const table = this.table

    if (this.action.type === 'select') {
      let rows = this.#matches()
      for (const { col, ascending } of [...this.orderings].reverse()) {
        rows = [...rows].sort((a, b) => {
          const av = a[col]
          const bv = b[col]
          if (av === bv) return 0
          if (av == null) return 1
          if (bv == null) return -1
          return (av < bv ? -1 : 1) * (ascending ? 1 : -1)
        })
      }
      const count = this.action.count ? rows.length : null
      if (this.action.head) return { data: null, error: null, count }
      if (this.limitN != null) rows = rows.slice(0, this.limitN)
      let data = projectRows(db, table, rows, this.action.columns)
      if (this.wantSingle) {
        if (data.length !== 1) {
          return {
            data: null,
            error: { code: 'PGRST116', message: 'Erwartete genau eine Zeile (Demo)' },
            count: null,
          }
        }
        data = data[0]
      }
      return { data, error: null, count }
    }

    if (this.action.type === 'insert') {
      const inserted = this.action.rows.map((r) => withDefaults(table, r))
      for (const row of inserted) {
        if (findConflict(db, table, row)) {
          return { data: null, error: duplicateError(table), count: null }
        }
      }
      db[table].push(...inserted)
      saveDb(db)
      return this.returning != null || this.wantSingle
        ? this.#finish(inserted)
        : { data: null, error: null, count: null }
    }

    if (this.action.type === 'upsert') {
      const conflictCols = this.action.options.onConflict
        ? this.action.options.onConflict.split(',').map((c) => c.trim())
        : null
      const touched = []
      for (const raw of this.action.rows) {
        const row = withDefaults(table, raw)
        const existing = findConflict(db, table, row, conflictCols)
        if (existing) {
          if (this.action.options.ignoreDuplicates) continue
          Object.assign(existing, raw)
          touched.push(existing)
        } else {
          db[table].push(row)
          touched.push(row)
        }
      }
      saveDb(db)
      return this.returning != null || this.wantSingle
        ? this.#finish(touched)
        : { data: null, error: null, count: null }
    }

    if (this.action.type === 'update') {
      const matched = this.#matches()
      const patch = HAS_UPDATED_AT.has(table)
        ? { ...this.action.patch, updated_at: new Date().toISOString() }
        : this.action.patch
      matched.forEach((row) => Object.assign(row, patch))
      saveDb(db)
      return this.returning != null || this.wantSingle
        ? this.#finish(matched)
        : { data: null, error: null, count: null }
    }

    if (this.action.type === 'delete') {
      const matched = this.#matches()
      cascadeDelete(db, table, matched)
      saveDb(db)
      return this.returning != null
        ? this.#finish(matched)
        : { data: null, error: null, count: null }
    }

    return { data: null, error: { message: `Demo: Aktion nicht unterstützt` }, count: null }
  }
}

function cascadeDelete(db, table, rows) {
  if (rows.length === 0) return
  const doomed = new Set(rows)
  db[table] = db[table].filter((r) => !doomed.has(r))
  const ids = new Set(rows.map((r) => r.id).filter(Boolean))
  if (ids.size === 0) return
  for (const rule of CASCADES[table] ?? []) {
    const children = db[rule.table].filter((r) => ids.has(r[rule.fk]))
    cascadeDelete(db, rule.table, children)
  }
}

// ------------------------------------------------------------
// Client
// ------------------------------------------------------------

export function createDemoClient() {
  const db = loadDb()
  saveDb(db)

  const demoSession = {
    user: { id: DEMO_USER_ID, email: 'demo@pathfinder.local' },
    access_token: 'demo',
  }

  return {
    from(table) {
      if (!db[table]) throw new Error(`Demo: unbekannte Tabelle "${table}"`)
      return new DemoQueryBuilder(db, table)
    },
    auth: {
      async getSession() {
        return { data: { session: demoSession }, error: null }
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } }
      },
      async signOut() {
        exitDemoMode()
        window.location.reload()
        return { error: null }
      },
      async signInWithPassword() {
        return { data: null, error: { message: 'Im Demo-Modus nicht verfügbar' } }
      },
      async signUp() {
        return { data: null, error: { message: 'Im Demo-Modus nicht verfügbar' } }
      },
    },
  }
}

// ------------------------------------------------------------
// Beispieldaten — kleine, stimmige Wald-Wanderung durch alle Features
// ------------------------------------------------------------

function buildSeedDb() {
  const db = emptyDb()
  const today = todayStr()
  const d = (n) => addDays(today, -n)
  const ts = (n) => new Date(Date.now() - n * 86400000).toISOString()
  const uid = DEMO_USER_ID

  db.ideas = [
    {
      id: 'demo-idea-1',
      user_id: uid,
      title: 'Einen Fotokurs besuchen',
      note: 'Vielleicht im Herbst, wenn das Licht weicher wird.',
      reflection: null,
      status: 'open',
      created_at: ts(9),
      updated_at: ts(9),
    },
    {
      id: 'demo-idea-2',
      user_id: uid,
      title: 'Den Balkon in ein Kräuterbeet verwandeln',
      note: null,
      reflection: null,
      status: 'open',
      created_at: ts(6),
      updated_at: ts(6),
    },
  ]

  db.goals = [
    {
      id: 'demo-goal-1',
      user_id: uid,
      idea_id: null,
      title: 'Halbmarathon laufen',
      description: 'Im Herbst beim Stadtlauf über die Ziellinie kommen.',
      target_date: addDays(today, 90),
      status: 'active',
      completed_at: null,
      created_at: ts(12),
      updated_at: ts(12),
    },
    {
      id: 'demo-goal-2',
      user_id: uid,
      idea_id: null,
      title: 'Ein Fotobuch vom letzten Sommer gestalten',
      description: null,
      target_date: null,
      status: 'active',
      completed_at: null,
      created_at: ts(3),
      updated_at: ts(3),
    },
  ]

  const step = (id, title, extra = {}) => ({
    id,
    user_id: uid,
    goal_id: 'demo-goal-1',
    parent_step_id: null,
    title,
    description: null,
    is_done: false,
    done_at: null,
    sort_order: 0,
    origin: 'manual',
    scheduled_date: null,
    scheduled_time: null,
    lead_time_minutes: 120,
    created_at: ts(11),
    updated_at: ts(11),
    ...extra,
  })

  db.steps = [
    step('demo-step-1', 'Trainingsplan für 12 Wochen erstellen', {
      is_done: true,
      done_at: ts(8),
      sort_order: 0,
    }),
    step('demo-step-2', 'Grundlagenausdauer aufbauen', { sort_order: 1 }),
    step('demo-step-2a', '3× pro Woche 5 km laufen', {
      parent_step_id: 'demo-step-2',
      is_done: true,
      done_at: ts(2),
      sort_order: 0,
    }),
    step('demo-step-2b', 'Langen Lauf auf 12 km steigern', {
      parent_step_id: 'demo-step-2',
      sort_order: 1,
    }),
    step('demo-step-3', 'Laufschuhe im Fachgeschäft anpassen lassen', { sort_order: 2 }),
    step('demo-step-4', 'Generalprobe: 18 km am Stück laufen', { sort_order: 3 }),
  ]

  db.step_dependencies = [
    {
      step_id: 'demo-step-4',
      depends_on_step_id: 'demo-step-2b',
      user_id: uid,
      created_at: ts(11),
    },
  ]

  db.sprints = [
    {
      id: 'demo-sprint-1',
      user_id: uid,
      start_date: d(4),
      end_date: addDays(d(4), 14),
      status: 'active',
      completed_at: null,
      total_tasks: null,
      done_tasks: null,
      created_at: ts(4),
    },
  ]

  db.sprint_tasks = [
    {
      id: 'demo-task-1',
      user_id: uid,
      sprint_id: 'demo-sprint-1',
      step_id: 'demo-step-2a',
      is_today_focus: false,
      focus_date: null,
      created_at: ts(4),
    },
    {
      id: 'demo-task-2',
      user_id: uid,
      sprint_id: 'demo-sprint-1',
      step_id: 'demo-step-2b',
      is_today_focus: true,
      focus_date: today,
      created_at: ts(4),
    },
    {
      id: 'demo-task-3',
      user_id: uid,
      sprint_id: 'demo-sprint-1',
      step_id: 'demo-step-3',
      is_today_focus: false,
      focus_date: null,
      created_at: ts(3),
    },
  ]

  db.habits = [
    {
      id: 'demo-habit-1',
      user_id: uid,
      title: '10 Minuten lesen',
      created_at: ts(10),
      archived_at: null,
    },
    {
      id: 'demo-habit-2',
      user_id: uid,
      title: 'Abends eine Runde spazieren',
      created_at: ts(10),
      archived_at: null,
    },
  ]

  db.habit_logs = [
    ...[1, 2, 3, 4].map((n) => ({
      id: `demo-log-h1-${n}`,
      user_id: uid,
      habit_id: 'demo-habit-1',
      log_date: d(n),
      created_at: ts(n),
    })),
    ...[1, 3].map((n) => ({
      id: `demo-log-h2-${n}`,
      user_id: uid,
      habit_id: 'demo-habit-2',
      log_date: d(n),
      created_at: ts(n),
    })),
  ]

  db.activity_days = [1, 2, 3, 4].map((n) => ({
    user_id: uid,
    activity_date: d(n),
  }))

  db.badges = [
    {
      id: 'demo-badge-1',
      user_id: uid,
      badge_key: 'streak_3',
      earned_at: ts(1),
    },
  ]

  return db
}
