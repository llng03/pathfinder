# Anforderungsdokument: Persönliches Ziel- & Produktivitätssystem

## 1. Vision

Ein persönliches System zur Zielsetzung und -verfolgung nach dem Vorbild agiler
2-Wochen-Sprints. Ideen werden zunächst gesammelt und reflektiert, bevor sie zu
verbindlichen Zielen werden. Ziele werden manuell in konkrete, planbare Schritte
zerlegt. Fortschritt wird visuell und motivierend dargestellt. Die App läuft
geräteübergreifend (Handy + PC) mit synchronisierten Daten.

*(KI-Features wie automatische Zielzerlegung sind in v1 bewusst ausgeklammert,
um den Setup-Aufwand — API-Konto, Abrechnung — gering zu halten. Die
Architektur schließt eine spätere Nachrüstung nicht aus.)*

## 2. Stakeholder

| Rolle | Person | Interesse |
|---|---|---|
| Nutzerin | Du (Informatikstudentin) | Motivation, Übersicht, persönliches Wachstum |
| Entwicklerin | Du | Lernprojekt, sauberer Code, sinnvoller Scope |

Single-User-System (kein Sharing/Multi-User in v1 vorgesehen).

## 3. Funktionale Anforderungen (User Stories)

### 3.1 Ideen-Sammlung (Backlog / "Parkplatz")
**US-1:** Als Nutzerin möchte ich spontane Ideen für mögliche Ziele festhalten
können, ohne dass sie sofort als verbindliches Ziel gelten.
- AK1: Eine Idee kann mit Titel und optionaler Notiz gespeichert werden.
- AK2: Ideen erscheinen in einer separaten Ansicht ("Ideenpool"), getrennt von aktiven Zielen.
- AK3: Zu jeder Idee kann ich Notizen zu Relevanz/Zeitaufwand ergänzen (z. B. Freitextfeld "Warum jetzt (nicht)?").
- AK4: Eine Idee kann ich jederzeit zu einem aktiven Ziel "befördern" oder verwerfen.

### 3.2 Zielsetzung & Zerlegung
**US-2:** Als Nutzerin möchte ich Ziele festlegen und sie manuell in kleinere
Etappen unterteilen — und jede Etappe bei Bedarf wieder in noch kleinere
Schritte, beliebig tief, damit ich nie vor einem zu großen, unklaren Schritt stehe.
- AK1: Ein Ziel hat Titel, Beschreibung, optional Zieldatum.
- AK2: Ich kann manuell Teilschritte/Aufgaben zu einem Ziel hinzufügen, bearbeiten, löschen, in eine Reihenfolge bringen.
- AK3: **Jeder Teilschritt kann selbst wieder in Unterschritte unterteilt werden — unbegrenzt tief** (Schritt → Unterschritt → Unter-Unterschritt, usw.).
- AK4: Die Baumstruktur wird übersichtlich dargestellt (z. B. einklapp-/ausklappbare verschachtelte Liste), mit Breadcrumb/Pfad-Anzeige, wenn ich tiefer in einen Ast navigiere.
- AK5: Ein Schritt auf jeder beliebigen Ebene kann unabhängig als erledigt markiert werden.
- AK6: *(Zurückgestellt für v2)* Auf Wunsch schlägt eine KI eine Zerlegung des Ziels in Teilschritte vor, die ich vor Übernahme bearbeiten kann.

### 3.3 Sprintplanung (2-Wochen-Rhythmus)
**US-3:** Als Nutzerin möchte ich alle 2 Wochen einen Sprint mit klaren,
im Voraus eingeplanten Aufgaben starten.
- AK1: Ein Sprint hat einen festen Zeitraum von 2 Wochen (Start-/Enddatum automatisch berechnet).
- AK2: Ich kann zu Sprintbeginn Schritte aus meinen Zielen auswählen und dem Sprint fest zuordnen — **auf jeder beliebigen Ebene der Baumstruktur** (sowohl ein kleiner Unter-Unterschritt als auch ein größerer Teilschritt können direkt eingeplant werden).
- AK3: Aufgaben werden nicht in Statusspalten verschoben (kein Kanban-Board) — ich hake sie als erledigt ab.
- AK4: Am Ende eines Sprints sehe ich eine Zusammenfassung: erledigt vs. offen.
- AK5: Ich kann einen neuen Sprint erst starten, wenn der vorherige beendet ist oder ich das bewusst überspringe.

### 3.4 Fortschritt & Motivation
**US-4:** Als Nutzerin möchte ich meinen Fortschritt sehen und motiviert werden.
- AK1: Fortschritt pro Ziel wird visuell dargestellt (z. B. Fortschrittsbalken auf Basis erledigter Teilschritte).
- AK2: Fortschritt pro laufendem Sprint wird visuell dargestellt.
- AK3: Der nächste anstehende Schritt ist auf einen Blick erkennbar (z. B. prominente "Nächster Schritt"-Karte) — gemeint ist dabei immer ein **konkreter, nicht weiter unterteilter Schritt** (unterste offene Ebene im Baum), nicht ein großes Teilziel.
- AK4: Gamification-Elemente sind vorhanden: Streaks (z. B. "X Tage in Folge aktiv"), Badges/Erfolge, einfache Statistiken (z. B. abgeschlossene Sprints, Erfolgsquote).
- AK5: *(Zurückgestellt für v2)* Auf Wunsch analysiert die KI meinen bisherigen Fortschritt (z. B. Muster wie "diese Art Aufgabe bleibt oft liegen") und gibt Hinweise.

### 3.5 Interface & Plattform
**US-5:** Als Nutzerin möchte ich ein ansprechendes Interface auf Handy und PC nutzen.
- AK1: Responsive Design, optimiert für Smartphone- und Desktop-Nutzung.
- AK2: Als PWA installierbar (Homescreen-Icon, Vollbildmodus).
- AK3: Konsistentes visuelles Design im **Pathfinder**-Branding: dunkelgrüne Basisfarbe für Schrift/UI, warme Lichtakzente, Wald-/"Licht durchbricht Dunkelheit"-Atmosphäre (Details siehe Abschnitt 6, Branding & Design-Identität), sanfte Animationen bei Fortschritt/Erfolgen.
- AK4: Daten sind geräteübergreifend synchron (gleicher Stand auf Handy und PC).

### 3.6 Fokusaufgaben für heute
**US-6:** Als Nutzerin möchte ich mir für den heutigen Tag eine Auswahl an
Fokusaufgaben aus meinem Sprint zusammenstellen, damit ich nicht von der
gesamten 2-Wochen-Aufgabenmenge überwältigt werde.
- AK1: Aus den Sprintaufgaben kann ich beliebig viele Aufgaben als "heute im Fokus" markieren (kein festes Limit).
- AK2: Eine "Heute"-Ansicht zeigt ausschließlich die für heute markierten Aufgaben — nicht die komplette Sprintliste.
- AK3: Die Sprint-Gesamtübersicht bleibt weiterhin über eine bewusste Navigation erreichbar, ist aber nicht die Standardansicht des Tages.
- AK4: Als-heute-markierte Aufgaben können jederzeit wieder aus der Tagesauswahl entfernt werden (ohne aus dem Sprint gelöscht zu werden).
- AK5: Nicht heute erledigte Fokusaufgaben verschwinden nicht automatisch — sie bleiben im Sprint und können am nächsten Tag erneut ausgewählt werden.

### 3.7 "Braucht Klärung"-Markierung
**US-7:** Als Nutzerin möchte ich aktiv erinnert werden, wenn einem Ziel oder
Teilschritt der nächste konkrete Schritt fehlt, damit ich nicht unbemerkt ins
Stocken gerate — auch bei tief verschachtelten Zielen.
- AK1: Ein Ziel oder Schritt wird automatisch als "Braucht Klärung" markiert, wenn er **offen ist (nicht erledigt) und in seinem gesamten Unterbaum kein einziger offener, nicht weiter unterteilter Schritt existiert** (also aktuell nirgendwo darunter eine konkret ausführbare nächste Handlung erkennbar ist).
- AK2: Diese Markierung wird automatisch neu berechnet, sobald sich der Baum ändert (z. B. neuer Unterschritt hinzugefügt, ein Schritt erledigt) — verschwindet, sobald wieder ein offener, unterteilter Schritt existiert.
- AK3: Auf dem Dashboard werden Ziele/Schritte mit "Braucht Klärung"-Status sichtbar hervorgehoben, statt stillschweigend liegen zu bleiben.
- AK4: Optional: ein kleiner Hinweistext/Prompt bei der Markierung, der zum Formulieren des nächsten Schritts anregt (z. B. "Was ist der nächste konkrete Schritt hier?").

### 3.8 Gewohnheiten-Tracking (Heatmap & sanfte Erinnerung)
**US-8:** Als Nutzerin möchte ich wiederkehrende Gewohnheiten (z. B. Gym)
getrennt von einmaligen Zielen verfolgen, mit einer sichtbaren Kette statt
nur einem Einzeltag-Status, und einer sanften Erinnerung statt Bestrafung.
- AK1: Eigener Objekttyp "Gewohnheit" — Titel, kein festes Enddatum, wiederkehrend (z. B. täglich).
- AK2: Pro Tag lässt sich die Gewohnheit als erledigt abhaken.
- AK3: Kalender-Heatmap-Ansicht zeigt den Verlauf der letzten Wochen/Monate auf einen Blick (statt nur "heute ja/nein").
- AK4: Streak-Zähler zeigt die aktuelle Serie aufeinanderfolgender erledigter Tage.
- AK5: **"Never miss twice":** Ein einzelner verpasster Tag wird neutral dargestellt (keine harte Bestrafung/kein dramatischer Reset-Hinweis). Erst bei **zwei aufeinanderfolgenden** verpassten Tagen zeigt die App beim nächsten Öffnen einen freundlichen, nicht wertenden Hinweis (**kein Push, rein In-App**, passend zur bestehenden "keine Notifications"-Vorgabe).
- AK6: Gewohnheiten erscheinen in einer eigenen Übersicht, getrennt von der Zielliste.

### 3.9 Zeitliche Bindung & Abhängigkeiten zwischen Schritten
**US-9:** Als Nutzerin möchte ich Schritte als "an eine feste Zeit gekoppelt"
oder "abhängig von einem anderen Schritt" markieren können, damit mir nie
ein Schritt als "nächster Schritt" vorgeschlagen wird, der aktuell gar nicht
durchführbar ist.
- AK1: Ein Schritt kann optional mit Datum/Uhrzeit versehen werden (z. B. "Vorlesung ASE, 10:00 Uhr, Di 14.07."). Das ist kein Enddatum wie beim Ziel, sondern der Zeitpunkt, zu dem der Schritt stattfindet/erst sinnvoll ist.
- AK2: Ein Schritt kann optional von einem oder mehreren anderen (noch offenen) Schritten abhängig gemacht werden ("erst wenn X erledigt ist") — auch über Ziel-/Ast-Grenzen hinweg (z. B. "Bett neu beziehen" hängt von "Bettwäsche waschen" ab, unabhängig davon, wo im Baum diese Schritte liegen).
- AK3: Die "Nächster Schritt"-Vorschlagslogik (US-4, AK3) berücksichtigt nur Schritte, die: offen sind, keine eigenen Unterschritte haben, **alle Abhängigkeiten bereits erledigt sind**, und **falls zeitgebunden: der Zeitpunkt heute/jetzt bereits erreicht ist** (zukünftig terminierte Schritte werden nicht vorgeschlagen).
- AK4: Zeitgebundene, für heute anstehende Schritte werden auf der "Heute"-Seite gesondert sichtbar gemacht (z. B. eigener Bereich "Heute anstehend: 10:00 Vorlesung ASE"), getrennt von der "Nächster Schritt"-Karte.
- AK5: Blockierte Schritte (offen, aber Abhängigkeit noch nicht erfüllt, oder Zeitpunkt in der Zukunft) werden bei Bedarf transparent als "wartet auf …" bzw. "geplant für …" gekennzeichnet, statt einfach zu verschwinden — damit nachvollziehbar bleibt, warum ein Schritt gerade nicht vorgeschlagen wird.
- AK6: Diese Filterung betrifft nur die "Nächster Schritt"-Vorschlagslogik — die "Braucht Klärung"-Markierung (US-7) bleibt unabhängig davon bestehen (ein blockierter Schritt zählt weiterhin als "existierender konkreter Schritt").

### 3.9 Zeitliche & inhaltliche Abhängigkeiten von Schritten
**US-9:** Als Nutzerin möchte ich Schritten eine feste Zeit oder Abhängigkeiten
zu anderen Schritten zuweisen können, damit mir nur Schritte als "nächster
Schritt" vorgeschlagen werden, die ich gerade wirklich ausführen kann.

**Zeitbindung**
- AK1: Ein Schritt kann optional mit Datum + Uhrzeit versehen werden (z. B. "Vorlesung ASE, Mo 14:00").
- AK2: Ein zeitgebundener Schritt wird als "nächster Schritt" **nur in einem Zeitfenster kurz vor der festgelegten Zeit** vorgeschlagen (Vorlaufzeit konfigurierbar, sinnvoller Standard z. B. 2 Stunden).
- AK3: Außerhalb dieses Fensters (zu früh oder nachdem die Zeit verstrichen ist) wird der Schritt **nicht** als "nächster Schritt" vorgeschlagen — er bleibt aber weiterhin normal in der Baumstruktur/im Sprint sichtbar und editierbar (z. B. als "verpasst" markierbar, neu terminierbar).

**Abhängigkeiten**
- AK4: Einem Schritt können ein oder mehrere andere, bereits existierende Schritte als Voraussetzung zugeordnet werden ("muss vorher erledigt sein").
- AK5: Ein Schritt mit offenen (nicht erledigten) Voraussetzungen wird **nicht** als "nächster Schritt" vorgeschlagen, bis alle zugeordneten Voraussetzungen erledigt sind.
- AK6: Zirkuläre Abhängigkeiten (A braucht B, B braucht A) werden beim Anlegen verhindert.

**Auswirkung auf bestehende Features**
- AK7: Die "Nächster Schritt"-Karte (US-4, AK3) berücksichtigt beide Bedingungen: nur Schritte, die aktuell zeitlich **und** inhaltlich (Abhängigkeiten) bereit sind, kommen infrage.
- AK8: Gibt es aktuell **keinen** bereiten Schritt (weil alle bekannten offenen Schritte zeitlich oder durch Abhängigkeiten blockiert sind), zeigt die Karte stattdessen freundlich den nächsten anstehenden blockierten Schritt samt Grund (z. B. "Wartet auf: Bettwäsche waschen" oder "Nächster Termin: Mo 14:00 Vorlesung ASE").
- AK9: In der "Heute"-Ansicht (US-6) werden blockierte Fokusaufgaben visuell als "noch nicht bereit" gekennzeichnet, statt einfach wie normale offene Aufgaben zu wirken.
- AK10: Die "Braucht Klärung"-Logik (US-7) bleibt unverändert bestehen — ein zeitlich/durch Abhängigkeit blockierter, aber klar definierter Schritt zählt weiterhin als "vorhandener nächster Schritt" und löst **keine** "Braucht Klärung"-Markierung aus (Blockierung ist kein Klarheits-Problem, sondern ein Timing-Problem).

## 4. Nicht-funktionale Anforderungen

| Kategorie | Anforderung |
|---|---|
| Plattform | Progressive Web App (eine Codebasis, Web + Mobile) |
| Datenhaltung | Backend mit Datenbank für Cross-Device-Sync (z. B. Supabase) |
| Performance | Kernansichten (Dashboard, Sprint) laden < 1s bei normaler Verbindung |
| Design | Modern, aufgeräumt, motivierend (keine "Business-Tool"-Optik) |
| KI-Integration | v1: keine. Architektur (z. B. Datenmodell für Teilschritte) so anlegen, dass eine spätere KI-Zerlegung via API ohne größeren Umbau nachrüstbar wäre |
| Datenschutz | Persönliche Daten, keine Weitergabe an Dritte |
| Erweiterbarkeit | Architektur sollte spätere Erweiterung um Erinnerungen/Notifications nicht ausschließen (v1: kein Feature) |
| Offline | Grundfunktionen (Ansehen von Zielen/Sprints) idealerweise auch offline verfügbar (PWA-Caching) — *Soll*, kein Muss |

## 5. Priorisierung (MoSCoW) für MVP

**Must have**
- Ideenpool (US-1)
- Ziele + manuelle Teilschritte (US-2, ohne KI)
- Sprintplanung 2 Wochen, Aufgaben zuordnen, abhaken (US-3)
- Fortschrittsanzeige pro Ziel & Sprint (US-4, AK1–3)
- Responsive Grundlayout, ansprechendes Design (US-5, AK1, AK3)
- Fokusaufgaben für heute (US-6)
- "Braucht Klärung"-Markierung (US-7)
- Zeitliche & inhaltliche Abhängigkeiten von Schritten (US-9)
- Zeitliche Bindung & Abhängigkeiten zwischen Schritten (US-9)

**Should have**
- Streaks/Badges/Statistiken (US-4, AK4)
- PWA-Installierbarkeit (US-5, AK2)
- Cross-Device-Sync (US-5, AK4)
- Gewohnheiten-Tracking mit Heatmap & Never-miss-twice-Hinweis (US-8)

**Could have**
- Sprint-Zusammenfassung mit Insights (US-3, AK4 erweitert)

**Won't have (v1)**
- KI-gestützte Zielzerlegung (US-2, AK3) — v2
- KI-Fortschrittsanalyse mit Hinweisen (US-4, AK5) — v2
- Erinnerungen/Notifications
- Multi-User/Sharing
- Native Mobile Apps (separates iOS/Android)

## 6. Branding & Design-Identität

| Element | Festlegung |
|---|---|
| App-Name | **Pathfinder** |
| Tagline | *"Your little guide through the big woods"* |
| Icon | Fuchs-Icon (`FoxIcon`, liegt im Projektordner) — wird als App-Icon/Logo verwendet |
| Farbschema | **Dunkelgrün** als Basis für Schrift/UI-Akzente, kombiniert mit warmen, leuchtenden Lichtakzenten |
| Atmosphäre | **"Licht durch den dunklen Wald"** — dunkler, waldiger Grundton, der durch helle, warme Lichtpunkte (Fortschritt, erledigte Aufgaben, Erfolge) durchbrochen wird. Das visuelle Prinzip: Fortschritt = Licht, das sich seinen Weg durch den Wald bahnt. |

Diese Identität ersetzt/konkretisiert die bisherige allgemeine Vorgabe
"bunt, verspielt" aus US-5 — der Wald-/Fuchs-Charakter gibt der App eine
kohärente Optik statt beliebiger Buntheit.

## 7. Entschiedene Annahmen

1. ✅ Backend/DB: Supabase (Postgres + Auth) für Cross-Device-Sync.
2. ✅ KI-Features (Zielzerlegung, Fortschrittsanalyse) sind für v1 **ausgeklammert** — kein API-Konto/keine Abrechnung nötig. Ziele werden vollständig manuell in Teilschritte unterteilt. Nachrüstbar für v2.
3. ✅ Design: Pathfinder-Branding, dunkelgrün mit warmen Lichtakzenten, "Licht durch den dunklen Wald".