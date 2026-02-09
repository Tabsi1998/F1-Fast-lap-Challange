from fastapi import FastAPI, APIRouter, HTTPException
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class LapEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_name: str
    team: Optional[str] = None
    lap_time_ms: int  # Store as milliseconds for accurate sorting
    lap_time_display: str  # Display format MM:SS.mmm
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LapEntryCreate(BaseModel):
    driver_name: str
    team: Optional[str] = None
    lap_time_display: str  # Format: MM:SS.mmm or M:SS.mmm

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

def parse_lap_time(time_str: str) -> int:
    """Convert MM:SS.mmm to milliseconds"""
    try:
        # Handle both M:SS.mmm and MM:SS.mmm
        parts = time_str.split(':')
        if len(parts) != 2:
            raise ValueError("Invalid format")
        
        minutes = int(parts[0])
        seconds_parts = parts[1].split('.')
        
        if len(seconds_parts) != 2:
            raise ValueError("Invalid format")
        
        seconds = int(seconds_parts[0])
        milliseconds = int(seconds_parts[1].ljust(3, '0')[:3])  # Ensure 3 digits
        
        total_ms = (minutes * 60 * 1000) + (seconds * 1000) + milliseconds
        return total_ms
    except Exception as e:
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

# API Routes
@api_router.get("/")
async def root():
    return {"message": "F1 Fast Lap Challenge API"}

@api_router.post("/laps", response_model=LapEntryResponse)
async def create_lap_entry(entry: LapEntryCreate):
    """Create a new lap time entry"""
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

@api_router.get("/laps", response_model=List[LapEntryResponse])
async def get_all_laps():
    """Get all lap entries sorted by time (fastest first) with rankings"""
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

@api_router.get("/laps/{lap_id}", response_model=LapEntryResponse)
async def get_lap_entry(lap_id: str):
    """Get a single lap entry by ID"""
    entry = await db.lap_entries.find_one({"id": lap_id}, {"_id": 0})
    
    if not entry:
        raise HTTPException(status_code=404, detail="Lap entry not found")
    
    return LapEntryResponse(
        id=entry['id'],
        driver_name=entry['driver_name'],
        team=entry.get('team'),
        lap_time_ms=entry['lap_time_ms'],
        lap_time_display=entry['lap_time_display'],
        created_at=entry['created_at'],
        rank=0,
        gap=""
    )

@api_router.put("/laps/{lap_id}", response_model=LapEntryResponse)
async def update_lap_entry(lap_id: str, update: LapEntryUpdate):
    """Update an existing lap entry"""
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

@api_router.delete("/laps/{lap_id}")
async def delete_lap_entry(lap_id: str):
    """Delete a lap entry"""
    result = await db.lap_entries.delete_one({"id": lap_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lap entry not found")
    
    return {"message": "Lap entry deleted successfully"}

@api_router.delete("/laps")
async def delete_all_laps():
    """Delete all lap entries"""
    await db.lap_entries.delete_many({})
    return {"message": "All lap entries deleted successfully"}

@api_router.get("/export/csv")
async def export_csv():
    """Export all lap entries as CSV"""
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Rank', 'Driver', 'Team', 'Lap Time', 'Gap'])
    
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
    """Export lap data for PDF generation (client-side)"""
    entries = await db.lap_entries.find({}, {"_id": 0}).sort("lap_time_ms", 1).to_list(1000)
    
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
    
    return {"entries": result, "exported_at": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
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
