'use client'
import { useState, useEffect } from 'react'
import VideoCard from '@/components/VideoCard'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function ActorPageClient({ slug }) {
    const [data, setData] = useState(null)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        api.actor(slug, page).then(d => { setData(d); setLoading(false) })
    }, [slug, page])

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
            <div id="top-banner-ad" className="ad-banner" style={{ marginBottom: 20 }} />

            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
                {' / '}
                <Link href="/actors" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Actors</Link>
                {' / '}
                <span style={{ color: 'var(--accent)' }}>{data?.actor?.name || slug}</span>
            </div>

            {/* Actor Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, flexShrink: 0
                }}>
                    👤
                </div>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{data?.actor?.name || slug}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
                        {data?.total || 0} videos
                    </p>
                </div>
            </div>

            <div id="inline-ad" className="ad-banner" style={{ marginBottom: 24 }} />

            {loading ? (
                <div className="video-grid">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 10, aspectRatio: '16/9', animation: 'pulse 1.5s infinite' }} />
                    ))}
                </div>
            ) : (
                <div className="video-grid">
                    {data?.videos?.map(v => <VideoCard key={v.id} video={v} />)}
                </div>
            )}

            {data?.totalPages > 1 && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 32 }}>
                    <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <span style={{ color: 'var(--text-muted)', lineHeight: '36px', fontSize: 13 }}>Page {page} of {data.totalPages}</span>
                    <button className="btn-secondary" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
            )}

            <div id="footer-banner-ad" className="ad-banner" style={{ marginTop: 32 }} />
        </div>
    )
}
