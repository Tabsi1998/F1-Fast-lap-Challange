import { useState, useEffect, useCallback, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
    Trophy, Timer, Flag, Plus, Trash2, Download, FileText, Edit2, 
    X, Check, Users, User, RefreshCw, Settings, LogOut, LogIn,
    MapPin, Calendar, ChevronRight, Palette, Key, Mail, Bell, Send,
    Clock, Play, Square, UserPlus, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

// Für Docker: BACKEND_URL leer lassen (API calls gehen über nginx proxy)
// Für Entwicklung: REACT_APP_BACKEND_URL setzen (z.B. http://localhost:8001)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
// Wenn BACKEND_URL bereits /api enthält, nicht nochmal hinzufügen
const API = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`;

// Auth Hook
const useAuth = () => {
    const [token, setToken] = useState(localStorage.getItem('f1_token'));
    const [username, setUsername] = useState(localStorage.getItem('f1_username'));
    const [mustChangePassword, setMustChangePassword] = useState(localStorage.getItem('f1_must_change_pw') === 'true');
    
    const login = useCallback((newToken, newUsername, needsPwChange = false) => { 
        localStorage.setItem('f1_token', newToken); 
        localStorage.setItem('f1_username', newUsername); 
        localStorage.setItem('f1_must_change_pw', needsPwChange ? 'true' : 'false');
        setToken(newToken); 
        setUsername(newUsername);
        setMustChangePassword(needsPwChange);
    }, []);
    
    const logout = useCallback(() => { 
        localStorage.removeItem('f1_token'); 
        localStorage.removeItem('f1_username'); 
        localStorage.removeItem('f1_must_change_pw');
        setToken(null); 
        setUsername(null);
        setMustChangePassword(false);
    }, []);
    
    const clearPasswordFlag = useCallback(() => {
        localStorage.setItem('f1_must_change_pw', 'false');
        setMustChangePassword(false);
    }, []);
    
    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);
    
    return { token, username, mustChangePassword, login, logout, clearPasswordFlag, getAuthHeader, isAuthenticated: !!token };
};

// Timer Display Component
const TimerDisplay = ({ endTime, onExpire }) => {
    const [remaining, setRemaining] = useState(0);
    
    useEffect(() => {
        if (!endTime) return;
        const end = new Date(endTime).getTime();
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((end - now) / 1000));
            setRemaining(diff);
            if (diff === 0 && onExpire) onExpire();
        }, 1000);
        return () => clearInterval(interval);
    }, [endTime, onExpire]);
    
    if (!endTime || remaining <= 0) return null;
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    
    return (
        <div className="timer-display" data-testid="timer-display">
            <Clock size={20} className="text-[var(--primary-color)]" />
            <span className="timer-value">
                {hours > 0 && `${hours.toString().padStart(2, '0')}:`}
                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
        </div>
    );
};

// Rank Badge
const RankBadge = ({ rank, design }) => {
    let bgColor = design?.surface_color || '#1A1A1A';
    if (rank === 1) bgColor = design?.gold_color || '#FFD700';
    else if (rank === 2) bgColor = design?.silver_color || '#C0C0C0';
    else if (rank === 3) bgColor = design?.bronze_color || '#CD7F32';
    
    const textColor = rank <= 3 ? '#000' : (design?.text_secondary || '#A0A0A0');
    
    return (
        <div className="rank-badge" style={{ background: rank <= 3 ? `linear-gradient(135deg, ${bgColor}, ${bgColor}99)` : bgColor, color: textColor }}>
            {rank}
        </div>
    );
};

// Status Banner
const StatusBanner = ({ status, message, design }) => {
    const colors = {
        inactive: design?.status_inactive_color || '#525252',
        scheduled: design?.status_scheduled_color || '#FFA500',
        active: design?.status_active_color || '#00FF00',
        finished: design?.status_finished_color || '#FF1E1E'
    };
    
    return (
        <div className="status-banner" style={{ background: `${colors[status]}33`, color: colors[status] }}>
            <Flag size={14} className="inline-block mr-2" />
            {message}
        </div>
    );
};

// ==================== PUBLIC LEADERBOARD ====================
const PublicLeaderboard = () => {
    const [entries, setEntries] = useState([]);
    const [eventStatus, setEventStatus] = useState(null);
    const [design, setDesign] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [entriesRes, statusRes, designRes] = await Promise.all([
                axios.get(`${API}/laps`),
                axios.get(`${API}/event/status`),
                axios.get(`${API}/design`)
            ]);
            setEntries(entriesRes.data);
            setEventStatus(statusRes.data);
            setDesign(designRes.data);
            
            // Update page title and favicon dynamically
            const d = designRes.data;
            document.title = d.site_title || 'F1 Fast Lap Challenge';
            const faviconEl = document.getElementById('dynamic-favicon');
            if (faviconEl && d.favicon_url) {
                faviconEl.href = d.favicon_url;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (isLoading || !design) {
        return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}><div className="spinner"></div></div>;
    }

    const cssVars = {
        '--bg-color': design.bg_color,
        '--surface-color': design.surface_color,
        '--primary-color': design.primary_color,
        '--accent-color': design.accent_color,
        '--text-color': design.text_color,
        '--text-secondary': design.text_secondary,
        '--heading-font': design.heading_font,
        '--body-font': design.body_font,
        '--time-font': design.time_font,
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ ...cssVars, background: design.bg_image_url ? `url(${design.bg_image_url}) center/cover fixed` : design.bg_color }}>
            <div className="min-h-screen flex flex-col" style={{ background: design.bg_image_url ? `rgba(0,0,0,${design.bg_overlay_opacity})` : 'transparent' }}>
                <Toaster position="top-right" />
                
                <header className="public-header" style={{ background: `${design.bg_color}ee`, fontFamily: design.heading_font }}>
                    <div className="flex items-center justify-between mb-2">
                        <div></div>
                        <Link to="/admin">
                            <Button className="btn-secondary" size="sm" style={{ borderColor: design.primary_color }}><LogIn size={16} className="mr-2" /> Admin</Button>
                        </Link>
                    </div>
                    
                    <h1 className="public-title" style={{ fontFamily: design.title_font || design.heading_font }}>
                        <Flag size={28} style={{ color: design.primary_color }} />
                        <span style={{ color: design.title_color1 }}>{design.title_line1}</span>
                        <span style={{ color: design.title_color2 }}>{design.title_line2}</span>
                        <span style={{ color: design.title_color3 }}>{design.title_line3}</span>
                    </h1>
                    
                    {eventStatus && <div className="mt-3"><StatusBanner status={eventStatus.status} message={eventStatus.message} design={design} /></div>}
                    
                    {eventStatus?.timer_enabled && eventStatus?.timer_end_time && eventStatus?.status === 'active' && (
                        <div className="mt-3 flex justify-center">
                            <TimerDisplay endTime={eventStatus.timer_end_time} />
                        </div>
                    )}
                </header>
                
                {eventStatus?.track && (
                    <div className="px-4 pt-4">
                        <div className="max-w-sm mx-auto rounded-xl overflow-hidden" style={{ background: `${design.surface_color}cc`, border: `1px solid ${design.surface_color}` }}>
                            {eventStatus.track.image_url && <img src={eventStatus.track.image_url} alt={eventStatus.track.name} className="w-full h-24 object-cover" />}
                            <div className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2" style={{ color: design.text_secondary }}>
                                    <MapPin size={16} />
                                    <span style={{ fontFamily: design.heading_font, color: design.text_color }}>{eventStatus.track.name}</span>
                                </div>
                                <div className="text-sm" style={{ color: design.text_secondary }}>{eventStatus.track.country}</div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="flex-1 overflow-auto p-4">
                    <div className="max-w-2xl mx-auto">
                        {entries.length === 0 ? (
                            <div className="text-center py-12" style={{ color: design.text_secondary }}>
                                <Timer size={64} className="mx-auto mb-4 opacity-50" />
                                <p style={{ fontFamily: design.body_font }}>Noch keine Rundenzeiten</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {entries.map((entry, idx) => (
                                    <div key={entry.id} className="leaderboard-entry animate-slide-in" 
                                        style={{ 
                                            background: `${design.surface_color}aa`, 
                                            borderColor: entry.rank <= 3 ? (entry.rank === 1 ? design.gold_color : entry.rank === 2 ? design.silver_color : design.bronze_color) : 'transparent',
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            animationDelay: `${idx * 50}ms`,
                                            backdropFilter: 'blur(8px)'
                                        }}>
                                        <RankBadge rank={entry.rank} design={design} />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate" style={{ fontFamily: design.heading_font, color: design.text_color, fontSize: '1.1rem' }}>{entry.driver_name}</div>
                                            {entry.team && <div className="truncate text-sm" style={{ color: design.text_secondary }}>{entry.team}</div>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div style={{ fontFamily: design.time_font, color: design.accent_color, fontSize: '1.25rem' }}>{entry.lap_time_display}</div>
                                            <div className="text-sm" style={{ fontFamily: design.time_font, color: design.text_secondary }}>{entry.gap}</div>
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

// ==================== LOGIN PAGE ====================
const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();
    const [hasAdmin, setHasAdmin] = useState(null);
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) { navigate('/admin/dashboard'); return; }
        axios.get(`${API}/auth/has-admin`).then(res => { setHasAdmin(res.data.has_admin); }).catch(() => setHasAdmin(true));
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) { toast.error("Bitte alle Felder ausfüllen"); return; }
        
        setIsLoading(true);
        try {
            const response = await axios.post(`${API}/auth/login`, { username, password });
            login(response.data.token, response.data.username, response.data.must_change_password);
            toast.success("Angemeldet!");
            navigate('/admin/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || "Fehler");
        } finally {
            setIsLoading(false);
        }
    };

    if (hasAdmin === null) return <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]"><div className="spinner"></div></div>;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0A0A]">
            <Toaster position="top-right" />
            <div className="w-full max-w-md p-8 rounded-xl bg-[#1A1A1A] border border-[#333]">
                <div className="text-center mb-6">
                    <Flag size={48} className="mx-auto text-[#FF1E1E] mb-2" />
                    <h1 className="text-2xl font-bold text-white">Admin Login</h1>
                    <p className="text-[#A0A0A0] text-sm mt-2">Standard: admin / admin</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><Label className="text-[#A0A0A0] text-xs uppercase">Benutzername</Label>
                        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" className="bg-[#0A0A0A] border-[#333] text-white" /></div>
                    <div><Label className="text-[#A0A0A0] text-xs uppercase">Passwort</Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="admin" className="bg-[#0A0A0A] border-[#333] text-white" /></div>
                    <Button type="submit" className="w-full bg-[#FF1E1E] hover:bg-[#D61A1A] text-white" disabled={isLoading}>
                        {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <>Anmelden <ChevronRight size={18} className="ml-2" /></>}
                    </Button>
                </form>
                <Link to="/" className="block mt-6 text-center text-sm text-[#A0A0A0] hover:text-[#FF1E1E]">← Zur Rangliste</Link>
            </div>
        </div>
    );
};

// ==================== ADMIN DASHBOARD ====================
const AdminDashboard = () => {
    const navigate = useNavigate();
    const { token, username, mustChangePassword, logout, clearPasswordFlag, getAuthHeader, isAuthenticated } = useAuth();
    
    const [entries, setEntries] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [eventStatus, setEventStatus] = useState(null);
    const [design, setDesign] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [emailTemplate, setEmailTemplate] = useState(null);
    const [smtpSettings, setSmtpSettings] = useState(null);
    const [adminProfile, setAdminProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showTeam, setShowTeam] = useState(true);
    
    // Form states
    const [driverName, setDriverName] = useState("");
    const [team, setTeam] = useState("");
    const [lapTime, setLapTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dialog states
    const [activeDialog, setActiveDialog] = useState(null);
    const [editEntry, setEditEntry] = useState(null);
    const [editTrack, setEditTrack] = useState(null);
    const [newParticipantName, setNewParticipantName] = useState("");
    const [newParticipantEmail, setNewParticipantEmail] = useState("");
    const [newTrackName, setNewTrackName] = useState("");
    const [newTrackCountry, setNewTrackCountry] = useState("");
    const [newTrackImage, setNewTrackImage] = useState("");
    const [currentPassword, setCurrentPassword] = useState("admin");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [emailPreview, setEmailPreview] = useState(null);
    
    // Einmaliger Auth-Check beim Mount
    const authCheckedRef = useRef(false);
    useEffect(() => {
        if (!isAuthenticated) { navigate('/admin'); return; }
        if (authCheckedRef.current) return;
        authCheckedRef.current = true;
        
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        axios.get(`${API}/auth/check`, { headers })
            .then(res => {
                setAdminProfile(res.data);
                if (res.data.must_change_password) {
                    setActiveDialog('forcePassword');
                    toast.info("Bitte ändern Sie Ihr Standard-Passwort!");
                }
            })
            .catch(() => { logout(); navigate('/admin'); });
    }, [isAuthenticated, navigate, logout, token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [entriesRes, tracksRes, statusRes, designRes, participantsRes, templateRes, smtpRes] = await Promise.all([
                axios.get(`${API}/laps`),
                axios.get(`${API}/tracks`),
                axios.get(`${API}/event/status`),
                axios.get(`${API}/design`),
                axios.get(`${API}/admin/participants`, { headers }).catch(() => ({ data: [] })),
                axios.get(`${API}/admin/email-template`, { headers }).catch(() => ({ data: null })),
                axios.get(`${API}/admin/smtp`, { headers }).catch(() => ({ data: null }))
            ]);
            setEntries(entriesRes.data);
            setTracks(tracksRes.data);
            setEventStatus(statusRes.data);
            setDesign(designRes.data);
            setParticipants(participantsRes.data);
            setEmailTemplate(templateRes.data);
            setSmtpSettings(smtpRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Einmaliges Fetchen beim Mount
    const dataFetchedRef = useRef(false);
    useEffect(() => { 
        if (dataFetchedRef.current) return;
        dataFetchedRef.current = true;
        fetchData(); 
    }, [fetchData]);

    // Handlers
    const handleAddEntry = async (e) => {
        e.preventDefault();
        if (!driverName.trim() || !lapTime.trim()) { toast.error("Fahrername und Zeit erforderlich"); return; }
        if (!/^\d{1,2}:\d{2}\.\d{1,3}$/.test(lapTime)) { toast.error("Format: M:SS.mmm"); return; }
        setIsSubmitting(true);
        try {
            await axios.post(`${API}/admin/laps`, { driver_name: driverName.trim(), team: showTeam ? team.trim() || null : null, lap_time_display: lapTime.trim() }, { headers: getAuthHeader() });
            setDriverName(""); setTeam(""); setLapTime("");
            toast.success("Hinzugefügt!");
            fetchData();
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteEntry = async (id) => { await axios.delete(`${API}/admin/laps/${id}`, { headers: getAuthHeader() }); toast.success("Gelöscht!"); fetchData(); };
    const handleDeleteAll = async () => { await axios.delete(`${API}/admin/laps`, { headers: getAuthHeader() }); toast.success("Alle gelöscht!"); fetchData(); };
    
    const handleUpdateEntry = async () => {
        if (!editEntry) return;
        await axios.put(`${API}/admin/laps/${editEntry.id}`, editEntry, { headers: getAuthHeader() });
        toast.success("Aktualisiert!"); setActiveDialog(null); setEditEntry(null); fetchData();
    };

    const handleSaveDesign = async (newDesign) => {
        await axios.put(`${API}/admin/design`, newDesign, { headers: getAuthHeader() });
        toast.success("Design gespeichert!"); fetchData();
    };

    const handleSaveEvent = async (eventData) => {
        await axios.put(`${API}/admin/event`, eventData, { headers: getAuthHeader() });
        toast.success("Event aktualisiert!"); setActiveDialog(null); fetchData();
    };

    const handleAddTrack = async () => {
        if (!newTrackName.trim()) return;
        await axios.post(`${API}/admin/tracks`, { name: newTrackName, country: newTrackCountry, image_url: newTrackImage || null }, { headers: getAuthHeader() });
        setNewTrackName(""); setNewTrackCountry(""); setNewTrackImage("");
        toast.success("Strecke hinzugefügt!"); fetchData();
    };

    const handleDeleteTrack = async (id) => { await axios.delete(`${API}/admin/tracks/${id}`, { headers: getAuthHeader() }); toast.success("Gelöscht!"); fetchData(); };

    const handleChangePassword = async (isForced = false) => {
        if (newPassword !== confirmPassword) { toast.error("Passwörter stimmen nicht überein"); return; }
        if (newPassword.length < 4) { toast.error("Neues Passwort min. 4 Zeichen"); return; }
        try {
            await axios.put(`${API}/admin/password`, { current_password: currentPassword, new_password: newPassword }, { headers: getAuthHeader() });
            toast.success("Passwort geändert!"); 
            setActiveDialog(null);
            setCurrentPassword("admin"); setNewPassword(""); setConfirmPassword("");
            clearPasswordFlag();
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    const handleSaveSmtp = async (smtpData) => {
        await axios.put(`${API}/admin/smtp`, smtpData, { headers: getAuthHeader() });
        toast.success("SMTP gespeichert!"); fetchData();
    };

    const handleTestSmtp = async () => {
        try {
            await axios.post(`${API}/admin/smtp/test`, {}, { headers: getAuthHeader() });
            toast.success("Test-E-Mail gesendet!");
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    const handleSaveEmailTemplate = async (templateData) => {
        await axios.put(`${API}/admin/email-template`, templateData, { headers: getAuthHeader() });
        toast.success("Template gespeichert!"); fetchData();
    };

    const handlePreviewEmail = async () => {
        const res = await axios.get(`${API}/admin/email-template/preview`, { headers: getAuthHeader() });
        setEmailPreview(res.data);
    };

    const handleAddParticipant = async () => {
        if (!newParticipantName.trim() || !newParticipantEmail.trim()) return;
        await axios.post(`${API}/admin/participants`, { name: newParticipantName, email: newParticipantEmail }, { headers: getAuthHeader() });
        setNewParticipantName(""); setNewParticipantEmail("");
        toast.success("Teilnehmer hinzugefügt!"); fetchData();
    };

    const handleDeleteParticipant = async (id) => { await axios.delete(`${API}/admin/participants/${id}`, { headers: getAuthHeader() }); fetchData(); };

    const handleSendEmails = async () => {
        await axios.post(`${API}/admin/send-results`, {}, { headers: getAuthHeader() });
        toast.success("E-Mails werden gesendet!");
    };

    const handleExportCSV = () => window.open(`${API}/admin/export/csv`, '_blank');

    if (!isAuthenticated) return null;
    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]"><div className="spinner"></div></div>;

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <Toaster position="top-right" />
            
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#333] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Settings size={24} className="text-[#FF1E1E]" />
                    <span className="font-bold text-lg">Admin</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#A0A0A0] text-sm hidden sm:inline">{username}</span>
                    <Link to="/"><Button variant="outline" size="sm" className="border-[#333] text-white hover:bg-[#1A1A1A]"><Trophy size={14} className="mr-1" /> Live</Button></Link>
                    <Button variant="outline" size="sm" className="border-[#333] text-white hover:bg-[#1A1A1A]" onClick={() => { logout(); navigate('/admin'); }}><LogOut size={14} /></Button>
                </div>
            </header>
            
            {/* Status & Timer */}
            {eventStatus && (
                <div className="border-b border-[#333]">
                    <StatusBanner status={eventStatus.status} message={eventStatus.message} design={design} />
                    {eventStatus.timer_enabled && eventStatus.timer_end_time && eventStatus.status === 'active' && (
                        <div className="py-2 flex justify-center bg-[#1A1A1A]">
                            <TimerDisplay endTime={eventStatus.timer_end_time} onExpire={fetchData} />
                        </div>
                    )}
                </div>
            )}
            
            <main className="p-4 max-w-6xl mx-auto">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Button onClick={() => setActiveDialog('design')} variant="outline" size="sm" className="border-[#333] hover:border-[#FF1E1E] hover:bg-[#FF1E1E]/10"><Palette size={14} className="mr-1" /> Design</Button>
                    <Button onClick={() => setActiveDialog('event')} variant="outline" size="sm" className="border-[#333] hover:border-[#FF1E1E] hover:bg-[#FF1E1E]/10"><Calendar size={14} className="mr-1" /> Event</Button>
                    <Button onClick={() => setActiveDialog('tracks')} variant="outline" size="sm" className="border-[#333] hover:border-[#FF1E1E] hover:bg-[#FF1E1E]/10"><MapPin size={14} className="mr-1" /> Strecken</Button>
                    <Button onClick={() => setActiveDialog('email')} variant="outline" size="sm" className="border-[#333] hover:border-[#FF1E1E] hover:bg-[#FF1E1E]/10"><Mail size={14} className="mr-1" /> E-Mail</Button>
                    <Button onClick={() => setActiveDialog('participants')} variant="outline" size="sm" className="border-[#333] hover:border-[#FF1E1E] hover:bg-[#FF1E1E]/10"><Users size={14} className="mr-1" /> Teilnehmer ({participants.length})</Button>
                    <Button onClick={() => setActiveDialog('password')} variant="outline" size="sm" className="border-[#333] hover:border-[#FF1E1E] hover:bg-[#FF1E1E]/10"><Key size={14} className="mr-1" /> Passwort</Button>
                    <Button onClick={handleExportCSV} variant="outline" size="sm" className="border-[#333]" disabled={entries.length === 0}><FileText size={14} className="mr-1" /> CSV</Button>
                </div>
                
                {/* Add Entry Form */}
                <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold flex items-center gap-2"><Plus size={18} className="text-[#FF1E1E]" /> Rundenzeit</h2>
                        <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                            <User size={14} /><Switch checked={showTeam} onCheckedChange={setShowTeam} /><Users size={14} />
                        </div>
                    </div>
                    <form onSubmit={handleAddEntry} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Fahrername" className="bg-[#0A0A0A] border-[#333]" />
                        {showTeam && <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Team (optional)" className="bg-[#0A0A0A] border-[#333]" />}
                        <Input value={lapTime} onChange={(e) => setLapTime(e.target.value)} placeholder="1:23.456" className="bg-[#0A0A0A] border-[#333] font-mono" />
                        <Button type="submit" className="bg-[#FF1E1E] hover:bg-[#D61A1A]" disabled={isSubmitting}>
                            {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <><Plus size={16} className="mr-1" /> Hinzufügen</>}
                        </Button>
                    </form>
                </div>
                
                {/* Entries List */}
                <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold flex items-center gap-2"><Trophy size={18} className="text-[#FFD700]" /> Rangliste ({entries.length})</h2>
                        {entries.length > 0 && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="border-[#333] text-[#FF1E1E]"><Trash2 size={14} className="mr-1" /> Alle</Button></AlertDialogTrigger>
                                <AlertDialogContent className="bg-[#1A1A1A] border-[#333]">
                                    <AlertDialogHeader><AlertDialogTitle>Alle löschen?</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="border-[#333]">Abbrechen</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteAll} className="bg-[#FF1E1E]">Löschen</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    
                    {entries.length === 0 ? (
                        <div className="text-center py-8 text-[#A0A0A0]"><Timer size={48} className="mx-auto mb-3 opacity-50" /><p>Keine Einträge</p></div>
                    ) : (
                        <div className="space-y-2">
                            {entries.map(entry => (
                                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0A0A]/50 border border-[#333]/50 hover:border-[#333]">
                                    <RankBadge rank={entry.rank} design={design} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold truncate">{entry.driver_name}</div>
                                        {entry.team && <div className="text-sm text-[#A0A0A0] truncate">{entry.team}</div>}
                                    </div>
                                    <div className="font-mono text-[#00F0FF]">{entry.lap_time_display}</div>
                                    <div className="font-mono text-sm text-[#A0A0A0] w-20 text-right">{entry.gap}</div>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditEntry({...entry}); setActiveDialog('editEntry'); }} className="p-2 text-[#A0A0A0] hover:text-white"><Edit2 size={14} /></button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><button className="p-2 text-[#A0A0A0] hover:text-[#FF1E1E]"><Trash2 size={14} /></button></AlertDialogTrigger>
                                            <AlertDialogContent className="bg-[#1A1A1A] border-[#333]">
                                                <AlertDialogHeader><AlertDialogTitle>Löschen?</AlertDialogTitle></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="border-[#333]">Nein</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="bg-[#FF1E1E]">Ja</AlertDialogAction>
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
            
            {/* DIALOGS */}
            
            {/* Design Dialog */}
            <Dialog open={activeDialog === 'design'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle><Palette size={18} className="inline mr-2" />Design anpassen</DialogTitle></DialogHeader>
                    {design && <DesignEditor design={design} onSave={handleSaveDesign} onClose={() => setActiveDialog(null)} />}
                </DialogContent>
            </Dialog>
            
            {/* Event Dialog */}
            <Dialog open={activeDialog === 'event'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]">
                    <DialogHeader><DialogTitle><Calendar size={18} className="inline mr-2" />Event Einstellungen</DialogTitle></DialogHeader>
                    {eventStatus && <EventEditor event={eventStatus} tracks={tracks} onSave={handleSaveEvent} />}
                </DialogContent>
            </Dialog>
            
            {/* Tracks Dialog */}
            <Dialog open={activeDialog === 'tracks'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]">
                    <DialogHeader><DialogTitle><MapPin size={18} className="inline mr-2" />Strecken</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            <Input value={newTrackName} onChange={(e) => setNewTrackName(e.target.value)} placeholder="Name" className="bg-[#0A0A0A] border-[#333]" />
                            <Input value={newTrackCountry} onChange={(e) => setNewTrackCountry(e.target.value)} placeholder="Land" className="bg-[#0A0A0A] border-[#333]" />
                            <Input value={newTrackImage} onChange={(e) => setNewTrackImage(e.target.value)} placeholder="Bild-URL" className="bg-[#0A0A0A] border-[#333]" />
                        </div>
                        <Button onClick={handleAddTrack} className="w-full bg-[#FF1E1E]"><Plus size={14} className="mr-1" /> Hinzufügen</Button>
                        <div className="space-y-2 max-h-60 overflow-auto">
                            {tracks.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded border border-[#333]">
                                    <div className="flex items-center gap-2">
                                        {t.image_url && <img src={t.image_url} alt="" className="w-10 h-6 object-cover rounded" />}
                                        <span>{t.name}, {t.country}</span>
                                    </div>
                                    <button onClick={() => handleDeleteTrack(t.id)} className="text-[#A0A0A0] hover:text-[#FF1E1E]"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Email Dialog */}
            <Dialog open={activeDialog === 'email'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle><Mail size={18} className="inline mr-2" />E-Mail Einstellungen</DialogTitle></DialogHeader>
                    <EmailEditor 
                        smtp={smtpSettings} 
                        template={emailTemplate} 
                        adminEmail={adminProfile?.email}
                        onSaveSmtp={handleSaveSmtp}
                        onTestSmtp={handleTestSmtp}
                        onSaveTemplate={handleSaveEmailTemplate}
                        onPreview={handlePreviewEmail}
                        preview={emailPreview}
                        onSendAll={handleSendEmails}
                        participantCount={participants.length}
                    />
                </DialogContent>
            </Dialog>
            
            {/* Participants Dialog */}
            <Dialog open={activeDialog === 'participants'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]">
                    <DialogHeader><DialogTitle><Users size={18} className="inline mr-2" />Teilnehmer</DialogTitle>
                        <DialogDescription>E-Mail-Empfänger für Ergebnisse</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Input value={newParticipantName} onChange={(e) => setNewParticipantName(e.target.value)} placeholder="Name" className="bg-[#0A0A0A] border-[#333]" />
                            <Input type="email" value={newParticipantEmail} onChange={(e) => setNewParticipantEmail(e.target.value)} placeholder="E-Mail" className="bg-[#0A0A0A] border-[#333]" />
                        </div>
                        <Button onClick={handleAddParticipant} className="w-full bg-[#FF1E1E]"><UserPlus size={14} className="mr-1" /> Hinzufügen</Button>
                        <div className="space-y-2 max-h-60 overflow-auto">
                            {participants.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded border border-[#333]">
                                    <div><div className="font-medium">{p.name}</div><div className="text-sm text-[#A0A0A0]">{p.email}</div></div>
                                    <button onClick={() => handleDeleteParticipant(p.id)} className="text-[#A0A0A0] hover:text-[#FF1E1E]"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Password Dialog */}
            <Dialog open={activeDialog === 'password'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]">
                    <DialogHeader><DialogTitle><Key size={18} className="inline mr-2" />Passwort ändern</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Aktuelles Passwort" className="bg-[#0A0A0A] border-[#333]" />
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Neues Passwort" className="bg-[#0A0A0A] border-[#333]" />
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Bestätigen" className="bg-[#0A0A0A] border-[#333]" />
                        <Button onClick={() => handleChangePassword(false)} className="w-full bg-[#FF1E1E]"><Check size={14} className="mr-1" /> Ändern</Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Force Password Change Dialog (First Login) */}
            <Dialog open={activeDialog === 'forcePassword'} onOpenChange={() => {}}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]" onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-[#FF1E1E]"><Key size={18} className="inline mr-2" />Passwort ändern erforderlich!</DialogTitle>
                        <DialogDescription>
                            Bitte ändern Sie das Standard-Passwort für mehr Sicherheit.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-[#A0A0A0] text-xs">Aktuelles Passwort (Standard: admin)</Label>
                            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="admin" className="bg-[#0A0A0A] border-[#333]" />
                        </div>
                        <div>
                            <Label className="text-[#A0A0A0] text-xs">Neues Passwort</Label>
                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mindestens 4 Zeichen" className="bg-[#0A0A0A] border-[#333]" />
                        </div>
                        <div>
                            <Label className="text-[#A0A0A0] text-xs">Passwort bestätigen</Label>
                            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Wiederholen" className="bg-[#0A0A0A] border-[#333]" />
                        </div>
                        <Button onClick={() => handleChangePassword(true)} className="w-full bg-[#FF1E1E]"><Check size={14} className="mr-1" /> Passwort ändern</Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Edit Entry Dialog */}
            <Dialog open={activeDialog === 'editEntry'} onOpenChange={(open) => { if (!open) { setActiveDialog(null); setEditEntry(null); } }}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]">
                    <DialogHeader><DialogTitle>Eintrag bearbeiten</DialogTitle></DialogHeader>
                    {editEntry && (
                        <div className="space-y-4">
                            <Input value={editEntry.driver_name} onChange={(e) => setEditEntry({...editEntry, driver_name: e.target.value})} className="bg-[#0A0A0A] border-[#333]" />
                            <Input value={editEntry.team || ''} onChange={(e) => setEditEntry({...editEntry, team: e.target.value})} placeholder="Team" className="bg-[#0A0A0A] border-[#333]" />
                            <Input value={editEntry.lap_time_display} onChange={(e) => setEditEntry({...editEntry, lap_time_display: e.target.value})} className="bg-[#0A0A0A] border-[#333] font-mono" />
                            <Button onClick={handleUpdateEntry} className="w-full bg-[#FF1E1E]"><Check size={14} className="mr-1" /> Speichern</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Design Editor Component
const DesignEditor = ({ design, onSave, onClose }) => {
    const [d, setD] = useState(design);
    
    const ColorInput = ({ label, value, onChange }) => (
        <div className="flex items-center gap-2">
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
            <span className="text-sm text-[#A0A0A0] flex-1">{label}</span>
            <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-24 bg-[#0A0A0A] border-[#333] text-xs font-mono" />
        </div>
    );
    
    return (
        <Tabs defaultValue="title" className="mt-4">
            <TabsList className="grid grid-cols-5 bg-[#0A0A0A]">
                <TabsTrigger value="title">Titel</TabsTrigger>
                <TabsTrigger value="colors">Farben</TabsTrigger>
                <TabsTrigger value="fonts">Schriften</TabsTrigger>
                <TabsTrigger value="bg">Hintergrund</TabsTrigger>
                <TabsTrigger value="site">Website</TabsTrigger>
            </TabsList>
            
            <TabsContent value="title" className="space-y-4 mt-4">
                <div className="p-4 rounded bg-[#0A0A0A] text-center">
                    <span style={{ fontFamily: d.title_font, fontSize: '1.5rem' }}>
                        <span style={{ color: d.title_color1 }}>{d.title_line1} </span>
                        <span style={{ color: d.title_color2 }}>{d.title_line2} </span>
                        <span style={{ color: d.title_color3 }}>{d.title_line3}</span>
                    </span>
                </div>
                {['title_line1', 'title_line2', 'title_line3'].map((key, i) => (
                    <div key={key} className="grid grid-cols-[1fr_auto] gap-2">
                        <Input value={d[key]} onChange={(e) => setD({...d, [key]: e.target.value})} className="bg-[#0A0A0A] border-[#333]" />
                        <input type="color" value={d[`title_color${i+1}`]} onChange={(e) => setD({...d, [`title_color${i+1}`]: e.target.value})} className="w-10 h-10 rounded cursor-pointer" />
                    </div>
                ))}
            </TabsContent>
            
            <TabsContent value="colors" className="space-y-3 mt-4">
                <ColorInput label="Primärfarbe" value={d.primary_color} onChange={(v) => setD({...d, primary_color: v})} />
                <ColorInput label="Akzentfarbe (Zeiten)" value={d.accent_color} onChange={(v) => setD({...d, accent_color: v})} />
                <ColorInput label="Text" value={d.text_color} onChange={(v) => setD({...d, text_color: v})} />
                <ColorInput label="Text sekundär" value={d.text_secondary} onChange={(v) => setD({...d, text_secondary: v})} />
                <ColorInput label="Hintergrund" value={d.bg_color} onChange={(v) => setD({...d, bg_color: v})} />
                <ColorInput label="Oberfläche" value={d.surface_color} onChange={(v) => setD({...d, surface_color: v})} />
                <hr className="border-[#333]" />
                <ColorInput label="Gold (1. Platz)" value={d.gold_color} onChange={(v) => setD({...d, gold_color: v})} />
                <ColorInput label="Silber (2. Platz)" value={d.silver_color} onChange={(v) => setD({...d, silver_color: v})} />
                <ColorInput label="Bronze (3. Platz)" value={d.bronze_color} onChange={(v) => setD({...d, bronze_color: v})} />
            </TabsContent>
            
            <TabsContent value="fonts" className="space-y-4 mt-4">
                {[
                    { key: 'heading_font', label: 'Überschriften' },
                    { key: 'body_font', label: 'Text' },
                    { key: 'time_font', label: 'Zeiten' },
                    { key: 'title_font', label: 'Titel' }
                ].map(({ key, label }) => (
                    <div key={key}>
                        <Label className="text-[#A0A0A0] text-xs">{label}</Label>
                        <Select value={d[key]} onValueChange={(v) => setD({...d, [key]: v})}>
                            <SelectTrigger className="bg-[#0A0A0A] border-[#333]"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#1A1A1A] border-[#333]">
                                {['Russo One', 'Barlow', 'JetBrains Mono', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Impact'].map(f => (
                                    <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </TabsContent>
            
            <TabsContent value="bg" className="space-y-4 mt-4">
                <div><Label className="text-[#A0A0A0] text-xs">Hintergrundbild URL</Label>
                    <Input value={d.bg_image_url} onChange={(e) => setD({...d, bg_image_url: e.target.value})} placeholder="https://..." className="bg-[#0A0A0A] border-[#333]" /></div>
                <div><Label className="text-[#A0A0A0] text-xs">Overlay Transparenz: {d.bg_overlay_opacity}</Label>
                    <input type="range" min="0" max="1" step="0.05" value={d.bg_overlay_opacity} onChange={(e) => setD({...d, bg_overlay_opacity: parseFloat(e.target.value)})} className="w-full" /></div>
            </TabsContent>
            
            <TabsContent value="site" className="space-y-4 mt-4">
                <div className="p-3 bg-[#0A0A0A] rounded border border-[#333]">
                    <p className="text-sm text-[#A0A0A0] mb-2">🌐 Browser-Tab Einstellungen</p>
                </div>
                <div>
                    <Label className="text-[#A0A0A0] text-xs">Tab-Titel (Browser)</Label>
                    <Input value={d.site_title || ''} onChange={(e) => setD({...d, site_title: e.target.value})} placeholder="F1 Fast Lap Challenge" className="bg-[#0A0A0A] border-[#333]" />
                </div>
                <div>
                    <Label className="text-[#A0A0A0] text-xs">Favicon URL (Icon im Browser-Tab)</Label>
                    <Input value={d.favicon_url || ''} onChange={(e) => setD({...d, favicon_url: e.target.value})} placeholder="https://example.com/favicon.ico" className="bg-[#0A0A0A] border-[#333]" />
                    {d.favicon_url && (
                        <div className="mt-2 flex items-center gap-2">
                            <img src={d.favicon_url} alt="Favicon preview" className="w-8 h-8 object-contain rounded border border-[#333]" onError={(e) => e.target.style.display = 'none'} />
                            <span className="text-xs text-[#A0A0A0]">Vorschau</span>
                        </div>
                    )}
                </div>
            </TabsContent>
            
            <div className="flex gap-2 mt-6">
                <Button onClick={onClose} variant="outline" className="flex-1 border-[#333]">Abbrechen</Button>
                <Button onClick={() => { onSave(d); onClose(); }} className="flex-1 bg-[#FF1E1E]"><Check size={14} className="mr-1" /> Speichern</Button>
            </div>
        </Tabs>
    );
};

// Event Editor Component
const EventEditor = ({ event, tracks, onSave }) => {
    const [e, setE] = useState({
        status: event.status,
        track_id: event.track?.id || '',
        scheduled_date: event.scheduled_date || '',
        scheduled_time: event.scheduled_time || '',
        timer_enabled: event.timer_enabled || false,
        timer_duration_minutes: event.timer_duration_minutes || 60
    });
    
    return (
        <div className="space-y-4 mt-4">
            <div><Label className="text-[#A0A0A0] text-xs">Status</Label>
                <Select value={e.status} onValueChange={(v) => setE({...e, status: v})}>
                    <SelectTrigger className="bg-[#0A0A0A] border-[#333]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        <SelectItem value="inactive">Kein Rennen</SelectItem>
                        <SelectItem value="scheduled">Geplant</SelectItem>
                        <SelectItem value="active">Läuft</SelectItem>
                        <SelectItem value="finished">Abgeschlossen</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div><Label className="text-[#A0A0A0] text-xs">Strecke</Label>
                <Select value={e.track_id} onValueChange={(v) => setE({...e, track_id: v})}>
                    <SelectTrigger className="bg-[#0A0A0A] border-[#333]"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        <SelectItem value="">Keine</SelectItem>
                        {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            
            {e.status === 'scheduled' && (
                <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[#A0A0A0] text-xs">Datum</Label>
                        <Input value={e.scheduled_date} onChange={(ev) => setE({...e, scheduled_date: ev.target.value})} placeholder="01.02.2026" className="bg-[#0A0A0A] border-[#333]" /></div>
                    <div><Label className="text-[#A0A0A0] text-xs">Uhrzeit</Label>
                        <Input value={e.scheduled_time} onChange={(ev) => setE({...e, scheduled_time: ev.target.value})} placeholder="18:00" className="bg-[#0A0A0A] border-[#333]" /></div>
                </div>
            )}
            
            <div className="p-3 bg-[#0A0A0A] rounded border border-[#333]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Clock size={16} className="text-[#A0A0A0]" /><span>Timer aktivieren</span></div>
                    <Switch checked={e.timer_enabled} onCheckedChange={(v) => setE({...e, timer_enabled: v})} />
                </div>
                {e.timer_enabled && (
                    <div className="mt-3"><Label className="text-[#A0A0A0] text-xs">Dauer (Minuten)</Label>
                        <Input type="number" value={e.timer_duration_minutes} onChange={(ev) => setE({...e, timer_duration_minutes: parseInt(ev.target.value) || 60})} className="bg-[#1A1A1A] border-[#333]" /></div>
                )}
            </div>
            
            <Button onClick={() => onSave(e)} className="w-full bg-[#FF1E1E]"><Check size={14} className="mr-1" /> Speichern</Button>
        </div>
    );
};

// Email Editor Component
const EmailEditor = ({ smtp, template, adminEmail, onSaveSmtp, onTestSmtp, onSaveTemplate, onPreview, preview, onSendAll, participantCount }) => {
    const [s, setS] = useState(smtp || { host: '', port: 587, username: '', password: '', from_email: '', from_name: '', enabled: false });
    const [t, setT] = useState(template || { subject: '', body_html: '', custom_footer: '', send_on_finish: true });
    
    return (
        <Tabs defaultValue="smtp" className="mt-4">
            <TabsList className="grid grid-cols-3 bg-[#0A0A0A]">
                <TabsTrigger value="smtp">SMTP</TabsTrigger>
                <TabsTrigger value="template">Template</TabsTrigger>
                <TabsTrigger value="send">Senden</TabsTrigger>
            </TabsList>
            
            <TabsContent value="smtp" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded"><span>SMTP aktivieren</span><Switch checked={s.enabled} onCheckedChange={(v) => setS({...s, enabled: v})} /></div>
                {s.enabled && <>
                    <div className="grid grid-cols-[2fr_1fr] gap-2">
                        <div><Label className="text-[#A0A0A0] text-xs">Host</Label><Input value={s.host} onChange={(e) => setS({...s, host: e.target.value})} placeholder="smtp.gmail.com" className="bg-[#0A0A0A] border-[#333]" /></div>
                        <div><Label className="text-[#A0A0A0] text-xs">Port</Label><Input type="number" value={s.port} onChange={(e) => setS({...s, port: parseInt(e.target.value)})} className="bg-[#0A0A0A] border-[#333]" /></div>
                    </div>
                    <div><Label className="text-[#A0A0A0] text-xs">Benutzername</Label><Input value={s.username} onChange={(e) => setS({...s, username: e.target.value})} className="bg-[#0A0A0A] border-[#333]" /></div>
                    <div><Label className="text-[#A0A0A0] text-xs">Passwort</Label><Input type="password" value={s.password} onChange={(e) => setS({...s, password: e.target.value})} className="bg-[#0A0A0A] border-[#333]" /></div>
                    <div><Label className="text-[#A0A0A0] text-xs">Absender E-Mail</Label><Input value={s.from_email} onChange={(e) => setS({...s, from_email: e.target.value})} className="bg-[#0A0A0A] border-[#333]" /></div>
                    <div><Label className="text-[#A0A0A0] text-xs">Absender Name</Label><Input value={s.from_name} onChange={(e) => setS({...s, from_name: e.target.value})} placeholder="F1 Challenge" className="bg-[#0A0A0A] border-[#333]" /></div>
                    <div className="flex gap-2">
                        <Button onClick={() => onSaveSmtp(s)} className="flex-1 bg-[#FF1E1E]"><Check size={14} className="mr-1" /> Speichern</Button>
                        <Button onClick={onTestSmtp} variant="outline" className="border-[#333]"><Send size={14} className="mr-1" /> Test</Button>
                    </div>
                </>}
            </TabsContent>
            
            <TabsContent value="template" className="space-y-4 mt-4">
                <div className="p-3 bg-[#0A0A0A] rounded text-xs text-[#A0A0A0]">
                    <strong>Variablen:</strong> {'{event_title}'}, {'{track_name}'}, {'{results_table}'}, {'{first_place}'}, {'{first_time}'}, {'{second_place}'}, {'{third_place}'}, {'{date}'}, {'{time}'}, {'{participant_name}'}, {'{custom_footer}'}, {'{title_color}'}
                </div>
                <div><Label className="text-[#A0A0A0] text-xs">Betreff</Label>
                    <Input value={t.subject} onChange={(e) => setT({...t, subject: e.target.value})} className="bg-[#0A0A0A] border-[#333]" /></div>
                <div><Label className="text-[#A0A0A0] text-xs">HTML Body</Label>
                    <Textarea value={t.body_html} onChange={(e) => setT({...t, body_html: e.target.value})} rows={10} className="bg-[#0A0A0A] border-[#333] font-mono text-xs" /></div>
                <div><Label className="text-[#A0A0A0] text-xs">Footer Text</Label>
                    <Input value={t.custom_footer} onChange={(e) => setT({...t, custom_footer: e.target.value})} className="bg-[#0A0A0A] border-[#333]" /></div>
                <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded">
                    <span className="text-sm">Automatisch senden bei "Abgeschlossen"</span>
                    <Switch checked={t.send_on_finish} onCheckedChange={(v) => setT({...t, send_on_finish: v})} />
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => onSaveTemplate(t)} className="flex-1 bg-[#FF1E1E]"><Check size={14} className="mr-1" /> Speichern</Button>
                    <Button onClick={onPreview} variant="outline" className="border-[#333]"><Eye size={14} className="mr-1" /> Vorschau</Button>
                </div>
                {preview && (
                    <div className="mt-4 p-4 bg-white text-black rounded max-h-80 overflow-auto">
                        <div className="font-bold mb-2 pb-2 border-b">{preview.subject}</div>
                        <div dangerouslySetInnerHTML={{ __html: preview.body_html }} />
                    </div>
                )}
            </TabsContent>
            
            <TabsContent value="send" className="space-y-4 mt-4">
                <div className="p-4 bg-[#0A0A0A] rounded text-center">
                    <Users size={48} className="mx-auto mb-2 text-[#A0A0A0]" />
                    <p className="text-2xl font-bold">{participantCount}</p>
                    <p className="text-[#A0A0A0]">Teilnehmer</p>
                </div>
                <Button onClick={onSendAll} className="w-full bg-[#FF1E1E]" disabled={participantCount === 0}>
                    <Send size={14} className="mr-2" /> Ergebnisse an alle senden
                </Button>
                <p className="text-xs text-[#A0A0A0] text-center">
                    Tipp: E-Mails werden automatisch gesendet, wenn der Status auf "Abgeschlossen" gesetzt wird (falls aktiviert).
                </p>
            </TabsContent>
        </Tabs>
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
