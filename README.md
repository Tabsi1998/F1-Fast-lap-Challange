# F1 Fast Lap Challenge 🏎️

Ein einfaches System zur Verwaltung von F1 Fast Lap Challenges mit Rangliste, Admin-Bereich und Export-Funktionen.

## 🐳 Docker Installation (Empfohlen)

### Voraussetzungen
- [Docker](https://www.docker.com/products/docker-desktop) installiert
- [Docker Compose](https://docs.docker.com/compose/install/) (meist bei Docker dabei)

### One-Command Installation

```bash
# Repository klonen oder Dateien herunterladen
git clone <repo-url>
cd f1-fast-lap-challenge

# Installation starten
chmod +x docker-install.sh
./docker-install.sh
```

**Oder manuell:**

```bash
docker compose up -d --build
```

### Nach der Installation

| Was | Wo |
|-----|-----|
| **App öffnen** | http://localhost:8080 |
| **Admin Login** | `admin` / `admin` |

### Docker Befehle

```bash
# Starten
docker compose up -d

# Stoppen
docker compose down

# Neustart
docker compose restart

# Logs anzeigen
docker compose logs -f

# Alles löschen (inkl. Daten)
docker compose down -v
```

---

## 🖥️ Features

### Öffentliche Seite (/)
- 📊 Live-Rangliste mit Auto-Refresh
- 🏆 Top 3 mit Gold/Silber/Bronze
- 📱 Mobile-optimiert
- 🏁 Event-Status Banner

### Admin Bereich (/admin)
- ✏️ Anpassbarer Titel mit Farben
- 🏎️ Strecken mit Bildern verwalten
- ⏱️ Rundenzeiten eintragen
- 📤 CSV & PDF Export
- 🔐 Passwort ändern

---

## 📁 Projektstruktur

```
f1-fast-lap-challenge/
├── docker-compose.yml      # Docker Konfiguration
├── docker-install.sh       # Installations-Script
├── backend/
│   ├── Dockerfile
│   ├── server.py           # FastAPI Backend
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── Dockerfile
    ├── nginx.conf          # Reverse Proxy Config
    └── src/
```

---

## ⚙️ Konfiguration

### Port ändern

In `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "3000:80"  # Ändere 8080 zu gewünschtem Port
```

### Daten sichern

Die MongoDB-Daten werden in einem Docker Volume gespeichert:
```bash
# Volume anzeigen
docker volume ls | grep mongodb

# Backup erstellen
docker run --rm -v f1-fast-lap-challenge_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb-backup.tar.gz /data
```

---

## 🔧 Troubleshooting

### Container startet nicht
```bash
docker compose logs backend
docker compose logs frontend
```

### Port bereits belegt
```bash
# Anderen Port verwenden in docker-compose.yml
ports:
  - "3000:80"  # statt 8080
```

### Daten zurücksetzen
```bash
docker compose down -v
docker compose up -d --build
```

---

## 📄 Lizenz

MIT - Frei verwendbar für private Events!
