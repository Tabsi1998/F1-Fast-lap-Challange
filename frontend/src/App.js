import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
    Trophy, Timer, Flag, Plus, Trash2, Download, FileText, Edit2, 
    X, Check, Users, User, RefreshCw, Settings, LogOut, LogIn,
    MapPin, Calendar, Clock, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const useAuth = () => {
    const [token, setToken] = useState(localStorage.getItem('f1_token'));
    const [username, setUsername] = useState(localStorage.getItem('f1_username'));

    const login = (newToken, newUsername) => {
        localStorage.setItem('f1_token', newToken);
        localStorage.setItem('f1_username', newUsername);
        setToken(newToken);
        setUsername(newUsername);
    };

    const logout = () => {
        localStorage.removeItem('f1_token');
        localStorage.removeItem('f1_username');
        setToken(null);
        setUsername(null);
    };

    const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

    return { token, username, login, logout, getAuthHeader, isAuthenticated: !!token };
};

// Rank Badge Component
const RankBadge = ({ rank, large = false }) => {
    let badgeClass = `rank-badge ${large ? 'rank-badge-lg' : ''} `;
    if (rank === 1) badgeClass += "rank-1";
    else if (rank === 2) badgeClass += "rank-2";
    else if (rank === 3) badgeClass += "rank-3";
    else badgeClass += "rank-default";
    
    return <div className={badgeClass} data-testid={`rank-badge-${rank}`}>{rank}</div>;
};

// Status Banner Component
const StatusBanner = ({ status, message }) => {
    const statusClass = `status-banner status-${status}`;
    return (
        <div className={statusClass} data-testid="status-banner">
            <Flag size={16} className="inline-block mr-2" />
            {message}
        </div>
    );
};

// ==================== PUBLIC LEADERBOARD PAGE ====================
const PublicLeaderboard = () => {
    const [entries, setEntries] = useState([]);
    const [eventStatus, setEventStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [entriesRes, statusRes] = await Promise.all([
                axios.get(`${API}/laps`),
                axios.get(`${API}/event/status`)
            ]);
            setEntries(entriesRes.data);
            setEventStatus(statusRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Auto-refresh every 10 seconds
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleExportCSV = () => window.open(`${API}/export/csv`, '_blank');

    const handleExportPDF = async () => {
        try {
            const response = await axios.get(`${API}/export/pdf`);
            const data = response.data;
            
            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>F1 Fast Lap Challenge</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Barlow:wght@400;600&family=JetBrains+Mono&display=swap');
                        body { font-family: 'Barlow', sans-serif; padding: 40px; background: #fff; color: #000; }
                        h1 { font-family: 'Russo One', sans-serif; font-size: 2rem; margin-bottom: 0.5rem; color: #FF1E1E; }
                        .track { color: #666; margin-bottom: 1rem; }
                        .subtitle { color: #666; margin-bottom: 2rem; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { font-family: 'Russo One', sans-serif; text-align: left; padding: 12px; background: #1A1A1A; color: #fff; font-size: 0.75rem; text-transform: uppercase; }
                        td { padding: 12px; border-bottom: 1px solid #eee; }
                        .rank { font-family: 'Russo One', sans-serif; font-weight: bold; width: 50px; }
                        .rank-1 { color: #FFD700; } .rank-2 { color: #C0C0C0; } .rank-3 { color: #CD7F32; }
                        .time { font-family: 'JetBrains Mono', monospace; font-weight: bold; }
                        .gap { font-family: 'JetBrains Mono', monospace; color: #666; }
                    </style>
                </head>
                <body>
                    <h1>F1 FAST LAP CHALLENGE</h1>
                    ${data.track_name ? `<p class="track">${data.track_name}</p>` : ''}
                    <p class="subtitle">Exportiert: ${new Date(data.exported_at).toLocaleString('de-DE')}</p>
                    <table>
                        <thead><tr><th>Platz</th><th>Fahrer</th><th>Team</th><th>Rundenzeit</th><th>Abstand</th></tr></thead>
                        <tbody>
                            ${data.entries.map(e => `
                                <tr>
                                    <td class="rank ${e.rank <= 3 ? `rank-${e.rank}` : ''}">${e.rank}</td>
                                    <td>${e.driver_name}</td><td>${e.team || '-'}</td>
                                    <td class="time">${e.lap_time_display}</td><td class="gap">${e.gap}</td>
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
        } catch (error) {
            toast.error("Fehler beim PDF Export");
        }
    };

    if (isLoading) {
        return (
            <div className="racing-bg fullscreen-leaderboard">
                <div className="racing-overlay flex-1 flex items-center justify-center">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="racing-bg fullscreen-leaderboard" data-testid="public-leaderboard">
            <div className="racing-overlay flex-1 flex flex-col">
                <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}} />
                
                {/* Status Banner */}
                {eventStatus && <StatusBanner status={eventStatus.status} message={eventStatus.message} />}
                
                {/* Header */}
                <header className="public-header">
                    <h1 className="public-title" data-testid="public-title">
                        <Flag size={32} className="inline-block mr-3 text-[var(--primary-red)]" />
                        F1 <span>FAST LAP</span> CHALLENGE
                    </h1>
                    {eventStatus?.track_name && (
                        <p className="track-info">
                            <MapPin size={16} />
                            {eventStatus.track_name}
                        </p>
                    )}
                </header>
                
                {/* Leaderboard */}
                <div className="flex-1 overflow-auto">
                    <div className="leaderboard-list">
                        {entries.length === 0 ? (
                            <div className="empty-state" data-testid="empty-leaderboard">
                                <Timer size={64} className="mx-auto mb-4 text-[var(--text-muted)]" />
                                <p className="empty-state-text">Noch keine Rundenzeiten</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {entries.map((entry, idx) => (
                                    <div 
                                        key={entry.id}
                                        className={`leaderboard-entry animate-slide-in ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                        data-testid={`leaderboard-entry-${entry.id}`}
                                    >
                                        <RankBadge rank={entry.rank} large={entry.rank <= 3} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-heading text-white text-lg truncate" data-testid={`driver-${entry.id}`}>
                                                {entry.driver_name}
                                            </div>
                                            {entry.team && (
                                                <div className="text-[var(--text-secondary)] text-sm truncate">
                                                    {entry.team}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="font-mono text-xl text-[var(--accent-neon)]" data-testid={`time-${entry.id}`}>
                                                {entry.lap_time_display}
                                            </div>
                                            <div className="font-mono text-sm text-[var(--text-secondary)]">
                                                {entry.gap}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer Actions */}
                {entries.length > 0 && (
                    <div className="p-4 border-t border-[var(--border-default)] flex justify-center gap-3 flex-wrap">
                        <Button onClick={handleExportCSV} className="btn-secondary" data-testid="export-csv-btn">
                            <FileText size={16} className="mr-2" /> CSV
                        </Button>
                        <Button onClick={handleExportPDF} className="btn-secondary" data-testid="export-pdf-btn">
                            <Download size={16} className="mr-2" /> PDF
                        </Button>
                    </div>
                )}
                
                {/* Admin Link */}
                <Link to="/admin" className="admin-link">
                    <Button className="btn-secondary" size="sm" data-testid="admin-link-btn">
                        <Settings size={16} className="mr-2" /> Admin
                    </Button>
                </Link>
            </div>
        </div>
    );
};

// ==================== LOGIN PAGE ====================
const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isSetup, setIsSetup] = useState(false);
    const [hasAdmin, setHasAdmin] = useState(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        axios.get(`${API}/auth/has-admin`).then(res => {
            setHasAdmin(res.data.has_admin);
            setIsSetup(!res.data.has_admin);
        }).catch(() => setHasAdmin(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            toast.error("Bitte alle Felder ausfüllen");
            return;
        }
        
        setIsLoading(true);
        try {
            const endpoint = isSetup ? `${API}/auth/setup` : `${API}/auth/login`;
            const response = await axios.post(endpoint, { username, password });
            login(response.data.token, response.data.username);
            toast.success(isSetup ? "Admin-Konto erstellt!" : "Erfolgreich angemeldet!");
            navigate('/admin/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || "Fehler bei der Anmeldung");
        } finally {
            setIsLoading(false);
        }
    };

    if (hasAdmin === null) {
        return <div className="racing-bg login-container"><div className="spinner"></div></div>;
    }

    return (
        <div className="racing-bg" data-testid="login-page">
            <div className="racing-overlay login-container">
                <Toaster position="top-right" />
                <div className="login-card animate-fade-in">
                    <div className="text-center mb-6">
                        <Flag size={48} className="mx-auto text-[var(--primary-red)] mb-2" />
                        <h1 className="login-title">
                            {isSetup ? "Admin Setup" : "Admin Login"}
                        </h1>
                        {isSetup && (
                            <p className="text-[var(--text-secondary)] text-sm">
                                Erstelle dein Administrator-Konto
                            </p>
                        )}
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-field">
                            <Label className="form-label">Benutzername</Label>
                            <Input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin"
                                className="input-racing"
                                data-testid="username-input"
                            />
                        </div>
                        
                        <div className="form-field">
                            <Label className="form-label">Passwort</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-racing"
                                data-testid="password-input"
                            />
                        </div>
                        
                        <Button type="submit" className="btn-primary w-full" disabled={isLoading} data-testid="login-btn">
                            {isLoading ? <RefreshCw size={18} className="animate-spin" /> : (
                                <>{isSetup ? "Konto erstellen" : "Anmelden"} <ChevronRight size={18} className="ml-2" /></>
                            )}
                        </Button>
                    </form>
                    
                    {hasAdmin && (
                        <button 
                            onClick={() => setIsSetup(!isSetup)}
                            className="w-full mt-4 text-center text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                        >
                            {isSetup ? "Bereits registriert? Anmelden" : ""}
                        </button>
                    )}
                    
                    <Link to="/" className="block mt-6 text-center text-sm text-[var(--text-secondary)] hover:text-[var(--primary-red)] transition-colors">
                        ← Zurück zur Rangliste
                    </Link>
                </div>
            </div>
        </div>
    );
};

// ==================== ADMIN DASHBOARD ====================
const AdminDashboard = () => {
    const navigate = useNavigate();
    const { token, username, logout, getAuthHeader, isAuthenticated } = useAuth();
    
    const [entries, setEntries] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [eventStatus, setEventStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showTeam, setShowTeam] = useState(true);
    
    // Form states
    const [driverName, setDriverName] = useState("");
    const [team, setTeam] = useState("");
    const [lapTime, setLapTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Edit dialog
    const [editEntry, setEditEntry] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    
    // Track dialog
    const [trackDialogOpen, setTrackDialogOpen] = useState(false);
    const [newTrackName, setNewTrackName] = useState("");
    const [newTrackCountry, setNewTrackCountry] = useState("");
    
    // Event settings
    const [eventSettingsOpen, setEventSettingsOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("inactive");
    const [selectedTrack, setSelectedTrack] = useState("");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/admin');
            return;
        }
        
        // Check token validity
        axios.get(`${API}/auth/check`, { headers: getAuthHeader() })
            .catch(() => {
                logout();
                navigate('/admin');
            });
    }, [isAuthenticated, navigate, getAuthHeader, logout]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [entriesRes, tracksRes, statusRes] = await Promise.all([
                axios.get(`${API}/laps`),
                axios.get(`${API}/tracks`),
                axios.get(`${API}/event/status`)
            ]);
            setEntries(entriesRes.data);
            setTracks(tracksRes.data);
            setEventStatus(statusRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddEntry = async (e) => {
        e.preventDefault();
        if (!driverName.trim() || !lapTime.trim()) {
            toast.error("Bitte Fahrername und Zeit eingeben");
            return;
        }
        
        const timeRegex = /^\d{1,2}:\d{2}\.\d{1,3}$/;
        if (!timeRegex.test(lapTime)) {
            toast.error("Ungültiges Zeitformat (z.B. 1:23.456)");
            return;
        }
        
        setIsSubmitting(true);
        try {
            await axios.post(`${API}/admin/laps`, {
                driver_name: driverName.trim(),
                team: showTeam ? team.trim() || null : null,
                lap_time_display: lapTime.trim()
            }, { headers: getAuthHeader() });
            
            setDriverName("");
            setTeam("");
            setLapTime("");
            toast.success("Rundenzeit hinzugefügt!");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Fehler beim Hinzufügen");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEntry = async (id) => {
        try {
            await axios.delete(`${API}/admin/laps/${id}`, { headers: getAuthHeader() });
            toast.success("Eintrag gelöscht!");
            fetchData();
        } catch (error) {
            toast.error("Fehler beim Löschen");
        }
    };

    const handleDeleteAll = async () => {
        try {
            await axios.delete(`${API}/admin/laps`, { headers: getAuthHeader() });
            toast.success("Alle Einträge gelöscht!");
            fetchData();
        } catch (error) {
            toast.error("Fehler beim Löschen");
        }
    };

    const handleUpdateEntry = async () => {
        if (!editEntry) return;
        
        const timeRegex = /^\d{1,2}:\d{2}\.\d{1,3}$/;
        if (!timeRegex.test(editEntry.lap_time_display)) {
            toast.error("Ungültiges Zeitformat");
            return;
        }
        
        try {
            await axios.put(`${API}/admin/laps/${editEntry.id}`, {
                driver_name: editEntry.driver_name,
                team: editEntry.team,
                lap_time_display: editEntry.lap_time_display
            }, { headers: getAuthHeader() });
            
            toast.success("Eintrag aktualisiert!");
            setEditDialogOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Fehler beim Speichern");
        }
    };

    const handleAddTrack = async () => {
        if (!newTrackName.trim() || !newTrackCountry.trim()) {
            toast.error("Bitte Name und Land eingeben");
            return;
        }
        
        try {
            await axios.post(`${API}/admin/tracks`, {
                name: newTrackName.trim(),
                country: newTrackCountry.trim()
            }, { headers: getAuthHeader() });
            
            toast.success("Strecke hinzugefügt!");
            setNewTrackName("");
            setNewTrackCountry("");
            setTrackDialogOpen(false);
            fetchData();
        } catch (error) {
            toast.error("Fehler beim Hinzufügen");
        }
    };

    const handleDeleteTrack = async (id) => {
        try {
            await axios.delete(`${API}/admin/tracks/${id}`, { headers: getAuthHeader() });
            toast.success("Strecke gelöscht!");
            fetchData();
        } catch (error) {
            toast.error("Fehler beim Löschen");
        }
    };

    const handleUpdateEvent = async () => {
        try {
            await axios.put(`${API}/admin/event`, {
                status: selectedStatus,
                scheduled_date: scheduledDate || null,
                scheduled_time: scheduledTime || null,
                track_id: selectedTrack || null
            }, { headers: getAuthHeader() });
            
            toast.success("Event aktualisiert!");
            setEventSettingsOpen(false);
            fetchData();
        } catch (error) {
            toast.error("Fehler beim Aktualisieren");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/admin');
    };

    if (!isAuthenticated) return null;

    if (isLoading) {
        return (
            <div className="racing-bg min-h-screen">
                <div className="racing-overlay min-h-screen flex items-center justify-center">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="racing-bg min-h-screen" data-testid="admin-dashboard">
            <div className="racing-overlay min-h-screen">
                <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}} />
                
                {/* Header */}
                <header className="header">
                    <div className="header-title">
                        <Settings size={24} className="text-[var(--primary-red)]" />
                        Admin Panel
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[var(--text-secondary)] text-sm hidden sm:inline">
                            Angemeldet als <span className="text-white">{username}</span>
                        </span>
                        <Link to="/">
                            <Button className="btn-secondary" size="sm">
                                <Trophy size={16} className="mr-2" /> Rangliste
                            </Button>
                        </Link>
                        <Button onClick={handleLogout} className="btn-secondary" size="sm" data-testid="logout-btn">
                            <LogOut size={16} className="mr-2" /> Logout
                        </Button>
                    </div>
                </header>
                
                {/* Status Banner */}
                {eventStatus && <StatusBanner status={eventStatus.status} message={eventStatus.message} />}
                
                <main className="main-content">
                    {/* Event Settings */}
                    <div className="event-settings">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h2 className="admin-title mb-0">
                                <Calendar size={20} className="text-[var(--primary-red)]" />
                                Event Einstellungen
                            </h2>
                            <Button onClick={() => {
                                setSelectedStatus(eventStatus?.status || 'inactive');
                                setSelectedTrack(eventStatus?.track_id || '');
                                setScheduledDate(eventStatus?.scheduled_date || '');
                                setScheduledTime(eventStatus?.scheduled_time || '');
                                setEventSettingsOpen(true);
                            }} className="btn-secondary" size="sm" data-testid="event-settings-btn">
                                <Edit2 size={16} className="mr-2" /> Bearbeiten
                            </Button>
                        </div>
                        
                        <div className="event-grid">
                            <div className="form-field">
                                <span className="form-label">Status</span>
                                <span className="text-white capitalize">{eventStatus?.status || 'Inaktiv'}</span>
                            </div>
                            <div className="form-field">
                                <span className="form-label">Strecke</span>
                                <span className="text-white">{eventStatus?.track_name || '-'}</span>
                            </div>
                            {eventStatus?.scheduled_date && (
                                <div className="form-field">
                                    <span className="form-label">Geplant</span>
                                    <span className="text-white">{eventStatus.scheduled_date} {eventStatus.scheduled_time}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Add Entry Form */}
                    <div className="admin-panel">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h2 className="admin-title mb-0">
                                <Plus size={20} className="text-[var(--primary-red)]" />
                                Rundenzeit eintragen
                            </h2>
                            <div className="flex items-center gap-2 text-sm">
                                <User size={14} className="text-[var(--text-secondary)]" />
                                <span className="text-[var(--text-secondary)]">Team</span>
                                <Switch checked={showTeam} onCheckedChange={setShowTeam} data-testid="team-toggle" />
                            </div>
                        </div>
                        
                        <form onSubmit={handleAddEntry} className="admin-form">
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
                                <Label className="form-label">Zeit (MM:SS.mmm)</Label>
                                <Input
                                    type="text"
                                    value={lapTime}
                                    onChange={(e) => setLapTime(e.target.value)}
                                    placeholder="1:23.456"
                                    className="input-racing input-time"
                                    data-testid="lap-time-input"
                                />
                            </div>
                            
                            <Button type="submit" className="btn-primary h-10 px-4" disabled={isSubmitting} data-testid="add-lap-btn">
                                {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <><Plus size={18} className="mr-1" /> Hinzufügen</>}
                            </Button>
                        </form>
                    </div>
                    
                    {/* Entries List */}
                    <div className="admin-panel">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h2 className="admin-title mb-0">
                                <Trophy size={20} className="text-[var(--accent-gold)]" />
                                Einträge ({entries.length})
                            </h2>
                            
                            <div className="quick-actions">
                                <Button onClick={() => setTrackDialogOpen(true)} className="btn-secondary" size="sm" data-testid="manage-tracks-btn">
                                    <MapPin size={14} className="mr-1" /> Strecken
                                </Button>
                                {entries.length > 0 && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="btn-secondary text-[var(--primary-red)]" size="sm" data-testid="delete-all-btn">
                                                <Trash2 size={14} className="mr-1" /> Alle löschen
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-white font-heading">Alle löschen?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-[var(--text-secondary)]">
                                                    Alle Rundenzeiten werden unwiderruflich gelöscht.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="btn-secondary">Abbrechen</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteAll} className="btn-primary" data-testid="confirm-delete-all-btn">
                                                    Löschen
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </div>
                        
                        {entries.length === 0 ? (
                            <div className="empty-state">
                                <Timer size={48} className="mx-auto mb-3 text-[var(--text-muted)]" />
                                <p className="empty-state-text">Keine Einträge</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {entries.map((entry) => (
                                    <div 
                                        key={entry.id}
                                        className={`leaderboard-entry ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`}
                                        data-testid={`entry-row-${entry.id}`}
                                    >
                                        <RankBadge rank={entry.rank} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-heading text-white truncate">{entry.driver_name}</div>
                                            {entry.team && <div className="text-[var(--text-secondary)] text-sm truncate">{entry.team}</div>}
                                        </div>
                                        <div className="font-mono text-[var(--accent-neon)] text-lg">{entry.lap_time_display}</div>
                                        <div className="font-mono text-[var(--text-secondary)] text-sm w-20 text-right">{entry.gap}</div>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditEntry({...entry}); setEditDialogOpen(true); }}
                                                className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors"
                                                data-testid={`edit-btn-${entry.id}`}>
                                                <Edit2 size={16} />
                                            </button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <button className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-red)] transition-colors"
                                                        data-testid={`delete-btn-${entry.id}`}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-white font-heading">Löschen?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-[var(--text-secondary)]">
                                                            {entry.driver_name} wirklich löschen?
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="btn-secondary">Abbrechen</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="btn-primary">
                                                            Löschen
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
                
                {/* Edit Entry Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        <DialogHeader>
                            <DialogTitle className="text-white font-heading">Eintrag bearbeiten</DialogTitle>
                        </DialogHeader>
                        {editEntry && (
                            <div className="space-y-4 py-4">
                                <div className="form-field">
                                    <Label className="form-label">Fahrername</Label>
                                    <Input value={editEntry.driver_name} onChange={(e) => setEditEntry({...editEntry, driver_name: e.target.value})}
                                        className="input-racing" data-testid="edit-driver-input" />
                                </div>
                                <div className="form-field">
                                    <Label className="form-label">Team</Label>
                                    <Input value={editEntry.team || ''} onChange={(e) => setEditEntry({...editEntry, team: e.target.value})}
                                        className="input-racing" data-testid="edit-team-input" />
                                </div>
                                <div className="form-field">
                                    <Label className="form-label">Zeit</Label>
                                    <Input value={editEntry.lap_time_display} onChange={(e) => setEditEntry({...editEntry, lap_time_display: e.target.value})}
                                        className="input-racing input-time" data-testid="edit-time-input" />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setEditDialogOpen(false)} className="btn-secondary">Abbrechen</Button>
                            <Button onClick={handleUpdateEntry} className="btn-primary" data-testid="save-edit-btn">
                                <Check size={16} className="mr-2" /> Speichern
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                {/* Track Management Dialog */}
                <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
                    <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        <DialogHeader>
                            <DialogTitle className="text-white font-heading">Strecken verwalten</DialogTitle>
                            <DialogDescription className="text-[var(--text-secondary)]">Füge neue Strecken hinzu oder lösche bestehende</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-2">
                                <Input value={newTrackName} onChange={(e) => setNewTrackName(e.target.value)}
                                    placeholder="Streckenname" className="input-racing" data-testid="track-name-input" />
                                <Input value={newTrackCountry} onChange={(e) => setNewTrackCountry(e.target.value)}
                                    placeholder="Land" className="input-racing" data-testid="track-country-input" />
                            </div>
                            <Button onClick={handleAddTrack} className="btn-primary w-full" data-testid="add-track-btn">
                                <Plus size={16} className="mr-2" /> Strecke hinzufügen
                            </Button>
                            
                            {tracks.length > 0 && (
                                <div className="space-y-2 mt-4">
                                    <Label className="form-label">Vorhandene Strecken</Label>
                                    {tracks.map(track => (
                                        <div key={track.id} className="track-item">
                                            <span className="text-white">{track.name}, {track.country}</span>
                                            <button onClick={() => handleDeleteTrack(track.id)}
                                                className="text-[var(--text-secondary)] hover:text-[var(--primary-red)] transition-colors">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
                
                {/* Event Settings Dialog */}
                <Dialog open={eventSettingsOpen} onOpenChange={setEventSettingsOpen}>
                    <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        <DialogHeader>
                            <DialogTitle className="text-white font-heading">Event Einstellungen</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="form-field">
                                <Label className="form-label">Status</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="input-racing" data-testid="event-status-select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                        <SelectItem value="inactive">Kein Rennen</SelectItem>
                                        <SelectItem value="scheduled">Geplant</SelectItem>
                                        <SelectItem value="active">Läuft</SelectItem>
                                        <SelectItem value="finished">Abgeschlossen</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="form-field">
                                <Label className="form-label">Strecke</Label>
                                <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                                    <SelectTrigger className="input-racing" data-testid="event-track-select">
                                        <SelectValue placeholder="Strecke wählen..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                        <SelectItem value="">Keine</SelectItem>
                                        {tracks.map(track => (
                                            <SelectItem key={track.id} value={track.id}>{track.name}, {track.country}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {selectedStatus === 'scheduled' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="form-field">
                                        <Label className="form-label">Datum</Label>
                                        <Input type="text" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                                            placeholder="01.02.2026" className="input-racing" data-testid="event-date-input" />
                                    </div>
                                    <div className="form-field">
                                        <Label className="form-label">Uhrzeit</Label>
                                        <Input type="text" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                                            placeholder="18:00" className="input-racing" data-testid="event-time-input" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setEventSettingsOpen(false)} className="btn-secondary">Abbrechen</Button>
                            <Button onClick={handleUpdateEvent} className="btn-primary" data-testid="save-event-btn">
                                <Check size={16} className="mr-2" /> Speichern
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

// ==================== MAIN APP ====================
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<PublicLeaderboard />} />
                <Route path="/admin" element={<LoginPage />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
