import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
    Trophy, Timer, Flag, Plus, Trash2, Download, FileText, Edit2, 
    X, Check, Users, User, RefreshCw, Settings, LogOut, LogIn,
    MapPin, Calendar, Clock, ChevronRight, Palette, Key, Mail, Bell, Send
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
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

// Auth Hook
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

// Rank Badge
const RankBadge = ({ rank, large = false }) => {
    let badgeClass = `rank-badge ${large ? 'rank-badge-lg' : ''} `;
    if (rank === 1) badgeClass += "rank-1";
    else if (rank === 2) badgeClass += "rank-2";
    else if (rank === 3) badgeClass += "rank-3";
    else badgeClass += "rank-default";
    return <div className={badgeClass} data-testid={`rank-badge-${rank}`}>{rank}</div>;
};

// Status Banner
const StatusBanner = ({ status, message }) => (
    <div className={`status-banner status-${status}`} data-testid="status-banner">
        <Flag size={14} className="inline-block mr-2" />
        {message}
    </div>
);

// ==================== PUBLIC LEADERBOARD ====================
const PublicLeaderboard = () => {
    const [entries, setEntries] = useState([]);
    const [eventStatus, setEventStatus] = useState(null);
    const [siteSettings, setSiteSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [entriesRes, statusRes, settingsRes] = await Promise.all([
                axios.get(`${API}/laps`),
                axios.get(`${API}/event/status`),
                axios.get(`${API}/settings`)
            ]);
            setEntries(entriesRes.data);
            setEventStatus(statusRes.data);
            setSiteSettings(settingsRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

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
        <div className="racing-bg min-h-screen" data-testid="public-leaderboard">
            <div className="racing-overlay min-h-screen flex flex-col">
                <Toaster position="top-right" />
                
                <header className="public-header">
                    <div className="flex items-center justify-between mb-2">
                        <div></div>
                        <Link to="/admin">
                            <Button className="btn-secondary" size="sm" data-testid="login-btn">
                                <LogIn size={16} className="mr-2" /> Admin
                            </Button>
                        </Link>
                    </div>
                    
                    <h1 className="public-title" data-testid="public-title">
                        <Flag size={28} className="text-[var(--primary-red)]" />
                        <span style={{ color: siteSettings?.title_color1 || '#FFFFFF' }}>{siteSettings?.title_line1 || 'F1'}</span>
                        <span style={{ color: siteSettings?.title_color2 || '#FF1E1E' }}>{siteSettings?.title_line2 || 'FAST LAP'}</span>
                        <span style={{ color: siteSettings?.title_color3 || '#FFFFFF' }}>{siteSettings?.title_line3 || 'CHALLENGE'}</span>
                    </h1>
                    
                    {eventStatus && (
                        <div className="mt-3">
                            <StatusBanner status={eventStatus.status} message={eventStatus.message} />
                        </div>
                    )}
                </header>
                
                {eventStatus?.track && (
                    <div className="px-4 pt-4">
                        <div className="track-card max-w-sm mx-auto" data-testid="track-card">
                            {eventStatus.track.image_url && (
                                <img src={eventStatus.track.image_url} alt={eventStatus.track.name} className="track-image" />
                            )}
                            <div className="track-info-box">
                                <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
                                    <MapPin size={16} />
                                    <span className="font-heading text-white">{eventStatus.track.name}</span>
                                </div>
                                <div className="text-sm text-[var(--text-secondary)]">{eventStatus.track.country}</div>
                            </div>
                        </div>
                    </div>
                )}
                
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
                                        className={`leaderboard-entry entry-transparent animate-slide-in ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                        data-testid={`leaderboard-entry-${entry.id}`}
                                    >
                                        <RankBadge rank={entry.rank} large={entry.rank <= 3} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-heading text-white text-lg truncate">{entry.driver_name}</div>
                                            {entry.team && <div className="text-[var(--text-secondary)] text-sm truncate">{entry.team}</div>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="font-mono text-xl text-[var(--accent-neon)]">{entry.lap_time_display}</div>
                                            <div className="font-mono text-sm text-[var(--text-secondary)]">{entry.gap}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================== LOGIN / SETUP PAGE ====================
const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();
    const [hasAdmin, setHasAdmin] = useState(null);
    const [isSetup, setIsSetup] = useState(false);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/admin/dashboard');
            return;
        }
        
        axios.get(`${API}/auth/has-admin`).then(res => {
            setHasAdmin(res.data.has_admin);
            setIsSetup(!res.data.has_admin);
        }).catch(() => setHasAdmin(false));
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSetup) {
            if (!username.trim() || !password.trim()) {
                toast.error("Benutzername und Passwort erforderlich");
                return;
            }
            if (password !== confirmPassword) {
                toast.error("Passwörter stimmen nicht überein");
                return;
            }
            if (password.length < 4) {
                toast.error("Passwort muss mindestens 4 Zeichen haben");
                return;
            }
        } else {
            if (!username.trim() || !password.trim()) {
                toast.error("Bitte alle Felder ausfüllen");
                return;
            }
        }
        
        setIsLoading(true);
        try {
            const endpoint = isSetup ? `${API}/auth/setup` : `${API}/auth/login`;
            const payload = isSetup 
                ? { username, password, email: email || null }
                : { username, password };
            
            const response = await axios.post(endpoint, payload);
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
        return <div className="racing-bg min-h-screen"><div className="racing-overlay min-h-screen flex items-center justify-center"><div className="spinner"></div></div></div>;
    }

    return (
        <div className="racing-bg" data-testid="login-page">
            <div className="racing-overlay login-container">
                <Toaster position="top-right" />
                <div className="login-card animate-fade-in">
                    <div className="text-center mb-6">
                        <Flag size={48} className="mx-auto text-[var(--primary-red)] mb-2" />
                        <h1 className="login-title">
                            {isSetup ? "Admin einrichten" : "Admin Login"}
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
                            <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin" className="input-racing" data-testid="username-input" />
                        </div>
                        
                        {isSetup && (
                            <div className="form-field">
                                <Label className="form-label">E-Mail (optional, für Benachrichtigungen)</Label>
                                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com" className="input-racing" data-testid="email-input" />
                            </div>
                        )}
                        
                        <div className="form-field">
                            <Label className="form-label">Passwort</Label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••" className="input-racing" data-testid="password-input" />
                        </div>
                        
                        {isSetup && (
                            <div className="form-field">
                                <Label className="form-label">Passwort bestätigen</Label>
                                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••" className="input-racing" data-testid="confirm-password-input" />
                            </div>
                        )}
                        
                        <Button type="submit" className="btn-primary w-full" disabled={isLoading} data-testid="login-submit-btn">
                            {isLoading ? <RefreshCw size={18} className="animate-spin" /> : (
                                <>{isSetup ? "Konto erstellen" : "Anmelden"} <ChevronRight size={18} className="ml-2" /></>
                            )}
                        </Button>
                    </form>
                    
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
    const [siteSettings, setSiteSettings] = useState(null);
    const [adminProfile, setAdminProfile] = useState(null);
    const [smtpSettings, setSmtpSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showTeam, setShowTeam] = useState(true);
    
    // Forms
    const [driverName, setDriverName] = useState("");
    const [team, setTeam] = useState("");
    const [lapTime, setLapTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dialogs
    const [editEntry, setEditEntry] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [trackDialogOpen, setTrackDialogOpen] = useState(false);
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    
    // Track form
    const [newTrackName, setNewTrackName] = useState("");
    const [newTrackCountry, setNewTrackCountry] = useState("");
    const [newTrackImage, setNewTrackImage] = useState("");
    const [editTrack, setEditTrack] = useState(null);
    
    // Settings form
    const [titleLine1, setTitleLine1] = useState("F1");
    const [titleLine2, setTitleLine2] = useState("FAST LAP");
    const [titleLine3, setTitleLine3] = useState("CHALLENGE");
    const [titleColor1, setTitleColor1] = useState("#FFFFFF");
    const [titleColor2, setTitleColor2] = useState("#FF1E1E");
    const [titleColor3, setTitleColor3] = useState("#FFFFFF");
    
    // Password form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    // Event form
    const [selectedStatus, setSelectedStatus] = useState("inactive");
    const [selectedTrack, setSelectedTrack] = useState("");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");
    
    // Email/SMTP form
    const [profileEmail, setProfileEmail] = useState("");
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [smtpHost, setSmtpHost] = useState("");
    const [smtpPort, setSmtpPort] = useState("587");
    const [smtpUser, setSmtpUser] = useState("");
    const [smtpPass, setSmtpPass] = useState("");
    const [smtpFrom, setSmtpFrom] = useState("");
    const [smtpEnabled, setSmtpEnabled] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/admin');
            return;
        }
        axios.get(`${API}/auth/check`, { headers: getAuthHeader() })
            .then(res => setAdminProfile(res.data))
            .catch(() => { logout(); navigate('/admin'); });
    }, [isAuthenticated, navigate, getAuthHeader, logout]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [entriesRes, tracksRes, statusRes, settingsRes, smtpRes] = await Promise.all([
                axios.get(`${API}/laps`),
                axios.get(`${API}/tracks`),
                axios.get(`${API}/event/status`),
                axios.get(`${API}/settings`),
                axios.get(`${API}/admin/smtp`, { headers: getAuthHeader() }).catch(() => ({ data: null }))
            ]);
            setEntries(entriesRes.data);
            setTracks(tracksRes.data);
            setEventStatus(statusRes.data);
            setSiteSettings(settingsRes.data);
            if (smtpRes.data) setSmtpSettings(smtpRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAddEntry = async (e) => {
        e.preventDefault();
        if (!driverName.trim() || !lapTime.trim()) { toast.error("Bitte Fahrername und Zeit eingeben"); return; }
        if (!/^\d{1,2}:\d{2}\.\d{1,3}$/.test(lapTime)) { toast.error("Ungültiges Zeitformat (z.B. 1:23.456)"); return; }
        
        setIsSubmitting(true);
        try {
            await axios.post(`${API}/admin/laps`, { driver_name: driverName.trim(), team: showTeam ? team.trim() || null : null, lap_time_display: lapTime.trim() }, { headers: getAuthHeader() });
            setDriverName(""); setTeam(""); setLapTime("");
            toast.success("Rundenzeit hinzugefügt!");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Fehler");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEntry = async (id) => {
        try {
            await axios.delete(`${API}/admin/laps/${id}`, { headers: getAuthHeader() });
            toast.success("Gelöscht!"); fetchData();
        } catch (error) { toast.error("Fehler"); }
    };

    const handleDeleteAll = async () => {
        try {
            await axios.delete(`${API}/admin/laps`, { headers: getAuthHeader() });
            toast.success("Alle gelöscht!"); fetchData();
        } catch (error) { toast.error("Fehler"); }
    };

    const handleUpdateEntry = async () => {
        if (!editEntry || !/^\d{1,2}:\d{2}\.\d{1,3}$/.test(editEntry.lap_time_display)) { toast.error("Ungültiges Format"); return; }
        try {
            await axios.put(`${API}/admin/laps/${editEntry.id}`, editEntry, { headers: getAuthHeader() });
            toast.success("Aktualisiert!"); setEditDialogOpen(false); fetchData();
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    const handleAddTrack = async () => {
        if (!newTrackName.trim() || !newTrackCountry.trim()) { toast.error("Name und Land erforderlich"); return; }
        try {
            await axios.post(`${API}/admin/tracks`, { name: newTrackName.trim(), country: newTrackCountry.trim(), image_url: newTrackImage.trim() || null }, { headers: getAuthHeader() });
            toast.success("Strecke hinzugefügt!"); setNewTrackName(""); setNewTrackCountry(""); setNewTrackImage(""); fetchData();
        } catch (error) { toast.error("Fehler"); }
    };

    const handleUpdateTrack = async () => {
        if (!editTrack) return;
        try {
            await axios.put(`${API}/admin/tracks/${editTrack.id}`, { name: editTrack.name, country: editTrack.country, image_url: editTrack.image_url }, { headers: getAuthHeader() });
            toast.success("Strecke aktualisiert!"); setEditTrack(null); fetchData();
        } catch (error) { toast.error("Fehler"); }
    };

    const handleDeleteTrack = async (id) => {
        try {
            await axios.delete(`${API}/admin/tracks/${id}`, { headers: getAuthHeader() });
            toast.success("Gelöscht!"); fetchData();
        } catch (error) { toast.error("Fehler"); }
    };

    const handleUpdateSettings = async () => {
        try {
            await axios.put(`${API}/admin/settings`, {
                title_line1: titleLine1, title_line2: titleLine2, title_line3: titleLine3,
                title_color1: titleColor1, title_color2: titleColor2, title_color3: titleColor3
            }, { headers: getAuthHeader() });
            toast.success("Einstellungen gespeichert!"); setSettingsDialogOpen(false); fetchData();
        } catch (error) { toast.error("Fehler"); }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) { toast.error("Passwörter stimmen nicht überein"); return; }
        if (newPassword.length < 4) { toast.error("Passwort zu kurz (min. 4 Zeichen)"); return; }
        try {
            await axios.put(`${API}/admin/password`, { current_password: currentPassword, new_password: newPassword }, { headers: getAuthHeader() });
            toast.success("Passwort geändert!"); setPasswordDialogOpen(false);
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    const handleUpdateEvent = async () => {
        try {
            await axios.put(`${API}/admin/event`, { status: selectedStatus, scheduled_date: scheduledDate || null, scheduled_time: scheduledTime || null, track_id: selectedTrack || null }, { headers: getAuthHeader() });
            toast.success("Event aktualisiert!"); setEventDialogOpen(false); fetchData();
        } catch (error) { toast.error("Fehler"); }
    };

    const handleSaveEmailSettings = async () => {
        try {
            // Save profile
            await axios.put(`${API}/admin/profile`, { email: profileEmail || null, notifications_enabled: notificationsEnabled }, { headers: getAuthHeader() });
            
            // Save SMTP
            await axios.put(`${API}/admin/smtp`, {
                host: smtpHost, port: parseInt(smtpPort) || 587, username: smtpUser,
                password: smtpPass, from_email: smtpFrom, enabled: smtpEnabled
            }, { headers: getAuthHeader() });
            
            toast.success("E-Mail Einstellungen gespeichert!");
            setEmailDialogOpen(false);
            
            // Refresh admin profile
            const res = await axios.get(`${API}/auth/check`, { headers: getAuthHeader() });
            setAdminProfile(res.data);
        } catch (error) { toast.error("Fehler beim Speichern"); }
    };

    const handleTestEmail = async () => {
        try {
            await axios.post(`${API}/admin/smtp/test`, {}, { headers: getAuthHeader() });
            toast.success("Test-E-Mail gesendet!");
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler beim Senden"); }
    };

    const openEmailDialog = () => {
        setProfileEmail(adminProfile?.email || '');
        setNotificationsEnabled(adminProfile?.notifications_enabled || false);
        setSmtpHost(smtpSettings?.host || '');
        setSmtpPort(String(smtpSettings?.port || 587));
        setSmtpUser(smtpSettings?.username || '');
        setSmtpPass(smtpSettings?.password || '');
        setSmtpFrom(smtpSettings?.from_email || '');
        setSmtpEnabled(smtpSettings?.enabled || false);
        setEmailDialogOpen(true);
    };

    const openSettingsDialog = () => {
        setTitleLine1(siteSettings?.title_line1 || 'F1');
        setTitleLine2(siteSettings?.title_line2 || 'FAST LAP');
        setTitleLine3(siteSettings?.title_line3 || 'CHALLENGE');
        setTitleColor1(siteSettings?.title_color1 || '#FFFFFF');
        setTitleColor2(siteSettings?.title_color2 || '#FF1E1E');
        setTitleColor3(siteSettings?.title_color3 || '#FFFFFF');
        setSettingsDialogOpen(true);
    };

    const openEventDialog = () => {
        setSelectedStatus(eventStatus?.status || 'inactive');
        setSelectedTrack(eventStatus?.track?.id || '');
        setScheduledDate(eventStatus?.scheduled_date || '');
        setScheduledTime(eventStatus?.scheduled_time || '');
        setEventDialogOpen(true);
    };

    const handleExportCSV = () => window.open(`${API}/admin/export/csv`, '_blank');

    const handleExportPDF = async () => {
        try {
            const response = await axios.get(`${API}/admin/export/pdf`, { headers: getAuthHeader() });
            const data = response.data;
            const title = `${data.title?.title_line1 || 'F1'} ${data.title?.title_line2 || 'FAST LAP'} ${data.title?.title_line3 || 'CHALLENGE'}`;
            
            const printContent = `<!DOCTYPE html><html><head><title>${title}</title>
                <style>@import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Barlow:wght@400;600&family=JetBrains+Mono&display=swap');
                body { font-family: 'Barlow', sans-serif; padding: 40px; }
                h1 { font-family: 'Russo One'; font-size: 2rem; color: #FF1E1E; }
                .track { color: #666; margin-bottom: 1rem; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { font-family: 'Russo One'; text-align: left; padding: 12px; background: #1A1A1A; color: #fff; font-size: 0.75rem; text-transform: uppercase; }
                td { padding: 12px; border-bottom: 1px solid #eee; }
                .rank { font-family: 'Russo One'; font-weight: bold; }
                .rank-1 { color: #FFD700; } .rank-2 { color: #C0C0C0; } .rank-3 { color: #CD7F32; }
                .time { font-family: 'JetBrains Mono'; font-weight: bold; }
                .gap { font-family: 'JetBrains Mono'; color: #666; }</style></head>
                <body><h1>${title}</h1>
                ${data.track ? `<p class="track">${data.track.name}, ${data.track.country}</p>` : ''}
                <table><thead><tr><th>Platz</th><th>Fahrer</th><th>Team</th><th>Zeit</th><th>Abstand</th></tr></thead>
                <tbody>${data.entries.map(e => `<tr><td class="rank ${e.rank <= 3 ? `rank-${e.rank}` : ''}">${e.rank}</td><td>${e.driver_name}</td><td>${e.team || '-'}</td><td class="time">${e.lap_time_display}</td><td class="gap">${e.gap}</td></tr>`).join('')}</tbody></table></body></html>`;
            
            const w = window.open('', '_blank');
            w.document.write(printContent);
            w.document.close();
            w.print();
        } catch (error) { toast.error("Fehler beim Export"); }
    };

    if (!isAuthenticated) return null;
    if (isLoading) return <div className="racing-bg min-h-screen"><div className="racing-overlay min-h-screen flex items-center justify-center"><div className="spinner"></div></div></div>;

    return (
        <div className="racing-bg min-h-screen" data-testid="admin-dashboard">
            <div className="racing-overlay min-h-screen">
                <Toaster position="top-right" />
                
                <header className="header">
                    <div className="flex items-center gap-3">
                        <Settings size={24} className="text-[var(--primary-red)]" />
                        <span className="font-heading text-lg">Admin</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[var(--text-secondary)] text-sm hidden sm:inline">{username}</span>
                        <Link to="/"><Button className="btn-secondary" size="sm"><Trophy size={14} className="mr-1" /> Rangliste</Button></Link>
                        <Button onClick={() => { logout(); navigate('/admin'); }} className="btn-secondary" size="sm" data-testid="logout-btn"><LogOut size={14} /></Button>
                    </div>
                </header>
                
                {eventStatus && <StatusBanner status={eventStatus.status} message={eventStatus.message} />}
                
                <main className="p-4 max-w-5xl mx-auto">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <Button onClick={openSettingsDialog} className="btn-secondary" size="sm" data-testid="settings-btn"><Palette size={14} className="mr-1" /> Titel</Button>
                        <Button onClick={openEventDialog} className="btn-secondary" size="sm" data-testid="event-btn"><Calendar size={14} className="mr-1" /> Event</Button>
                        <Button onClick={() => setTrackDialogOpen(true)} className="btn-secondary" size="sm" data-testid="tracks-btn"><MapPin size={14} className="mr-1" /> Strecken</Button>
                        <Button onClick={() => setPasswordDialogOpen(true)} className="btn-secondary" size="sm" data-testid="password-btn"><Key size={14} className="mr-1" /> Passwort</Button>
                        <Button onClick={openEmailDialog} className="btn-secondary" size="sm" data-testid="email-btn">
                            <Mail size={14} className="mr-1" /> E-Mail
                            {adminProfile?.notifications_enabled && <Bell size={12} className="ml-1 text-green-500" />}
                        </Button>
                        <Button onClick={handleExportCSV} className="btn-secondary" size="sm" disabled={entries.length === 0} data-testid="export-csv-btn"><FileText size={14} className="mr-1" /> CSV</Button>
                        <Button onClick={handleExportPDF} className="btn-secondary" size="sm" disabled={entries.length === 0} data-testid="export-pdf-btn"><Download size={14} className="mr-1" /> PDF</Button>
                    </div>
                    
                    {/* Add Entry */}
                    <div className="admin-panel">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h2 className="admin-title mb-0"><Plus size={18} className="text-[var(--primary-red)]" /> Rundenzeit eintragen</h2>
                            <div className="flex items-center gap-2 text-sm">
                                <User size={14} className="text-[var(--text-secondary)]" />
                                <Switch checked={showTeam} onCheckedChange={setShowTeam} data-testid="team-toggle" />
                                <Users size={14} className="text-[var(--text-secondary)]" />
                            </div>
                        </div>
                        <form onSubmit={handleAddEntry} className="admin-form">
                            <div className="form-field">
                                <Label className="form-label">Fahrername</Label>
                                <Input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Max Verstappen" className="input-racing" data-testid="driver-input" />
                            </div>
                            {showTeam && (
                                <div className="form-field">
                                    <Label className="form-label">Team</Label>
                                    <Input type="text" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Red Bull" className="input-racing" data-testid="team-input" />
                                </div>
                            )}
                            <div className="form-field">
                                <Label className="form-label">Zeit (MM:SS.mmm)</Label>
                                <Input type="text" value={lapTime} onChange={(e) => setLapTime(e.target.value)} placeholder="1:23.456" className="input-racing input-time" data-testid="time-input" />
                            </div>
                            <Button type="submit" className="btn-primary h-10 px-4" disabled={isSubmitting} data-testid="add-btn">
                                {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <><Plus size={16} className="mr-1" /> Hinzufügen</>}
                            </Button>
                        </form>
                    </div>
                    
                    {/* Entries */}
                    <div className="admin-panel">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h2 className="admin-title mb-0"><Trophy size={18} className="text-[var(--accent-gold)]" /> Einträge ({entries.length})</h2>
                            {entries.length > 0 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="btn-secondary text-[var(--primary-red)]" size="sm" data-testid="delete-all-btn"><Trash2 size={14} className="mr-1" /> Alle</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-white font-heading">Alle löschen?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-[var(--text-secondary)]">Unwiderruflich!</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="btn-secondary">Abbrechen</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteAll} className="btn-primary">Löschen</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                        
                        {entries.length === 0 ? (
                            <div className="empty-state"><Timer size={48} className="mx-auto mb-3 text-[var(--text-muted)]" /><p className="empty-state-text">Keine Einträge</p></div>
                        ) : (
                            <div className="space-y-2">
                                {entries.map(entry => (
                                    <div key={entry.id} className={`leaderboard-entry entry-transparent ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`} data-testid={`entry-${entry.id}`}>
                                        <RankBadge rank={entry.rank} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-heading text-white truncate">{entry.driver_name}</div>
                                            {entry.team && <div className="text-[var(--text-secondary)] text-sm truncate">{entry.team}</div>}
                                        </div>
                                        <div className="font-mono text-[var(--accent-neon)]">{entry.lap_time_display}</div>
                                        <div className="font-mono text-[var(--text-secondary)] text-sm w-16 text-right">{entry.gap}</div>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditEntry({...entry}); setEditDialogOpen(true); }} className="p-2 text-[var(--text-secondary)] hover:text-white" data-testid={`edit-${entry.id}`}><Edit2 size={14} /></button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><button className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-red)]" data-testid={`delete-${entry.id}`}><Trash2 size={14} /></button></AlertDialogTrigger>
                                                <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                                    <AlertDialogHeader><AlertDialogTitle className="text-white font-heading">Löschen?</AlertDialogTitle></AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="btn-secondary">Abbrechen</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="btn-primary">Löschen</AlertDialogAction>
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
                        <DialogHeader><DialogTitle className="text-white font-heading">Eintrag bearbeiten</DialogTitle></DialogHeader>
                        {editEntry && (
                            <div className="space-y-4 py-4">
                                <div className="form-field"><Label className="form-label">Fahrername</Label>
                                    <Input value={editEntry.driver_name} onChange={(e) => setEditEntry({...editEntry, driver_name: e.target.value})} className="input-racing" /></div>
                                <div className="form-field"><Label className="form-label">Team</Label>
                                    <Input value={editEntry.team || ''} onChange={(e) => setEditEntry({...editEntry, team: e.target.value})} className="input-racing" /></div>
                                <div className="form-field"><Label className="form-label">Zeit</Label>
                                    <Input value={editEntry.lap_time_display} onChange={(e) => setEditEntry({...editEntry, lap_time_display: e.target.value})} className="input-racing input-time" /></div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setEditDialogOpen(false)} className="btn-secondary">Abbrechen</Button>
                            <Button onClick={handleUpdateEntry} className="btn-primary"><Check size={14} className="mr-1" /> Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                {/* Settings Dialog */}
                <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
                    <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        <DialogHeader><DialogTitle className="text-white font-heading"><Palette size={18} className="inline mr-2" />Titel anpassen</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="text-center p-4 rounded-lg bg-[var(--bg-default)] border border-[var(--border-default)]">
                                <span className="font-heading text-2xl">
                                    <span style={{ color: titleColor1 }}>{titleLine1} </span>
                                    <span style={{ color: titleColor2 }}>{titleLine2} </span>
                                    <span style={{ color: titleColor3 }}>{titleLine3}</span>
                                </span>
                            </div>
                            {[
                                { label: "Zeile 1", value: titleLine1, setValue: setTitleLine1, color: titleColor1, setColor: setTitleColor1 },
                                { label: "Zeile 2", value: titleLine2, setValue: setTitleLine2, color: titleColor2, setColor: setTitleColor2 },
                                { label: "Zeile 3", value: titleLine3, setValue: setTitleLine3, color: titleColor3, setColor: setTitleColor3 }
                            ].map((item, i) => (
                                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-end">
                                    <div className="form-field"><Label className="form-label">{item.label}</Label>
                                        <Input value={item.value} onChange={(e) => item.setValue(e.target.value)} className="input-racing" /></div>
                                    <input type="color" value={item.color} onChange={(e) => item.setColor(e.target.value)} className="color-input h-10 w-10" />
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setSettingsDialogOpen(false)} className="btn-secondary">Abbrechen</Button>
                            <Button onClick={handleUpdateSettings} className="btn-primary"><Check size={14} className="mr-1" /> Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                {/* Tracks Dialog */}
                <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
                    <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)] max-w-lg">
                        <DialogHeader><DialogTitle className="text-white font-heading"><MapPin size={18} className="inline mr-2" />Strecken</DialogTitle></DialogHeader>
                        <Tabs defaultValue="add" className="py-4">
                            <TabsList className="grid w-full grid-cols-2 bg-[var(--bg-default)]">
                                <TabsTrigger value="add">Neue Strecke</TabsTrigger>
                                <TabsTrigger value="list">Vorhandene ({tracks.length})</TabsTrigger>
                            </TabsList>
                            <TabsContent value="add" className="space-y-4 mt-4">
                                <div className="form-field"><Label className="form-label">Streckenname</Label>
                                    <Input value={newTrackName} onChange={(e) => setNewTrackName(e.target.value)} placeholder="Spa-Francorchamps" className="input-racing" /></div>
                                <div className="form-field"><Label className="form-label">Land</Label>
                                    <Input value={newTrackCountry} onChange={(e) => setNewTrackCountry(e.target.value)} placeholder="Belgien" className="input-racing" /></div>
                                <div className="form-field"><Label className="form-label">Bild-URL (optional)</Label>
                                    <Input value={newTrackImage} onChange={(e) => setNewTrackImage(e.target.value)} placeholder="https://..." className="input-racing" /></div>
                                <Button onClick={handleAddTrack} className="btn-primary w-full"><Plus size={14} className="mr-1" /> Hinzufügen</Button>
                            </TabsContent>
                            <TabsContent value="list" className="mt-4 space-y-2 max-h-60 overflow-auto">
                                {tracks.length === 0 ? <p className="text-center text-[var(--text-secondary)]">Keine Strecken</p> : tracks.map(track => (
                                    <div key={track.id} className="flex items-center justify-between p-3 bg-[var(--bg-default)] rounded border border-[var(--border-default)]">
                                        <div className="flex items-center gap-3">
                                            {track.image_url && <img src={track.image_url} alt={track.name} className="w-12 h-8 object-cover rounded" />}
                                            <div><div className="text-white font-medium">{track.name}</div><div className="text-sm text-[var(--text-secondary)]">{track.country}</div></div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => setEditTrack({...track})} className="p-2 text-[var(--text-secondary)] hover:text-white"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDeleteTrack(track.id)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-red)]"><X size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
                
                {/* Edit Track Dialog */}
                <Dialog open={!!editTrack} onOpenChange={() => setEditTrack(null)}>
                    <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        <DialogHeader><DialogTitle className="text-white font-heading">Strecke bearbeiten</DialogTitle></DialogHeader>
                        {editTrack && (
                            <div className="space-y-4 py-4">
                                <div className="form-field"><Label className="form-label">Name</Label>
                                    <Input value={editTrack.name} onChange={(e) => setEditTrack({...editTrack, name: e.target.value})} className="input-racing" /></div>
                                <div className="form-field"><Label className="form-label">Land</Label>
                                    <Input value={editTrack.country} onChange={(e) => setEditTrack({...editTrack, country: e.target.value})} className="input-racing" /></div>
                                <div className="form-field"><Label className="form-label">Bild-URL</Label>
                                    <Input value={editTrack.image_url || ''} onChange={(e) => setEditTrack({...editTrack, image_url: e.target.value})} placeholder="https://..." className="input-racing" /></div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setEditTrack(null)} className="btn-secondary">Abbrechen</Button>
                            <Button onClick={handleUpdateTrack} className="btn-primary"><Check size={14} className="mr-1" /> Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                {/* Password Dialog */}
                <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                    <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        <DialogHeader><DialogTitle className="text-white font-heading"><Key size={18} className="inline mr-2" />Passwort ändern</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="form-field"><Label className="form-label">Aktuelles Passwort</Label>
                                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-racing" /></div>
                            <div className="form-field"><Label className="form-label">Neues Passwort</Label>
                                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-racing" /></div>
                            <div className="form-field"><Label className="form-label">Passwort bestätigen</Label>
                                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-racing" /></div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setPasswordDialogOpen(false)} className="btn-secondary">Abbrechen</Button>
                            <Button onClick={handleChangePassword} className="btn-primary"><Check size={14} className="mr-1" /> Ändern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                {/* Event Dialog */}
                <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                    <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        <DialogHeader><DialogTitle className="text-white font-heading"><Calendar size={18} className="inline mr-2" />Event Einstellungen</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="form-field"><Label className="form-label">Status</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="input-racing"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                        <SelectItem value="inactive">Kein Rennen</SelectItem>
                                        <SelectItem value="scheduled">Geplant</SelectItem>
                                        <SelectItem value="active">Läuft</SelectItem>
                                        <SelectItem value="finished">Abgeschlossen</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="form-field"><Label className="form-label">Strecke</Label>
                                <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                                    <SelectTrigger className="input-racing"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                                    <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                        <SelectItem value="">Keine</SelectItem>
                                        {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}, {t.country}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedStatus === 'scheduled' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="form-field"><Label className="form-label">Datum</Label>
                                        <Input value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} placeholder="01.02.2026" className="input-racing" /></div>
                                    <div className="form-field"><Label className="form-label">Uhrzeit</Label>
                                        <Input value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} placeholder="18:00" className="input-racing" /></div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setEventDialogOpen(false)} className="btn-secondary">Abbrechen</Button>
                            <Button onClick={handleUpdateEvent} className="btn-primary"><Check size={14} className="mr-1" /> Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                {/* Email Settings Dialog */}
                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                    <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-default)] max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-white font-heading"><Mail size={18} className="inline mr-2" />E-Mail Einstellungen</DialogTitle>
                            <DialogDescription className="text-[var(--text-secondary)]">Erhalte Benachrichtigungen bei neuen Rundenzeiten</DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="profile" className="py-4">
                            <TabsList className="grid w-full grid-cols-2 bg-[var(--bg-default)]">
                                <TabsTrigger value="profile">Profil</TabsTrigger>
                                <TabsTrigger value="smtp">SMTP Server</TabsTrigger>
                            </TabsList>
                            <TabsContent value="profile" className="space-y-4 mt-4">
                                <div className="form-field">
                                    <Label className="form-label">Deine E-Mail Adresse</Label>
                                    <Input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="admin@example.com" className="input-racing" />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-[var(--bg-default)] rounded border border-[var(--border-default)]">
                                    <div className="flex items-center gap-2">
                                        <Bell size={16} className="text-[var(--text-secondary)]" />
                                        <span>Benachrichtigungen aktivieren</span>
                                    </div>
                                    <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                                </div>
                                {notificationsEnabled && (
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Du erhältst eine E-Mail, wenn eine neue Rundenzeit eingetragen wird.
                                    </p>
                                )}
                            </TabsContent>
                            <TabsContent value="smtp" className="space-y-4 mt-4">
                                <div className="flex items-center justify-between p-3 bg-[var(--bg-default)] rounded border border-[var(--border-default)]">
                                    <span>SMTP aktivieren</span>
                                    <Switch checked={smtpEnabled} onCheckedChange={setSmtpEnabled} />
                                </div>
                                {smtpEnabled && (
                                    <>
                                        <div className="grid grid-cols-[2fr_1fr] gap-2">
                                            <div className="form-field"><Label className="form-label">SMTP Host</Label>
                                                <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="input-racing" /></div>
                                            <div className="form-field"><Label className="form-label">Port</Label>
                                                <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" className="input-racing" /></div>
                                        </div>
                                        <div className="form-field"><Label className="form-label">Benutzername</Label>
                                            <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="dein@email.com" className="input-racing" /></div>
                                        <div className="form-field"><Label className="form-label">Passwort / App-Passwort</Label>
                                            <Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••" className="input-racing" /></div>
                                        <div className="form-field"><Label className="form-label">Absender E-Mail</Label>
                                            <Input value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="f1challenge@example.com" className="input-racing" /></div>
                                        
                                        <Button onClick={handleTestEmail} className="btn-secondary w-full" type="button">
                                            <Send size={14} className="mr-2" /> Test-E-Mail senden
                                        </Button>
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                        <DialogFooter>
                            <Button onClick={() => setEmailDialogOpen(false)} className="btn-secondary">Abbrechen</Button>
                            <Button onClick={handleSaveEmailSettings} className="btn-primary"><Check size={14} className="mr-1" /> Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

// ==================== APP ====================
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
