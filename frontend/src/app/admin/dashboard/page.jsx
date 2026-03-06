'use client'
import { useState, useEffect, useRef } from 'react'
import { api, formatViews, videoUrl } from '@/lib/api'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ─── helpers ─────────────────────────────────────────────────
function xhrUpload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => onProgress(Math.round((e.loaded / e.total) * 100))
        xhr.onload = () => {
            const res = JSON.parse(xhr.responseText)
            if (xhr.status >= 200 && xhr.status < 300) resolve(res)
            else reject(new Error(res.error || 'Upload failed'))
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.open('POST', url)
        xhr.withCredentials = true
        xhr.send(formData)
    })
}

const tabStyle = (active) => ({
    padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    borderRadius: 6, background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)', border: 'none', whiteSpace: 'nowrap'
})

const inputStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 6, padding: '8px 12px',
    fontSize: 13, width: '100%', outline: 'none'
}

// ─── TABS ────────────────────────────────────────────────────

function TabVideos({ genres }) {
    const [videos, setVideos] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    async function load() {
        const params = new URLSearchParams({ page, ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}) })
        const d = await fetch(`${API}/api/admin/videos?${params}`, { credentials: 'include' }).then(r => r.json())
        setVideos(d.videos || [])
        setTotal(d.total || 0)
    }
    useEffect(() => { load() }, [page, search, statusFilter])

    async function del(id) {
        if (!confirm('Delete?')) return
        await fetch(`${API}/api/admin/videos/${id}`, { method: 'DELETE', credentials: 'include' })
        load()
    }

    return (
        <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input placeholder="Search title..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ ...inputStyle, maxWidth: 260 }} />
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ ...inputStyle, maxWidth: 140 }}>
                    <option value="">All status</option>
                    <option value="ready">Ready</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: '36px' }}>{total} total</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            {['Thumb', 'Code', 'Title', 'Genre', 'Tags', 'Views', 'Status', ''].map(h => (
                                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {videos?.map(v => (
                            <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px 10px' }}>
                                    <div style={{ width: 60, borderRadius: 4, overflow: 'hidden', aspectRatio: '16/9', background: '#111' }}>
                                        <img src={videoUrl(v.thumbnailPath)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    </div>
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--accent)', fontFamily: 'monospace', fontSize: 11 }}>{v.code || '—'}</td>
                                <td style={{ padding: '8px 10px', maxWidth: 200, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{v.title}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{v.genre?.name}</td>
                                <td style={{ padding: '8px 10px' }}>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {v.tags?.slice(0, 3).map(vt => (
                                            <span key={vt.tag.id} style={{ fontSize: 10, background: 'rgba(124,58,237,0.15)', color: 'var(--accent)', padding: '2px 5px', borderRadius: 3 }}>
                                                {vt.tag.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{formatViews(v.viewsCount)}</td>
                                <td style={{ padding: '8px 10px' }}>
                                    <span className={`badge-${v.status}`}>{v.status}</span>
                                </td>
                                <td style={{ padding: '8px 10px' }}>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Link href={`/watch/${v.id}`} target="_blank" style={{ color: 'var(--accent)', fontSize: 11 }}>Watch</Link>
                                        <button onClick={() => del(v.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>Del</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', fontSize: 12 }}>← Prev</button>
                <span style={{ color: 'var(--text-muted)', lineHeight: '32px', fontSize: 12 }}>Page {page}</span>
                <button className="btn-secondary" disabled={videos.length < 20} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', fontSize: 12 }}>Next →</button>
            </div>
        </div>
    )
}

function TabFileUpload({ genres }) {
    const [form, setForm] = useState({ title: '', genreId: '', description: '', code: '', tags: '', actors: '', isAdult: false })
    const [progress, setProgress] = useState(null)
    const [msg, setMsg] = useState('')
    const fileRef = useRef()

    async function submit(e) {
        e.preventDefault()
        if (!fileRef.current?.files[0]) return setMsg('Select a file first')
        setMsg('')
        const fd = new FormData()
        fd.append('file', fileRef.current.files[0])
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        try {
            await xhrUpload(`${API}/api/admin/videos/upload`, fd, setProgress)
            setMsg('✅ Upload complete! Processing in background...')
            setProgress(null)
            setForm({ title: '', genreId: '', description: '', code: '', tags: '', actors: '', isAdult: false })
            fileRef.current.value = ''
        } catch (err) { setMsg(`❌ ${err.message}`) }
    }

    return (
        <form onSubmit={submit} style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msg && <div style={{ padding: '8px 12px', borderRadius: 6, background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', fontSize: 13 }}>{msg}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TITLE *</label>
                    <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>VIDEO CODE</label>
                    <input style={inputStyle} placeholder="e.g. SSIS-001" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>GENRE *</label>
                    <select style={inputStyle} value={form.genreId} onChange={e => setForm(f => ({ ...f, genreId: e.target.value }))} required>
                        <option value="">Select genre</option>
                        {genres?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={form.isAdult} onChange={e => setForm(f => ({ ...f, isAdult: e.target.checked }))} />
                        🔞 Adult Content
                    </label>
                </div>
            </div>
            <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TAGS (comma separated)</label>
                <input style={inputStyle} placeholder="creampie, big tits, amateur" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>ACTORS/MODELS (comma separated)</label>
                <input style={inputStyle} placeholder="Yua Mikami, Eimi Fukada" value={form.actors} onChange={e => setForm(f => ({ ...f, actors: e.target.value }))} />
            </div>
            <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>DESCRIPTION</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '20px', textAlign: 'center' }}>
                <input ref={fileRef} type="file" accept="video/*" style={{ cursor: 'pointer', fontSize: 13 }} />
            </div>
            {progress !== null && (
                <div>
                    <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
                        <div style={{ background: 'var(--accent)', borderRadius: 4, height: 6, width: `${progress}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{progress}% uploading...</div>
                </div>
            )}
            <button type="submit" className="btn-primary">Upload & Process</button>
        </form>
    )
}

function TabUrlImport({ genres }) {
    const [url, setUrl] = useState('')
    const [form, setForm] = useState({ title: '', genreId: '', code: '', tags: '', actors: '', isAdult: false })
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')

    async function submit(e) {
        e.preventDefault()
        setLoading(true); setMsg('')
        try {
            const r = await fetch(`${API}/api/admin/videos/import-url`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url, ...form,
                    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
                    actors: form.actors.split(',').map(a => a.trim()).filter(Boolean)
                })
            })
            const d = await r.json()
            setMsg(`✅ Queued! Video ID: ${d.id} — downloading in background`)
            setUrl(''); setForm({ title: '', genreId: '', code: '', tags: '', actors: '', isAdult: false })
        } catch (err) { setMsg(`❌ ${err.message}`) }
        setLoading(false)
    }

    return (
        <form onSubmit={submit} style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                💡 Paste any direct video URL or supported site URL. Uses <strong>yt-dlp</strong> to download automatically. Video processes in background — check Videos tab for status.
            </div>
            {msg && <div style={{ padding: '8px 12px', borderRadius: 6, background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', fontSize: 13 }}>{msg}</div>}
            <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>VIDEO URL *</label>
                <input style={inputStyle} placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TITLE *</label>
                    <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>VIDEO CODE</label>
                    <input style={inputStyle} placeholder="SSIS-001" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>GENRE *</label>
                    <select style={inputStyle} value={form.genreId} onChange={e => setForm(f => ({ ...f, genreId: e.target.value }))} required>
                        <option value="">Select</option>
                        {genres?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                    <label style={{ display: 'flex', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={form.isAdult} onChange={e => setForm(f => ({ ...f, isAdult: e.target.checked }))} />
                        🔞 Adult Content
                    </label>
                </div>
            </div>
            <input style={inputStyle} placeholder="Tags: creampie, amateur, teen (comma separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            <input style={inputStyle} placeholder="Actors: Actor Name, Another Name (comma separated)" value={form.actors} onChange={e => setForm(f => ({ ...f, actors: e.target.value }))} />
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Queuing...' : '⬇ Import from URL'}</button>
        </form>
    )
}

function TabBatchImport({ genres }) {
    const [csv, setCsv] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)

    const EXAMPLE = `url,title,genreName,code,tags,actors,isAdult
https://example.com/video1.mp4,Hot Video Title,Action,CODE-001,tag1;tag2,Actor Name,false
https://example.com/video2.mp4,Another Video,Drama,,tag3,Actor2;Actor3,true`

    async function submit(e) {
        e.preventDefault()
        if (!csv.trim()) return
        setLoading(true); setResult(null)
        try {
            const lines = csv.trim().split('\n').filter(Boolean)
            const headers = lines[0].split(',').map(h => h.trim())
            const rows = lines.slice(1).map(line => {
                const vals = line.split(',')
                return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').trim()]))
            })
            const r = await fetch(`${API}/api/admin/videos/batch-import`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows })
            })
            setResult(await r.json())
        } catch (err) { setResult({ error: err.message }) }
        setLoading(false)
    }

    return (
        <div style={{ maxWidth: 760 }}>
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 14 }}>
                💡 <strong>Bulk Import up to 500 videos at once.</strong> Paste CSV with headers. Tags and actors use <code>;</code> as separator. All downloads queue in background — check Videos tab.
            </div>
            <div style={{ marginBottom: 10 }}>
                <button onClick={() => setCsv(EXAMPLE)} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Load example CSV →
                </button>
            </div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <textarea
                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, resize: 'vertical' }}
                    rows={12}
                    placeholder={EXAMPLE}
                    value={csv}
                    onChange={e => setCsv(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'fit-content' }}>
                    {loading ? 'Importing...' : `🚀 Batch Import ${csv.trim().split('\n').length - 1 || 0} Videos`}
                </button>
            </form>
            {result && (
                <div style={{ marginTop: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                    {result.error
                        ? <div style={{ color: 'var(--danger)' }}>❌ {result.error}</div>
                        : <>
                            <div style={{ color: 'var(--success)', marginBottom: 8 }}>✅ Queued: {result.queued} videos</div>
                            {result.errors?.length > 0 && (
                                <div style={{ color: 'var(--danger)', fontSize: 12 }}>❌ {result.errors.length} errors:
                                    {result.errors.map((e, i) => <div key={i} style={{ marginTop: 4 }}>{e.error}</div>)}
                                </div>
                            )}
                        </>
                    }
                </div>
            )}
        </div>
    )
}

function TabTaxonomy({ genres, reload }) {
    const [newGenre, setNewGenre] = useState({ name: '', isAdult: false })
    const [tags, setTags] = useState([])
    const [actors, setActors] = useState([])

    useEffect(() => {
        fetch(`${API}/api/admin/tags`, { credentials: 'include' }).then(r => r.json()).then(setTags)
        fetch(`${API}/api/admin/actors`, { credentials: 'include' }).then(r => r.json()).then(setActors)
    }, [])

    async function addGenre(e) {
        e.preventDefault()
        await fetch(`${API}/api/admin/genres`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newGenre) })
        setNewGenre({ name: '', isAdult: false }); reload()
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Genres */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Genres ({genres.length})</h3>
                <form onSubmit={addGenre} style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Genre name" value={newGenre.name} onChange={e => setNewGenre(f => ({ ...f, name: e.target.value }))} required />
                    <label style={{ display: 'flex', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={newGenre.isAdult} onChange={e => setNewGenre(f => ({ ...f, isAdult: e.target.checked }))} /> 🔞
                    </label>
                    <button type="submit" className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>Add</button>
                </form>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {genres?.map(g => (
                        <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                            <span>{g.name} {g.isAdult && '🔞'}</span>
                            <span style={{ color: 'var(--text-muted)' }}>/{g.slug}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tags */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Tags ({tags.length})</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Tags are auto-created when you upload videos. They appear here automatically.</p>
                <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tags?.map(t => (
                        <span key={t.id} style={{ fontSize: 11, background: 'rgba(124,58,237,0.15)', color: 'var(--accent)', padding: '3px 8px', borderRadius: 4 }}>
                            {t.name}
                        </span>
                    ))}
                </div>
                <h3 style={{ margin: '16px 0 8px', fontSize: 14, fontWeight: 700 }}>Actors/Models ({actors.length})</h3>
                <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {actors?.map(a => (
                        <span key={a.id} style={{ fontSize: 11, background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '3px 8px', borderRadius: 4 }}>
                            {a.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────

export default function AdminDashboard() {
    const [tab, setTab] = useState('videos')
    const [genres, setGenres] = useState([])
    const [analytics, setAnalytics] = useState(null)
    const [ads, setAds] = useState({})

    async function loadGenres() {
        const d = await fetch(`${API}/api/admin/genres`, { credentials: 'include' }).then(r => r.json())
        setGenres(d || [])
    }

    useEffect(() => {
        fetch(`${API}/api/auth/me`, { credentials: 'include' })
            .then(r => { if (!r.ok) window.location.href = '/admin' })
        loadGenres()
        fetch(`${API}/api/admin/analytics`, { credentials: 'include' }).then(r => r.json()).then(setAnalytics)
        fetch(`${API}/api/admin/ads`, { credentials: 'include' }).then(r => r.json()).then(setAds)
    }, [])

    async function saveAds(e) {
        e.preventDefault()
        await fetch(`${API}/api/admin/ads`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ads) })
        alert('Ad config saved!')
    }

    const TABS = [
        { id: 'videos', label: '🎬 Videos' },
        { id: 'upload', label: '⬆ File Upload' },
        { id: 'urlimport', label: '🔗 URL Import' },
        { id: 'batch', label: '🚀 Batch CSV' },
        { id: 'taxonomy', label: '🏷 Genres/Tags' },
        { id: 'analytics', label: '📊 Analytics' },
        { id: 'ads', label: '💰 Ads' },
    ]

    return (
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Admin Dashboard
                </h1>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 12 }}>← View Site</Link>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}
                        onClick={() => fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' }).then(() => window.location.href = '/admin')}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Stats */}
            {analytics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                    {[
                        { label: 'Total Views', value: formatViews(analytics.totalViews) },
                        { label: 'Top Video', value: analytics.topVideos?.[0]?.title?.slice(0, 20) + '...' || '—' },
                        { label: 'Today', value: `${analytics.dailyTraffic?.[analytics.dailyTraffic.length - 1]?._sum?.views || 0} views` },
                        { label: 'Upload Queue', value: 'Live' }
                    ].map(c => (
                        <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ fontSize: 20, fontWeight: 800 }}>{c.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 6, borderRadius: 8, border: '1px solid var(--border)', overflowX: 'auto' }}>
                {TABS.map(t => (
                    <button key={t.id} style={tabStyle(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
                {tab === 'videos' && <TabVideos genres={genres} />}
                {tab === 'upload' && <TabFileUpload genres={genres} />}
                {tab === 'urlimport' && <TabUrlImport genres={genres} />}
                {tab === 'batch' && <TabBatchImport genres={genres} />}
                {tab === 'taxonomy' && <TabTaxonomy genres={genres} reload={loadGenres} />}

                {tab === 'analytics' && analytics && (
                    <div>
                        <h2 style={{ marginTop: 0, fontSize: 15 }}>Top 10 Videos</h2>
                        {analytics.topVideos?.map((v, i) => (
                            <div key={v.id} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-muted)', width: 18, textAlign: 'right' }}>{i + 1}</span>
                                <img src={videoUrl(v.thumbnailPath)} alt="" style={{ width: 44, borderRadius: 3, aspectRatio: '16/9', objectFit: 'cover' }} />
                                <span style={{ flex: 1 }}>{v.title}</span>
                                <span style={{ color: 'var(--accent)' }}>{formatViews(v.viewsCount)}</span>
                            </div>
                        ))}
                        <h2 style={{ fontSize: 15, marginTop: 24 }}>Daily Traffic</h2>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                            {analytics.dailyTraffic?.map((d, i) => {
                                const max = Math.max(...analytics.dailyTraffic.map(x => x._sum.views || 0), 1)
                                return <div key={i} style={{ flex: 1, background: 'var(--accent)', borderRadius: '2px 2px 0 0', height: `${Math.max(4, ((d._sum.views || 0) / max) * 100)}%`, opacity: 0.75 }} title={`${d._sum.views} views`} />
                            })}
                        </div>
                    </div>
                )}

                {tab === 'ads' && (
                    <form onSubmit={saveAds} style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                            { key: 'preRollVast', label: '🎬 Pre-Roll VAST URL', ph: 'https://ads.exoclick.com/vast?...', ta: false },
                            { key: 'topBanner', label: '📣 Top Banner HTML', ph: '<script src="..."></script>', ta: true },
                            { key: 'inlineBanner', label: '📊 Grid Inline Banner HTML', ph: '<ins class="...">...</ins>', ta: true },
                            { key: 'sidebarBanner', label: '📌 Sidebar Banner HTML', ph: '<ins ...>...</ins>', ta: true },
                            { key: 'footerBanner', label: '🦶 Footer Banner HTML', ph: '<ins ...>...</ins>', ta: true },
                            { key: 'popunderScript', label: '💥 Popunder Script', ph: '<script>...</script>', ta: true },
                        ].map(f => (
                            <div key={f.key}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</label>
                                {f.ta
                                    ? <textarea rows={2} style={{ ...inputStyle, resize: 'vertical', fontSize: 11, fontFamily: 'monospace' }} placeholder={f.ph} value={ads[f.key] || ''} onChange={e => setAds(a => ({ ...a, [f.key]: e.target.value }))} />
                                    : <input style={inputStyle} placeholder={f.ph} value={ads[f.key] || ''} onChange={e => setAds(a => ({ ...a, [f.key]: e.target.value }))} />
                                }
                            </div>
                        ))}
                        <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>Save Ad Config</button>
                    </form>
                )}
            </div>
        </div>
    )
}
