# F1 Fast Lap Challenge - PRD

## Problem Statement
F1 Fast Lap Challenge mit anpassbarem Design, Admin-Verwaltung und öffentlicher Rangliste.

## Core Features (WIEDERHERGESTELLT Feb 10, 2026)

### ✅ Admin Dashboard
- [x] Design Editor (5 Tabs: Titel, Farben, Schriften, Hintergrund, Website)
- [x] Event Einstellungen (Status-Dropdown, Strecken-Auswahl, Timer)
- [x] Strecken verwalten (Name, Land, Bild-Upload)
- [x] E-Mail Einstellungen (SMTP, Templates, Test-Button)
- [x] Teilnehmer verwalten
- [x] Passwort ändern
- [x] CSV Export
- [x] Rundenzeit hinzufügen/bearbeiten/löschen

### ✅ Public Leaderboard
- [x] Rangliste mit Gold/Silber/Bronze Badges
- [x] Fahrername, Team, Zeit, Abstand
- [x] Timer-Countdown
- [x] Status-Banner

### ✅ Bild-Upload
- [x] Streckenbilder hochladen
- [x] Hintergrundbilder hochladen
- [x] Favicon hochladen
- [x] Toast-Nachrichten für Upload-Status

## Test Results (Feb 10, 2026)
- Backend: 100%
- Frontend: 100% 
- Alle 10 Admin-Features getestet und verifiziert

## Login-Daten
- **Benutzername**: admin
- **Passwort**: admin

## Next Steps
- **P0**: Multi-Event System (mehrere Events mit eigenen URLs)
- **P0**: QR-Code pro Event
- **P0**: WebSocket für Echtzeit-Updates
- **P1**: Statistiken & Diagramme
- **P2**: Fullscreen Leaderboard (Kiosk-Modus)

## Changelog

### Feb 10, 2026 - Wiederherstellung
- ⚠️ Versehentliches Überschreiben der App.js rückgängig gemacht
- ✅ Alle originalen Features wiederhergestellt (git commit 9e00867)
- ✅ 10/10 Tests bestanden
- ✅ Design Editor, Event, Strecken, E-Mail, Teilnehmer, Passwort, CSV, CRUD funktionieren

### Vorherige Updates
- Standard-Admin (admin/admin) automatisch erstellt
- Passwort-Änderung nach erstem Login
- Docker API Fix (/api/api → /api)
- Infinite Loop Bug behoben
- File Upload System
- SMTP mit verbesserter Fehlerbehandlung
- "Made with Emergent" Badge entfernt

## Backend Multi-Event API (VORHANDEN aber Frontend noch nicht angebunden)
```
GET  /api/events                          - Alle Events
GET  /api/events/{slug}                   - Event Details
GET  /api/events/{slug}/qr                - QR-Code PNG
POST /api/admin/events                    - Event erstellen
PUT  /api/admin/events/{id}               - Event aktualisieren
DELETE /api/admin/events/{id}             - Event löschen
POST /api/admin/events/{id}/laps          - Rundenzeit hinzufügen
GET  /api/admin/events/{id}/export/csv    - CSV Export
```
