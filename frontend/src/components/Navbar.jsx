'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function Navbar({ siteName, isAdultSite }) {
    const [genres, setGenres] = useState([])
    const [search, setSearch] = useState('')
    const [menuOpen, setMenuOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        api.genres().then(setGenres).catch(() => { })
    }, [])

    function handleSearch(e) {
        e.preventDefault()
        const q = search.trim()
        if (!q) return
        router.push(`/search?q=${encodeURIComponent(q)}`)
    }

    const name = siteName || process.env.NEXT_PUBLIC_SITE_NAME || 'StreamVid'

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 1000,
            background: 'rgba(10,10,15,0.95)',
            borderBottom: '1px solid var(--border)',
            backdropFilter: 'blur(20px)',
        }}>
            <div style={{
                maxWidth: 1400, margin: '0 auto',
                padding: '0 16px', height: 58,
                display: 'flex', alignItems: 'center', gap: 16
            }}>
                {/* Logo */}
                <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
                    <span style={{
                        fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em',
                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        WebkitBackgroundClip: 'text', backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        {name}
                    </span>
                    {isAdultSite && (
                        <span style={{ fontSize: 9, color: 'var(--danger)', marginLeft: 4, fontWeight: 700, verticalAlign: 'super' }}>18+</span>
                    )}
                </Link>

                {/* Search Bar */}
                <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 400, display: 'flex', gap: 6 }}>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search videos, codes, actors..."
                        style={{
                            flex: 1, background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)', color: 'var(--text-primary)',
                            borderRadius: 6, padding: '6px 12px', fontSize: 13, outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    <button type="submit" style={{
                        background: 'var(--accent)', color: '#fff', border: 'none',
                        borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                    }}>
                        🔍
                    </button>
                </form>

                {/* Genre Links — desktop */}
                <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 1, minWidth: 0 }}
                    className="hide-mobile">
                    {genres.slice(0, 6).map(g => (
                        <Link key={g.id} href={`/genre/${g.slug}`} style={{
                            padding: '4px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                            color: 'var(--text-muted)', textDecoration: 'none', whiteSpace: 'nowrap',
                            transition: 'color 0.2s'
                        }}
                            onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                        >
                            {g.name}
                        </Link>
                    ))}
                </div>

                {/* Admin link — low key */}
                <Link href="/admin" style={{ fontSize: 11, color: 'var(--border)', textDecoration: 'none', flexShrink: 0 }}>
                    ·
                </Link>
            </div>
        </nav>
    )
}
