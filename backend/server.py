from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

JWT_SECRET = os.environ.get('JWT_SECRET', 'f1-fast-lap-challenge-secret-key-2024')
JWT_ALGORITHM = "HS256"

# SMTP Settings
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', '')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'f1_fast_lap_challenge')]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ============== MODELS ==============

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: Optional[str] = None
    password_hash: str
    notifications_enabled: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminSetup(BaseModel):
    username: str
    email: Optional[str] = None
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class AdminUpdate(BaseModel):
    email: Optional[str] = None
    notifications_enabled: Optional[bool] = None

class SmtpSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "smtp_settings"
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_email: str = ""
    enabled: bool = False

class SmtpSettingsUpdate(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    from_email: Optional[str] = None
    enabled: Optional[bool] = None

class Track(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    country: str
    image_url: Optional[str] = None
    length_km: Optional[float] = None

class TrackCreate(BaseModel):
    name: str
    country: str
    image_url: Optional[str] = None
    length_km: Optional[float] = None

class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "site_settings"
    title_line1: str = "F1"
    title_line2: str = "FAST LAP"
    title_line3: str = "CHALLENGE"
    title_color1: str = "#FFFFFF"
    title_color2: str = "#FF1E1E"
    title_color3: str = "#FFFFFF"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteSettingsUpdate(BaseModel):
    title_line1: Optional[str] = None
    title_line2: Optional[str] = None
    title_line3: Optional[str] = None
    title_color1: Optional[str] = None
    title_color2: Optional[str] = None
    title_color3: Optional[str] = None

class EventSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "current_event"
    status: str = "inactive"
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
        return (minutes * 60 * 1000) + (seconds * 1000) + milliseconds
    except Exception:
        raise ValueError("Invalid time format. Use MM:SS.mmm (e.g., 1:23.456)")

def format_gap(leader_ms: int, current_ms: int) -> str:
    if leader_ms == current_ms:
        return "-"
    gap_ms = current_ms - leader_ms
    if gap_ms < 1000:
        return f"+0.{str(gap_ms).zfill(3)}"
    elif gap_ms < 60000:
        return f"+{gap_ms // 1000}.{str(gap_ms % 1000).zfill(3)}"
    else:
        minutes = gap_ms // 60000
        remaining = gap_ms % 60000
        return f"+{minutes}:{str(remaining // 1000).zfill(2)}.{str(remaining % 1000).zfill(3)}"

def create_token(username: str) -> str:
    return jwt.encode({"username": username, "exp": datetime.now(timezone.utc).timestamp() + 86400}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_token(credentials.credentials)

async def send_email_notification(driver_name: str, lap_time: str, rank: int):
    """Send email notification for new lap time"""
    try:
        # Get SMTP settings from database
        smtp_settings = await db.smtp_settings.find_one({"id": "smtp_settings"}, {"_id": 0})
        if not smtp_settings or not smtp_settings.get('enabled'):
            return
        
        # Get admin with notifications enabled
        admin = await db.admins.find_one({"notifications_enabled": True}, {"_id": 0})
        if not admin or not admin.get('email'):
            return
        
        # Get site title
        site = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
        title = f"{site.get('title_line1', 'F1')} {site.get('title_line2', 'FAST LAP')} {site.get('title_line3', 'CHALLENGE')}" if site else "F1 FAST LAP CHALLENGE"
        
        # Create email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"🏎️ Neue Rundenzeit: {driver_name} - {lap_time}"
        msg['From'] = smtp_settings['from_email']
        msg['To'] = admin['email']
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; border-radius: 12px; padding: 30px; border: 1px solid #333;">
                <h1 style="color: #FF1E1E; margin: 0 0 20px 0; font-size: 24px;">🏁 {title}</h1>
                <h2 style="color: #FFFFFF; margin: 0 0 20px 0;">Neue Rundenzeit eingetragen!</h2>
                <div style="background-color: #0A0A0A; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 10px 0; font-size: 18px;"><strong>Fahrer:</strong> {driver_name}</p>
                    <p style="margin: 10px 0; font-size: 24px; color: #00F0FF; font-family: monospace;"><strong>Zeit:</strong> {lap_time}</p>
                    <p style="margin: 10px 0; font-size: 18px;"><strong>Aktuelle Position:</strong> Platz {rank}</p>
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">Diese E-Mail wurde automatisch gesendet.</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html, 'html'))
        
        # Send email
        with smtplib.SMTP(smtp_settings['host'], smtp_settings['port']) as server:
            server.starttls()
            server.login(smtp_settings['username'], smtp_settings['password'])
            server.send_message(msg)
        
        logging.info(f"Email notification sent for {driver_name}")
    except Exception as e:
        logging.error(f"Failed to send email: {e}")

# ============== PUBLIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "F1 Fast Lap Challenge API"}

@api_router.get("/auth/has-admin")
async def has_admin():
    """Check if any admin account exists"""
    existing = await db.admins.find_one({}, {"_id": 0})
    return {"has_admin": existing is not None}

@api_router.get("/settings")
async def get_site_settings():
    """Get site settings (public)"""
    settings = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    if not settings:
        default = SiteSettings()
        return default.model_dump()
    return settings

@api_router.get("/event/status")
async def get_event_status():
    """Get current event status with track info (public)"""
    settings = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    
    track_info = None
    if settings and settings.get('track_id'):
        track = await db.tracks.find_one({"id": settings['track_id']}, {"_id": 0})
        if track:
            track_info = {
                "name": track['name'],
                "country": track['country'],
                "image_url": track.get('image_url'),
                "full_name": f"{track['name']}, {track['country']}"
            }
    
    status = settings.get('status', 'inactive') if settings else 'inactive'
    message = ""
    
    if status == "inactive":
        message = "Momentan kein Rennen"
    elif status == "scheduled":
        date = settings.get('scheduled_date', '') if settings else ''
        time = settings.get('scheduled_time', '') if settings else ''
        track_text = f" auf {track_info['full_name']}" if track_info else ""
        message = f"Fast Lap Challenge beginnt am {date} um {time}{track_text}"
    elif status == "active":
        message = f"Fast Lap Challenge läuft{' auf ' + track_info['full_name'] if track_info else ''}"
    elif status == "finished":
        message = "Fast Lap Challenge abgeschlossen - Endergebnis"
    
    return {
        "status": status,
        "scheduled_time": settings.get('scheduled_time') if settings else None,
        "scheduled_date": settings.get('scheduled_date') if settings else None,
        "track": track_info,
        "message": message
    }

@api_router.get("/laps", response_model=List[LapEntryResponse])
async def get_all_laps():
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    result = []
    leader_time = entries[0]['lap_time_ms'] if entries else 0
    for idx, entry in enumerate(entries):
        result.append(LapEntryResponse(
            id=entry['id'], driver_name=entry['driver_name'], team=entry.get('team'),
            lap_time_ms=entry['lap_time_ms'], lap_time_display=entry['lap_time_display'],
            created_at=entry['created_at'], rank=idx + 1, gap=format_gap(leader_time, entry['lap_time_ms'])
        ))
    return result

@api_router.get("/tracks")
async def get_tracks():
    return await db.tracks.find({}, {"_id": 0}).to_list(100)

# ============== AUTH ROUTES ==============

@api_router.post("/auth/setup")
async def setup_admin(admin: AdminSetup):
    """Create first admin account (only works if no admin exists)"""
    existing = await db.admins.find_one({}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Admin existiert bereits. Bitte einloggen.")
    
    if len(admin.password) < 4:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 4 Zeichen haben")
    
    password_hash = bcrypt.hashpw(admin.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    admin_user = AdminUser(
        username=admin.username,
        email=admin.email,
        password_hash=password_hash,
        notifications_enabled=bool(admin.email)
    )
    
    doc = admin_user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.admins.insert_one(doc)
    
    token = create_token(admin.username)
    return {"token": token, "username": admin.username, "email": admin.email}

@api_router.post("/auth/login")
async def login(credentials: AdminLogin):
    """Login as admin"""
    admin = await db.admins.find_one({"username": credentials.username}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    if not bcrypt.checkpw(credentials.password.encode('utf-8'), admin['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    return {"token": create_token(credentials.username), "username": admin['username'], "email": admin.get('email')}

@api_router.get("/auth/check")
async def check_auth(admin = Depends(get_current_admin)):
    admin_doc = await db.admins.find_one({"username": admin['username']}, {"_id": 0})
    return {
        "authenticated": True, 
        "username": admin['username'],
        "email": admin_doc.get('email') if admin_doc else None,
        "notifications_enabled": admin_doc.get('notifications_enabled', False) if admin_doc else False
    }

# ============== ADMIN ROUTES (Protected) ==============

@api_router.put("/admin/password")
async def change_password(data: PasswordChange, admin = Depends(get_current_admin)):
    """Change admin password"""
    admin_doc = await db.admins.find_one({"username": admin['username']}, {"_id": 0})
    if not admin_doc:
        raise HTTPException(status_code=404, detail="Admin nicht gefunden")
    
    if not bcrypt.checkpw(data.current_password.encode('utf-8'), admin_doc['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort falsch")
    
    new_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.admins.update_one({"username": admin['username']}, {"$set": {"password_hash": new_hash}})
    return {"message": "Passwort geändert"}

@api_router.put("/admin/profile")
async def update_profile(data: AdminUpdate, admin = Depends(get_current_admin)):
    """Update admin profile (email, notifications)"""
    update_data = {}
    if data.email is not None:
        update_data['email'] = data.email
    if data.notifications_enabled is not None:
        update_data['notifications_enabled'] = data.notifications_enabled
    
    if update_data:
        await db.admins.update_one({"username": admin['username']}, {"$set": update_data})
    
    return {"message": "Profil aktualisiert"}

@api_router.get("/admin/smtp")
async def get_smtp_settings(admin = Depends(get_current_admin)):
    """Get SMTP settings"""
    settings = await db.smtp_settings.find_one({"id": "smtp_settings"}, {"_id": 0})
    if not settings:
        return SmtpSettings().model_dump()
    # Don't return password
    settings['password'] = '********' if settings.get('password') else ''
    return settings

@api_router.put("/admin/smtp")
async def update_smtp_settings(settings: SmtpSettingsUpdate, admin = Depends(get_current_admin)):
    """Update SMTP settings"""
    current = await db.smtp_settings.find_one({"id": "smtp_settings"}, {"_id": 0})
    
    update_data = {"id": "smtp_settings"}
    if current:
        update_data = {**current, **{k: v for k, v in settings.model_dump().items() if v is not None}}
    else:
        update_data = {**SmtpSettings().model_dump(), **{k: v for k, v in settings.model_dump().items() if v is not None}}
    
    # Don't overwrite password with masked value
    if settings.password == '********' or settings.password == '':
        if current and current.get('password'):
            update_data['password'] = current['password']
    
    await db.smtp_settings.update_one({"id": "smtp_settings"}, {"$set": update_data}, upsert=True)
    return {"message": "SMTP Einstellungen gespeichert"}

@api_router.post("/admin/smtp/test")
async def test_smtp(admin = Depends(get_current_admin)):
    """Test SMTP connection"""
    smtp_settings = await db.smtp_settings.find_one({"id": "smtp_settings"}, {"_id": 0})
    if not smtp_settings:
        raise HTTPException(status_code=400, detail="SMTP nicht konfiguriert")
    
    admin_doc = await db.admins.find_one({"username": admin['username']}, {"_id": 0})
    if not admin_doc or not admin_doc.get('email'):
        raise HTTPException(status_code=400, detail="Keine E-Mail-Adresse hinterlegt")
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "🏎️ F1 Fast Lap Challenge - Test E-Mail"
        msg['From'] = smtp_settings['from_email']
        msg['To'] = admin_doc['email']
        
        html = """
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; border-radius: 12px; padding: 30px; border: 1px solid #333;">
                <h1 style="color: #FF1E1E;">✅ Test erfolgreich!</h1>
                <p>Die SMTP-Konfiguration funktioniert korrekt.</p>
                <p>Du erhältst nun Benachrichtigungen bei neuen Rundenzeiten.</p>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html, 'html'))
        
        with smtplib.SMTP(smtp_settings['host'], smtp_settings['port']) as server:
            server.starttls()
            server.login(smtp_settings['username'], smtp_settings['password'])
            server.send_message(msg)
        
        return {"message": "Test-E-Mail gesendet!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP Fehler: {str(e)}")

@api_router.put("/admin/settings")
async def update_site_settings(settings: SiteSettingsUpdate, admin = Depends(get_current_admin)):
    """Update site settings"""
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.site_settings.update_one({"id": "site_settings"}, {"$set": update_data}, upsert=True)
    return {"message": "Einstellungen aktualisiert"}

@api_router.post("/admin/laps", response_model=LapEntryResponse)
async def create_lap_entry(entry: LapEntryCreate, background_tasks: BackgroundTasks, admin = Depends(get_current_admin)):
    try:
        lap_time_ms = parse_lap_time(entry.lap_time_display)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    lap_entry = LapEntry(driver_name=entry.driver_name, team=entry.team, lap_time_ms=lap_time_ms, lap_time_display=entry.lap_time_display)
    doc = lap_entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.lap_entries.insert_one(doc)
    
    # Calculate rank
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    rank = 1
    for idx, e in enumerate(entries):
        if e['id'] == lap_entry.id:
            rank = idx + 1
            break
    
    # Send email notification in background
    background_tasks.add_task(send_email_notification, entry.driver_name, entry.lap_time_display, rank)
    
    return LapEntryResponse(id=lap_entry.id, driver_name=lap_entry.driver_name, team=lap_entry.team,
        lap_time_ms=lap_entry.lap_time_ms, lap_time_display=lap_entry.lap_time_display, created_at=doc['created_at'], rank=rank, gap="")

@api_router.put("/admin/laps/{lap_id}", response_model=LapEntryResponse)
async def update_lap_entry(lap_id: str, update: LapEntryUpdate, admin = Depends(get_current_admin)):
    entry = await db.lap_entries.find_one({"id": lap_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    
    update_data = {}
    if update.driver_name is not None:
        update_data['driver_name'] = update.driver_name
    if update.team is not None:
        update_data['team'] = update.team
    if update.lap_time_display is not None:
        try:
            update_data['lap_time_ms'] = parse_lap_time(update.lap_time_display)
            update_data['lap_time_display'] = update.lap_time_display
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    if update_data:
        await db.lap_entries.update_one({"id": lap_id}, {"$set": update_data})
    
    updated = await db.lap_entries.find_one({"id": lap_id}, {"_id": 0})
    return LapEntryResponse(id=updated['id'], driver_name=updated['driver_name'], team=updated.get('team'),
        lap_time_ms=updated['lap_time_ms'], lap_time_display=updated['lap_time_display'], created_at=updated['created_at'], rank=0, gap="")

@api_router.delete("/admin/laps/{lap_id}")
async def delete_lap_entry(lap_id: str, admin = Depends(get_current_admin)):
    result = await db.lap_entries.delete_one({"id": lap_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return {"message": "Eintrag gelöscht"}

@api_router.delete("/admin/laps")
async def delete_all_laps(admin = Depends(get_current_admin)):
    await db.lap_entries.delete_many({})
    return {"message": "Alle Einträge gelöscht"}

@api_router.post("/admin/tracks")
async def create_track(track: TrackCreate, admin = Depends(get_current_admin)):
    track_obj = Track(name=track.name, country=track.country, image_url=track.image_url, length_km=track.length_km)
    await db.tracks.insert_one(track_obj.model_dump())
    return {"id": track_obj.id, "name": track_obj.name, "country": track_obj.country, "image_url": track_obj.image_url}

@api_router.put("/admin/tracks/{track_id}")
async def update_track(track_id: str, track: TrackCreate, admin = Depends(get_current_admin)):
    result = await db.tracks.update_one({"id": track_id}, {"$set": {"name": track.name, "country": track.country, "image_url": track.image_url, "length_km": track.length_km}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Strecke nicht gefunden")
    return {"message": "Strecke aktualisiert"}

@api_router.delete("/admin/tracks/{track_id}")
async def delete_track(track_id: str, admin = Depends(get_current_admin)):
    result = await db.tracks.delete_one({"id": track_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Strecke nicht gefunden")
    return {"message": "Strecke gelöscht"}

@api_router.put("/admin/event")
async def update_event(event: EventUpdate, admin = Depends(get_current_admin)):
    doc = {"id": "current_event", "status": event.status, "scheduled_time": event.scheduled_time,
           "scheduled_date": event.scheduled_date, "track_id": event.track_id, "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.event_settings.update_one({"id": "current_event"}, {"$set": doc}, upsert=True)
    return {"message": "Event aktualisiert"}

@api_router.get("/admin/export/csv")
async def export_csv(admin = Depends(get_current_admin)):
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    event = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    site = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    
    title = f"{site.get('title_line1', 'F1')} {site.get('title_line2', 'FAST LAP')} {site.get('title_line3', 'CHALLENGE')}" if site else "F1 FAST LAP CHALLENGE"
    
    track_name = ""
    if event and event.get('track_id'):
        track = await db.tracks.find_one({"id": event['track_id']}, {"_id": 0})
        if track:
            track_name = f"{track['name']}, {track['country']}"
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([title, track_name])
    writer.writerow([])
    writer.writerow(['Platz', 'Fahrer', 'Team', 'Rundenzeit', 'Abstand'])
    
    leader_time = entries[0]['lap_time_ms'] if entries else 0
    for idx, entry in enumerate(entries):
        writer.writerow([idx + 1, entry['driver_name'], entry.get('team', ''), entry['lap_time_display'], format_gap(leader_time, entry['lap_time_ms'])])
    
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode('utf-8')), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=lap_times.csv"})

@api_router.get("/admin/export/pdf")
async def export_pdf_data(admin = Depends(get_current_admin)):
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    event = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    site = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    
    track_info = None
    if event and event.get('track_id'):
        track = await db.tracks.find_one({"id": event['track_id']}, {"_id": 0})
        if track:
            track_info = {"name": track['name'], "country": track['country'], "image_url": track.get('image_url')}
    
    result = []
    leader_time = entries[0]['lap_time_ms'] if entries else 0
    for idx, entry in enumerate(entries):
        result.append({"rank": idx + 1, "driver_name": entry['driver_name'], "team": entry.get('team', ''),
            "lap_time_display": entry['lap_time_display'], "gap": format_gap(leader_time, entry['lap_time_ms'])})
    
    return {"entries": result, "exported_at": datetime.now(timezone.utc).isoformat(), "track": track_info,
        "title": site if site else SiteSettings().model_dump()}

app.include_router(api_router)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
