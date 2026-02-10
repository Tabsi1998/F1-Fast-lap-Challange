# F1 Fast Lap Challenge - PRD

## Problem Statement
Multi-Event-Verwaltungssystem für F1 Fast Lap Challenge mit anpassbarem Design, separaten Event-Seiten, QR-Codes und Admin-Export.

## Core Features (Feb 2026)

### ✅ Multi-Event System
- [x] Übersichtsseite zeigt alle Events gruppiert: Live > Geplant > Beendet > Archiviert
- [x] Jedes Event hat eigene URL: `/event/{slug}`
- [x] Ausklappbare Top 3 Vorschau auf der Übersichtsseite
- [x] Events können archiviert werden
- [x] QR-Code pro Event (automatisch generiert)
- [x] CSV Export pro Event mit Statistiken

### ✅ Admin Dashboard
- [x] Events erstellen mit Name, Strecke, Datum, Uhrzeit
- [x] Events verwalten: Rundenzeiten hinzufügen/löschen
- [x] Event-Status ändern (Geplant → Live → Beendet → Archiviert)
- [x] QR-Code Dialog mit Download-Option
- [x] URL kopieren Button
- [x] Design anpassen (Titel, Farben, Hintergrund)
- [x] E-Mail Einstellungen (SMTP, Templates)
- [x] Strecken verwalten mit Bild-Upload

### ✅ Bild-Upload Feedback
- [x] Toast-Nachricht "Bild wird hochgeladen..."
- [x] Toast-Nachricht "Bild erfolgreich hochgeladen!"
- [x] Fehlermeldung bei Upload-Fehler

### ✅ Öffentliche Event-Seite
- [x] Rangliste mit Gold/Silber/Bronze Badges
- [x] Fahrerzeit und Abstand zur Spitze
- [x] Team-Anzeige
- [x] Status-Badge (Geplant/Live/Beendet)
- [x] Zurück-Link zur Übersicht

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn UI
- **Backend**: FastAPI (Python), JWT Auth
- **Database**: MongoDB
  - `events` - Multi-Event Collection
  - `event_lap_entries` - Rundenzeiten pro Event
  - `tracks` - Strecken
  - `design_settings` - Design
  - `smtp_settings` - E-Mail
  - `admins` - Benutzer

## API Endpoints (Multi-Event)
```
GET  /api/events                          - Alle Events (gruppiert)
GET  /api/events/{slug}                   - Event Details + Einträge
GET  /api/events/{slug}/qr                - QR-Code PNG
POST /api/admin/events                    - Event erstellen
PUT  /api/admin/events/{id}               - Event aktualisieren
DELETE /api/admin/events/{id}             - Event löschen
POST /api/admin/events/{id}/laps          - Rundenzeit hinzufügen
PUT  /api/admin/events/{id}/laps/{lap_id} - Rundenzeit bearbeiten
DELETE /api/admin/events/{id}/laps/{lap_id} - Rundenzeit löschen
GET  /api/admin/events/{id}/export/csv    - CSV Export
GET  /api/admin/events/{id}/statistics    - Statistiken
```

## Test Results (Feb 10, 2026)
- Backend: 100% (35 Tests)
- Frontend: 100% (10 Features)
- Multi-Event System: ✅ Vollständig implementiert und getestet

## Login-Daten
- **Benutzername**: admin
- **Passwort**: admin

## Next Steps
- **P0**: WebSocket für Echtzeit-Updates
- **P1**: Statistiken & Diagramme
- **P2**: Fullscreen Leaderboard (Kiosk-Modus)

## Changelog

### Feb 10, 2026 - Multi-Event System
- ✅ Komplettes Multi-Event System implementiert
- ✅ Event-Übersichtsseite mit gruppierter Anzeige
- ✅ Eigene Event-URLs (/event/{slug})
- ✅ QR-Code Generierung pro Event
- ✅ Top 3 Vorschau ausklappbar
- ✅ Event-Archivierung
- ✅ Verbessertes Bild-Upload Feedback (Toast)
- ✅ CSV Export mit E-Mail Spalte
- ✅ 35 Backend-Tests, 10 Frontend-Features getestet

### Vorherige Updates
- Standard-Admin (admin/admin) automatisch erstellt
- Passwort-Änderung nach erstem Login
- Docker API Fix (/api/api → /api)
- Infinite Loop Bug behoben
- File Upload System
- SMTP mit verbesserter Fehlerbehandlung
- "Made with Emergent" Badge entfernt
