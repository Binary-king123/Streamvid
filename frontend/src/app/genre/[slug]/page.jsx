'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import VideoCard from '@/components/VideoCard'
import { api } from '@/lib/api'

export default function GenrePage() {
    const { slug } = useParams()
    const [data, setData] = useState(null)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        api.genre(slug, page).then(d => { setData(d); setLoading(false) })
    }, [slug, page])

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
            <div id="top-banner-ad" className="ad-banner" style={{ marginBottom: 24 }} />

            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
                {data?.genre?.name || 'Loading...'}
            </h1>

            <div className="video-grid">
                {data?.videos?.map(v => <VideoCard key={v.id} video={v} />)}
            </div>

            {data?.totalPages > 1 && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 32 }}>
                    <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <span style={{ color: 'var(--text-muted)', lineHeight: '36px', fontSize: 13 }}>Page {page} of {data.totalPages}</span>
                    <button className="btn-secondary" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
            )}
        </div>
    )
}
