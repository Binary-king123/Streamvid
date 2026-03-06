'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import VideoCard from '@/components/VideoCard'
import { api } from '@/lib/api'

function SearchResults() {
    const searchParams = useSearchParams()
    const q = searchParams.get('q') || ''
    const [data, setData] = useState(null)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [input, setInput] = useState(q)

    useEffect(() => {
        if (!q) return
        setLoading(true)
        api.search(q, page).then(d => { setData(d); setLoading(false) })
    }, [q, page])

    function handleSearch(e) {
        e.preventDefault()
        window.location.href = `/search?q=${encodeURIComponent(input)}`
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 28, maxWidth: 600 }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Search videos, codes, actors, tags..."
                    style={{
                        flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', borderRadius: 8, padding: '10px 16px', fontSize: 14, outline: 'none'
                    }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Search</button>
            </form>

            {/* Results Header */}
            {q && (
                <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                    {data?.total
                        ? <>{data.total} results for "<span style={{ color: 'var(--accent)' }}>{q}</span>"</>
                        : loading ? 'Searching...' : `No results for "${q}"`}
                </h1>
            )}

            {!q && (
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-muted)' }}>
                    Search for desi, milf, code, actor name...
                </h1>
            )}

            {/* Ad Slot */}
            <div id="top-banner-ad" className="ad-banner" style={{ marginBottom: 20 }} />

            {/* Grid */}
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

            {/* Pagination */}
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

export default function SearchPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
            <SearchResults />
        </Suspense>
    )
}
