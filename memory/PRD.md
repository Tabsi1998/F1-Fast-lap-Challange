# F1 Fast Lap Challenge - PRD

## Problem Statement
Einfaches Verwaltungssystem für F1 Fast Lap Challenge mit Zeitanzeige, Rangliste und einfachem Menü zum Eintragen von Rundenzeiten. Export als CSV und PDF.

## User Choices
- Unbegrenzte Teilnehmeranzahl
- Zeitformat: MM:SS.mmm (z.B. 1:23.456)
- Auswählbar: Name + Zeit ODER Name + Team + Zeit
- Export: CSV und PDF
- Design: Dunkles Racing-Theme (schwarz/rot)

## Architecture
- **Frontend**: React mit Shadcn UI, TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Fonts**: Russo One (Headings), Barlow (Body), JetBrains Mono (Zeiten)

## Core Features Implemented
- [x] Rundenzeiten eintragen (Name, optionales Team, Zeit)
- [x] Rangliste mit automatischer Sortierung (schnellste Zeit = Platz 1)
- [x] Gap-Berechnung zum Führenden
- [x] Top 3 Plätze mit Gold/Silber/Bronze Hervorhebung
- [x] Einträge bearbeiten und löschen
- [x] Alle Einträge löschen
- [x] CSV Export
- [x] PDF Export (Print-Funktion)
- [x] Team-Modus umschaltbar (Name vs Name+Team)
- [x] Dunkles Racing-Theme mit F1-Hintergrundbild
- [x] Deutsche Benutzeroberfläche

## API Endpoints
- `GET /api/laps` - Alle Rundenzeiten abrufen
- `POST /api/laps` - Neue Rundenzeit hinzufügen
- `PUT /api/laps/{id}` - Rundenzeit bearbeiten
- `DELETE /api/laps/{id}` - Einzelne Rundenzeit löschen
- `DELETE /api/laps` - Alle Rundenzeiten löschen
- `GET /api/export/csv` - CSV Export
- `GET /api/export/pdf` - PDF Daten für Export

## Data Model
```
LapEntry:
  - id: UUID
  - driver_name: string
  - team: string (optional)
  - lap_time_ms: int (Millisekunden für Sortierung)
  - lap_time_display: string (MM:SS.mmm Format)
  - created_at: datetime
```

## What's Been Implemented (Jan 2026)
- Vollständiges MVP mit allen Kernfunktionen
- 100% Backend-Tests bestanden
- 100% Frontend-Tests bestanden
- 100% Integration-Tests bestanden

## Backlog / Future Enhancements
- P1: Session/Event Management (mehrere Challenges verwalten)
- P1: Bestzeit-Tracking pro Fahrer
- P2: Live-Updates via WebSocket
- P2: Statistiken und Diagramme
- P3: Fahrer-Profil mit Foto
- P3: Sound-Effekte bei neuer Bestzeit
