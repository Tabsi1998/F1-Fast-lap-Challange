# F1 Fast Lap Challenge 🏎️

Ein einfaches System zur Verwaltung von F1 Fast Lap Challenges mit Rangliste, Admin-Bereich und Export-Funktionen.

## 🐳 Docker Installation

### Voraussetzungen
- [Docker](https://www.docker.com/products/docker-desktop) installiert
- [Docker Compose](https://docs.docker.com/compose/install/) (meist bei Docker dabei)

### One-Command Installation

```bash
chmod +x docker-install.sh
./docker-install.sh
```

**Oder manuell:**

```bash
docker compose up -d --build
```

---

## 🌐 Zugriff

Nach der Installation ist die App erreichbar über:

| Zugriff | URL |
|---------|-----|
| **Localhost** | http://localhost:8080 |
| **Lokale IP** | http://192.168.x.x:8080 |
| **Domain** | http://deine-domain.de:8080 |

### Admin Login
- **Benutzer:** `admin`
- **Passwort:** `admin`

---

## 🔧 Port & Domain Konfiguration

### Anderen Port verwenden

In `docker-compose.yml` ändern:
```yaml
frontend:
  ports:
    - "0.0.0.0:3000:80"  # z.B. Port 3000 statt 8080
```

Dann neu starten:
```bash
docker compose down
docker compose up -d
```

### Mit Domain (ohne Port)

Für Zugriff über `http://deine-domain.de` (Port 80):

```yaml
frontend:
  ports:
    - "0.0.0.0:80:80"
```

### Mit Reverse Proxy (Traefik, Nginx Proxy Manager)

Wenn du bereits einen Reverse Proxy hast, entferne den Port-Eintrag und verbinde über das Docker-Netzwerk:

```yaml
frontend:
  # ports: entfernen
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.f1.rule=Host(`f1.deine-domain.de`)"
```

---

## 📱 Netzwerk-Zugriff einrichten

### 1. Lokale IP herausfinden

**Linux/macOS:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
# oder
hostname -I
```

**Windows:**
```cmd
ipconfig
```

### 2. Firewall-Port öffnen (falls nötig)

**Linux (UFW):**
```bash
sudo ufw allow 8080/tcp
```

**Windows:**
```cmd
netsh advfirewall firewall add rule name="F1 App" dir=in action=allow protocol=tcp localport=8080
```

### 3. Router Port-Forwarding (für externen Zugriff)

Falls du die App von außerhalb deines Netzwerks erreichen willst:
1. Router-Einstellungen öffnen (meist http://192.168.1.1)
2. Port-Forwarding einrichten: Externer Port 8080 → Interne IP:8080

---

## 🛠️ Docker Befehle

```bash
# Starten
docker compose up -d

# Stoppen
docker compose down

# Neustart (nach Konfig-Änderung)
docker compose down && docker compose up -d

# Neu bauen (nach Code-Änderung)
docker compose up -d --build

# Logs anzeigen
docker compose logs -f

# Logs nur Frontend
docker compose logs -f frontend

# Logs nur Backend
docker compose logs -f backend

# Status prüfen
docker compose ps

# Alles löschen (inkl. Datenbank!)
docker compose down -v
```

---

## 🖥️ Features

### Öffentliche Seite (/)
- 📊 Live-Rangliste mit Auto-Refresh (10 Sek.)
- 🏆 Top 3 mit Gold/Silber/Bronze
- 📱 Mobile-optimiert
- 🏁 Event-Status Banner
- 🖼️ Strecken-Anzeige mit Bild

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
│   ├── requirements-docker.txt
│   └── server.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
```

---

## 🔒 Sicherheit

### JWT Secret ändern

In `docker-compose.yml`:
```yaml
backend:
  environment:
    - JWT_SECRET=dein-eigenes-geheimes-passwort-hier
```

### HTTPS mit Let's Encrypt

Empfohlen: Verwende einen Reverse Proxy wie:
- [Traefik](https://traefik.io/)
- [Nginx Proxy Manager](https://nginxproxymanager.com/)
- [Caddy](https://caddyserver.com/)

---

## 💾 Backup & Restore

### Datenbank sichern
```bash
docker exec f1-mongodb mongodump --archive=/tmp/backup.gz --gzip
docker cp f1-mongodb:/tmp/backup.gz ./backup-$(date +%Y%m%d).gz
```

### Datenbank wiederherstellen
```bash
docker cp ./backup.gz f1-mongodb:/tmp/backup.gz
docker exec f1-mongodb mongorestore --archive=/tmp/backup.gz --gzip --drop
```

---

## 🐛 Troubleshooting

### App nicht erreichbar

1. **Container läuft?**
   ```bash
   docker compose ps
   ```

2. **Logs prüfen:**
   ```bash
   docker compose logs -f
   ```

3. **Port belegt?**
   ```bash
   sudo lsof -i :8080
   # oder anderen Port verwenden
   ```

4. **Firewall blockiert?**
   ```bash
   sudo ufw status
   ```

### API-Fehler

```bash
# Backend-Logs prüfen
docker compose logs backend

# MongoDB läuft?
docker compose logs mongodb
```

### Komplett neu starten

```bash
docker compose down -v
docker compose up -d --build
```

---

## 📄 Lizenz

MIT - Frei verwendbar für private Events!
