'use client'
import { useState, useEffect } from 'react'
import VideoCard from '@/components/VideoCard'
import { api } from '@/lib/api'

export default function HomePage() {
    const [data, setData] = useState(null)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        api.home(page).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
    }, [page])

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>

            {/* Top Banner Ad Slot */}
            <div id="top-banner-ad" className="ad-banner" style={{ marginBottom: 24 }}>
                {/* Ad loads here asynchronously */}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>
                Latest Videos
            </h1>

            {loading ? (
                <div className="video-grid">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 10, aspectRatio: '16/9', animation: 'pulse 1.5s infinite' }} />
                    ))}
                </div>
            ) : (
                <>
                    {/* Row 1–2 (8 videos) */}
                    <div className="video-grid" style={{ marginBottom: 16 }}>
                        {data?.videos?.slice(0, 8).map(v => <VideoCard key={v.id} video={v} />)}
                    </div>

                    {/* Inline Ad Slot */}
                    <div id="inline-ad" className="ad-banner" style={{ marginBottom: 16 }}>
                        {/* Inline grid ad */}
                    </div>

                    {/* Row 3 (remaining videos) */}
                    <div className="video-grid">
                        {data?.videos?.slice(8).map(v => <VideoCard key={v.id} video={v} />)}
                    </div>

                    {/* Pagination */}
                    {data?.totalPages > 1 && (
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 32 }}>
                            <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            <span style={{ color: 'var(--text-muted)', lineHeight: '36px', fontSize: 13 }}>Page {page} of {data.totalPages}</span>
                            <button className="btn-secondary" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </>
            )}

            {/* Footer Ad Slot */}
            <div id="footer-banner-ad" className="ad-banner" style={{ marginTop: 32 }}>
                {/* Footer banner */}
            </div>
        </div>
    )
}
