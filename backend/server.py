from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
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
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import io
import csv
import jwt
import bcrypt
import asyncio
import re
import shutil

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

JWT_SECRET = os.environ.get('JWT_SECRET', 'f1-fast-lap-challenge-secret-key-2024')
JWT_ALGORITHM = "HS256"

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
    from_name: str = "F1 Fast Lap Challenge"
    enabled: bool = False

class SmtpSettingsUpdate(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    enabled: Optional[bool] = None

class EmailTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "email_template"
    subject: str = "🏎️ {event_title} - Ergebnisse"
    body_html: str = """<html>
<body style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 20px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #1A1A1A; border-radius: 12px; padding: 30px; border: 1px solid #333;">
<h1 style="color: {title_color}; margin: 0 0 20px 0;">{event_title}</h1>
<p style="color: #A0A0A0;">Die Challenge ist beendet! Hier sind die Ergebnisse:</p>

<h2 style="color: #FFD700;">🏆 Endergebnis</h2>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<tr style="background: #333;"><th style="padding: 10px; text-align: left; color: #A0A0A0;">Platz</th><th style="padding: 10px; text-align: left; color: #A0A0A0;">Fahrer</th><th style="padding: 10px; text-align: left; color: #A0A0A0;">Zeit</th></tr>
{results_table}
</table>

<p style="color: #A0A0A0; margin-top: 30px;">Strecke: {track_name}</p>
<p style="color: #666; font-size: 12px; margin-top: 20px;">{custom_footer}</p>
</div>
</body>
</html>"""
    custom_footer: str = "Danke fürs Mitmachen! Bis zum nächsten Mal."
    send_on_finish: bool = True

class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body_html: Optional[str] = None
    custom_footer: Optional[str] = None
    send_on_finish: Optional[bool] = None

class Participant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ParticipantCreate(BaseModel):
    name: str
    email: str

class DesignSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "design_settings"
    # Title
    title_line1: str = "F1"
    title_line2: str = "FAST LAP"
    title_line3: str = "CHALLENGE"
    title_color1: str = "#FFFFFF"
    title_color2: str = "#FF1E1E"
    title_color3: str = "#FFFFFF"
    title_font: str = "Russo One"
    # Colors
    bg_color: str = "#0A0A0A"
    surface_color: str = "#1A1A1A"
    primary_color: str = "#FF1E1E"
    accent_color: str = "#00F0FF"
    text_color: str = "#FFFFFF"
    text_secondary: str = "#A0A0A0"
    # Fonts
    heading_font: str = "Russo One"
    body_font: str = "Barlow"
    time_font: str = "JetBrains Mono"
    # Rank colors
    gold_color: str = "#FFD700"
    silver_color: str = "#C0C0C0"
    bronze_color: str = "#CD7F32"
    # Background
    bg_image_url: str = ""
    bg_overlay_opacity: float = 0.85
    # Status colors
    status_inactive_color: str = "#525252"
    status_scheduled_color: str = "#FFA500"
    status_active_color: str = "#00FF00"
    status_finished_color: str = "#FF1E1E"
    # Browser/Site settings
    site_title: str = "F1 Fast Lap Challenge"
    favicon_url: str = ""
    show_badge: bool = False

class DesignSettingsUpdate(BaseModel):
    title_line1: Optional[str] = None
    title_line2: Optional[str] = None
    title_line3: Optional[str] = None
    title_color1: Optional[str] = None
    title_color2: Optional[str] = None
    title_color3: Optional[str] = None
    title_font: Optional[str] = None
    bg_color: Optional[str] = None
    surface_color: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    text_color: Optional[str] = None
    text_secondary: Optional[str] = None
    heading_font: Optional[str] = None
    body_font: Optional[str] = None
    time_font: Optional[str] = None
    gold_color: Optional[str] = None
    silver_color: Optional[str] = None
    bronze_color: Optional[str] = None
    bg_image_url: Optional[str] = None
    bg_overlay_opacity: Optional[float] = None
    status_inactive_color: Optional[str] = None
    status_scheduled_color: Optional[str] = None
    status_active_color: Optional[str] = None
    status_finished_color: Optional[str] = None
    site_title: Optional[str] = None
    favicon_url: Optional[str] = None
    show_badge: Optional[bool] = None

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

class EventSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "current_event"
    status: str = "inactive"
    scheduled_time: Optional[str] = None
    scheduled_date: Optional[str] = None
    track_id: Optional[str] = None
    # Timer
    timer_enabled: bool = False
    timer_duration_minutes: int = 60
    timer_start_time: Optional[str] = None
    timer_end_time: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventUpdate(BaseModel):
    status: str
    scheduled_time: Optional[str] = None
    scheduled_date: Optional[str] = None
    track_id: Optional[str] = None
    timer_enabled: Optional[bool] = None
    timer_duration_minutes: Optional[int] = None

# ============== MULTI-EVENT MODELS ==============

def generate_slug(name: str) -> str:
    """Generate URL-safe slug from name"""
    slug = name.lower().strip()
    slug = re.sub(r'[äöüß]', lambda m: {'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss'}[m.group()], slug)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str = ""
    description: Optional[str] = None
    track_id: Optional[str] = None
    status: str = "scheduled"  # scheduled, active, finished, archived
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    timer_enabled: bool = False
    timer_duration_minutes: int = 60
    timer_start_time: Optional[str] = None
    timer_end_time: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    track_id: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    image_url: Optional[str] = None

class EventUpdateModel(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    track_id: Optional[str] = None
    status: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    timer_enabled: Optional[bool] = None
    timer_duration_minutes: Optional[int] = None
    image_url: Optional[str] = None

class EventLapEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    driver_name: str
    team: Optional[str] = None
    email: Optional[str] = None
    lap_time_ms: int
    lap_time_display: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventLapEntryCreate(BaseModel):
    driver_name: str
    team: Optional[str] = None
    email: Optional[str] = None
    lap_time_display: str

class LapEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_name: str
    team: Optional[str] = None
    email: Optional[str] = None
    lap_time_ms: int
    lap_time_display: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LapEntryCreate(BaseModel):
    driver_name: str
    team: Optional[str] = None
    email: Optional[str] = None
    lap_time_display: str

class LapEntryUpdate(BaseModel):
    driver_name: Optional[str] = None
    team: Optional[str] = None
    email: Optional[str] = None
    lap_time_display: Optional[str] = None

class LapEntryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    driver_name: str
    team: Optional[str]
    email: Optional[str] = None
    lap_time_ms: int
    lap_time_display: str
    created_at: str
    rank: int = 0
    gap: str = ""

class SendEmailRequest(BaseModel):
    participant_ids: Optional[List[str]] = None  # None = send to all

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

async def get_results_table_html() -> str:
    """Generate HTML table rows for results"""
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    if not entries:
        return "<tr><td colspan='3' style='padding: 10px; color: #666;'>Keine Ergebnisse</td></tr>"
    
    rows = []
    leader_time = entries[0]['lap_time_ms']
    for idx, entry in enumerate(entries):
        rank = idx + 1
        color = "#FFD700" if rank == 1 else "#C0C0C0" if rank == 2 else "#CD7F32" if rank == 3 else "#FFFFFF"
        gap = format_gap(leader_time, entry['lap_time_ms'])
        rows.append(f'<tr><td style="padding: 10px; color: {color}; font-weight: bold;">{rank}</td><td style="padding: 10px; color: #FFF;">{entry["driver_name"]}</td><td style="padding: 10px; color: #00F0FF; font-family: monospace;">{entry["lap_time_display"]} <span style="color: #666;">{gap}</span></td></tr>')
    
    return "\n".join(rows)

async def replace_template_variables(template: str, subject: bool = False) -> str:
    """Replace template variables with actual values"""
    design = await db.design_settings.find_one({"id": "design_settings"}, {"_id": 0})
    if not design:
        design = DesignSettings().model_dump()
    
    event = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    track_name = "Unbekannt"
    if event and event.get('track_id'):
        track = await db.tracks.find_one({"id": event['track_id']}, {"_id": 0})
        if track:
            track_name = f"{track['name']}, {track['country']}"
    
    email_tpl = await db.email_template.find_one({"id": "email_template"}, {"_id": 0})
    custom_footer = email_tpl.get('custom_footer', '') if email_tpl else ''
    
    event_title = f"{design.get('title_line1', 'F1')} {design.get('title_line2', 'FAST LAP')} {design.get('title_line3', 'CHALLENGE')}"
    
    # Get top 3 for quick reference
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(3)
    first_place = entries[0]['driver_name'] if len(entries) > 0 else "-"
    first_time = entries[0]['lap_time_display'] if len(entries) > 0 else "-"
    second_place = entries[1]['driver_name'] if len(entries) > 1 else "-"
    third_place = entries[2]['driver_name'] if len(entries) > 2 else "-"
    
    results_table = await get_results_table_html() if not subject else ""
    
    replacements = {
        "{event_title}": event_title,
        "{title_color}": design.get('primary_color', '#FF1E1E'),
        "{track_name}": track_name,
        "{results_table}": results_table,
        "{custom_footer}": custom_footer,
        "{first_place}": first_place,
        "{first_time}": first_time,
        "{second_place}": second_place,
        "{third_place}": third_place,
        "{date}": datetime.now().strftime("%d.%m.%Y"),
        "{time}": datetime.now().strftime("%H:%M"),
    }
    
    result = template
    for var, value in replacements.items():
        result = result.replace(var, value)
    
    return result

async def send_results_email(participant_ids: Optional[List[str]] = None):
    """Send results email to participants and lap entry emails"""
    try:
        smtp_settings = await db.smtp_settings.find_one({"id": "smtp_settings"}, {"_id": 0})
        if not smtp_settings or not smtp_settings.get('enabled'):
            logging.info("SMTP not enabled, skipping email")
            return
        
        email_tpl = await db.email_template.find_one({"id": "email_template"}, {"_id": 0})
        if not email_tpl:
            email_tpl = EmailTemplate().model_dump()
        
        # Collect all email recipients from both participants and lap_entries
        recipients = []
        
        # Get participants (legacy system)
        query = {"id": {"$in": participant_ids}} if participant_ids else {}
        participants = await db.participants.find(query, {"_id": 0}).to_list(1000)
        for p in participants:
            if p.get('email'):
                recipients.append({"name": p.get('name', 'Teilnehmer'), "email": p['email']})
        
        # Get emails from lap_entries (new system)
        lap_entries = await db.lap_entries.find({"email": {"$exists": True, "$ne": None, "$ne": ""}}, {"_id": 0}).to_list(1000)
        for entry in lap_entries:
            if entry.get('email') and entry['email'] not in [r['email'] for r in recipients]:
                recipients.append({"name": entry.get('driver_name', 'Fahrer'), "email": entry['email']})
        
        if not recipients:
            logging.info("No recipients with email addresses found")
            return
        
        logging.info(f"Sending results to {len(recipients)} recipients")
        
        subject = await replace_template_variables(email_tpl['subject'], subject=True)
        body = await replace_template_variables(email_tpl['body_html'])
        
        from_name = smtp_settings.get('from_name', 'F1 Fast Lap Challenge')
        from_email = smtp_settings['from_email']
        
        with smtplib.SMTP(smtp_settings['host'], smtp_settings['port']) as server:
            server.starttls()
            server.login(smtp_settings['username'], smtp_settings['password'])
            
            for recipient in recipients:
                try:
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = subject
                    msg['From'] = f"{from_name} <{from_email}>"
                    msg['To'] = recipient['email']
                    
                    # Personalize body
                    personalized_body = body.replace("{participant_name}", recipient['name'])
                    msg.attach(MIMEText(personalized_body, 'html'))
                    
                    server.send_message(msg)
                    logging.info(f"Email sent to {recipient['email']}")
                except Exception as e:
                    logging.error(f"Failed to send to {recipient['email']}: {e}")
        
    except Exception as e:
        logging.error(f"Failed to send results emails: {e}")

# ============== PUBLIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "F1 Fast Lap Challenge API"}

@api_router.get("/auth/has-admin")
async def has_admin():
    existing = await db.admins.find_one({}, {"_id": 0})
    return {"has_admin": existing is not None}

@api_router.get("/design")
async def get_design_settings():
    """Get design settings (public)"""
    settings = await db.design_settings.find_one({"id": "design_settings"}, {"_id": 0})
    if not settings:
        return DesignSettings().model_dump()
    return settings

@api_router.get("/event/status")
async def get_event_status():
    """Get current event status with timer info"""
    settings = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    
    track_info = None
    if settings and settings.get('track_id'):
        track = await db.tracks.find_one({"id": settings['track_id']}, {"_id": 0})
        if track:
            track_info = {
                "id": track['id'],
                "name": track['name'],
                "country": track['country'],
                "image_url": track.get('image_url'),
                "full_name": f"{track['name']}, {track['country']}"
            }
    
    status = settings.get('status', 'inactive') if settings else 'inactive'
    message = ""
    
    # Timer calculation
    timer_remaining = None
    timer_end = None
    if settings and settings.get('timer_enabled') and settings.get('timer_end_time'):
        try:
            end_time = datetime.fromisoformat(settings['timer_end_time'].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            if end_time > now:
                timer_remaining = int((end_time - now).total_seconds())
                timer_end = settings['timer_end_time']
            elif status == 'active':
                # Timer expired, should close
                timer_remaining = 0
        except:
            pass
    
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
        "message": message,
        "timer_enabled": settings.get('timer_enabled', False) if settings else False,
        "timer_duration_minutes": settings.get('timer_duration_minutes', 60) if settings else 60,
        "timer_remaining_seconds": timer_remaining,
        "timer_end_time": timer_end
    }

@api_router.get("/laps", response_model=List[LapEntryResponse])
async def get_all_laps():
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    result = []
    leader_time = entries[0]['lap_time_ms'] if entries else 0
    for idx, entry in enumerate(entries):
        result.append(LapEntryResponse(
            id=entry['id'], driver_name=entry['driver_name'], team=entry.get('team'),
            email=entry.get('email'), lap_time_ms=entry['lap_time_ms'], 
            lap_time_display=entry['lap_time_display'],
            created_at=entry['created_at'], rank=idx + 1, gap=format_gap(leader_time, entry['lap_time_ms'])
        ))
    return result

@api_router.get("/tracks")
async def get_tracks():
    return await db.tracks.find({}, {"_id": 0}).to_list(100)

# ============== AUTH ROUTES ==============

@api_router.post("/auth/setup")
async def setup_admin(admin: AdminSetup):
    existing = await db.admins.find_one({}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Admin existiert bereits")
    
    if len(admin.password) < 4:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 4 Zeichen haben")
    
    password_hash = bcrypt.hashpw(admin.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    admin_user = AdminUser(username=admin.username, email=admin.email, password_hash=password_hash, notifications_enabled=bool(admin.email))
    doc = admin_user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.admins.insert_one(doc)
    
    return {"token": create_token(admin.username), "username": admin.username, "email": admin.email}

@api_router.post("/auth/login")
async def login(credentials: AdminLogin):
    admin = await db.admins.find_one({"username": credentials.username}, {"_id": 0})
    if not admin or not bcrypt.checkpw(credentials.password.encode('utf-8'), admin['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    return {
        "token": create_token(credentials.username), 
        "username": admin['username'], 
        "email": admin.get('email'),
        "must_change_password": admin.get('must_change_password', False)
    }

@api_router.get("/auth/check")
async def check_auth(admin = Depends(get_current_admin)):
    admin_doc = await db.admins.find_one({"username": admin['username']}, {"_id": 0})
    return {
        "authenticated": True, 
        "username": admin['username'],
        "email": admin_doc.get('email') if admin_doc else None,
        "notifications_enabled": admin_doc.get('notifications_enabled', False) if admin_doc else False,
        "must_change_password": admin_doc.get('must_change_password', False) if admin_doc else False
    }

# ============== ADMIN ROUTES ==============

@api_router.put("/admin/password")
async def change_password(data: PasswordChange, admin = Depends(get_current_admin)):
    admin_doc = await db.admins.find_one({"username": admin['username']}, {"_id": 0})
    if not admin_doc or not bcrypt.checkpw(data.current_password.encode('utf-8'), admin_doc['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort falsch")
    
    new_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.admins.update_one(
        {"username": admin['username']}, 
        {"$set": {"password_hash": new_hash, "must_change_password": False}}
    )
    return {"message": "Passwort geändert"}

@api_router.put("/admin/profile")
async def update_profile(data: AdminUpdate, admin = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.admins.update_one({"username": admin['username']}, {"$set": update_data})
    return {"message": "Profil aktualisiert"}

@api_router.get("/admin/smtp")
async def get_smtp_settings(admin = Depends(get_current_admin)):
    settings = await db.smtp_settings.find_one({"id": "smtp_settings"}, {"_id": 0})
    if not settings:
        return SmtpSettings().model_dump()
    settings['password'] = '********' if settings.get('password') else ''
    return settings

@api_router.put("/admin/smtp")
async def update_smtp_settings(settings: SmtpSettingsUpdate, admin = Depends(get_current_admin)):
    current = await db.smtp_settings.find_one({"id": "smtp_settings"}, {"_id": 0})
    update_data = {"id": "smtp_settings"}
    
    if current:
        update_data = {**current}
    else:
        update_data = SmtpSettings().model_dump()
    
    for k, v in settings.model_dump().items():
        if v is not None and v != '********':
            update_data[k] = v
    
    await db.smtp_settings.update_one({"id": "smtp_settings"}, {"$set": update_data}, upsert=True)
    return {"message": "SMTP Einstellungen gespeichert"}

class SmtpTestRequest(BaseModel):
    test_email: Optional[str] = None

@api_router.post("/admin/smtp/test")
async def test_smtp(request: SmtpTestRequest = SmtpTestRequest(), admin = Depends(get_current_admin)):
    smtp_settings = await db.smtp_settings.find_one({"id": "smtp_settings"}, {"_id": 0})
    if not smtp_settings:
        raise HTTPException(status_code=400, detail="SMTP nicht konfiguriert. Bitte erst SMTP-Einstellungen speichern.")
    
    # Validate SMTP settings
    if not smtp_settings.get('host'):
        raise HTTPException(status_code=400, detail="SMTP Host nicht konfiguriert")
    if not smtp_settings.get('from_email'):
        raise HTTPException(status_code=400, detail="Absender E-Mail nicht konfiguriert")
    if not smtp_settings.get('username'):
        raise HTTPException(status_code=400, detail="SMTP Benutzername nicht konfiguriert")
    if not smtp_settings.get('password'):
        raise HTTPException(status_code=400, detail="SMTP Passwort nicht konfiguriert")
    
    # Get recipient email - either from request or from admin profile
    recipient_email = request.test_email
    if not recipient_email:
        admin_doc = await db.admins.find_one({"username": admin['username']}, {"_id": 0})
        if admin_doc:
            recipient_email = admin_doc.get('email')
    
    if not recipient_email:
        raise HTTPException(status_code=400, detail="Keine Test-E-Mail-Adresse angegeben und keine E-Mail im Admin-Profil hinterlegt")
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "🏎️ Test E-Mail - F1 Fast Lap Challenge"
        msg['From'] = f"{smtp_settings.get('from_name', 'F1 Challenge')} <{smtp_settings['from_email']}>"
        msg['To'] = recipient_email
        msg.attach(MIMEText("<h1 style='color: #FF1E1E;'>✅ Test erfolgreich!</h1><p>SMTP funktioniert korrekt.</p>", 'html'))
        
        with smtplib.SMTP(smtp_settings['host'], smtp_settings['port']) as server:
            server.starttls()
            server.login(smtp_settings['username'], smtp_settings['password'])
            server.send_message(msg)
        
        return {"message": f"Test-E-Mail erfolgreich an {recipient_email} gesendet!"}
    except smtplib.SMTPAuthenticationError as e:
        raise HTTPException(status_code=500, detail=f"SMTP Authentifizierung fehlgeschlagen: Benutzername oder Passwort falsch")
    except smtplib.SMTPConnectError as e:
        raise HTTPException(status_code=500, detail=f"Verbindung zum SMTP-Server fehlgeschlagen: {smtp_settings['host']}:{smtp_settings['port']}")
    except smtplib.SMTPRecipientsRefused as e:
        raise HTTPException(status_code=500, detail=f"Empfänger abgelehnt: {recipient_email}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP Fehler: {str(e)}")

@api_router.get("/admin/email-template")
async def get_email_template(admin = Depends(get_current_admin)):
    tpl = await db.email_template.find_one({"id": "email_template"}, {"_id": 0})
    if not tpl:
        return EmailTemplate().model_dump()
    return tpl

@api_router.put("/admin/email-template")
async def update_email_template(data: EmailTemplateUpdate, admin = Depends(get_current_admin)):
    update_data = {"id": "email_template"}
    current = await db.email_template.find_one({"id": "email_template"}, {"_id": 0})
    
    if current:
        update_data = {**current}
    else:
        update_data = EmailTemplate().model_dump()
    
    for k, v in data.model_dump().items():
        if v is not None:
            update_data[k] = v
    
    await db.email_template.update_one({"id": "email_template"}, {"$set": update_data}, upsert=True)
    return {"message": "E-Mail Template gespeichert"}

@api_router.get("/admin/email-template/preview")
async def preview_email_template(admin = Depends(get_current_admin)):
    """Preview email with variables replaced"""
    tpl = await db.email_template.find_one({"id": "email_template"}, {"_id": 0})
    if not tpl:
        tpl = EmailTemplate().model_dump()
    
    subject = await replace_template_variables(tpl['subject'], subject=True)
    body = await replace_template_variables(tpl['body_html'])
    
    return {"subject": subject, "body_html": body}

@api_router.get("/admin/participants")
async def get_participants(admin = Depends(get_current_admin)):
    return await db.participants.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/admin/participants")
async def add_participant(data: ParticipantCreate, admin = Depends(get_current_admin)):
    participant = Participant(name=data.name, email=data.email)
    doc = participant.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.participants.insert_one(doc)
    return {"id": participant.id, "name": participant.name, "email": participant.email}

@api_router.delete("/admin/participants/{participant_id}")
async def delete_participant(participant_id: str, admin = Depends(get_current_admin)):
    await db.participants.delete_one({"id": participant_id})
    return {"message": "Teilnehmer gelöscht"}

@api_router.post("/admin/send-results")
async def send_results(data: SendEmailRequest, background_tasks: BackgroundTasks, admin = Depends(get_current_admin)):
    """Send results email to selected or all participants"""
    background_tasks.add_task(send_results_email, data.participant_ids)
    return {"message": "E-Mails werden gesendet..."}

@api_router.put("/admin/design")
async def update_design_settings(settings: DesignSettingsUpdate, admin = Depends(get_current_admin)):
    current = await db.design_settings.find_one({"id": "design_settings"}, {"_id": 0})
    update_data = {"id": "design_settings"}
    
    if current:
        update_data = {**current}
    else:
        update_data = DesignSettings().model_dump()
    
    for k, v in settings.model_dump().items():
        if v is not None:
            update_data[k] = v
    
    await db.design_settings.update_one({"id": "design_settings"}, {"$set": update_data}, upsert=True)
    return {"message": "Design gespeichert"}

@api_router.post("/admin/laps", response_model=LapEntryResponse)
async def create_lap_entry(entry: LapEntryCreate, admin = Depends(get_current_admin)):
    try:
        lap_time_ms = parse_lap_time(entry.lap_time_display)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    lap_entry = LapEntry(driver_name=entry.driver_name, team=entry.team, email=entry.email, lap_time_ms=lap_time_ms, lap_time_display=entry.lap_time_display)
    doc = lap_entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.lap_entries.insert_one(doc)
    
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    rank = next((i + 1 for i, e in enumerate(entries) if e['id'] == lap_entry.id), 0)
    
    return LapEntryResponse(id=lap_entry.id, driver_name=lap_entry.driver_name, team=lap_entry.team,
        email=lap_entry.email, lap_time_ms=lap_entry.lap_time_ms, lap_time_display=lap_entry.lap_time_display, 
        created_at=doc['created_at'], rank=rank, gap="")

@api_router.put("/admin/laps/{lap_id}")
async def update_lap_entry(lap_id: str, update: LapEntryUpdate, admin = Depends(get_current_admin)):
    entry = await db.lap_entries.find_one({"id": lap_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    
    update_data = {}
    if update.driver_name is not None:
        update_data['driver_name'] = update.driver_name
    if update.team is not None:
        update_data['team'] = update.team
    if update.email is not None:
        update_data['email'] = update.email if update.email else None
    if update.lap_time_display is not None:
        try:
            update_data['lap_time_ms'] = parse_lap_time(update.lap_time_display)
            update_data['lap_time_display'] = update.lap_time_display
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    if update_data:
        await db.lap_entries.update_one({"id": lap_id}, {"$set": update_data})
    return {"message": "Aktualisiert"}

@api_router.delete("/admin/laps/{lap_id}")
async def delete_lap_entry(lap_id: str, admin = Depends(get_current_admin)):
    await db.lap_entries.delete_one({"id": lap_id})
    return {"message": "Gelöscht"}

@api_router.delete("/admin/laps")
async def delete_all_laps(admin = Depends(get_current_admin)):
    await db.lap_entries.delete_many({})
    return {"message": "Alle gelöscht"}

@api_router.post("/admin/tracks")
async def create_track(track: TrackCreate, admin = Depends(get_current_admin)):
    track_obj = Track(name=track.name, country=track.country, image_url=track.image_url, length_km=track.length_km)
    await db.tracks.insert_one(track_obj.model_dump())
    return {"id": track_obj.id, "name": track_obj.name, "country": track_obj.country, "image_url": track_obj.image_url}

@api_router.put("/admin/tracks/{track_id}")
async def update_track(track_id: str, track: TrackCreate, admin = Depends(get_current_admin)):
    await db.tracks.update_one({"id": track_id}, {"$set": {"name": track.name, "country": track.country, "image_url": track.image_url, "length_km": track.length_km}})
    return {"message": "Aktualisiert"}

@api_router.delete("/admin/tracks/{track_id}")
async def delete_track(track_id: str, admin = Depends(get_current_admin)):
    await db.tracks.delete_one({"id": track_id})
    return {"message": "Gelöscht"}

@api_router.put("/admin/event")
async def update_event(event: EventUpdate, background_tasks: BackgroundTasks, admin = Depends(get_current_admin)):
    current = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    old_status = current.get('status') if current else 'inactive'
    
    doc = {
        "id": "current_event",
        "status": event.status,
        "scheduled_time": event.scheduled_time,
        "scheduled_date": event.scheduled_date,
        "track_id": event.track_id,
        "timer_enabled": event.timer_enabled if event.timer_enabled is not None else (current.get('timer_enabled', False) if current else False),
        "timer_duration_minutes": event.timer_duration_minutes if event.timer_duration_minutes is not None else (current.get('timer_duration_minutes', 60) if current else 60),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Start timer if status changed to active and timer is enabled
    if event.status == 'active' and doc['timer_enabled']:
        duration = doc['timer_duration_minutes']
        start_time = datetime.now(timezone.utc)
        end_time = start_time + timedelta(minutes=duration)
        doc['timer_start_time'] = start_time.isoformat()
        doc['timer_end_time'] = end_time.isoformat()
    elif event.status != 'active':
        doc['timer_start_time'] = None
        doc['timer_end_time'] = None
    
    await db.event_settings.update_one({"id": "current_event"}, {"$set": doc}, upsert=True)
    
    # Send emails if status changed to finished and auto-send is enabled
    if event.status == 'finished' and old_status != 'finished':
        email_tpl = await db.email_template.find_one({"id": "email_template"}, {"_id": 0})
        if email_tpl and email_tpl.get('send_on_finish', True):
            background_tasks.add_task(send_results_email, None)
    
    return {"message": "Event aktualisiert"}

@api_router.get("/admin/export/csv")
async def export_csv(admin = Depends(get_current_admin)):
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    design = await db.design_settings.find_one({"id": "design_settings"}, {"_id": 0})
    event = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    
    title = f"{design.get('title_line1', 'F1')} {design.get('title_line2', 'FAST LAP')} {design.get('title_line3', 'CHALLENGE')}" if design else "F1 FAST LAP CHALLENGE"
    
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
    return StreamingResponse(io.BytesIO(output.getvalue().encode('utf-8')), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=lap_times.csv"})

@api_router.delete("/admin/reset-admin")
async def reset_admin(admin = Depends(get_current_admin)):
    """Delete current admin and all data for fresh setup"""
    await db.admins.delete_many({})
    return {"message": "Admin gelöscht - Neues Setup erforderlich"}

@api_router.get("/admin/export/pdf")
async def export_pdf_data(admin = Depends(get_current_admin)):
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    design = await db.design_settings.find_one({"id": "design_settings"}, {"_id": 0})
    event = await db.event_settings.find_one({"id": "current_event"}, {"_id": 0})
    
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
    
    return {"entries": result, "exported_at": datetime.now(timezone.utc).isoformat(), "track": track_info, "design": design}

# ============== MULTI-EVENT ROUTES ==============

@api_router.get("/events")
async def get_all_events():
    """Get all events grouped by status (public)"""
    events = await db.events.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with track info and top 3 entries
    for event in events:
        if event.get('track_id'):
            track = await db.tracks.find_one({"id": event['track_id']}, {"_id": 0})
            event['track'] = track
        
        # Get top 3 entries for preview
        entries = await db.event_lap_entries.find(
            {"event_id": event['id']}, {"_id": 0}
        ).sort("lap_time_ms", 1).limit(3).to_list(3)
        event['top_entries'] = entries
        event['entry_count'] = await db.event_lap_entries.count_documents({"event_id": event['id']})
    
    # Group by status
    active = [e for e in events if e.get('status') == 'active']
    scheduled = [e for e in events if e.get('status') == 'scheduled']
    finished = [e for e in events if e.get('status') == 'finished']
    archived = [e for e in events if e.get('status') == 'archived']
    
    return {
        "active": active,
        "scheduled": scheduled,
        "finished": finished,
        "archived": archived
    }

@api_router.get("/events/{event_slug}")
async def get_event_by_slug(event_slug: str):
    """Get event details by slug (public)"""
    event = await db.events.find_one({"slug": event_slug}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    # Get track info
    if event.get('track_id'):
        track = await db.tracks.find_one({"id": event['track_id']}, {"_id": 0})
        event['track'] = track
    
    # Get all entries sorted by time
    entries = await db.event_lap_entries.find(
        {"event_id": event['id']}, {"_id": 0}
    ).sort("lap_time_ms", 1).to_list(1000)
    
    # Calculate ranks and gaps
    leader_time = entries[0]['lap_time_ms'] if entries else 0
    for idx, entry in enumerate(entries):
        entry['rank'] = idx + 1
        entry['gap'] = format_gap(leader_time, entry['lap_time_ms'])
    
    event['entries'] = entries
    
    return event

@api_router.post("/admin/events")
async def create_event(event: EventCreate, admin = Depends(get_current_admin)):
    """Create new event"""
    slug = generate_slug(event.name)
    
    # Check for slug collision
    existing = await db.events.find_one({"slug": slug}, {"_id": 0})
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    new_event = Event(
        name=event.name,
        slug=slug,
        description=event.description,
        track_id=event.track_id,
        scheduled_date=event.scheduled_date,
        scheduled_time=event.scheduled_time,
        image_url=event.image_url
    )
    
    doc = new_event.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.events.insert_one(doc)
    
    # Remove _id for response
    doc.pop('_id', None)
    
    return {"message": "Event erstellt", "event": doc}

@api_router.put("/admin/events/{event_id}")
async def update_event(event_id: str, update: EventUpdateModel, background_tasks: BackgroundTasks, admin = Depends(get_current_admin)):
    """Update event"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    old_status = event.get('status')
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    for key, value in update.model_dump().items():
        if value is not None:
            update_data[key] = value
            # Update slug if name changes
            if key == 'name':
                new_slug = generate_slug(value)
                existing = await db.events.find_one({"slug": new_slug, "id": {"$ne": event_id}}, {"_id": 0})
                if not existing:
                    update_data['slug'] = new_slug
    
    # Handle timer start
    if update.status == 'active' and update.timer_enabled and old_status != 'active':
        duration = update.timer_duration_minutes or event.get('timer_duration_minutes', 60)
        start_time = datetime.now(timezone.utc)
        end_time = start_time + timedelta(minutes=duration)
        update_data['timer_start_time'] = start_time.isoformat()
        update_data['timer_end_time'] = end_time.isoformat()
    elif update.status and update.status != 'active':
        update_data['timer_start_time'] = None
        update_data['timer_end_time'] = None
    
    await db.events.update_one({"id": event_id}, {"$set": update_data})
    
    # Send emails if finished
    if update.status == 'finished' and old_status != 'finished':
        email_tpl = await db.email_template.find_one({"id": "email_template"}, {"_id": 0})
        if email_tpl and email_tpl.get('send_on_finish', True):
            background_tasks.add_task(send_event_results_email, event_id)
    
    return {"message": "Event aktualisiert"}

@api_router.delete("/admin/events/{event_id}")
async def delete_event(event_id: str, admin = Depends(get_current_admin)):
    """Delete event and its entries"""
    await db.events.delete_one({"id": event_id})
    await db.event_lap_entries.delete_many({"event_id": event_id})
    return {"message": "Event gelöscht"}

@api_router.post("/admin/events/{event_id}/laps")
async def add_event_lap(event_id: str, entry: EventLapEntryCreate, admin = Depends(get_current_admin)):
    """Add lap entry to event"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    lap_time_ms = parse_lap_time(entry.lap_time_display)
    
    new_entry = EventLapEntry(
        event_id=event_id,
        driver_name=entry.driver_name,
        team=entry.team,
        email=entry.email,
        lap_time_ms=lap_time_ms,
        lap_time_display=entry.lap_time_display
    )
    
    doc = new_entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.event_lap_entries.insert_one(doc)
    
    # Remove _id for response
    doc.pop('_id', None)
    
    return {"message": "Rundenzeit hinzugefügt", "entry": doc}

@api_router.put("/admin/events/{event_id}/laps/{lap_id}")
async def update_event_lap(event_id: str, lap_id: str, update: LapEntryUpdate, admin = Depends(get_current_admin)):
    """Update lap entry"""
    entry = await db.event_lap_entries.find_one({"id": lap_id, "event_id": event_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    
    update_data = {}
    for key, value in update.model_dump().items():
        if value is not None:
            if key == 'lap_time_display':
                update_data['lap_time_ms'] = parse_lap_time(value)
            update_data[key] = value
    
    if update_data:
        await db.event_lap_entries.update_one({"id": lap_id}, {"$set": update_data})
    
    return {"message": "Eintrag aktualisiert"}

@api_router.delete("/admin/events/{event_id}/laps/{lap_id}")
async def delete_event_lap(event_id: str, lap_id: str, admin = Depends(get_current_admin)):
    """Delete lap entry"""
    await db.event_lap_entries.delete_one({"id": lap_id, "event_id": event_id})
    return {"message": "Eintrag gelöscht"}

@api_router.get("/admin/events/{event_id}/export/csv")
async def export_event_csv(event_id: str, admin = Depends(get_current_admin)):
    """Export event results as CSV"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    entries = await db.event_lap_entries.find({"event_id": event_id}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    
    track_name = ""
    if event.get('track_id'):
        track = await db.tracks.find_one({"id": event['track_id']}, {"_id": 0})
        if track:
            track_name = f"{track['name']}, {track['country']}"
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([event['name'], track_name, event.get('scheduled_date', '')])
    writer.writerow([])
    writer.writerow(['Platz', 'Fahrer', 'Team', 'Rundenzeit', 'Abstand', 'E-Mail'])
    
    leader_time = entries[0]['lap_time_ms'] if entries else 0
    for idx, entry in enumerate(entries):
        writer.writerow([
            idx + 1, 
            entry['driver_name'], 
            entry.get('team', ''), 
            entry['lap_time_display'], 
            format_gap(leader_time, entry['lap_time_ms']),
            entry.get('email', '')
        ])
    
    output.seek(0)
    filename = f"{event['slug']}_results.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/admin/events/{event_id}/statistics")
async def get_event_statistics(event_id: str, admin = Depends(get_current_admin)):
    """Get event statistics for export"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    entries = await db.event_lap_entries.find({"event_id": event_id}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    
    if not entries:
        return {"event": event, "statistics": None}
    
    times = [e['lap_time_ms'] for e in entries]
    
    stats = {
        "total_entries": len(entries),
        "fastest_time": entries[0]['lap_time_display'] if entries else None,
        "fastest_driver": entries[0]['driver_name'] if entries else None,
        "slowest_time": entries[-1]['lap_time_display'] if entries else None,
        "average_time_ms": sum(times) / len(times) if times else 0,
        "time_distribution": {
            "under_1_30": len([t for t in times if t < 90000]),
            "1_30_to_1_45": len([t for t in times if 90000 <= t < 105000]),
            "1_45_to_2_00": len([t for t in times if 105000 <= t < 120000]),
            "over_2_00": len([t for t in times if t >= 120000])
        },
        "teams": {}
    }
    
    # Team statistics
    for entry in entries:
        team = entry.get('team', 'Ohne Team')
        if team not in stats['teams']:
            stats['teams'][team] = {"count": 0, "best_time": None, "best_driver": None}
        stats['teams'][team]['count'] += 1
        if stats['teams'][team]['best_time'] is None or entry['lap_time_ms'] < parse_lap_time(stats['teams'][team]['best_time']):
            stats['teams'][team]['best_time'] = entry['lap_time_display']
            stats['teams'][team]['best_driver'] = entry['driver_name']
    
    return {"event": event, "statistics": stats, "entries": entries}

async def send_event_results_email(event_id: str):
    """Send results email to event participants"""
    try:
        smtp_settings = await db.smtp_settings.find_one({"id": "smtp_settings"}, {"_id": 0})
        if not smtp_settings or not smtp_settings.get('enabled'):
            logging.info("SMTP not enabled, skipping email")
            return
        
        event = await db.events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            return
        
        email_tpl = await db.email_template.find_one({"id": "email_template"}, {"_id": 0})
        if not email_tpl:
            email_tpl = EmailTemplate().model_dump()
        
        # Get entries with email
        entries = await db.event_lap_entries.find(
            {"event_id": event_id, "email": {"$exists": True, "$ne": None, "$ne": ""}}, 
            {"_id": 0}
        ).to_list(1000)
        
        recipients = [{"name": e['driver_name'], "email": e['email']} for e in entries if e.get('email')]
        
        if not recipients:
            logging.info(f"No recipients for event {event_id}")
            return
        
        # Get results for template
        all_entries = await db.event_lap_entries.find({"event_id": event_id}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
        
        # Build results table
        results_rows = []
        for idx, e in enumerate(all_entries[:10]):
            color = '#FFD700' if idx == 0 else '#C0C0C0' if idx == 1 else '#CD7F32' if idx == 2 else '#A0A0A0'
            results_rows.append(f"<tr><td style='padding: 8px; color: {color};'>{idx + 1}</td><td style='padding: 8px;'>{e['driver_name']}</td><td style='padding: 8px;'>{e['lap_time_display']}</td></tr>")
        
        subject = email_tpl['subject'].replace("{event_title}", event['name'])
        body = email_tpl['body_html'].replace("{event_title}", event['name']).replace("{results_table}", ''.join(results_rows))
        
        from_name = smtp_settings.get('from_name', 'F1 Fast Lap Challenge')
        from_email = smtp_settings['from_email']
        
        with smtplib.SMTP(smtp_settings['host'], smtp_settings['port']) as server:
            server.starttls()
            server.login(smtp_settings['username'], smtp_settings['password'])
            
            for recipient in recipients:
                try:
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = subject
                    msg['From'] = f"{from_name} <{from_email}>"
                    msg['To'] = recipient['email']
                    personalized_body = body.replace("{participant_name}", recipient['name'])
                    msg.attach(MIMEText(personalized_body, 'html'))
                    server.send_message(msg)
                    logging.info(f"Email sent to {recipient['email']} for event {event_id}")
                except Exception as e:
                    logging.error(f"Failed to send to {recipient['email']}: {e}")
                    
    except Exception as e:
        logging.error(f"Failed to send event results emails: {e}")

# ============== QR CODE ==============

@api_router.get("/events/{event_slug}/qr")
async def get_event_qr_code(event_slug: str, base_url: Optional[str] = None):
    """Generate QR code for event URL"""
    event = await db.events.find_one({"slug": event_slug}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    # Build event URL
    if base_url:
        event_url = f"{base_url}/event/{event_slug}"
    else:
        event_url = f"/event/{event_slug}"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(event_url)
    qr.make(fit=True)
    
    # Create image with F1 colors (red on white)
    img = qr.make_image(fill_color="#FF1E1E", back_color="white")
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return Response(content=img_bytes.getvalue(), media_type="image/png")

# ============== FILE UPLOAD ==============
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), admin = Depends(get_current_admin)):
    """Upload image file and return URL"""
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Nur Bilder erlaubt (JPG, PNG, GIF, WebP, SVG)")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"filename": filename, "url": f"/api/uploads/{filename}"}

@api_router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded file"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    
    # Determine content type
    ext = filename.split('.')[-1].lower()
    content_types = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return FileResponse(file_path, media_type=content_type)

app.include_router(api_router)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.on_event("startup")
async def create_default_admin():
    """Erstellt Standard-Admin wenn keiner existiert"""
    existing = await db.admins.find_one({}, {"_id": 0})
    if not existing:
        password_hash = bcrypt.hashpw('admin'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin_doc = {
            'id': str(uuid.uuid4()),
            'username': 'admin',
            'email': None,
            'password_hash': password_hash,
            'notifications_enabled': False,
            'must_change_password': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.admins.insert_one(admin_doc)
        logging.info("✅ Standard-Admin erstellt: admin / admin")
    else:
        logging.info("ℹ️ Admin existiert bereits")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
