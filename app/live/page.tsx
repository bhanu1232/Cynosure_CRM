'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';

// ─── Separate access key just for this live board ───────────────────────────
const LIVE_ACCESS_KEY = 'CYNO_LIVE_2026';
const LIVE_KEY_STORAGE = 'cyno_live_access';
// ────────────────────────────────────────────────────────────────────────────

// Unified record type covering both collections
interface LiveRecord {
    id: string;
    source: 'hackathon' | 'general'; // which collection

    // General registration fields
    name?: string;
    email?: string;
    mobile?: string;
    collegeName?: string;
    uid?: string;
    totalAmount?: number;
    paymentId?: string;
    date?: string;
    verifiedAt?: string;

    // Hackathon / separate registration fields
    event?: string;
    eventId?: string;
    registrationType?: string;
    teamName?: string;
    leaderName?: string;
    leaderEmail?: string;
    leaderPhone?: string;
    participants?: string[];
    fee?: number;
    status?: string;
}

// ── Access Gate ──────────────────────────────────────────────────────────────
function AccessGate({ onUnlock }: { onUnlock: () => void }) {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);

    // Override body overflow so the page can scroll (globals.css sets overflow:hidden)
    useEffect(() => {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() === LIVE_ACCESS_KEY) {
            localStorage.setItem(LIVE_KEY_STORAGE, LIVE_ACCESS_KEY);
            onUnlock();
        } else {
            setError('Invalid access key. Please try again.');
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',sans-serif", padding: 24 }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
                @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.5)}50%{box-shadow:0 0 0 14px rgba(99,102,241,0)}}
            `}</style>
            <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '48px 40px', animation: shaking ? 'shake 0.5s ease' : undefined }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 18, margin: '0 auto 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'glow 2s infinite' }}>
                        <svg width="34" height="34" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 style={{ color: 'white', fontWeight: 800, fontSize: 26, margin: '0 0 8px', letterSpacing: '-0.5px' }}>Live Registrations</h1>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Enter the access key to view<br />Cynosure 2026 live registrations</p>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <input
                        type="password" value={input} onChange={e => { setInput(e.target.value); setError(''); }}
                        placeholder="Enter access key..." autoFocus
                        style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: `1px solid ${error ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 12, padding: '14px 18px', color: 'white', fontSize: 15, boxSizing: 'border-box', letterSpacing: 2 }}
                    />
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
                            {error}
                        </div>
                    )}
                    <button type="submit" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, padding: '14px', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                        Access Live Board →
                    </button>
                </form>
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 28 }}>Cynosure 2026 · Registration Board</p>
            </div>
        </div>
    );
}

// ── Live Board ───────────────────────────────────────────────────────────────
function LiveBoard() {
    const [records, setRecords] = useState<LiveRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadedCount, setLoadedCount] = useState(0); // track how many listeners are ready
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [newIds, setNewIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterEvent, setFilterEvent] = useState('all');
    const [activeTab, setActiveTab] = useState<'all' | 'hackathon' | 'general'>('all');

    const prevIdsRef = useRef<Set<string>>(new Set());
    const hackathonRef = useRef<LiveRecord[]>([]);
    const generalRef = useRef<LiveRecord[]>([]);
    const [, setTick] = useState(0);

    // Override body overflow so the live page scrolls (globals.css sets overflow:hidden)
    useEffect(() => {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const mergeAndUpdate = (hackathon: LiveRecord[], general: LiveRecord[]) => {
        const merged = [...hackathon, ...general].sort((a, b) => {
            const ta = a.verifiedAt ? new Date(a.verifiedAt).getTime() : (a.date ? new Date(a.date).getTime() : 0);
            const tb = b.verifiedAt ? new Date(b.verifiedAt).getTime() : (b.date ? new Date(b.date).getTime() : 0);
            return tb - ta;
        });

        const currentIds = new Set(merged.map(r => r.id));
        const incomingNew = new Set<string>();
        currentIds.forEach(id => {
            if (!prevIdsRef.current.has(id) && prevIdsRef.current.size > 0) incomingNew.add(id);
        });
        prevIdsRef.current = currentIds;

        if (incomingNew.size > 0) {
            setNewIds(incomingNew);
            setTimeout(() => setNewIds(new Set()), 5000);
        }

        setRecords(merged);
        setLastUpdated(new Date());
    };

    // Listener 1 — successSeparateRegistrations (hackathon / paper / ideathon)
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'successSeparateRegistrations')), snapshot => {
            hackathonRef.current = snapshot.docs.map(docSnap => {
                const d = docSnap.data();
                return {
                    ...d,
                    id: `sep_${docSnap.id}`,
                    source: 'hackathon' as const,
                    name: d.leaderName || d.name || 'Unknown',
                    leaderName: d.leaderName || d.name || 'Unknown',
                    participants: Array.isArray(d.participants) ? d.participants : [],
                } as LiveRecord;
            });
            setLoadedCount(c => c + 1);
            mergeAndUpdate(hackathonRef.current, generalRef.current);
        });
        return () => unsub();
    }, []);

    // Listener 2 — successRegistrations (general event registrations)
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'successRegistrations')), snapshot => {
            generalRef.current = snapshot.docs.map(docSnap => {
                const d = docSnap.data();
                return {
                    ...d,
                    id: `gen_${docSnap.id}`,
                    source: 'general' as const,
                    event: 'General Registration',
                    registrationType: 'individual',
                } as LiveRecord;
            });
            setLoadedCount(c => c + 1);
            mergeAndUpdate(hackathonRef.current, generalRef.current);
        });
        return () => unsub();
    }, []);

    // Mark loading done after both listeners fire at least once
    useEffect(() => {
        if (loadedCount >= 2) setLoading(false);
    }, [loadedCount]);

    const formatDate = (ts: any) => {
        if (!ts) return '—';
        const d = ts?.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const timeSince = (date: Date | null) => {
        if (!date) return '';
        const s = Math.floor((Date.now() - date.getTime()) / 1000);
        if (s < 5) return 'just now';
        if (s < 60) return `${s}s ago`;
        return `${Math.floor(s / 60)}m ago`;
    };

    // Stats
    const hackathonRecords = records.filter(r => r.source === 'hackathon');
    const generalRecords = records.filter(r => r.source === 'general');
    const totalParticipants = hackathonRecords.reduce((a, r) => a + (r.participants?.length || 0) + 1, 0) + generalRecords.length;

    // Unique events for filter
    const eventOptions = ['all', ...Array.from(new Set(records.map(r => r.event || 'Hackathon').filter(Boolean)))];

    // Active tab filter
    const tabFiltered = records.filter(r => {
        if (activeTab === 'hackathon') return r.source === 'hackathon';
        if (activeTab === 'general') return r.source === 'general';
        return true;
    });

    // Search + event filter
    const filtered = tabFiltered.filter(r => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q ||
            (r.name || '').toLowerCase().includes(q) ||
            (r.teamName || '').toLowerCase().includes(q) ||
            (r.leaderName || '').toLowerCase().includes(q) ||
            (r.collegeName || '').toLowerCase().includes(q) ||
            (r.participants || []).some(p => p.toLowerCase().includes(q)) ||
            (r.event || '').toLowerCase().includes(q);
        const matchEvent = filterEvent === 'all' || (r.event || 'General Registration') === filterEvent;
        return matchSearch && matchEvent;
    });

    const handleLogout = () => {
        localStorage.removeItem(LIVE_KEY_STORAGE);
        window.location.reload();
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)', fontFamily: "'Inter',sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                @keyframes fadeUp{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
                @keyframes glowGreen{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.5)}50%{box-shadow:0 0 0 8px rgba(74,222,128,0)}}
                @keyframes newRow{0%{background:rgba(74,222,128,0.18)}100%{background:transparent}}
                @keyframes spin{to{transform:rotate(360deg)}}
                .new-entry{animation:newRow 5s ease-out forwards,fadeUp 0.4s ease-out}
                ::-webkit-scrollbar{width:5px}
                ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:3px}
                input:focus,select:focus{outline:none}
                select{appearance:none}
                input::placeholder{color:rgba(255,255,255,0.3)}
            `}</style>

            {/* ── Header ── */}
            <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(15,12,41,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px' }}>
                <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 66 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>Cynosure 2026</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Live Registrations Board</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>Last updated</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500 }}>{timeSince(lastUpdated)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: 20, padding: '5px 13px', animation: 'glowGreen 2s infinite' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }}></div>
                            <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 700 }}>LIVE</span>
                        </div>
                        <button onClick={handleLogout} title="Sign out" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}>
                            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 24px 60px' }}>

                {/* ── Stats ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 28 }}>
                    {[
                        { label: 'Hackathon / Events', value: hackathonRecords.length, emoji: '💻', color: '#8b5cf6' },
                        { label: 'General', value: generalRecords.length, emoji: '🎫', color: '#a78bfa' },
                    ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: 26 }}>{s.emoji}</span>
                            <div>
                                <div style={{ color: 'white', fontWeight: 800, fontSize: 28, lineHeight: 1 }}>{s.value}</div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Tabs ── */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 5, width: 'fit-content' }}>
                    {([
                        { key: 'all', label: `All (${records.length})` },
                        { key: 'hackathon', label: `Hackathon / Events (${hackathonRecords.length})` },
                        { key: 'general', label: `General (${generalRecords.length})` },
                    ] as { key: typeof activeTab; label: string }[]).map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: activeTab === tab.key ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent', color: activeTab === tab.key ? 'white' : 'rgba(255,255,255,0.45)' }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Search + Filter ── */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
                        <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', opacity: 0.35 }} width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input type="text" placeholder="Search by name, team, college, event or member..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '11px 16px 11px 40px', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    {activeTab !== 'general' && (
                        <div style={{ position: 'relative' }}>
                            <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '11px 36px 11px 14px', color: 'white', fontSize: 13, minWidth: 160 }}>
                                {eventOptions.map(ev => <option key={ev} value={ev} style={{ background: '#1a1740' }}>{ev === 'all' ? 'All Events' : ev}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.4 }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    )}
                    <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>
                        Showing <strong style={{ color: 'white' }}>{filtered.length}</strong> of {records.length}
                    </div>
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                        <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Connecting to live data...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 42, marginBottom: 12 }}>🔍</div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>No registrations found.</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map((rec, i) => (
                            <div key={rec.id} className={newIds.has(rec.id) ? 'new-entry' : ''}
                                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 20px', display: 'grid', gridTemplateColumns: '36px auto 1fr 1fr', gap: 16, alignItems: 'start', transition: 'background 0.15s', cursor: 'default' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>

                                {/* Index */}
                                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, paddingTop: 2 }}>{i + 1}</div>

                                {/* Source Badge */}
                                <div style={{ paddingTop: 2 }}>
                                    {rec.source === 'hackathon' ? (
                                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                            {rec.event || 'Hackathon'}
                                        </span>
                                    ) : (
                                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                            General
                                        </span>
                                    )}
                                    {rec.source === 'hackathon' && rec.registrationType && (
                                        <div style={{ marginTop: 5 }}>
                                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 600, background: 'rgba(168,85,247,0.2)', color: '#d8b4fe', textTransform: 'capitalize' }}>
                                                {rec.registrationType}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Name / Team Info */}
                                <div>
                                    {rec.source === 'hackathon' ? (
                                        <>
                                            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{rec.teamName || rec.leaderName || '—'}</div>
                                            {rec.teamName && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>Leader: {rec.leaderName}</div>}
                                            {rec.participants && rec.participants.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                                                    {rec.participants.map((m, idx) => (
                                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ width: 15, height: 15, borderRadius: '50%', background: 'rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#c4b5fd', fontWeight: 700, flexShrink: 0 }}>{idx + 1}</div>
                                                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{m}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{rec.name || '—'}</div>
                                    )}
                                </div>

                                {/* College + Verified */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', textAlign: 'right' }}>
                                    {rec.collegeName && (
                                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, maxWidth: 240 }}>{rec.collegeName}</div>
                                    )}
                                    {rec.uid && (
                                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontFamily: 'monospace' }}>
                                            UID: {rec.uid}
                                        </span>
                                    )}
                                    <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 2 }}>
                                        {formatDate(rec.verifiedAt || rec.date)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', paddingBottom: 32, color: 'rgba(255,255,255,0.18)', fontSize: 11 }}>
                🔴 Live · Cynosure 2026 Registration Board · Auto-updates without refresh
            </div>
        </div>
    );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function LivePage() {
    const [unlocked, setUnlocked] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem(LIVE_KEY_STORAGE);
        if (stored === LIVE_ACCESS_KEY) setUnlocked(true);
        setChecking(false);
    }, []);

    if (checking) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    return unlocked ? <LiveBoard /> : <AccessGate onUnlock={() => setUnlocked(true)} />;
}
