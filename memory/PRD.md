# F1 Fast Lap Challenge - PRD

## Problem Statement
Verwaltungssystem für F1 Fast Lap Challenge mit:
- Öffentliche Rangliste (Vollbild, mobile-optimiert)
- Geschützter Admin-Bereich mit Passwort
- Event-Status Anzeige (kein Rennen, geplant, läuft, abgeschlossen)
- Strecken-Management
- Export für Social Media

## User Personas
1. **Zuschauer/Spieler**: Sehen nur die öffentliche Rangliste, können Ergebnisse teilen
2. **Administrator**: Verwaltet Zeiten, Strecken und Event-Status

## Architecture
- **Frontend**: React mit Shadcn UI, TailwindCSS
- **Backend**: FastAPI (Python) mit JWT Authentication
- **Database**: MongoDB
- **Fonts**: Russo One, Barlow, JetBrains Mono

## Core Features (Implemented Jan 2026)

### Öffentliche Seite (/)
- [x] Vollbild-Rangliste mit automatischer Aktualisierung (10 Sek.)
- [x] Status-Banner (Kein Rennen / Geplant / Läuft / Abgeschlossen)
- [x] Strecken-Anzeige
- [x] Top 3 mit Gold/Silber/Bronze
- [x] CSV & PDF Export
- [x] Mobile-optimiert
- [x] Admin-Link Button

### Admin Login (/admin)
- [x] Setup-Modus für ersten Admin
- [x] Passwort-geschützter Zugang
- [x] JWT Token Authentication

### Admin Dashboard (/admin/dashboard)
- [x] Rundenzeiten eintragen/bearbeiten/löschen
- [x] Team-Modus umschaltbar
- [x] Strecken-Management
- [x] Event-Status Einstellungen
- [x] Logout

## API Endpoints

### Public
- `GET /api/laps` - Alle Rundenzeiten
- `GET /api/event/status` - Event Status
- `GET /api/tracks` - Alle Strecken
- `GET /api/export/csv` - CSV Export
- `GET /api/export/pdf` - PDF Daten

### Auth
- `POST /api/auth/setup` - Ersten Admin erstellen
- `POST /api/auth/login` - Login
- `GET /api/auth/check` - Token prüfen
- `GET /api/auth/has-admin` - Prüft ob Admin existiert

### Admin (Protected)
- `POST /api/admin/laps` - Zeit hinzufügen
- `PUT /api/admin/laps/{id}` - Zeit bearbeiten
- `DELETE /api/admin/laps/{id}` - Zeit löschen
- `DELETE /api/admin/laps` - Alle löschen
- `POST /api/admin/tracks` - Strecke hinzufügen
- `DELETE /api/admin/tracks/{id}` - Strecke löschen
- `PUT /api/admin/event` - Event aktualisieren

## Test Results
- Backend: 100%
- Frontend: 95% (kleines Overlay-Issue)
- Integration: 100%
- Authentication: 100%
- Mobile: 100%

## Backlog / Future Enhancements
- P1: Mehrere Events/Sessions verwalten
- P1: Bestzeit-Tracking pro Fahrer
- P2: Live-Updates via WebSocket
- P2: QR-Code für schnellen Zugriff
- P3: Fahrer-Profil mit Foto
- P3: Sound-Effekte bei neuer Bestzeit
