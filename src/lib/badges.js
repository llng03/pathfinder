import {
  Sprout,
  Tent,
  Star,
  Flame,
  Footprints,
  Moon,
  Repeat,
  TreePine,
} from 'lucide-react'

// Badge-Katalog — badge_key entspricht der Spalte badges.badge_key.
// icon ist eine Lucide-Icon-Komponente (Rendering z. B. <badge.icon />).
export const BADGES = {
  first_goal: {
    icon: Sprout,
    title: 'Erster Samen',
    description: 'Dein erstes Ziel angelegt',
  },
  first_sprint_completed: {
    icon: Tent,
    title: 'Erste Etappe',
    description: 'Deinen ersten Trail abgeschlossen',
  },
  perfect_sprint: {
    icon: Star,
    title: 'Lichtung erreicht',
    description: 'Alle Aufgaben eines Trails erledigt',
  },
  streak_3: {
    icon: Flame,
    title: 'Funke',
    description: '3 Tage in Folge aktiv',
  },
  streak_7: {
    icon: Footprints,
    title: 'Fährtenleserin',
    description: '7 Tage in Folge aktiv',
  },
  streak_30: {
    icon: Moon,
    title: 'Waldläuferin',
    description: '30 Tage in Folge aktiv',
  },
  first_habit: {
    icon: Repeat,
    title: 'Neuer Pfad',
    description: 'Deine erste Gewohnheit angelegt',
  },
  habit_streak_14: {
    icon: TreePine,
    title: 'Tiefe Wurzeln',
    description: '14-Tage-Serie bei einer Gewohnheit',
  },
}
