# Strategie: Modell-Management & Task-Kontinuität (NOVA-META)

## Zielsetzung
Verhinderung von Task-Abbrüchen durch Modell-Limits oder Quoten-Erschöpfung. Sicherstellung, dass komplexe Aufgaben auch über lange Zeiträume (6+ Stunden) erfolgreich abgeschlossen werden.

## Maßnahmen

### 1. Proaktives Modell-Switching
- **Primär-Modell:** Gemini 1.5 Pro für komplexe Analysen und Logik.
- **Fallback-Modell:** Gemini 1.5 Flash.
- **Vorgehensweise:** Bei Anzeichen von Quoten-Engpässen oder zur Schonung des Kontext-Fensters wird autonom auf Flash gewechselt, um die Kontinuität des Tasks zu gewährleisten. Ein Abbruch wegen "Modell nicht mehr verfügbar" ist strikt zu vermeiden.

### 2. Kontext-Schonung durch Delegation (Sub-Agenten)
- **Strategie:** Rechenintensive Aufgaben (große Datei-Reads, umfangreiche Suchen, repetitive Batch-Tasks) werden konsequent an Sub-Agenten (`@generalist`, `codebase_investigator`) ausgelagert.
- **Vorteil:** Der Haupt-Kontext der Session bleibt "leicht", was die Stabilität erhöht und das Risiko von Limit-Abbrüchen in späten Phasen des Tasks minimiert.

### 3. Autonome Problemlösung
- Der Agent trifft technische Entscheidungen zum Modell-Switch eigenständig während des Tasks.
- Rückmeldungen an den Nutzer erfolgen erst bei Ergebnissen oder wenn strategische Richtungsentscheidungen erforderlich sind.

## Gültigkeit
Diese Maßnahmen gelten ab dem 26. Oktober 2026 für alle Operationen im NOVA-META Projekt.
