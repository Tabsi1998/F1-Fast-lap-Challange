import { useState, useEffect, useCallback, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, Link, useParams } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
    Trophy, Timer, Flag, Plus, Trash2, Download, FileText, Edit2, 
    X, Check, Users, User, RefreshCw, Settings, LogOut, LogIn,
    MapPin, Calendar, ChevronRight, Palette, Key, Mail, Bell, Send,
    Clock, Play, Square, UserPlus, Eye, Upload, Image, QrCode,
    ChevronDown, ChevronUp, Archive, BarChart3, Copy, ExternalLink
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
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
const RankBadge = ({ rank }) => {
    let bgColor = '#1A1A1A';
    if (rank === 1) bgColor = '#FFD700';
    else if (rank === 2) bgColor = '#C0C0C0';
    else if (rank === 3) bgColor = '#CD7F32';
    const textColor = rank <= 3 ? '#000' : '#A0A0A0';
    
    return (
        <div className="rank-badge" style={{ background: rank <= 3 ? `linear-gradient(135deg, ${bgColor}, ${bgColor}99)` : bgColor, color: textColor }}>
            {rank}
        </div>
    );
};

// Status Badge
const StatusBadge = ({ status }) => {
    const colors = {
        scheduled: { bg: '#FFA500', text: 'Geplant' },
        active: { bg: '#00FF00', text: 'Live' },
        finished: { bg: '#FF1E1E', text: 'Beendet' },
        archived: { bg: '#666', text: 'Archiviert' }
    };
    const s = colors[status] || colors.scheduled;
    return (
        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: `${s.bg}33`, color: s.bg }}>
            {s.text}
        </span>
    );
};

// ==================== EVENTS OVERVIEW (Homepage) ====================
const EventsOverview = () => {
    const [events, setEvents] = useState({ active: [], scheduled: [], finished: [], archived: [] });
    const [design, setDesign] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedEvents, setExpandedEvents] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [eventsRes, designRes] = await Promise.all([
                    axios.get(`${API}/events`),
                    axios.get(`${API}/design`)
                ]);
                setEvents(eventsRes.data);
                setDesign(designRes.data);
                
                // Apply design settings
                if (designRes.data) {
                    const d = designRes.data;
                    document.documentElement.style.setProperty('--bg-color', d.bg_color || '#0A0A0A');
                    document.documentElement.style.setProperty('--primary-color', d.primary_color || '#FF1E1E');
                    document.title = d.site_title || 'F1 Fast Lap Challenge';
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const toggleExpand = (eventId) => {
        setExpandedEvents(prev => ({ ...prev, [eventId]: !prev[eventId] }));
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]"><div className="spinner"></div></div>;
    }

    const EventCard = ({ event, showExpand = true }) => {
        const isExpanded = expandedEvents[event.id];
        return (
            <div key={event.id} className="bg-[#1A1A1A] rounded-lg border border-[#333] overflow-hidden hover:border-[#FF1E1E] transition-colors">
                <Link to={`/event/${event.slug}`} className="block">
                    {event.track?.image_url && (
                        <div className="h-32 overflow-hidden">
                            <img src={event.track.image_url} alt={event.track.name} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg">{event.name}</h3>
                            <StatusBadge status={event.status} />
                        </div>
                        {event.track && (
                            <p className="text-[#A0A0A0] text-sm flex items-center gap-1">
                                <MapPin size={12} /> {event.track.name}, {event.track.country}
                            </p>
                        )}
                        {event.scheduled_date && (
                            <p className="text-[#A0A0A0] text-sm flex items-center gap-1 mt-1">
                                <Calendar size={12} /> {event.scheduled_date} {event.scheduled_time || ''}
                            </p>
                        )}
                        <p className="text-[#666] text-xs mt-2">{event.entry_count} Teilnehmer</p>
                    </div>
                </Link>
                
                {showExpand && event.top_entries?.length > 0 && (
                    <div className="border-t border-[#333]">
                        <button 
                            onClick={(e) => { e.preventDefault(); toggleExpand(event.id); }}
                            className="w-full px-4 py-2 text-sm text-[#A0A0A0] hover:bg-[#0A0A0A] flex items-center justify-between"
                        >
                            <span>Top 3 Vorschau</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {isExpanded && (
                            <div className="px-4 pb-4 space-y-2">
                                {event.top_entries.map((entry, idx) => (
                                    <div key={entry.id} className="flex items-center justify-between text-sm p-2 bg-[#0A0A0A] rounded">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                                                idx === 0 ? 'bg-[#FFD700] text-black' : 
                                                idx === 1 ? 'bg-[#C0C0C0] text-black' : 
                                                'bg-[#CD7F32] text-black'
                                            }`}>{idx + 1}</span>
                                            <span>{entry.driver_name}</span>
                                        </div>
                                        <span className="text-[#FF1E1E] font-mono">{entry.lap_time_display}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const allEvents = [...events.active, ...events.scheduled, ...events.finished];
    const hasNoEvents = allEvents.length === 0;

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <Toaster position="top-right" />
            
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#333] px-4 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Flag size={28} className="text-[#FF1E1E]" />
                        <div>
                            <h1 className="font-bold text-xl" style={{ fontFamily: 'Russo One' }}>
                                {design?.title_line1 || 'F1'} <span className="text-[#FF1E1E]">{design?.title_line2 || 'FAST LAP'}</span> {design?.title_line3 || 'CHALLENGE'}
                            </h1>
                        </div>
                    </div>
                    <Link to="/admin">
                        <Button variant="outline" size="sm" className="border-[#333] text-white hover:bg-[#1A1A1A]">
                            <LogIn size={14} className="mr-1" /> Admin
                        </Button>
                    </Link>
                </div>
            </header>
            
            <main className="max-w-6xl mx-auto px-4 py-8">
                {hasNoEvents ? (
                    <div className="text-center py-20">
                        <Trophy size={64} className="mx-auto mb-4 text-[#333]" />
                        <h2 className="text-xl font-bold mb-2">Noch keine Events</h2>
                        <p className="text-[#A0A0A0]">Events werden bald hier erscheinen!</p>
                    </div>
                ) : (
                    <>
                        {/* Active Events */}
                        {events.active.length > 0 && (
                            <section className="mb-8">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#00FF00] animate-pulse"></div>
                                    Live Events
                                </h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {events.active.map(e => <EventCard key={e.id} event={e} />)}
                                </div>
                            </section>
                        )}
                        
                        {/* Scheduled Events */}
                        {events.scheduled.length > 0 && (
                            <section className="mb-8">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Calendar size={18} className="text-[#FFA500]" />
                                    Geplante Events
                                </h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {events.scheduled.map(e => <EventCard key={e.id} event={e} />)}
                                </div>
                            </section>
                        )}
                        
                        {/* Finished Events */}
                        {events.finished.length > 0 && (
                            <section className="mb-8">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Trophy size={18} className="text-[#FFD700]" />
                                    Abgeschlossene Events
                                </h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {events.finished.map(e => <EventCard key={e.id} event={e} />)}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

// ==================== SINGLE EVENT PAGE ====================
const EventPage = () => {
    const { slug } = useParams();
    const [event, setEvent] = useState(null);
    const [design, setDesign] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [eventRes, designRes] = await Promise.all([
                    axios.get(`${API}/events/${slug}`),
                    axios.get(`${API}/design`)
                ]);
                setEvent(eventRes.data);
                setDesign(designRes.data);
                
                if (designRes.data) {
                    document.documentElement.style.setProperty('--bg-color', designRes.data.bg_color || '#0A0A0A');
                    document.documentElement.style.setProperty('--primary-color', designRes.data.primary_color || '#FF1E1E');
                    document.title = `${eventRes.data.name} - ${designRes.data.site_title || 'F1 Fast Lap Challenge'}`;
                }
            } catch (err) {
                setError('Event nicht gefunden');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [slug]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]"><div className="spinner"></div></div>;
    }

    if (error || !event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">{error}</h1>
                    <Link to="/"><Button>Zurück zur Übersicht</Button></Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <Toaster position="top-right" />
            
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#333] px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-[#A0A0A0] hover:text-white">
                        <ChevronRight size={16} className="rotate-180" />
                        <span className="text-sm">Alle Events</span>
                    </Link>
                    <StatusBadge status={event.status} />
                </div>
            </header>
            
            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Event Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'Russo One' }}>
                        {event.name}
                    </h1>
                    {event.description && <p className="text-[#A0A0A0]">{event.description}</p>}
                    
                    {/* Timer */}
                    {event.status === 'active' && event.timer_end_time && (
                        <div className="mt-4">
                            <TimerDisplay endTime={event.timer_end_time} />
                        </div>
                    )}
                </div>
                
                {/* Track Info */}
                {event.track && (
                    <div className="mb-6 rounded-lg overflow-hidden border border-[#333]">
                        {event.track.image_url && (
                            <img src={event.track.image_url} alt={event.track.name} className="w-full h-40 object-cover" />
                        )}
                        <div className="p-4 bg-[#1A1A1A] text-center">
                            <p className="flex items-center justify-center gap-2">
                                <MapPin size={16} className="text-[#FF1E1E]" />
                                <span className="font-bold">{event.track.name}</span>, {event.track.country}
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Leaderboard */}
                <div className="space-y-2">
                    {event.entries?.length === 0 ? (
                        <div className="text-center py-12 bg-[#1A1A1A] rounded-lg border border-[#333]">
                            <Timer size={48} className="mx-auto mb-4 text-[#333]" />
                            <p className="text-[#A0A0A0]">Noch keine Rundenzeiten</p>
                        </div>
                    ) : (
                        event.entries?.map((entry, idx) => (
                            <div 
                                key={entry.id} 
                                className={`entry-row flex items-center gap-4 p-4 rounded-lg border ${
                                    idx === 0 ? 'border-[#FFD700]/50 bg-[#FFD700]/10' :
                                    idx === 1 ? 'border-[#C0C0C0]/50 bg-[#C0C0C0]/10' :
                                    idx === 2 ? 'border-[#CD7F32]/50 bg-[#CD7F32]/10' :
                                    'border-[#333] bg-[#1A1A1A]'
                                }`}
                            >
                                <RankBadge rank={entry.rank} />
                                <div className="flex-1">
                                    <div className="font-bold">{entry.driver_name}</div>
                                    {entry.team && <div className="text-sm text-[#A0A0A0]">{entry.team}</div>}
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-lg text-[#FF1E1E]">{entry.lap_time_display}</div>
                                    {entry.gap && entry.gap !== '-' && (
                                        <div className="text-xs text-[#A0A0A0]">{entry.gap}</div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {/* Event Date */}
                {event.scheduled_date && (
                    <div className="mt-6 text-center text-[#A0A0A0] text-sm">
                        <Calendar size={14} className="inline mr-1" />
                        {event.scheduled_date} {event.scheduled_time || ''}
                    </div>
                )}
            </main>
        </div>
    );
};

// ==================== LOGIN PAGE ====================
const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { if (isAuthenticated) navigate('/admin/dashboard'); }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await axios.post(`${API}/auth/login`, { username, password });
            login(res.data.token, res.data.username, res.data.must_change_password);
            navigate('/admin/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || "Login fehlgeschlagen");
        } finally { setIsLoading(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white p-4">
            <Toaster position="top-right" />
            <div className="w-full max-w-sm bg-[#1A1A1A] rounded-xl p-8 border border-[#333]">
                <div className="text-center mb-6">
                    <Flag size={40} className="mx-auto mb-4 text-[#FF1E1E]" />
                    <h1 className="text-xl font-bold">Admin Login</h1>
                    <p className="text-[#A0A0A0] text-sm mt-1">Standard: admin / admin</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><Label className="text-[#A0A0A0] text-xs">BENUTZERNAME</Label>
                        <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-[#0A0A0A] border-[#333]" /></div>
                    <div><Label className="text-[#A0A0A0] text-xs">PASSWORT</Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#0A0A0A] border-[#333]" /></div>
                    <Button type="submit" className="w-full bg-[#FF1E1E]" disabled={isLoading}>
                        {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <>Anmelden <ChevronRight size={14} /></>}
                    </Button>
                </form>
                <Link to="/" className="block text-center text-[#A0A0A0] text-sm mt-4 hover:text-white">← Zur Übersicht</Link>
            </div>
        </div>
    );
};

// ==================== ADMIN DASHBOARD ====================
const AdminDashboard = () => {
    const { token, username, mustChangePassword, logout, clearPasswordFlag, getAuthHeader, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState({ active: [], scheduled: [], finished: [], archived: [] });
    const [tracks, setTracks] = useState([]);
    const [design, setDesign] = useState(null);
    const [smtpSettings, setSmtpSettings] = useState(null);
    const [emailTemplate, setEmailTemplate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Dialogs
    const [activeDialog, setActiveDialog] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    
    // New Event Form
    const [newEventName, setNewEventName] = useState("");
    const [newEventTrack, setNewEventTrack] = useState("");
    const [newEventDate, setNewEventDate] = useState("");
    const [newEventTime, setNewEventTime] = useState("");
    
    // New Track Form
    const [newTrackName, setNewTrackName] = useState("");
    const [newTrackCountry, setNewTrackCountry] = useState("");
    const [newTrackImage, setNewTrackImage] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    
    // Password
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // New Lap Entry
    const [newDriverName, setNewDriverName] = useState("");
    const [newTeam, setNewTeam] = useState("");
    const [newLapTime, setNewLapTime] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [showEmailField, setShowEmailField] = useState(false);

    const dataFetchedRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [eventsRes, tracksRes, designRes, smtpRes, templateRes] = await Promise.all([
                axios.get(`${API}/events`),
                axios.get(`${API}/tracks`),
                axios.get(`${API}/design`),
                axios.get(`${API}/admin/smtp`, { headers: getAuthHeader() }),
                axios.get(`${API}/admin/email-template`, { headers: getAuthHeader() })
            ]);
            setEvents(eventsRes.data);
            setTracks(tracksRes.data);
            setDesign(designRes.data);
            setSmtpSettings(smtpRes.data);
            setEmailTemplate(templateRes.data);
        } catch (error) {
            if (error.response?.status === 401) { logout(); navigate('/admin'); }
        } finally { setIsLoading(false); }
    }, [token, getAuthHeader, logout, navigate]);

    useEffect(() => {
        if (!isAuthenticated) { navigate('/admin'); return; }
        if (dataFetchedRef.current) return;
        dataFetchedRef.current = true;
        fetchData();
    }, [isAuthenticated, navigate, fetchData]);

    useEffect(() => {
        if (mustChangePassword && isAuthenticated) setActiveDialog('forcePassword');
    }, [mustChangePassword, isAuthenticated]);

    // Upload Handler with better feedback
    const handleUploadImage = async (file) => {
        if (!file) return null;
        setUploadingImage(true);
        toast.info("Bild wird hochgeladen...");
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await axios.post(`${API}/upload`, formData, { 
                headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Bild erfolgreich hochgeladen!");
            return res.data.url;
        } catch (error) {
            toast.error("Upload fehlgeschlagen: " + (error.response?.data?.detail || "Unbekannter Fehler"));
            return null;
        } finally {
            setUploadingImage(false);
        }
    };

    // Event Handlers
    const handleCreateEvent = async () => {
        if (!newEventName.trim()) { toast.error("Event-Name erforderlich"); return; }
        try {
            await axios.post(`${API}/admin/events`, {
                name: newEventName,
                track_id: newEventTrack || null,
                scheduled_date: newEventDate || null,
                scheduled_time: newEventTime || null
            }, { headers: getAuthHeader() });
            toast.success("Event erstellt!");
            setNewEventName(""); setNewEventTrack(""); setNewEventDate(""); setNewEventTime("");
            setActiveDialog(null);
            fetchData();
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    const handleUpdateEventStatus = async (eventId, status) => {
        try {
            await axios.put(`${API}/admin/events/${eventId}`, { status }, { headers: getAuthHeader() });
            toast.success("Status aktualisiert!");
            fetchData();
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    const handleDeleteEvent = async (eventId) => {
        try {
            await axios.delete(`${API}/admin/events/${eventId}`, { headers: getAuthHeader() });
            toast.success("Event gelöscht!");
            fetchData();
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    const handleShowQR = (event) => {
        const baseUrl = window.location.origin;
        setQrCodeUrl(`${API}/events/${event.slug}/qr?base_url=${encodeURIComponent(baseUrl)}`);
        setSelectedEvent(event);
        setActiveDialog('qr');
    };

    const copyEventUrl = (event) => {
        const url = `${window.location.origin}/event/${event.slug}`;
        navigator.clipboard.writeText(url);
        toast.success("URL kopiert!");
    };

    // Track Handlers
    const handleAddTrack = async () => {
        if (!newTrackName.trim() || !newTrackCountry.trim()) return;
        try {
            await axios.post(`${API}/admin/tracks`, {
                name: newTrackName,
                country: newTrackCountry,
                image_url: newTrackImage || null
            }, { headers: getAuthHeader() });
            toast.success("Strecke hinzugefügt!");
            setNewTrackName(""); setNewTrackCountry(""); setNewTrackImage("");
            fetchData();
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    const handleDeleteTrack = async (trackId) => {
        await axios.delete(`${API}/admin/tracks/${trackId}`, { headers: getAuthHeader() });
        fetchData();
    };

    // Lap Entry Handlers
    const handleAddLapEntry = async () => {
        if (!selectedEvent || !newDriverName.trim() || !newLapTime.trim()) {
            toast.error("Fahrername und Zeit erforderlich");
            return;
        }
        if (!/^\d{1,2}:\d{2}\.\d{1,3}$/.test(newLapTime)) {
            toast.error("Format: M:SS.mmm");
            return;
        }
        try {
            await axios.post(`${API}/admin/events/${selectedEvent.id}/laps`, {
                driver_name: newDriverName,
                team: newTeam || null,
                lap_time_display: newLapTime,
                email: showEmailField ? newEmail : null
            }, { headers: getAuthHeader() });
            toast.success("Rundenzeit hinzugefügt!");
            setNewDriverName(""); setNewTeam(""); setNewLapTime(""); setNewEmail("");
            fetchData();
            // Refresh selected event
            const res = await axios.get(`${API}/events/${selectedEvent.slug}`);
            setSelectedEvent(res.data);
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    const handleDeleteLapEntry = async (lapId) => {
        try {
            await axios.delete(`${API}/admin/events/${selectedEvent.id}/laps/${lapId}`, { headers: getAuthHeader() });
            toast.success("Eintrag gelöscht!");
            const res = await axios.get(`${API}/events/${selectedEvent.slug}`);
            setSelectedEvent(res.data);
            fetchData();
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    // Password Handler
    const handleChangePassword = async (isForced = false) => {
        if (newPassword !== confirmPassword) { toast.error("Passwörter stimmen nicht überein"); return; }
        if (newPassword.length < 4) { toast.error("Mindestens 4 Zeichen"); return; }
        try {
            await axios.put(`${API}/admin/password`, {
                current_password: isForced ? 'admin' : currentPassword,
                new_password: newPassword
            }, { headers: getAuthHeader() });
            toast.success("Passwort geändert!");
            if (isForced) clearPasswordFlag();
            setActiveDialog(null);
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
    };

    // Export Handler
    const handleExportCSV = (eventId) => {
        window.open(`${API}/admin/events/${eventId}/export/csv`, '_blank');
    };

    if (!isAuthenticated) return null;
    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]"><div className="spinner"></div></div>;

    const allEvents = [...events.active, ...events.scheduled, ...events.finished, ...events.archived];

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <Toaster position="top-right" />
            
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#333] px-4 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Settings size={24} className="text-[#FF1E1E]" />
                        <span className="font-bold text-lg">Admin Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[#A0A0A0] text-sm hidden sm:inline">{username}</span>
                        <Link to="/"><Button variant="outline" size="sm" className="border-[#333]"><Eye size={14} className="mr-1" /> Live</Button></Link>
                        <Button variant="outline" size="sm" className="border-[#333]" onClick={() => { logout(); navigate('/admin'); }}><LogOut size={14} /></Button>
                    </div>
                </div>
            </header>
            
            <main className="max-w-6xl mx-auto px-4 py-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <Button onClick={() => setActiveDialog('newEvent')} className="bg-[#FF1E1E] h-auto py-4 flex-col">
                        <Plus size={24} className="mb-1" />
                        <span>Neues Event</span>
                    </Button>
                    <Button onClick={() => setActiveDialog('tracks')} variant="outline" className="border-[#333] h-auto py-4 flex-col">
                        <MapPin size={24} className="mb-1" />
                        <span>Strecken</span>
                    </Button>
                    <Button onClick={() => setActiveDialog('design')} variant="outline" className="border-[#333] h-auto py-4 flex-col">
                        <Palette size={24} className="mb-1" />
                        <span>Design</span>
                    </Button>
                    <Button onClick={() => setActiveDialog('email')} variant="outline" className="border-[#333] h-auto py-4 flex-col">
                        <Mail size={24} className="mb-1" />
                        <span>E-Mail</span>
                    </Button>
                </div>
                
                {/* Events List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold">Events ({allEvents.length})</h2>
                    
                    {allEvents.length === 0 ? (
                        <div className="text-center py-12 bg-[#1A1A1A] rounded-lg border border-[#333]">
                            <Trophy size={48} className="mx-auto mb-4 text-[#333]" />
                            <p className="text-[#A0A0A0] mb-4">Noch keine Events erstellt</p>
                            <Button onClick={() => setActiveDialog('newEvent')} className="bg-[#FF1E1E]">
                                <Plus size={14} className="mr-1" /> Erstes Event erstellen
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {allEvents.map(event => (
                                <div key={event.id} className="bg-[#1A1A1A] rounded-lg border border-[#333] p-4">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={event.status} />
                                            <div>
                                                <h3 className="font-bold">{event.name}</h3>
                                                <p className="text-sm text-[#A0A0A0]">
                                                    {event.track?.name || 'Keine Strecke'} • {event.entry_count || 0} Teilnehmer
                                                    {event.scheduled_date && ` • ${event.scheduled_date}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Button size="sm" variant="outline" className="border-[#333]" onClick={() => { setSelectedEvent(event); setActiveDialog('eventDetail'); }}>
                                                <Edit2 size={14} className="mr-1" /> Verwalten
                                            </Button>
                                            <Button size="sm" variant="outline" className="border-[#333]" onClick={() => handleShowQR(event)}>
                                                <QrCode size={14} />
                                            </Button>
                                            <Button size="sm" variant="outline" className="border-[#333]" onClick={() => copyEventUrl(event)}>
                                                <Copy size={14} />
                                            </Button>
                                            <Select value={event.status} onValueChange={(v) => handleUpdateEventStatus(event.id, v)}>
                                                <SelectTrigger className="w-32 bg-[#0A0A0A] border-[#333]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="scheduled">Geplant</SelectItem>
                                                    <SelectItem value="active">Live</SelectItem>
                                                    <SelectItem value="finished">Beendet</SelectItem>
                                                    <SelectItem value="archived">Archiviert</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="outline" className="border-[#333] text-[#FF1E1E]"><Trash2 size={14} /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-[#1A1A1A] border-[#333]">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Event löschen?</AlertDialogTitle>
                                                        <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="border-[#333]">Abbrechen</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteEvent(event.id)} className="bg-[#FF1E1E]">Löschen</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Settings Footer */}
                <div className="mt-8 flex justify-center gap-3">
                    <Button variant="outline" size="sm" className="border-[#333]" onClick={() => setActiveDialog('password')}>
                        <Key size={14} className="mr-1" /> Passwort
                    </Button>
                </div>
            </main>
            
            {/* New Event Dialog */}
            <Dialog open={activeDialog === 'newEvent'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]">
                    <DialogHeader><DialogTitle><Plus size={18} className="inline mr-2" />Neues Event erstellen</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-[#A0A0A0] text-xs">Event Name *</Label>
                            <Input value={newEventName} onChange={(e) => setNewEventName(e.target.value)} placeholder="z.B. Monaco GP 2026" className="bg-[#0A0A0A] border-[#333]" />
                        </div>
                        <div>
                            <Label className="text-[#A0A0A0] text-xs">Strecke</Label>
                            <Select value={newEventTrack} onValueChange={setNewEventTrack}>
                                <SelectTrigger className="bg-[#0A0A0A] border-[#333]"><SelectValue placeholder="Strecke wählen..." /></SelectTrigger>
                                <SelectContent>
                                    {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}, {t.country}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-[#A0A0A0] text-xs">Datum</Label>
                                <Input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="bg-[#0A0A0A] border-[#333]" />
                            </div>
                            <div>
                                <Label className="text-[#A0A0A0] text-xs">Uhrzeit</Label>
                                <Input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} className="bg-[#0A0A0A] border-[#333]" />
                            </div>
                        </div>
                        <Button onClick={handleCreateEvent} className="w-full bg-[#FF1E1E]"><Plus size={14} className="mr-1" /> Event erstellen</Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Event Detail Dialog */}
            <Dialog open={activeDialog === 'eventDetail'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trophy size={18} />
                            {selectedEvent?.name}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedEvent && (
                        <Tabs defaultValue="entries" className="mt-4">
                            <TabsList className="grid grid-cols-3 bg-[#0A0A0A]">
                                <TabsTrigger value="entries">Zeiten</TabsTrigger>
                                <TabsTrigger value="settings">Einstellungen</TabsTrigger>
                                <TabsTrigger value="stats">Statistik</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="entries" className="space-y-4 mt-4">
                                {/* Add Entry Form */}
                                <div className="p-4 bg-[#0A0A0A] rounded-lg space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} placeholder="Fahrername *" className="bg-[#1A1A1A] border-[#333]" />
                                        <Input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="Team (optional)" className="bg-[#1A1A1A] border-[#333]" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Input value={newLapTime} onChange={(e) => setNewLapTime(e.target.value)} placeholder="Zeit: 1:23.456 *" className="bg-[#1A1A1A] border-[#333] flex-1" />
                                        <Button onClick={() => setShowEmailField(!showEmailField)} variant="outline" className={`border-[#333] ${showEmailField ? 'bg-[#FF1E1E]' : ''}`}>
                                            <Mail size={14} />
                                        </Button>
                                    </div>
                                    {showEmailField && (
                                        <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="E-Mail (für Benachrichtigung)" className="bg-[#1A1A1A] border-[#333]" />
                                    )}
                                    <Button onClick={handleAddLapEntry} className="w-full bg-[#FF1E1E]"><Plus size={14} className="mr-1" /> Hinzufügen</Button>
                                </div>
                                
                                {/* Entries List */}
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {selectedEvent.entries?.length === 0 ? (
                                        <p className="text-center text-[#A0A0A0] py-4">Noch keine Einträge</p>
                                    ) : (
                                        selectedEvent.entries?.map((entry, idx) => (
                                            <div key={entry.id} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded border border-[#333]">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-8 h-8 flex items-center justify-center rounded font-bold ${
                                                        idx === 0 ? 'bg-[#FFD700] text-black' :
                                                        idx === 1 ? 'bg-[#C0C0C0] text-black' :
                                                        idx === 2 ? 'bg-[#CD7F32] text-black' :
                                                        'bg-[#333] text-white'
                                                    }`}>{idx + 1}</span>
                                                    <div>
                                                        <div className="font-medium">{entry.driver_name}</div>
                                                        {entry.team && <div className="text-xs text-[#A0A0A0]">{entry.team}</div>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-[#FF1E1E]">{entry.lap_time_display}</span>
                                                    {entry.email && <Mail size={12} className="text-[#A0A0A0]" />}
                                                    <button onClick={() => handleDeleteLapEntry(entry.id)} className="text-[#A0A0A0] hover:text-[#FF1E1E]">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="settings" className="space-y-4 mt-4">
                                <div className="flex gap-2">
                                    <Button onClick={() => handleShowQR(selectedEvent)} variant="outline" className="border-[#333] flex-1">
                                        <QrCode size={14} className="mr-1" /> QR-Code
                                    </Button>
                                    <Button onClick={() => handleExportCSV(selectedEvent.id)} variant="outline" className="border-[#333] flex-1">
                                        <Download size={14} className="mr-1" /> CSV Export
                                    </Button>
                                </div>
                                <div className="p-3 bg-[#0A0A0A] rounded">
                                    <Label className="text-[#A0A0A0] text-xs">Event URL</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input value={`${window.location.origin}/event/${selectedEvent.slug}`} readOnly className="bg-[#1A1A1A] border-[#333] font-mono text-xs" />
                                        <Button onClick={() => copyEventUrl(selectedEvent)} variant="outline" className="border-[#333]"><Copy size={14} /></Button>
                                    </div>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="stats" className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 bg-[#0A0A0A] rounded text-center">
                                        <p className="text-2xl font-bold">{selectedEvent.entries?.length || 0}</p>
                                        <p className="text-[#A0A0A0] text-sm">Teilnehmer</p>
                                    </div>
                                    <div className="p-4 bg-[#0A0A0A] rounded text-center">
                                        <p className="text-2xl font-bold text-[#FFD700]">{selectedEvent.entries?.[0]?.lap_time_display || '-'}</p>
                                        <p className="text-[#A0A0A0] text-sm">Schnellste Zeit</p>
                                    </div>
                                </div>
                                <Button onClick={() => handleExportCSV(selectedEvent.id)} className="w-full bg-[#FF1E1E]">
                                    <BarChart3 size={14} className="mr-1" /> Statistik exportieren
                                </Button>
                            </TabsContent>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>
            
            {/* QR Code Dialog */}
            <Dialog open={activeDialog === 'qr'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]">
                    <DialogHeader><DialogTitle><QrCode size={18} className="inline mr-2" />QR-Code: {selectedEvent?.name}</DialogTitle></DialogHeader>
                    <div className="flex flex-col items-center gap-4">
                        {qrCodeUrl && (
                            <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 bg-white p-4 rounded-lg" />
                        )}
                        <p className="text-[#A0A0A0] text-sm text-center">
                            Scannen Sie den QR-Code, um direkt zum Event zu gelangen
                        </p>
                        <div className="flex gap-2 w-full">
                            <Button onClick={() => copyEventUrl(selectedEvent)} variant="outline" className="border-[#333] flex-1">
                                <Copy size={14} className="mr-1" /> URL kopieren
                            </Button>
                            <a href={qrCodeUrl} download={`${selectedEvent?.slug}-qr.png`} className="flex-1">
                                <Button variant="outline" className="border-[#333] w-full">
                                    <Download size={14} className="mr-1" /> Speichern
                                </Button>
                            </a>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Tracks Dialog */}
            <Dialog open={activeDialog === 'tracks'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]">
                    <DialogHeader><DialogTitle><MapPin size={18} className="inline mr-2" />Strecken verwalten</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Input value={newTrackName} onChange={(e) => setNewTrackName(e.target.value)} placeholder="Streckenname *" className="bg-[#0A0A0A] border-[#333]" />
                            <Input value={newTrackCountry} onChange={(e) => setNewTrackCountry(e.target.value)} placeholder="Land *" className="bg-[#0A0A0A] border-[#333]" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#A0A0A0] text-xs">Streckenbild</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={newTrackImage} 
                                    onChange={(e) => setNewTrackImage(e.target.value)} 
                                    placeholder="Bild-URL oder hochladen →" 
                                    className="bg-[#0A0A0A] border-[#333] flex-1" 
                                />
                                <input 
                                    id="track-image-upload"
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const url = await handleUploadImage(file);
                                            if (url) setNewTrackImage(url);
                                        }
                                        e.target.value = '';
                                    }}
                                />
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="border-[#333]" 
                                    disabled={uploadingImage}
                                    onClick={() => document.getElementById('track-image-upload')?.click()}
                                >
                                    {uploadingImage ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                </Button>
                            </div>
                            {newTrackImage && (
                                <div className="relative w-full h-24 rounded overflow-hidden border border-[#333]">
                                    <img src={newTrackImage} alt="Vorschau" className="w-full h-full object-cover" />
                                    <button onClick={() => setNewTrackImage("")} className="absolute top-1 right-1 p-1 bg-black/50 rounded"><X size={12} /></button>
                                </div>
                            )}
                        </div>
                        <Button onClick={handleAddTrack} className="w-full bg-[#FF1E1E]" disabled={!newTrackName.trim() || !newTrackCountry.trim()}>
                            <Plus size={14} className="mr-1" /> Strecke hinzufügen
                        </Button>
                        
                        {tracks.length > 0 && (
                            <div className="border-t border-[#333] pt-4">
                                <Label className="text-[#A0A0A0] text-xs mb-2 block">Vorhandene Strecken</Label>
                                <div className="space-y-2 max-h-48 overflow-auto">
                                    {tracks.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded border border-[#333]">
                                            <div className="flex items-center gap-3">
                                                {t.image_url ? (
                                                    <img src={t.image_url} alt={t.name} className="w-12 h-8 object-cover rounded" />
                                                ) : (
                                                    <div className="w-12 h-8 bg-[#333] rounded flex items-center justify-center"><MapPin size={14} /></div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-sm">{t.name}</div>
                                                    <div className="text-xs text-[#A0A0A0]">{t.country}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteTrack(t.id)} className="text-[#A0A0A0] hover:text-[#FF1E1E]"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Design Dialog */}
            <Dialog open={activeDialog === 'design'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-lg">
                    <DialogHeader><DialogTitle><Palette size={18} className="inline mr-2" />Design anpassen</DialogTitle></DialogHeader>
                    {design && <DesignEditor design={design} onSave={async (d) => {
                        await axios.put(`${API}/admin/design`, d, { headers: getAuthHeader() });
                        toast.success("Design gespeichert!");
                        fetchData();
                    }} onUpload={handleUploadImage} uploading={uploadingImage} />}
                </DialogContent>
            </Dialog>
            
            {/* Email Dialog */}
            <Dialog open={activeDialog === 'email'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-lg">
                    <DialogHeader><DialogTitle><Mail size={18} className="inline mr-2" />E-Mail Einstellungen</DialogTitle></DialogHeader>
                    <EmailEditor 
                        smtp={smtpSettings} 
                        template={emailTemplate}
                        onSaveSmtp={async (s) => {
                            await axios.put(`${API}/admin/smtp`, s, { headers: getAuthHeader() });
                            toast.success("SMTP gespeichert!");
                            fetchData();
                        }}
                        onTestSmtp={async (email) => {
                            try {
                                await axios.post(`${API}/admin/smtp/test`, { test_email: email }, { headers: getAuthHeader() });
                                toast.success("Test-E-Mail gesendet!");
                            } catch (error) { toast.error(error.response?.data?.detail || "Fehler"); }
                        }}
                        onSaveTemplate={async (t) => {
                            await axios.put(`${API}/admin/email-template`, t, { headers: getAuthHeader() });
                            toast.success("Template gespeichert!");
                            fetchData();
                        }}
                    />
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
            
            {/* Force Password Change Dialog */}
            <Dialog open={activeDialog === 'forcePassword'} onOpenChange={() => {}}>
                <DialogContent className="bg-[#1A1A1A] border-[#333]" onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-[#FF1E1E]"><Key size={18} className="inline mr-2" />Passwort ändern erforderlich!</DialogTitle>
                        <DialogDescription>Bitte ändern Sie das Standard-Passwort.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Neues Passwort" className="bg-[#0A0A0A] border-[#333]" />
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Bestätigen" className="bg-[#0A0A0A] border-[#333]" />
                        <Button onClick={() => handleChangePassword(true)} className="w-full bg-[#FF1E1E]" disabled={!newPassword || newPassword !== confirmPassword}>
                            <Check size={14} className="mr-1" /> Speichern
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ==================== DESIGN EDITOR ====================
const DesignEditor = ({ design, onSave, onUpload, uploading }) => {
    const [d, setD] = useState(design);
    const fileInputRef = useRef(null);
    const [uploadField, setUploadField] = useState(null);
    
    const handleUpload = async (file, field) => {
        if (!file || !onUpload) return;
        const url = await onUpload(file);
        if (url) setD({ ...d, [field]: url });
    };
    
    const ColorField = ({ label, value, onChange }) => (
        <div className="flex items-center gap-2">
            <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
            <span className="text-sm text-[#A0A0A0] flex-1">{label}</span>
        </div>
    );
    
    return (
        <Tabs defaultValue="title" className="mt-4">
            <TabsList className="grid grid-cols-3 bg-[#0A0A0A]">
                <TabsTrigger value="title">Titel</TabsTrigger>
                <TabsTrigger value="colors">Farben</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
            </TabsList>
            
            <TabsContent value="title" className="space-y-3 mt-4">
                <Input value={d.title_line1 || ''} onChange={(e) => setD({...d, title_line1: e.target.value})} placeholder="Zeile 1" className="bg-[#0A0A0A] border-[#333]" />
                <Input value={d.title_line2 || ''} onChange={(e) => setD({...d, title_line2: e.target.value})} placeholder="Zeile 2" className="bg-[#0A0A0A] border-[#333]" />
                <Input value={d.title_line3 || ''} onChange={(e) => setD({...d, title_line3: e.target.value})} placeholder="Zeile 3" className="bg-[#0A0A0A] border-[#333]" />
            </TabsContent>
            
            <TabsContent value="colors" className="space-y-3 mt-4">
                <ColorField label="Hintergrund" value={d.bg_color} onChange={(v) => setD({...d, bg_color: v})} />
                <ColorField label="Primärfarbe" value={d.primary_color} onChange={(v) => setD({...d, primary_color: v})} />
                <ColorField label="Akzentfarbe" value={d.accent_color} onChange={(v) => setD({...d, accent_color: v})} />
            </TabsContent>
            
            <TabsContent value="website" className="space-y-3 mt-4">
                <div>
                    <Label className="text-[#A0A0A0] text-xs">Browser Tab Titel</Label>
                    <Input value={d.site_title || ''} onChange={(e) => setD({...d, site_title: e.target.value})} placeholder="F1 Fast Lap Challenge" className="bg-[#0A0A0A] border-[#333]" />
                </div>
                <div>
                    <Label className="text-[#A0A0A0] text-xs">Hintergrundbild</Label>
                    <div className="flex gap-2">
                        <Input value={d.bg_image_url || ''} onChange={(e) => setD({...d, bg_image_url: e.target.value})} placeholder="URL oder hochladen" className="bg-[#0A0A0A] border-[#333] flex-1" />
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleUpload(e.target.files?.[0], uploadField); e.target.value = ''; }} />
                        <Button variant="outline" className="border-[#333]" disabled={uploading} onClick={() => { setUploadField('bg_image_url'); fileInputRef.current?.click(); }}>
                            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                        </Button>
                    </div>
                </div>
                <div>
                    <Label className="text-[#A0A0A0] text-xs">Favicon</Label>
                    <div className="flex gap-2">
                        <Input value={d.favicon_url || ''} onChange={(e) => setD({...d, favicon_url: e.target.value})} placeholder="URL oder hochladen" className="bg-[#0A0A0A] border-[#333] flex-1" />
                        <Button variant="outline" className="border-[#333]" disabled={uploading} onClick={() => { setUploadField('favicon_url'); fileInputRef.current?.click(); }}>
                            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                        </Button>
                    </div>
                </div>
            </TabsContent>
            
            <Button onClick={() => onSave(d)} className="w-full bg-[#FF1E1E] mt-4"><Check size={14} className="mr-1" /> Speichern</Button>
        </Tabs>
    );
};

// ==================== EMAIL EDITOR ====================
const EmailEditor = ({ smtp, template, onSaveSmtp, onTestSmtp, onSaveTemplate }) => {
    const [s, setS] = useState(smtp || { host: '', port: 587, username: '', password: '', from_email: '', from_name: '', enabled: false });
    const [t, setT] = useState(template || { subject: '', body_html: '', custom_footer: '', send_on_finish: true });
    const [testEmail, setTestEmail] = useState('');
    
    return (
        <Tabs defaultValue="smtp" className="mt-4">
            <TabsList className="grid grid-cols-2 bg-[#0A0A0A]">
                <TabsTrigger value="smtp">SMTP</TabsTrigger>
                <TabsTrigger value="template">Template</TabsTrigger>
            </TabsList>
            
            <TabsContent value="smtp" className="space-y-3 mt-4">
                <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded">
                    <span>SMTP aktivieren</span>
                    <Switch checked={s.enabled} onCheckedChange={(v) => setS({...s, enabled: v})} />
                </div>
                {s.enabled && <>
                    <div className="grid grid-cols-[2fr_1fr] gap-2">
                        <Input value={s.host} onChange={(e) => setS({...s, host: e.target.value})} placeholder="SMTP Host" className="bg-[#0A0A0A] border-[#333]" />
                        <Input type="number" value={s.port} onChange={(e) => setS({...s, port: parseInt(e.target.value)})} placeholder="Port" className="bg-[#0A0A0A] border-[#333]" />
                    </div>
                    <Input value={s.username} onChange={(e) => setS({...s, username: e.target.value})} placeholder="Benutzername" className="bg-[#0A0A0A] border-[#333]" />
                    <Input type="password" value={s.password} onChange={(e) => setS({...s, password: e.target.value})} placeholder="Passwort" className="bg-[#0A0A0A] border-[#333]" />
                    <Input value={s.from_email} onChange={(e) => setS({...s, from_email: e.target.value})} placeholder="Absender E-Mail" className="bg-[#0A0A0A] border-[#333]" />
                    <Button onClick={() => onSaveSmtp(s)} className="w-full bg-[#FF1E1E]"><Check size={14} className="mr-1" /> Speichern</Button>
                    <div className="border-t border-[#333] pt-3">
                        <Label className="text-[#A0A0A0] text-xs">Test E-Mail</Label>
                        <div className="flex gap-2 mt-1">
                            <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" className="bg-[#0A0A0A] border-[#333] flex-1" />
                            <Button onClick={() => onTestSmtp(testEmail)} variant="outline" className="border-[#333]" disabled={!testEmail}><Send size={14} /></Button>
                        </div>
                    </div>
                </>}
            </TabsContent>
            
            <TabsContent value="template" className="space-y-3 mt-4">
                <Input value={t.subject} onChange={(e) => setT({...t, subject: e.target.value})} placeholder="E-Mail Betreff" className="bg-[#0A0A0A] border-[#333]" />
                <Textarea value={t.body_html} onChange={(e) => setT({...t, body_html: e.target.value})} placeholder="HTML Body" rows={6} className="bg-[#0A0A0A] border-[#333] font-mono text-xs" />
                <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded">
                    <span className="text-sm">Auto-senden bei "Beendet"</span>
                    <Switch checked={t.send_on_finish} onCheckedChange={(v) => setT({...t, send_on_finish: v})} />
                </div>
                <Button onClick={() => onSaveTemplate(t)} className="w-full bg-[#FF1E1E]"><Check size={14} className="mr-1" /> Speichern</Button>
            </TabsContent>
        </Tabs>
    );
};

// ==================== APP ====================
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<EventsOverview />} />
                <Route path="/event/:slug" element={<EventPage />} />
                <Route path="/admin" element={<LoginPage />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
