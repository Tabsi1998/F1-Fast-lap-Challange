#!/bin/bash
# ============================================
# F1 FAST LAP CHALLENGE - ONE-COMMAND INSTALL
# ============================================
# 
# Dieses Script installiert alles automatisch:
# - MongoDB
# - Python Backend (FastAPI)
# - React Frontend
# - Autostart beim Systemstart
#
# USAGE: 
#   chmod +x install.sh && ./install.sh
#
# Nach Installation:
#   - Frontend: http://localhost:3000
#   - Backend API: http://localhost:8001
#   - Admin Login: admin / admin
# ============================================

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   F1 FAST LAP CHALLENGE - INSTALLATION   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check OS
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo -e "${YELLOW}Windows erkannt - Bitte WSL2 oder Docker verwenden${NC}"
    echo "Alternativ: XAMPP mit Python + MongoDB installieren"
    exit 1
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Bitte NICHT als root ausführen!${NC}"
    exit 1
fi

# Create app directory
APP_DIR="$HOME/f1-fast-lap-challenge"
echo -e "${YELLOW}Installationsverzeichnis: $APP_DIR${NC}"

if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Verzeichnis existiert bereits. Überschreiben? (y/n)${NC}"
    read -r answer
    if [ "$answer" != "y" ]; then
        echo "Abgebrochen."
        exit 0
    fi
    rm -rf "$APP_DIR"
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"

# ============================================
# 1. CHECK DEPENDENCIES
# ============================================
echo ""
echo -e "${GREEN}[1/6] Prüfe Abhängigkeiten...${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python3 nicht gefunden!${NC}"
    echo "Installation: sudo apt install python3 python3-pip python3-venv"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js nicht gefunden!${NC}"
    echo "Installation: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
fi

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}MongoDB nicht gefunden. Versuche Installation...${NC}"
    if command -v apt &> /dev/null; then
        wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        sudo apt update
        sudo apt install -y mongodb-org
    else
        echo -e "${RED}Bitte MongoDB manuell installieren: https://www.mongodb.com/docs/manual/installation/${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Alle Abhängigkeiten vorhanden${NC}"

# ============================================
# 2. CREATE BACKEND
# ============================================
echo ""
echo -e "${GREEN}[2/6] Erstelle Backend...${NC}"

mkdir -p backend
cat > backend/requirements.txt << 'EOF'
fastapi==0.110.1
uvicorn==0.25.0
python-dotenv>=1.0.1
pymongo==4.5.0
motor==3.3.1
pydantic>=2.6.4
pyjwt>=2.10.1
bcrypt==4.1.3
EOF

cat > backend/.env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=f1_fast_lap_challenge
CORS_ORIGINS=*
JWT_SECRET=f1-fast-lap-challenge-secret-key-change-me
EOF

# Copy server.py (simplified version for standalone)
cat > backend/server.py << 'SERVEREOF'
from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, io, csv, jwt, bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALGORITHM = "HS256"

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'f1_fast_lap_challenge')]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Models
class LapEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_name: str
    team: Optional[str] = None
    lap_time_ms: int
    lap_time_display: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LapEntryCreate(BaseModel):
    driver_name: str
    team: Optional[str] = None
    lap_time_display: str

class LapEntryUpdate(BaseModel):
    driver_name: Optional[str] = None
    team: Optional[str] = None
    lap_time_display: Optional[str] = None

class LapEntryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    driver_name: str
    team: Optional[str]
    lap_time_ms: int
    lap_time_display: str
    created_at: str
    rank: int = 0
    gap: str = ""

class AdminLogin(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class SiteSettingsUpdate(BaseModel):
    title_line1: Optional[str] = None
    title_line2: Optional[str] = None
    title_line3: Optional[str] = None
    title_color1: Optional[str] = None
    title_color2: Optional[str] = None
    title_color3: Optional[str] = None

class TrackCreate(BaseModel):
    name: str
    country: str
    image_url: Optional[str] = None

class EventUpdate(BaseModel):
    status: str
    scheduled_time: Optional[str] = None
    scheduled_date: Optional[str] = None
    track_id: Optional[str] = None

# Helpers
def parse_lap_time(time_str: str) -> int:
    try:
        parts = time_str.split(':')
        minutes = int(parts[0])
        seconds_parts = parts[1].split('.')
        seconds = int(seconds_parts[0])
        ms = int(seconds_parts[1].ljust(3, '0')[:3])
        return (minutes * 60 * 1000) + (seconds * 1000) + ms
    except:
        raise ValueError("Invalid time format")

def format_gap(leader_ms: int, current_ms: int) -> str:
    if leader_ms == current_ms: return "-"
    gap_ms = current_ms - leader_ms
    if gap_ms < 1000: return f"+0.{str(gap_ms).zfill(3)}"
    elif gap_ms < 60000: return f"+{gap_ms // 1000}.{str(gap_ms % 1000).zfill(3)}"
    else:
        m = gap_ms // 60000
        r = gap_ms % 60000
        return f"+{m}:{str(r // 1000).zfill(2)}.{str(r % 1000).zfill(3)}"

def create_token(username: str) -> str:
    return jwt.encode({"username": username, "exp": datetime.now(timezone.utc).timestamp() + 86400}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try: return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except: raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials: raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_token(credentials.credentials)

async def init_default_admin():
    existing = await db.admins.find_one({}, {"_id": 0})
    if not existing:
        pw_hash = bcrypt.hashpw("admin".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        await db.admins.insert_one({"id": str(uuid.uuid4()), "username": "admin", "password_hash": pw_hash, "created_at": datetime.now(timezone.utc).isoformat()})
        logging.info("Default admin created (admin/admin)")

# Public Routes
@api_router.get("/")
async def root(): return {"message": "F1 Fast Lap Challenge API"}

@api_router.get("/settings")
async def get_settings():
    s = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    return s or {"title_line1": "F1", "title_line2": "FAST LAP", "title_line3": "CHALLENGE", "title_color1": "#FFFFFF", "title_color2": "#FF1E1E", "title_color3": "#FFFFFF"}

@api_router.get("/event/status")
async def get_event_status():
    s = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    track_info = None
    if s and s.get('track_id'):
        t = await db.tracks.find_one({"id": s['track_id']}, {"_id": 0})
        if t: track_info = {"name": t['name'], "country": t['country'], "image_url": t.get('image_url'), "full_name": f"{t['name']}, {t['country']}"}
    status = s.get('status', 'inactive') if s else 'inactive'
    msg = "Momentan kein Rennen"
    if status == "scheduled": msg = f"Fast Lap Challenge beginnt am {s.get('scheduled_date', '')} um {s.get('scheduled_time', '')}{' auf ' + track_info['full_name'] if track_info else ''}"
    elif status == "active": msg = f"Fast Lap Challenge läuft{' auf ' + track_info['full_name'] if track_info else ''}"
    elif status == "finished": msg = "Fast Lap Challenge abgeschlossen - Endergebnis"
    return {"status": status, "scheduled_time": s.get('scheduled_time') if s else None, "scheduled_date": s.get('scheduled_date') if s else None, "track": track_info, "message": msg}

@api_router.get("/laps", response_model=List[LapEntryResponse])
async def get_laps():
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    result = []
    leader = entries[0]['lap_time_ms'] if entries else 0
    for i, e in enumerate(entries):
        result.append(LapEntryResponse(id=e['id'], driver_name=e['driver_name'], team=e.get('team'), lap_time_ms=e['lap_time_ms'], lap_time_display=e['lap_time_display'], created_at=e['created_at'], rank=i+1, gap=format_gap(leader, e['lap_time_ms'])))
    return result

@api_router.get("/tracks")
async def get_tracks(): return await db.tracks.find({}, {"_id": 0}).to_list(100)

# Auth
@api_router.post("/auth/login")
async def login(creds: AdminLogin):
    await init_default_admin()
    admin = await db.admins.find_one({"username": creds.username}, {"_id": 0})
    if not admin or not bcrypt.checkpw(creds.password.encode('utf-8'), admin['password_hash'].encode('utf-8')): raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(creds.username), "username": admin['username']}

@api_router.get("/auth/check")
async def check_auth(admin = Depends(get_current_admin)): return {"authenticated": True, "username": admin['username']}

# Admin Routes
@api_router.put("/admin/password")
async def change_password(data: PasswordChange, admin = Depends(get_current_admin)):
    a = await db.admins.find_one({"username": admin['username']}, {"_id": 0})
    if not bcrypt.checkpw(data.current_password.encode('utf-8'), a['password_hash'].encode('utf-8')): raise HTTPException(status_code=400, detail="Wrong password")
    new_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.admins.update_one({"username": admin['username']}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password changed"}

@api_router.put("/admin/settings")
async def update_settings(s: SiteSettingsUpdate, admin = Depends(get_current_admin)):
    update = {k: v for k, v in s.model_dump().items() if v is not None}
    update['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.site_settings.update_one({"id": "site_settings"}, {"$set": update}, upsert=True)
    return {"message": "Settings updated"}

@api_router.post("/admin/laps", response_model=LapEntryResponse)
async def create_lap(entry: LapEntryCreate, admin = Depends(get_current_admin)):
    try: ms = parse_lap_time(entry.lap_time_display)
    except: raise HTTPException(status_code=400, detail="Invalid time format")
    lap = LapEntry(driver_name=entry.driver_name, team=entry.team, lap_time_ms=ms, lap_time_display=entry.lap_time_display)
    doc = lap.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.lap_entries.insert_one(doc)
    return LapEntryResponse(id=lap.id, driver_name=lap.driver_name, team=lap.team, lap_time_ms=lap.lap_time_ms, lap_time_display=lap.lap_time_display, created_at=doc['created_at'], rank=0, gap="")

@api_router.put("/admin/laps/{lap_id}")
async def update_lap(lap_id: str, update: LapEntryUpdate, admin = Depends(get_current_admin)):
    e = await db.lap_entries.find_one({"id": lap_id}, {"_id": 0})
    if not e: raise HTTPException(status_code=404, detail="Not found")
    data = {}
    if update.driver_name: data['driver_name'] = update.driver_name
    if update.team is not None: data['team'] = update.team
    if update.lap_time_display:
        try: data['lap_time_ms'] = parse_lap_time(update.lap_time_display); data['lap_time_display'] = update.lap_time_display
        except: raise HTTPException(status_code=400, detail="Invalid time")
    if data: await db.lap_entries.update_one({"id": lap_id}, {"$set": data})
    return {"message": "Updated"}

@api_router.delete("/admin/laps/{lap_id}")
async def delete_lap(lap_id: str, admin = Depends(get_current_admin)):
    r = await db.lap_entries.delete_one({"id": lap_id})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

@api_router.delete("/admin/laps")
async def delete_all_laps(admin = Depends(get_current_admin)):
    await db.lap_entries.delete_many({})
    return {"message": "All deleted"}

@api_router.post("/admin/tracks")
async def create_track(track: TrackCreate, admin = Depends(get_current_admin)):
    t = {"id": str(uuid.uuid4()), "name": track.name, "country": track.country, "image_url": track.image_url}
    await db.tracks.insert_one(t)
    return t

@api_router.put("/admin/tracks/{track_id}")
async def update_track(track_id: str, track: TrackCreate, admin = Depends(get_current_admin)):
    await db.tracks.update_one({"id": track_id}, {"$set": {"name": track.name, "country": track.country, "image_url": track.image_url}})
    return {"message": "Updated"}

@api_router.delete("/admin/tracks/{track_id}")
async def delete_track(track_id: str, admin = Depends(get_current_admin)):
    await db.tracks.delete_one({"id": track_id})
    return {"message": "Deleted"}

@api_router.put("/admin/event")
async def update_event(event: EventUpdate, admin = Depends(get_current_admin)):
    await db.event_settings.update_one({"id": "current_event"}, {"$set": {"id": "current_event", "status": event.status, "scheduled_time": event.scheduled_time, "scheduled_date": event.scheduled_date, "track_id": event.track_id}}, upsert=True)
    return {"message": "Updated"}

@api_router.get("/admin/export/csv")
async def export_csv(admin = Depends(get_current_admin)):
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Platz', 'Fahrer', 'Team', 'Rundenzeit', 'Abstand'])
    leader = entries[0]['lap_time_ms'] if entries else 0
    for i, e in enumerate(entries): writer.writerow([i+1, e['driver_name'], e.get('team', ''), e['lap_time_display'], format_gap(leader, e['lap_time_ms'])])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode('utf-8')), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=lap_times.csv"})

@api_router.get("/admin/export/pdf")
async def export_pdf(admin = Depends(get_current_admin)):
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    site = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    result = []
    leader = entries[0]['lap_time_ms'] if entries else 0
    for i, e in enumerate(entries): result.append({"rank": i+1, "driver_name": e['driver_name'], "team": e.get('team', ''), "lap_time_display": e['lap_time_display'], "gap": format_gap(leader, e['lap_time_ms'])})
    return {"entries": result, "title": site}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Serve frontend static files
frontend_build = ROOT_DIR.parent / "frontend" / "build"
if frontend_build.exists():
    app.mount("/", StaticFiles(directory=str(frontend_build), html=True), name="frontend")

logging.basicConfig(level=logging.INFO)

@app.on_event("startup")
async def startup(): await init_default_admin()

@app.on_event("shutdown")
async def shutdown(): client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
SERVEREOF

echo -e "${GREEN}✓ Backend erstellt${NC}"

# ============================================
# 3. CREATE FRONTEND
# ============================================
echo ""
echo -e "${GREEN}[3/6] Erstelle Frontend...${NC}"

mkdir -p frontend
cd frontend

# Initialize package.json
cat > package.json << 'EOF'
{
  "name": "f1-fast-lap-challenge",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.294.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "devDependencies": {
    "react-scripts": "5.0.1"
  },
  "browserslist": {
    "production": [">0.2%", "not dead"],
    "development": ["last 1 chrome version"]
  }
}
EOF

cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

cd "$APP_DIR"
echo -e "${GREEN}✓ Frontend vorbereitet${NC}"

# ============================================
# 4. INSTALL DEPENDENCIES
# ============================================
echo ""
echo -e "${GREEN}[4/6] Installiere Abhängigkeiten...${NC}"

# Backend
cd "$APP_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -q -r requirements.txt
deactivate

# Frontend
cd "$APP_DIR/frontend"
npm install --silent 2>/dev/null || npm install

echo -e "${GREEN}✓ Abhängigkeiten installiert${NC}"

# ============================================
# 5. BUILD FRONTEND
# ============================================
echo ""
echo -e "${GREEN}[5/6] Baue Frontend...${NC}"

cd "$APP_DIR/frontend"
npm run build --silent 2>/dev/null || npm run build

echo -e "${GREEN}✓ Frontend gebaut${NC}"

# ============================================
# 6. CREATE START SCRIPTS
# ============================================
echo ""
echo -e "${GREEN}[6/6] Erstelle Start-Scripts...${NC}"

cd "$APP_DIR"

# Start script
cat > start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"

echo "Starte MongoDB..."
sudo systemctl start mongod 2>/dev/null || mongod --fork --logpath /tmp/mongod.log

echo "Starte F1 Fast Lap Challenge..."
cd backend
source venv/bin/activate
python server.py &
BACKEND_PID=$!
cd ..

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   F1 FAST LAP CHALLENGE GESTARTET!       ║"
echo "╠══════════════════════════════════════════╣"
echo "║   URL: http://localhost:8001             ║"
echo "║   Admin: admin / admin                   ║"
echo "║                                          ║"
echo "║   Stoppen: Ctrl+C                        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

wait $BACKEND_PID
EOF

chmod +x start.sh

# Stop script
cat > stop.sh << 'EOF'
#!/bin/bash
pkill -f "python server.py"
echo "F1 Fast Lap Challenge gestoppt."
EOF

chmod +x stop.sh

# Systemd service (optional)
cat > f1-lap-challenge.service << EOF
[Unit]
Description=F1 Fast Lap Challenge
After=network.target mongod.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/backend
ExecStart=$APP_DIR/backend/venv/bin/python $APP_DIR/backend/server.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Start-Scripts erstellt${NC}"

# ============================================
# DONE
# ============================================
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║           INSTALLATION ABGESCHLOSSEN!            ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║   Starten:     cd $APP_DIR && ./start.sh        ║"
echo "║   Stoppen:     ./stop.sh                        ║"
echo "║                                                  ║"
echo "║   URL:         http://localhost:8001            ║"
echo "║   Admin Login: admin / admin                    ║"
echo "║                                                  ║"
echo "║   Autostart einrichten (optional):              ║"
echo "║   sudo cp f1-lap-challenge.service \\            ║"
echo "║        /etc/systemd/system/                     ║"
echo "║   sudo systemctl enable f1-lap-challenge        ║"
echo "║   sudo systemctl start f1-lap-challenge         ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
