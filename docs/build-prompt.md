# Build-Prompt: Pathfinder — Your little guide through the big woods

> Diesen Prompt kannst du direkt in Claude Code (oder ein ähnliches
> KI-Coding-Tool) einfügen, um die App entwickeln zu lassen. Er basiert auf
> dem gemeinsam erarbeiteten Anforderungsdokument.

---

Baue **Pathfinder**, eine persönliche Produktivitäts- und Zielsetzungs-App
als Progressive Web App (PWA). Zielgruppe: eine einzelne Nutzerin (kein
Multi-User/Sharing nötig). Ziel ist ein System, das Ideen sammelt, Ziele in
Etappen zerlegt, diese in 2-Wochen-Sprints plant und den Fortschritt
motivierend visualisiert.

## Tech-Stack
- Frontend: React (Vite), PWA-fähig (installierbar, Manifest, Service Worker
  für Basis-Offline-Caching der Ansichten)
- Backend/Datenhaltung: Supabase (Postgres + Auth + Storage), für
  geräteübergreifenden Sync zwischen Handy und PC
- Responsive Design für Mobile + Desktop aus einer Codebasis
- **Kein KI-API-Anbindung in dieser Version** — Ziele werden vollständig
  manuell in Teilschritte unterteilt. Das Datenmodell für Teilschritte
  sollte aber so gestaltet sein, dass eine spätere KI-gestützte Zerlegung
  ohne größeren Umbau ergänzbar wäre (z. B. Herkunfts-Flag "manuell" vs.
  "KI-generiert" pro Teilschritt vorsehen, auch wenn v1 nur "manuell" nutzt)

## Kernfunktionen

### 1. Ideenpool
- Neue Idee anlegen: Titel + optionale Notiz
- Eigene Ansicht "Ideenpool", getrennt von aktiven Zielen
- Freitextfeld pro Idee für Reflexion (z. B. "Relevanz / Zeitaufwand")
- Aktion "Zu Ziel machen" (verschiebt Idee in aktive Ziele) oder "Verwerfen"

### 2. Ziele & Zerlegung (rekursive Baumstruktur)
- Ziel anlegen: Titel, Beschreibung, optionales Zieldatum
- Teilschritte manuell hinzufügen, bearbeiten, löschen, als erledigt markieren,
  in eine Reihenfolge bringen (z. B. Drag & Drop oder Auf-/Abwärts-Pfeile)
- **Jeder Schritt kann selbst wieder eigene Unterschritte haben — unbegrenzt
  tief verschachtelbar** (Schritt → Unterschritt → Unter-Unterschritt, usw.)
- Datenmodell: `steps`-Tabelle mit Selbstreferenz `parent_step_id` (nullable,
  FK auf `steps.id`). Root-Schritte eines Ziels haben `parent_step_id = null`
  und ein `goal_id`-Feld. Für performantes Laden des gesamten Baums eines
  Ziels: rekursive CTE (`WITH RECURSIVE`) in Postgres verwenden.
- UI: verschachtelte, ein-/ausklappbare Liste (Tree-View) mit Breadcrumb/
  Pfad-Anzeige beim Navigieren in einen tieferen Ast
- **Jede Ebene ist unabhängig als "erledigt" markierbar** — kein Zwang, dass
  ein Elternschritt automatisch fertig wird, wenn alle Kinder fertig sind
  (kann als spätere UX-Verbesserung ergänzt werden, ist aber kein Muss)
- Kein KI-Feature in dieser Version — Zerlegung erfolgt komplett manuell

### 3. Sprintplanung (2-Wochen-Rhythmus)
- Sprint = fester 2-Wochen-Zeitraum (Start-/Enddatum automatisch berechnet
  ab Startklick)
- Beim Sprintstart: Schritte aus bestehenden Zielen auswählen und dem
  Sprint fest zuordnen — **auf jeder beliebigen Ebene der Baumstruktur**
  (ein großer Teilschritt oder ein kleiner Unter-Unterschritt können
  gleichermaßen direkt eingeplant werden). `SprintTasks` referenziert daher
  einfach eine `step_id`, unabhängig von deren Tiefe im Baum. Keine
  Statusspalten/Kanban — einfaches Abhaken.
- Am Sprintende: Zusammenfassungs-Screen (erledigt vs. offen, Erfolgsquote)
- Neuer Sprint kann erst gestartet werden, wenn vorheriger beendet oder
  bewusst übersprungen wurde

### 4. Fortschritt & Motivation
- Fortschrittsbalken pro Ziel (Anteil erledigter Teilschritte)
- Fortschrittsanzeige für den laufenden Sprint
- Prominente "Nächster Schritt"-Karte auf dem Dashboard (zeigt einen
  konkreten, nicht weiter unterteilten offenen Schritt — also die unterste
  offene Ebene im Baum, kein großes Teilziel)
- Gamification: Streak-Zähler (aufeinanderfolgende aktive Tage), Badges/
  Erfolge (z. B. "Erster Sprint abgeschlossen", "7-Tage-Streak"), einfache
  Statistik-Übersicht (abgeschlossene Sprints, Erfolgsquote insgesamt)
- Kein KI-gestützter Analyse-Button in dieser Version

### 5. Design & Branding
- **App-Name:** Pathfinder
- **Tagline:** "Your little guide through the big woods"
- **Icon:** Fuchs-Icon (`FoxIcon`-Datei liegt im Projektordner) — als App-Icon
  (Homescreen, Favicon, PWA-Manifest-Icon) verwenden
- **Farbschema:** Dunkelgrün als Basisfarbe für Schrift und UI-Elemente,
  kombiniert mit warmen, leuchtenden Akzentfarben (z. B. Gold-/Amber-Töne)
  für Fortschritt, erledigte Aufgaben und Erfolge
- **Atmosphäre: "Licht durch den dunklen Wald"** — dunkler, waldiger
  Grundton (Tannengrün/Dunkelgrün, ggf. dunkle Brauntöne), der durch helle,
  warme Lichtpunkte durchbrochen wird. Visuelles Prinzip: Fortschritt = Licht,
  das sich seinen Weg durch den Wald bahnt (z. B. Fortschrittsbalken als
  "Lichtstrahl", Badges/Erfolge mit leuchtendem Glow-Effekt)
- Aufgeräumt trotz dunklem Grundton — gute Lesbarkeit hat Priorität vor Optik
- Klare visuelle Belohnung bei erledigten Aufgaben (z. B. kurzes Aufleuchten/
  Glow, sanfte Licht-Animation bei Sprintabschluss)
- Klare visuelle Hierarchie zwischen "was ist als Nächstes dran" (hell/
  prominent) und Detailinformationen (zurückhaltender, dunkler)

### 6. Fokusaufgaben für heute
- Aus den Aufgaben des aktuellen Sprints beliebig viele (kein Limit) als
  "heute im Fokus" markieren
- Eigene "Heute"-Ansicht als Standard-Startbildschirm: zeigt NUR die heute
  markierten Aufgaben, nicht die komplette Sprintliste
- Sprint-Gesamtübersicht bleibt über eigene Navigation erreichbar, ist aber
  nicht die Default-Ansicht
- Aufgaben können jederzeit aus der Tagesauswahl entfernt werden, ohne aus
  dem Sprint gelöscht zu werden
- Nicht heute erledigte Fokusaufgaben bleiben unverändert im Sprint und
  können am nächsten Tag erneut ausgewählt werden (kein automatisches
  Verschwinden/Verfallen)

### 7. "Braucht Klärung"-Markierung (rekursiv über den ganzen Baum)
- Ein Ziel oder Schritt wird automatisch markiert, wenn er **offen ist UND
  in seinem gesamten Unterbaum kein einziger offener, kindloser Schritt
  (= konkrete nächste Handlung) existiert**
- Technisch: rekursive Abfrage (`WITH RECURSIVE`) pro Ziel/Schritt, die
  prüft, ob mindestens ein offener Blatt-Schritt (kein Kind, `is_done = false`)
  im Unterbaum existiert. Kann als Datenbank-View/Funktion umgesetzt werden,
  oder client-seitig berechnet werden, wenn der ganze Baum ohnehin geladen ist
  (bei der zu erwartenden Datenmenge für ein persönliches Tool unproblematisch)
- Markierung wird automatisch neu berechnet bei jeder Änderung am Baum
  (Schritt hinzugefügt/gelöscht/erledigt)
- Auf dem Dashboard werden so markierte Ziele/Schritte sichtbar hervorgehoben,
  nicht nur in der Detailansicht
- Beim Markieren optional ein kurzer, freundlicher Hinweistext, der zum
  Formulieren des nächsten Schritts anregt

### 8. Gewohnheiten-Tracking (getrennt von Zielen)
- Eigener Objekttyp "Gewohnheit": Titel, kein festes Enddatum, wiederkehrend
  (z. B. täglich), eigene Übersicht getrennt von der Zielliste
- Tägliches Abhaken pro Gewohnheit
- Kalender-Heatmap-Ansicht pro Gewohnheit (Verlauf der letzten Wochen/Monate,
  nicht nur Einzeltag-Status)
- Streak-Zähler für aktuelle Serie aufeinanderfolgender erledigter Tage
- **"Never miss twice"-Logik:** Ein einzelner verpasster Tag wird neutral
  dargestellt, keine harte Bestrafung. Erst bei zwei aufeinanderfolgenden
  verpassten Tagen erscheint beim nächsten App-Öffnen ein freundlicher,
  nicht wertender Hinweis — **rein In-App, keine Push-Notification** (siehe
  "keine Notifications"-Vorgabe)

### 9. Zeitliche Bindung & Abhängigkeiten zwischen Schritten
- **Zeitbindung:** `steps.scheduled_at` (nullable timestamp) — optionaler
  Zeitpunkt, zu dem ein Schritt stattfindet/erst relevant wird (z. B.
  Vorlesungstermin). Kein Enddatum, sondern "ab wann/wann genau relevant".
- **Abhängigkeiten:** eigene Join-Tabelle `step_dependencies` (`step_id`,
  `depends_on_step_id`) — ermöglicht n:m-Abhängigkeiten, auch über
  Ziel-/Ast-Grenzen hinweg (nicht nur innerhalb desselben Teilbaums)
- **"Nächster Schritt"-Logik anpassen:** ein Schritt gilt nur dann als
  vorschlagbar, wenn er offen ist, keine eigenen Kinder hat, UND
  - alle Einträge in `step_dependencies` für diesen Schritt bereits
    `is_done = true` sind, UND
  - `scheduled_at` entweder `null` ist oder in der Vergangenheit/heute liegt
- **"Heute"-Seite:** zusätzlicher Bereich für zeitgebundene, heute anstehende
  Schritte (sortiert nach Uhrzeit), getrennt von der "Nächster Schritt"-Karte
- **Transparenz bei Blockierung:** blockierte Schritte (Abhängigkeit offen
  oder `scheduled_at` in der Zukunft) bei Anzeige in der Baumansicht mit
  Hinweis kennzeichnen (z. B. "wartet auf: Bettwäsche waschen" oder
  "geplant für: Di 14.07., 10:00")
- **Wichtig:** Diese Filterung betrifft ausschließlich die
  Vorschlagslogik für den nächsten Schritt — die "Braucht Klärung"-Logik
  (Punkt 7) bleibt unverändert und zählt blockierte Schritte weiterhin als
  existierende konkrete Schritte

### 9. Zeitliche & inhaltliche Abhängigkeiten von Schritten
- **Zeitbindung:** Schritt bekommt optionale Felder `scheduled_date` (Datum)
  und `scheduled_time` (Uhrzeit), sowie `lead_time_minutes` (Vorlaufzeit,
  Standard z. B. 120 = 2 Std.)
  - Als "nächster Schritt" nur vorschlagen, wenn `now()` zwischen
    `scheduled_at - lead_time_minutes` und `scheduled_at` liegt
  - Außerhalb des Fensters: nicht als nächster Schritt vorschlagen, aber
    weiterhin normal sichtbar/editierbar (z. B. mit "verpasst"-Markierung,
    wenn Zeit verstrichen ist)
- **Abhängigkeiten:** neue Tabelle `step_dependencies` (`step_id`,
  `depends_on_step_id`, beide FK auf `steps.id`, zusammengesetzter Primary
  Key)
  - Ein Schritt gilt nur als "bereit", wenn alle über `step_dependencies`
    zugeordneten Voraussetzungs-Schritte `is_done = true` sind
  - Beim Anlegen einer Abhängigkeit: Zyklen verhindern (z. B. rekursive
    Prüfung vor dem Insert, ob der Ziel-Schritt bereits (indirekt) von sich
    selbst abhängt)
- **"Nächster Schritt"-Berechnung** (ersetzt die einfache Logik aus Punkt 4):
  ein Schritt ist Kandidat für die "Nächster Schritt"-Karte, wenn er
  1. offen ist, 2. keine Kinder hat (Blatt), 3. keine Zeitbindung hat ODER
  innerhalb des Zeitfensters liegt, UND 4. keine offenen Abhängigkeiten hat.
  Gibt es keinen solchen Kandidaten, zeige stattdessen freundlich den
  nächstliegenden blockierten Schritt mit Blockierungsgrund (z. B. "Wartet
  auf: Bettwäsche waschen" oder "Nächster Termin: Mo 14:00")
- **Fokusaufgaben-Ansicht (Punkt 6):** blockierte Aufgaben visuell als
  "noch nicht bereit" kennzeichnen, nicht wie normale offene Aufgaben
  darstellen
- **"Braucht Klärung" (Punkt 7):** Logik bleibt unverändert — ein blockierter,
  aber klar definierter Schritt zählt weiterhin als vorhandener nächster
  Schritt und löst keine "Braucht Klärung"-Markierung aus

## Nicht-funktionale Vorgaben
- Kernansichten (Dashboard, aktueller Sprint) sollen schnell laden
- Keine Erinnerungen/Notifications in dieser Version
- Architektur so anlegen, dass Notifications später ergänzbar wären, ohne
  alles umzubauen
- Keine Weitergabe persönlicher Daten an Dritte (keine externen KI-API-Calls in dieser Version)

## Vorgehen
1. Schlage zunächst eine Datenbank-/Tabellenstruktur in Supabase vor
   (Tabellen für Ideas, Goals, Steps, Sprints, SprintTasks, Streaks/Badges,
   Habits, HabitLogs (Datum + erledigt-Status pro Gewohnheit und Tag);
   **Steps braucht `parent_step_id` (nullable, self-referencing) für
   unbegrenzt tiefe Verschachtelung**; SprintTasks referenziert `step_id`
   unabhängig von der Tiefe im Baum; Goals/Steps brauchen eine ableitbare
   "Braucht Klärung"-Logik über den gesamten Unterbaum)
2. Setze das Projekt-Grundgerüst auf (Vite + React + PWA-Setup + Supabase-
   Client) — keine Anthropic-API-Anbindung nötig
3. Baue die Features iterativ in dieser Reihenfolge: Ideenpool → Ziele &
   manuelle Teilschritte (inkl. "Braucht Klärung"-Markierung) → Sprintplanung
   → Fokusaufgaben-Ansicht für heute → Fortschrittsanzeige → Gamification →
   Gewohnheiten-Tracking (Heatmap & Never-miss-twice)
4. Frage nach, falls für ein Feature eine Design- oder Datenmodell-
   Entscheidung nicht eindeutig aus dieser Beschreibung hervorgeht

---

*Basierend auf dem Anforderungsdokument vom [Datum einfügen]. Bei Bedarf
Details (z. B. genaue Badge-Liste, Farbschema) direkt beim Prompten weiter
konkretisieren.*