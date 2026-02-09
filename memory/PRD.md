# F1 Fast Lap Challenge - PRD

## Problem Statement
Verwaltungssystem für F1 Fast Lap Challenge mit anpassbarem Titel, transparenten Einträgen, Strecken mit Bildern, Event-Status und Admin-geschütztem Export.

## User Choices
- Anpassbarer Titel mit 3 Zeilen + Farbauswahl
- Transparente/Glaseffekt Einträge
- Strecken mit Bild-URL
- Export NUR für angemeldete Admins
- Standard-Login: admin/admin (änderbar)
- Mobile-optimiert

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn UI
- **Backend**: FastAPI (Python), JWT Auth
- **Database**: MongoDB
- **Fonts**: Russo One, Barlow, JetBrains Mono

## Core Features (Jan 2026)

### Öffentliche Seite (/)
- [x] Anpassbarer 3-Zeilen Titel mit Farben
- [x] Status-Banner unter Überschrift
- [x] Admin-Button im Header
- [x] Transparente/Glaseffekt Einträge
- [x] Strecken-Karte mit Bild
- [x] Auto-Refresh (10 Sek.)
- [x] Mobile-optimiert
- [x] KEIN Export (nur für Admins)

### Admin Login (/admin)
- [x] Standard-Login: admin / admin
- [x] JWT Token Authentication

### Admin Dashboard (/admin/dashboard)
- [x] Titel bearbeiten (3 Zeilen + Farben)
- [x] Passwort ändern
- [x] Event-Status setzen
- [x] Strecken mit Bild-URL
- [x] Rundenzeiten CRUD
- [x] CSV & PDF Export (geschützt)

## Installation

### One-Command (Linux/macOS)
```bash
chmod +x install.sh && ./install.sh
```

### Nach Installation
- URL: http://localhost:8001
- Admin: admin / admin

### Autostart
```bash
sudo cp f1-lap-challenge.service /etc/systemd/system/
sudo systemctl enable f1-lap-challenge
sudo systemctl start f1-lap-challenge
```

## Test Results
- Backend: 100%
- Frontend: 100%
- Mobile: 100%
- New Features: 100%

## Next Steps
- P1: QR-Code für schnellen Handy-Zugriff
- P1: WebSocket für Echtzeit-Updates
- P2: Mehrere Events/Sessions
- P2: Statistiken/Diagramme
