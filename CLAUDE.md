# Projekt: Pathfinder — Your little guide through the big woods

Persönliche PWA zur Zielsetzung mit 2-Wochen-Sprints, manueller Zielzerlegung,
Gewohnheiten-Tracking und motivierendem Fortschritts-Feedback. Single-User
(keine Multi-User-Logik nötig). Details siehe `docs/anforderungsdokument.md`.

## Branding & Design

- **Name:** Pathfinder
- **Tagline:** "Your little guide through the big woods"
- **Icon:** Fuchs-Icon (`FoxIcon`-Datei im Projektordner) als App-Icon (Favicon, PWA-Manifest, Homescreen)
- **Farbschema:** Dunkelgrün als Basis für Schrift/UI, warme leuchtende Akzente für Fortschritt/Erfolge
- **Atmosphäre:** "Licht durch den dunklen Wald" — Fortschritt wird visuell als Licht dargestellt, das sich durch einen dunklen Waldton durchbricht

## Tech-Stack

- Frontend: React + Vite, PWA (Manifest + Service Worker)
- Backend: Supabase (Postgres + Auth)
- Kein KI-API-Call in v1 (siehe Abschnitt "Nicht jetzt")

## Befehle

```bash
npm run dev      # Dev-Server (Vite)
npm run build    # Production-Build inkl. PWA/Service Worker
npm run preview  # Production-Build lokal testen
npm run lint     # Linter (oxlint)
```

Supabase-Zugangsdaten liegen in `.env.local` (gitignored, Vorlage: `.env.example`).
Das Datenbankschema liegt in `supabase/migrations/0001_initial_schema.sql` und
wird über den Supabase SQL Editor eingespielt.

## Datenmodell (Kerntabellen)

`Ideas`, `Goals`, `Steps`, `Sprints`, `SprintTasks`, `Habits`, `HabitLogs`,
`Streaks`/`Badges`. Details und Feldbedeutungen: siehe `docs/build-prompt.md`.

Wichtige Flags nicht vergessen:
- `Steps.parent_step_id` (nullable, self-referencing) — ermöglicht unbegrenzt tiefe Verschachtelung von Schritten in Unterschritte
- `SprintTasks.step_id` referenziert einen Step auf beliebiger Baumtiefe (nicht nur Blätter)
- `SprintTasks.is_today_focus` (boolean) — für die Fokusaufgaben-Ansicht
- `Goals`/`Steps` brauchen einen abgeleiteten "Braucht Klärung"-Status: **rekursiv über den gesamten Unterbaum** — markiert, wenn offen UND kein offener, kindloser Schritt irgendwo darunter existiert (nicht mehr nur "hat direkte Kinder oder nicht")

## Kernkonventionen

- **Kein Kanban-Board.** Sprintaufgaben werden abgehakt, nicht durch Statusspalten bewegt.
- **Schritte sind unbegrenzt tief verschachtelbar** (Steps können eigene Unterschritte haben). Jede Ebene ist einzeln einplanbar (Sprint) und einzeln abhakbar.
- **"Heute"-Ansicht ist der Standard-Startbildschirm**, nicht die volle Sprintliste.
- **KI-Vorschläge (falls in v2 ergänzt) werden nie automatisch übernommen** — Nutzerin muss jeden Schritt bestätigen/bearbeiten können.
- **Keine Push-Notifications.** Hinweise (z. B. "Never miss twice") erscheinen nur In-App beim nächsten Öffnen.
- **Design:** Pathfinder-Branding — dunkelgrüne Basis, warme Lichtakzente, "Licht durch den dunklen Wald"-Atmosphäre (siehe Abschnitt Branding & Design oben). Keine nüchterne "Business-Tool"-Optik, aber gute Lesbarkeit hat Priorität.

## Nicht jetzt (bewusst außerhalb des Scopes)

- Keine Anthropic-API-Anbindung / KI-Features in v1
- Keine Push-Notifications/Erinnerungen
- Kein Multi-User/Sharing
- Kein natives Mobile-App-Projekt (PWA reicht)

## Referenzdokumente (bei Bedarf lesen, nicht auswendig vorhalten)

- `docs/anforderungsdokument.md` — vollständige User Stories, Akzeptanzkriterien, Priorisierung
- `docs/build-prompt.md` — ursprünglicher Build-Auftrag mit Feature-Reihenfolge

## Hinweis für Claude Code

Wenn du unsicher bist, ob ein Feature/eine Datenmodell-Entscheidung in den
Scope passt, prüfe zuerst `docs/anforderungsdokument.md` (Abschnitt
Priorisierung), bevor du eigenständig entscheidest oder nachfragst.
