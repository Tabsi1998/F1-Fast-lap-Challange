# F1 Fast Lap Challenge - PRD

## Problem Statement
Verwaltungssystem für F1 Fast Lap Challenge mit anpassbarem Titel, transparenten Einträgen, Strecken mit Bildern, Event-Status und Admin-geschütztem Export.

## User Choices
- Anpassbarer Titel mit 3 Zeilen + Farbauswahl
- Transparente/Glaseffekt Einträge
- Strecken mit Bild-URL
- Export NUR für angemeldete Admins
- First-Run Setup Formular für Admin-Erstellung
- Mobile-optimiert
- Saubere Seite ohne Branding/Badge

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn UI
- **Backend**: FastAPI (Python), JWT Auth
- **Database**: MongoDB
- **Fonts**: Russo One, Barlow, JetBrains Mono

## Core Features (Feb 2026)

### Öffentliche Seite (/)
- [x] Anpassbarer 3-Zeilen Titel mit Farben
- [x] Status-Banner unter Überschrift
- [x] Admin-Button im Header
- [x] Transparente/Glaseffekt Einträge
- [x] Strecken-Karte mit Bild
- [x] Auto-Refresh (5 Sek.)
- [x] Mobile-optimiert
- [x] KEIN Export (nur für Admins)
- [x] Dynamischer Browser Tab-Titel
- [x] Anpassbares Favicon
- [x] "Made with Emergent" Badge entfernt ✅

### Admin Login (/admin)
- [x] First-Run Setup Formular (wenn kein Admin existiert)
- [x] JWT Token Authentication
- [x] Login mit erstellten Credentials

### Admin Dashboard (/admin/dashboard)
- [x] Titel bearbeiten (3 Zeilen + Farben)
- [x] Passwort ändern
- [x] Event-Status setzen (mit Timer)
- [x] Strecken mit Bild-URL
- [x] Rundenzeiten CRUD
- [x] CSV & PDF Export (geschützt)
- [x] E-Mail Template Editor
- [x] SMTP Einstellungen
- [x] Teilnehmer-Verwaltung
- [x] **NEU**: Website Tab im Design-Editor
  - Browser Tab-Titel anpassbar
  - Favicon URL anpassbar

## Installation

### Docker (Empfohlen) 🐳
```bash
chmod +x docker-install.sh && ./docker-install.sh
```
Oder: `docker compose up -d --build`

**URL:** http://localhost:8080  
**Admin:** Wird beim ersten Start erstellt

### Docker Befehle
```bash
docker compose up -d      # Starten
docker compose down       # Stoppen
docker compose logs -f    # Logs
docker compose down -v    # Alles löschen
```

### Ohne Docker (Linux/macOS)
```bash
chmod +x install.sh && ./install.sh
./start.sh
```
URL: http://localhost:8001

## Test Results (Feb 2026)
- Backend: 100%
- Frontend: 100%
- Mobile: 100%
- New Features: 100% (Admin Setup, Website Tab, Badge Removed)

## Completed in This Session
- [x] Admin Setup Flow funktioniert (Setup-Formular bei erstem Aufruf)
- [x] "Made with Emergent" Badge komplett entfernt
- [x] Browser Tab-Titel anpassbar über Design-Einstellungen
- [x] Favicon URL anpassbar über Design-Einstellungen
- [x] Neuer "Website" Tab im Design-Editor
- [x] **Standard-Admin**: admin / admin funktioniert IMMER
- [x] **Passwort-Aufforderung**: Nach erstem Login wird zum Passwort-Ändern aufgefordert
- [x] **Infinite Loop Bug behoben**: React-Funktionen mit useCallback memoized
- [x] **Docker API Fix**: /api/api → /api korrigiert
- [x] **File Upload**: Bilder können direkt hochgeladen werden (nicht nur URLs)
- [x] **E-Mail bei Rundenzeit**: Optionales E-Mail-Feld beim Hinzufügen von Zeiten
- [x] **Event-Dialog verbessert**: Status-Anzeige, Countdown-Timer, Strecken-Auswahl

## Login-Daten
- **Benutzername**: admin
- **Passwort**: admin
- Nach erstem Login: Passwort-Änderung erforderlich

## Next Steps
- P1: QR-Code für schnellen Handy-Zugriff
- P1: WebSocket für Echtzeit-Updates
- P2: Mehrere Events/Sessions
- P2: Statistiken/Diagramme
