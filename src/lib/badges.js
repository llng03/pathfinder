import {
  Sprout,
  Tent,
  Star,
  Flame,
  Footprints,
  Moon,
  Repeat,
  TreePine,
  Mountain,
  Route,
  TreeDeciduous,
  MoonStar,
  Compass,
  Sun,
  Package,
  Trees,
  Gem,
  Crown,
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
  trails_completed_5: {
    icon: Compass,
    title: 'Pfadfinderin',
    description: '5 Trails abgeschlossen',
  },
  trails_completed_10: {
    icon: Mountain,
    title: 'Gipfelstürmerin',
    description: '10 Trails abgeschlossen',
  },
  perfect_week: {
    icon: Sun,
    title: 'Klare Sicht',
    description: 'Alle Fokusaufgaben einer Woche erledigt',
  },
  steps_completed_100: {
    icon: Route,
    title: 'Weiter Weg',
    description: '100 Schritte insgesamt erledigt',
  },
  
  ideas_collected_10: {
    icon: Package,
    title: 'Sammlerin',
    description: '10 Ideen im Ideenpool gesammelt',
  },
  streak_60: {
    icon: TreeDeciduous,
    title: 'Waldgeist',
    description: '60 Tage in Folge aktiv',
  },
  habit_streak_full_month: {
    icon: MoonStar,
    title: 'Voller Mond',
    description: 'Einen ganzen Monat ohne Lücke bei einer Gewohnheit',
  },
  steps_completed_500: {
    icon: Gem,
    title: 'Verborgener Schatz',
    description: '500 Schritte insgesamt erledigt',
  },
  steps_completed_1000: {
    icon: Crown,
    title: 'Königin des Waldes',
    description: '1000 Schritte insgesamt erledigt',
  },
  one_year_active: {
    icon: Trees,
    title: 'Jahreszeiten im Wald',
    description: 'Ein Jahr dabei seit dem ersten Tag',
  },
}