from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import io
import csv
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'f1-fast-lap-challenge-secret-key-2024')
JWT_ALGORITHM = "HS256"

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# ============== MODELS ==============

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminCreate(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class Track(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    country: str
    length_km: Optional[float] = None

class TrackCreate(BaseModel):
    name: str
    country: str
    length_km: Optional[float] = None

class EventStatus(BaseModel):
    status: str  # "inactive", "scheduled", "active", "finished"
    scheduled_time: Optional[str] = None
    scheduled_date: Optional[str] = None
    track_id: Optional[str] = None
    track_name: Optional[str] = None
    message: Optional[str] = None

class EventSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "current_event"
    status: str = "inactive"  # inactive, scheduled, active, finished
    scheduled_time: Optional[str] = None
    scheduled_date: Optional[str] = None
    track_id: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventUpdate(BaseModel):
    status: str
    scheduled_time: Optional[str] = None
    scheduled_date: Optional[str] = None
    track_id: Optional[str] = None

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

# ============== HELPER FUNCTIONS ==============

def parse_lap_time(time_str: str) -> int:
    """Convert MM:SS.mmm to milliseconds"""
    try:
        parts = time_str.split(':')
        if len(parts) != 2:
            raise ValueError("Invalid format")
        
        minutes = int(parts[0])
        seconds_parts = parts[1].split('.')
        
        if len(seconds_parts) != 2:
            raise ValueError("Invalid format")
        
        seconds = int(seconds_parts[0])
        milliseconds = int(seconds_parts[1].ljust(3, '0')[:3])
        
        total_ms = (minutes * 60 * 1000) + (seconds * 1000) + milliseconds
        return total_ms
    except Exception:
        raise ValueError(f"Invalid time format. Use MM:SS.mmm (e.g., 1:23.456)")

def format_gap(leader_ms: int, current_ms: int) -> str:
    """Calculate gap to leader"""
    if leader_ms == current_ms:
        return "-"
    
    gap_ms = current_ms - leader_ms
    if gap_ms < 1000:
        return f"+0.{str(gap_ms).zfill(3)}"
    elif gap_ms < 60000:
        seconds = gap_ms // 1000
        ms = gap_ms % 1000
        return f"+{seconds}.{str(ms).zfill(3)}"
    else:
        minutes = gap_ms // 60000
        remaining = gap_ms % 60000
        seconds = remaining // 1000
        ms = remaining % 1000
        return f"+{minutes}:{str(seconds).zfill(2)}.{str(ms).zfill(3)}"

def create_token(username: str) -> str:
    payload = {
        "username": username,
        "exp": datetime.now(timezone.utc).timestamp() + 86400  # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_token(credentials.credentials)

# ============== PUBLIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "F1 Fast Lap Challenge API"}

@api_router.get("/event/status")
async def get_event_status():
    """Get current event status (public)"""
    settings = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    
    if not settings:
        return EventStatus(status="inactive", message="Momentan kein Rennen")
    
    track_name = None
    if settings.get('track_id'):
        track = await db.tracks.find_one({"id": settings['track_id']}, {"_id": 0})
        if track:
            track_name = f"{track['name']}, {track['country']}"
    
    status = settings.get('status', 'inactive')
    message = ""
    
    if status == "inactive":
        message = "Momentan kein Rennen"
    elif status == "scheduled":
        date = settings.get('scheduled_date', '')
        time = settings.get('scheduled_time', '')
        track_info = f" auf {track_name}" if track_name else ""
        message = f"Fast Lap Challenge beginnt am {date} um {time}{track_info}"
    elif status == "active":
        message = f"Fast Lap Challenge läuft{' auf ' + track_name if track_name else ''}"
    elif status == "finished":
        message = "Fast Lap Challenge abgeschlossen - Endergebnis"
    
    return EventStatus(
        status=status,
        scheduled_time=settings.get('scheduled_time'),
        scheduled_date=settings.get('scheduled_date'),
        track_id=settings.get('track_id'),
        track_name=track_name,
        message=message
    )

@api_router.get("/laps", response_model=List[LapEntryResponse])
async def get_all_laps():
    """Get all lap entries sorted by time (public)"""
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    
    result = []
    leader_time = entries[0]['lap_time_ms'] if entries else 0
    
    for idx, entry in enumerate(entries):
        result.append(LapEntryResponse(
            id=entry['id'],
            driver_name=entry['driver_name'],
            team=entry.get('team'),
            lap_time_ms=entry['lap_time_ms'],
            lap_time_display=entry['lap_time_display'],
            created_at=entry['created_at'],
            rank=idx + 1,
            gap=format_gap(leader_time, entry['lap_time_ms'])
        ))
    
    return result

@api_router.get("/tracks")
async def get_tracks():
    """Get all tracks (public)"""
    tracks = await db.tracks.find({}, {"_id": 0}).to_list(100)
    return tracks

@api_router.get("/export/csv")
async def export_csv():
    """Export all lap entries as CSV (public)"""
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    event = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    
    track_name = ""
    if event and event.get('track_id'):
        track = await db.tracks.find_one({"id": event['track_id']}, {"_id": 0})
        if track:
            track_name = f"{track['name']}, {track['country']}"
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    if track_name:
        writer.writerow(['F1 Fast Lap Challenge', track_name])
        writer.writerow([])
    
    writer.writerow(['Platz', 'Fahrer', 'Team', 'Rundenzeit', 'Abstand'])
    
    leader_time = entries[0]['lap_time_ms'] if entries else 0
    
    for idx, entry in enumerate(entries):
        gap = format_gap(leader_time, entry['lap_time_ms'])
        writer.writerow([
            idx + 1,
            entry['driver_name'],
            entry.get('team', ''),
            entry['lap_time_display'],
            gap
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=f1_lap_times.csv"}
    )

@api_router.get("/export/pdf")
async def export_pdf_data():
    """Export lap data for PDF (public)"""
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    event = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    
    track_name = ""
    if event and event.get('track_id'):
        track = await db.tracks.find_one({"id": event['track_id']}, {"_id": 0})
        if track:
            track_name = f"{track['name']}, {track['country']}"
    
    result = []
    leader_time = entries[0]['lap_time_ms'] if entries else 0
    
    for idx, entry in enumerate(entries):
        result.append({
            "rank": idx + 1,
            "driver_name": entry['driver_name'],
            "team": entry.get('team', ''),
            "lap_time_display": entry['lap_time_display'],
            "gap": format_gap(leader_time, entry['lap_time_ms'])
        })
    
    return {
        "entries": result, 
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "track_name": track_name
    }

# ============== AUTH ROUTES ==============

@api_router.post("/auth/setup")
async def setup_admin(admin: AdminCreate):
    """Create first admin account (only works if no admin exists)"""
    existing = await db.admins.find_one({}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists. Use login.")
    
    password_hash = bcrypt.hashpw(admin.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    admin_user = AdminUser(
        username=admin.username,
        password_hash=password_hash
    )
    
    doc = admin_user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.admins.insert_one(doc)
    
    token = create_token(admin.username)
    return {"token": token, "username": admin.username}

@api_router.post("/auth/login")
async def login(credentials: AdminLogin):
    """Login as admin"""
    admin = await db.admins.find_one({"username": credentials.username}, {"_id": 0})
    
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(credentials.password.encode('utf-8'), admin['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(credentials.username)
    return {"token": token, "username": admin['username']}

@api_router.get("/auth/check")
async def check_auth(admin = Depends(get_current_admin)):
    """Check if authenticated"""
    return {"authenticated": True, "username": admin['username']}

@api_router.get("/auth/has-admin")
async def has_admin():
    """Check if any admin account exists"""
    existing = await db.admins.find_one({}, {"_id": 0})
    return {"has_admin": existing is not None}

# ============== ADMIN ROUTES (Protected) ==============

@api_router.post("/admin/laps", response_model=LapEntryResponse)
async def create_lap_entry(entry: LapEntryCreate, admin = Depends(get_current_admin)):
    """Create a new lap time entry (admin only)"""
    try:
        lap_time_ms = parse_lap_time(entry.lap_time_display)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    lap_entry = LapEntry(
        driver_name=entry.driver_name,
        team=entry.team,
        lap_time_ms=lap_time_ms,
        lap_time_display=entry.lap_time_display
    )
    
    doc = lap_entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.lap_entries.insert_one(doc)
    
    return LapEntryResponse(
        id=lap_entry.id,
        driver_name=lap_entry.driver_name,
        team=lap_entry.team,
        lap_time_ms=lap_entry.lap_time_ms,
        lap_time_display=lap_entry.lap_time_display,
        created_at=doc['created_at'],
        rank=0,
        gap=""
    )

@api_router.put("/admin/laps/{lap_id}", response_model=LapEntryResponse)
async def update_lap_entry(lap_id: str, update: LapEntryUpdate, admin = Depends(get_current_admin)):
    """Update an existing lap entry (admin only)"""
    entry = await db.lap_entries.find_one({"id": lap_id}, {"_id": 0})
    
    if not entry:
        raise HTTPException(status_code=404, detail="Lap entry not found")
    
    update_data = {}
    
    if update.driver_name is not None:
        update_data['driver_name'] = update.driver_name
    
    if update.team is not None:
        update_data['team'] = update.team
    
    if update.lap_time_display is not None:
        try:
            lap_time_ms = parse_lap_time(update.lap_time_display)
            update_data['lap_time_ms'] = lap_time_ms
            update_data['lap_time_display'] = update.lap_time_display
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    if update_data:
        await db.lap_entries.update_one({"id": lap_id}, {"$set": update_data})
    
    updated_entry = await db.lap_entries.find_one({"id": lap_id}, {"_id": 0})
    
    return LapEntryResponse(
        id=updated_entry['id'],
        driver_name=updated_entry['driver_name'],
        team=updated_entry.get('team'),
        lap_time_ms=updated_entry['lap_time_ms'],
        lap_time_display=updated_entry['lap_time_display'],
        created_at=updated_entry['created_at'],
        rank=0,
        gap=""
    )

@api_router.delete("/admin/laps/{lap_id}")
async def delete_lap_entry(lap_id: str, admin = Depends(get_current_admin)):
    """Delete a lap entry (admin only)"""
    result = await db.lap_entries.delete_one({"id": lap_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lap entry not found")
    
    return {"message": "Lap entry deleted successfully"}

@api_router.delete("/admin/laps")
async def delete_all_laps(admin = Depends(get_current_admin)):
    """Delete all lap entries (admin only)"""
    await db.lap_entries.delete_many({})
    return {"message": "All lap entries deleted successfully"}

@api_router.post("/admin/tracks")
async def create_track(track: TrackCreate, admin = Depends(get_current_admin)):
    """Create a new track (admin only)"""
    track_obj = Track(
        name=track.name,
        country=track.country,
        length_km=track.length_km
    )
    
    doc = track_obj.model_dump()
    await db.tracks.insert_one(doc)
    
    return {"id": track_obj.id, "name": track_obj.name, "country": track_obj.country}

@api_router.delete("/admin/tracks/{track_id}")
async def delete_track(track_id: str, admin = Depends(get_current_admin)):
    """Delete a track (admin only)"""
    result = await db.tracks.delete_one({"id": track_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Track not found")
    
    return {"message": "Track deleted successfully"}

@api_router.put("/admin/event")
async def update_event(event: EventUpdate, admin = Depends(get_current_admin)):
    """Update event settings (admin only)"""
    settings = EventSettings(
        status=event.status,
        scheduled_time=event.scheduled_time,
        scheduled_date=event.scheduled_date,
        track_id=event.track_id
    )
    
    doc = settings.model_dump()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.event_settings.update_one(
        {"id": "current_event"},
        {"$set": doc},
        upsert=True
    )
    
    return {"message": "Event updated successfully"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
