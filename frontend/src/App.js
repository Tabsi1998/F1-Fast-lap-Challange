import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
    Trophy, 
    Timer, 
    Flag, 
    Plus, 
    Trash2, 
    Download, 
    FileText, 
    Edit2, 
    X, 
    Check,
    Users,
    User,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Rank Badge Component
const RankBadge = ({ rank }) => {
    let badgeClass = "rank-badge rank-default";
    
    if (rank === 1) badgeClass = "rank-badge rank-1";
    else if (rank === 2) badgeClass = "rank-badge rank-2";
    else if (rank === 3) badgeClass = "rank-badge rank-3";
    
    return (
        <div className={badgeClass} data-testid={`rank-badge-${rank}`}>
            {rank}
        </div>
    );
};

// Leaderboard Entry Row
const EntryRow = ({ entry, onEdit, onDelete, showTeam }) => {
    const rowClass = `entry-row ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`;
    
    return (
        <div className={rowClass} data-testid={`entry-row-${entry.id}`}>
            <div>
                <RankBadge rank={entry.rank} />
            </div>
            <div className="font-body text-white font-semibold" data-testid={`driver-name-${entry.id}`}>
                {entry.driver_name}
            </div>
            {showTeam && (
                <div className="team-col text-[var(--text-secondary)] font-body" data-testid={`team-${entry.id}`}>
                    {entry.team || '-'}
                </div>
            )}
            <div className="font-mono text-lg tracking-wider text-[var(--accent-neon)]" data-testid={`lap-time-${entry.id}`}>
                {entry.lap_time_display}
            </div>
            <div className="gap-col font-mono text-sm text-[var(--text-secondary)]" data-testid={`gap-${entry.id}`}>
                {entry.gap}
            </div>
            <div className="flex gap-2 justify-end">
                <button 
                    onClick={() => onEdit(entry)}
                    className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors"
                    data-testid={`edit-btn-${entry.id}`}
                >
                    <Edit2 size={16} />
                </button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <button 
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-red)] transition-colors"
                            data-testid={`delete-btn-${entry.id}`}
                        >
                            <Trash2 size={16} />
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-white font-heading">Eintrag löschen?</AlertDialogTitle>
                            <AlertDialogDescription className="text-[var(--text-secondary)]">
                                Möchtest du den Eintrag von {entry.driver_name} wirklich löschen?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="btn-secondary">Abbrechen</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={() => onDelete(entry.id)}
                                className="btn-primary"
                                data-testid="confirm-delete-btn"
                            >
                                Löschen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
};

// Admin Panel Component
const AdminPanel = ({ onSubmit, showTeam }) => {
    const [driverName, setDriverName] = useState("");
    const [team, setTeam] = useState("");
    const [lapTime, setLapTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!driverName.trim()) {
            toast.error("Bitte Fahrername eingeben");
            return;
        }
        
        if (!lapTime.trim()) {
            toast.error("Bitte Rundenzeit eingeben");
            return;
        }
        
        // Validate time format
        const timeRegex = /^\d{1,2}:\d{2}\.\d{1,3}$/;
        if (!timeRegex.test(lapTime)) {
            toast.error("Ungültiges Zeitformat. Bitte MM:SS.mmm verwenden (z.B. 1:23.456)");
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            await onSubmit({
                driver_name: driverName.trim(),
                team: showTeam ? team.trim() || null : null,
                lap_time_display: lapTime.trim()
            });
            
            setDriverName("");
            setTeam("");
            setLapTime("");
            toast.success("Rundenzeit hinzugefügt!");
        } catch (error) {
            toast.error(error.response?.data?.detail || "Fehler beim Hinzufügen");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-panel" data-testid="admin-panel">
            <h2 className="admin-title">
                <Plus size={20} className="text-[var(--primary-red)]" />
                Neue Rundenzeit eintragen
            </h2>
            <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-field">
                    <Label className="form-label">Fahrername</Label>
                    <Input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="Max Verstappen"
                        className="input-racing"
                        data-testid="driver-name-input"
                    />
                </div>
                
                {showTeam && (
                    <div className="form-field">
                        <Label className="form-label">Team (optional)</Label>
                        <Input
                            type="text"
                            value={team}
                            onChange={(e) => setTeam(e.target.value)}
                            placeholder="Red Bull Racing"
                            className="input-racing"
                            data-testid="team-input"
                        />
                    </div>
                )}
                
                <div className="form-field">
                    <Label className="form-label">Rundenzeit (MM:SS.mmm)</Label>
                    <Input
                        type="text"
                        value={lapTime}
                        onChange={(e) => setLapTime(e.target.value)}
                        placeholder="1:23.456"
                        className="input-racing input-time"
                        data-testid="lap-time-input"
                    />
                </div>
                
                <Button 
                    type="submit" 
                    className="btn-primary h-10 px-6"
                    disabled={isSubmitting}
                    data-testid="add-lap-btn"
                >
                    {isSubmitting ? (
                        <RefreshCw size={18} className="animate-spin" />
                    ) : (
                        <>
                            <Plus size={18} className="mr-2" />
                            Hinzufügen
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
};

// Edit Dialog Component
const EditDialog = ({ entry, isOpen, onClose, onSave, showTeam }) => {
    const [driverName, setDriverName] = useState("");
    const [team, setTeam] = useState("");
    const [lapTime, setLapTime] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (entry) {
            setDriverName(entry.driver_name);
            setTeam(entry.team || "");
            setLapTime(entry.lap_time_display);
        }
    }, [entry]);

    const handleSave = async () => {
        if (!driverName.trim()) {
            toast.error("Bitte Fahrername eingeben");
            return;
        }
        
        const timeRegex = /^\d{1,2}:\d{2}\.\d{1,3}$/;
        if (!timeRegex.test(lapTime)) {
            toast.error("Ungültiges Zeitformat");
            return;
        }
        
        setIsSaving(true);
        
        try {
            await onSave(entry.id, {
                driver_name: driverName.trim(),
                team: showTeam ? team.trim() || null : null,
                lap_time_display: lapTime.trim()
            });
            onClose();
            toast.success("Eintrag aktualisiert!");
        } catch (error) {
            toast.error(error.response?.data?.detail || "Fehler beim Speichern");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                <DialogHeader>
                    <DialogTitle className="text-white font-heading flex items-center gap-2">
                        <Edit2 size={20} className="text-[var(--primary-red)]" />
                        Eintrag bearbeiten
                    </DialogTitle>
                    <DialogDescription className="text-[var(--text-secondary)]">
                        Ändere die Daten für diesen Eintrag
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="form-field">
                        <Label className="form-label">Fahrername</Label>
                        <Input
                            type="text"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            className="input-racing"
                            data-testid="edit-driver-name-input"
                        />
                    </div>
                    
                    {showTeam && (
                        <div className="form-field">
                            <Label className="form-label">Team</Label>
                            <Input
                                type="text"
                                value={team}
                                onChange={(e) => setTeam(e.target.value)}
                                className="input-racing"
                                data-testid="edit-team-input"
                            />
                        </div>
                    )}
                    
                    <div className="form-field">
                        <Label className="form-label">Rundenzeit</Label>
                        <Input
                            type="text"
                            value={lapTime}
                            onChange={(e) => setLapTime(e.target.value)}
                            className="input-racing input-time"
                            data-testid="edit-lap-time-input"
                        />
                    </div>
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="btn-secondary">
                        Abbrechen
                    </Button>
                    <Button onClick={handleSave} className="btn-primary" disabled={isSaving} data-testid="save-edit-btn">
                        {isSaving ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : (
                            <>
                                <Check size={18} className="mr-2" />
                                Speichern
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Main App Component
function App() {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showTeam, setShowTeam] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const fetchEntries = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/laps`);
            setEntries(response.data);
        } catch (error) {
            toast.error("Fehler beim Laden der Daten");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const handleAddEntry = async (data) => {
        await axios.post(`${API}/laps`, data);
        fetchEntries();
    };

    const handleUpdateEntry = async (id, data) => {
        await axios.put(`${API}/laps/${id}`, data);
        fetchEntries();
    };

    const handleDeleteEntry = async (id) => {
        try {
            await axios.delete(`${API}/laps/${id}`);
            toast.success("Eintrag gelöscht!");
            fetchEntries();
        } catch (error) {
            toast.error("Fehler beim Löschen");
        }
    };

    const handleDeleteAll = async () => {
        try {
            await axios.delete(`${API}/laps`);
            toast.success("Alle Einträge gelöscht!");
            fetchEntries();
        } catch (error) {
            toast.error("Fehler beim Löschen");
        }
    };

    const handleExportCSV = () => {
        window.open(`${API}/export/csv`, '_blank');
        toast.success("CSV Export gestartet!");
    };

    const handleExportPDF = async () => {
        try {
            const response = await axios.get(`${API}/export/pdf`);
            const data = response.data;
            
            // Generate PDF-like HTML and open in new window for printing
            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>F1 Fast Lap Challenge - Ergebnisse</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Barlow:wght@400;600&family=JetBrains+Mono&display=swap');
                        body { 
                            font-family: 'Barlow', sans-serif; 
                            padding: 40px;
                            background: #fff;
                            color: #000;
                        }
                        h1 { 
                            font-family: 'Russo One', sans-serif;
                            font-size: 2rem;
                            margin-bottom: 0.5rem;
                            color: #FF1E1E;
                        }
                        .subtitle {
                            color: #666;
                            margin-bottom: 2rem;
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        th { 
                            font-family: 'Russo One', sans-serif;
                            text-align: left;
                            padding: 12px;
                            background: #1A1A1A;
                            color: #fff;
                            font-size: 0.75rem;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                        }
                        td { 
                            padding: 12px;
                            border-bottom: 1px solid #eee;
                        }
                        .rank { 
                            font-family: 'Russo One', sans-serif;
                            font-weight: bold;
                            width: 50px;
                        }
                        .rank-1 { color: #FFD700; }
                        .rank-2 { color: #C0C0C0; }
                        .rank-3 { color: #CD7F32; }
                        .time { 
                            font-family: 'JetBrains Mono', monospace;
                            font-weight: bold;
                        }
                        .gap {
                            font-family: 'JetBrains Mono', monospace;
                            color: #666;
                        }
                        @media print {
                            body { padding: 20px; }
                        }
                    </style>
                </head>
                <body>
                    <h1>F1 FAST LAP CHALLENGE</h1>
                    <p class="subtitle">Exportiert: ${new Date(data.exported_at).toLocaleString('de-DE')}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Platz</th>
                                <th>Fahrer</th>
                                <th>Team</th>
                                <th>Rundenzeit</th>
                                <th>Abstand</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.entries.map(e => `
                                <tr>
                                    <td class="rank ${e.rank <= 3 ? `rank-${e.rank}` : ''}">${e.rank}</td>
                                    <td>${e.driver_name}</td>
                                    <td>${e.team || '-'}</td>
                                    <td class="time">${e.lap_time_display}</td>
                                    <td class="gap">${e.gap}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
            
            toast.success("PDF Export bereit zum Drucken!");
        } catch (error) {
            toast.error("Fehler beim PDF Export");
        }
    };

    const openEditDialog = (entry) => {
        setEditEntry(entry);
        setIsEditDialogOpen(true);
    };

    const closeEditDialog = () => {
        setEditEntry(null);
        setIsEditDialogOpen(false);
    };

    return (
        <div className="racing-bg">
            <div className="racing-overlay min-h-screen">
                <Toaster 
                    position="top-right" 
                    toastOptions={{
                        style: {
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-default)'
                        }
                    }}
                />
                
                {/* Header */}
                <header className="header" data-testid="app-header">
                    <div className="header-title">
                        <Flag size={28} className="text-[var(--primary-red)]" />
                        F1 <span>FAST LAP</span> CHALLENGE
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="mode-switch" data-testid="mode-switch">
                            <User size={16} />
                            <span>Name</span>
                            <Switch 
                                checked={showTeam}
                                onCheckedChange={setShowTeam}
                                data-testid="team-toggle"
                            />
                            <span>+ Team</span>
                            <Users size={16} />
                        </div>
                    </div>
                </header>
                
                {/* Main Content */}
                <main className="main-content">
                    {/* Admin Panel */}
                    <AdminPanel onSubmit={handleAddEntry} showTeam={showTeam} />
                    
                    {/* Leaderboard */}
                    <div className="leaderboard-container" data-testid="leaderboard">
                        <div className="leaderboard-header">
                            <h2 className="leaderboard-title">
                                <Trophy size={28} className="inline-block mr-3 text-[var(--accent-gold)]" />
                                Rangliste
                            </h2>
                            
                            <div className="leaderboard-actions">
                                <Button 
                                    onClick={handleExportCSV}
                                    className="btn-secondary"
                                    disabled={entries.length === 0}
                                    data-testid="export-csv-btn"
                                >
                                    <FileText size={18} className="mr-2" />
                                    CSV Export
                                </Button>
                                
                                <Button 
                                    onClick={handleExportPDF}
                                    className="btn-secondary"
                                    disabled={entries.length === 0}
                                    data-testid="export-pdf-btn"
                                >
                                    <Download size={18} className="mr-2" />
                                    PDF Export
                                </Button>
                                
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            className="btn-secondary text-[var(--primary-red)] hover:bg-[var(--primary-red)] hover:text-white"
                                            disabled={entries.length === 0}
                                            data-testid="delete-all-btn"
                                        >
                                            <Trash2 size={18} className="mr-2" />
                                            Alle löschen
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-white font-heading">Alle Einträge löschen?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-[var(--text-secondary)]">
                                                Dies kann nicht rückgängig gemacht werden. Alle Rundenzeiten werden unwiderruflich gelöscht.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="btn-secondary">Abbrechen</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={handleDeleteAll}
                                                className="btn-primary"
                                                data-testid="confirm-delete-all-btn"
                                            >
                                                Alle löschen
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        
                        {/* Column Headers */}
                        {entries.length > 0 && (
                            <div className="grid gap-4 px-6 pb-2" style={{ gridTemplateColumns: showTeam ? '60px 1fr 120px 150px 120px 80px' : '60px 1fr 150px 120px 80px' }}>
                                <span className="form-label">Platz</span>
                                <span className="form-label">Fahrer</span>
                                {showTeam && <span className="form-label">Team</span>}
                                <span className="form-label">Zeit</span>
                                <span className="form-label">Abstand</span>
                                <span className="form-label text-right">Aktionen</span>
                            </div>
                        )}
                        
                        {/* Entries */}
                        {isLoading ? (
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="empty-state" data-testid="empty-state">
                                <Timer size={64} className="mx-auto mb-4 text-[var(--text-muted)]" />
                                <p className="empty-state-text">Noch keine Rundenzeiten eingetragen</p>
                                <p className="text-[var(--text-muted)] mt-2">Füge oben die erste Rundenzeit hinzu!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {entries.map((entry, index) => (
                                    <div 
                                        key={entry.id} 
                                        className="animate-slide-in"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <EntryRow 
                                            entry={entry}
                                            onEdit={openEditDialog}
                                            onDelete={handleDeleteEntry}
                                            showTeam={showTeam}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
                
                {/* Edit Dialog */}
                <EditDialog 
                    entry={editEntry}
                    isOpen={isEditDialogOpen}
                    onClose={closeEditDialog}
                    onSave={handleUpdateEntry}
                    showTeam={showTeam}
                />
            </div>
        </div>
    );
}

export default App;
