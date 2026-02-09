# F1 Fast Lap Challenge

## 🏎️ Features

- **Öffentliche Rangliste** - Vollbild-Ansicht für Zuschauer (mobile-optimiert)
- **Admin-Bereich** - Passwort-geschützt (Standard: admin/admin)
- **Anpassbarer Titel** - Eigene Bezeichnung mit Farbauswahl
- **Strecken-Management** - Mit Bild-Upload
- **Event-Status** - "Kein Rennen" / "Geplant" / "Läuft" / "Abgeschlossen"
- **Export** - CSV & PDF (nur für Admins)
- **Transparente Einträge** - Modernes Design

## 🚀 Quick Start

### Option 1: One-Command Installation (Linux/macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/f1-lap-challenge/main/install.sh | bash
```

Oder manuell:

```bash
chmod +x install.sh
./install.sh
```

### Option 2: Docker

```bash
docker-compose up -d
```

### Option 3: Manuelle Installation

#### Voraussetzungen
- Node.js 18+
- Python 3.10+
- MongoDB 6+

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## 📱 Zugriff

| Seite | URL |
|-------|-----|
| Rangliste (öffentlich) | http://localhost:3000 |
| Admin Login | http://localhost:3000/admin |
| API | http://localhost:8001/api |

## 🔐 Standard Login

- **Benutzername:** admin
- **Passwort:** admin

⚠️ **Wichtig:** Passwort nach erstem Login ändern!

## 📖 Bedienung

### Öffentliche Seite (/)
- Zeigt Rangliste mit automatischer Aktualisierung (10 Sek.)
- Transparente Einträge mit Top 3 Hervorhebung
- Admin-Button im Header

### Admin Dashboard (/admin/dashboard)
1. **Titel bearbeiten** - Eigener Name + Farben
2. **Event** - Status setzen (Kein Rennen, Geplant, Läuft, Fertig)
3. **Strecken** - Mit Bild-URL hinzufügen
4. **Rundenzeiten** - Format: M:SS.mmm (z.B. 1:23.456)
5. **Export** - CSV/PDF nur im Admin-Bereich
6. **Passwort** - Im Admin änderbar

## 🖼️ Streckenbilder

Empfohlene Quellen für Streckenbilder:
- https://unsplash.com (Suche: "race track", "circuit")
- https://www.pexels.com
- Eigene Bilder hochladen (URL eingeben)

## 🛠️ Autostart (Linux)

```bash
sudo cp f1-lap-challenge.service /etc/systemd/system/
sudo systemctl enable f1-lap-challenge
sudo systemctl start f1-lap-challenge
```

## 📝 Lizenz

MIT License - Frei verwendbar für private Events!
