'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import VideoCard from '@/components/VideoCard'
import ShareButtons from '@/components/ShareButtons'
import { api, formatViews, formatDuration, videoUrl } from '@/lib/api'

const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), { ssr: false })

function SidebarCard({ video }) {
    return (
        <Link href={`/watch/${video.id}`} style={{ textDecoration: 'none' }}>
            <div style={{
                display: 'flex', gap: 10, padding: '8px 0',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'opacity 0.2s'
            }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
                <div style={{ position: 'relative', width: 110, flexShrink: 0, borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9', background: '#0d0d16' }}>
                    <img src={videoUrl(video.thumbnailPath)} alt={video.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    {video.durationSeconds > 0 && (
                        <span style={{
                            position: 'absolute', bottom: 3, right: 4,
                            background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 10,
                            padding: '1px 4px', borderRadius: 3
                        }}>
                            {Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, '0')}
                        </span>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {video.code && <div style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 2 }}>{video.code}</div>}
                    <div style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                    }}>{video.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{video.genre?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{formatViews(video.viewsCount)}</div>
                </div>
            </div>
        </Link>
    )
}

export default function WatchPageClient({ id: propId }) {
    const params = useParams()
    const id = propId || params?.id
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showMore, setShowMore] = useState(false)

    useEffect(() => {
        if (!id) return
        setLoading(true)
        setShowMore(false)
        api.video(id).then(d => { setData(d); setLoading(false) })
    }, [id])

    if (loading) return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24, display: 'flex', gap: 24 }}>
            <div style={{ flex: 1, background: 'var(--bg-card)', aspectRatio: '16/9', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: 300, background: 'var(--bg-card)', borderRadius: 10, animation: 'pulse 1.5s infinite', height: 400 }} />
        </div>
    )

    const { video, recommended, related } = data || {}

    if (!video) return (
        <div style={{ maxWidth: 800, margin: '80px auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
            <h1 style={{ fontSize: 20 }}>Video not found</h1>
            <Link href="/" style={{ color: 'var(--accent)', marginTop: 16, display: 'inline-block' }}>← Go Home</Link>
        </div>
    )

    const descLimit = 200
    const longDesc = video.description && video.description.length > descLimit

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px' }}>
            {/* Top banner ad */}
            <div id="top-banner-ad" className="ad-banner" style={{ marginBottom: 12 }} />

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                {/* ── Main Player Column ─────────────────────────────── */}
                <div style={{ flex: '1 1 640px', minWidth: 0 }}>

                    {/* Video Player */}
                    <VideoPlayer video={video} />

                    {/* Video Info */}
                    <div style={{ marginTop: 12 }}>
                        {video.code && (
                            <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 4 }}>
                                {video.code}
                            </div>
                        )}
                        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.45, color: 'var(--text-primary)' }}>
                            {video.title}
                        </h1>
                        <div style={{ display: 'flex', gap: 14, marginTop: 8, color: 'var(--text-muted)', fontSize: 13, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span>{formatViews(video.viewsCount)}</span>
                            {video.genre?.name && (
                                <Link href={`/genre/${video.genre.slug}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                                    {video.genre.name}
                                </Link>
                            )}
                            {video.durationSeconds > 0 && <span>{formatDuration(video.durationSeconds)}</span>}
                        </div>

                        {/* Actors */}
                        {video.actors?.length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {video.actors.map(a => (
                                    <Link key={a.id} href={`/actor/${a.slug}`}
                                        style={{ fontSize: 12, background: 'rgba(16,185,129,0.12)', color: 'var(--success)', padding: '3px 10px', borderRadius: 20, textDecoration: 'none' }}>
                                        👤 {a.name}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Tags */}
                        {video.tags?.length > 0 && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                {video.tags.map(t => (
                                    <Link key={t.id} href={`/tag/${t.slug}`}
                                        style={{ fontSize: 11, background: 'rgba(124,58,237,0.12)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, textDecoration: 'none' }}>
                                        #{t.name}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Description (collapsible) */}
                        {video.description && (
                            <div style={{ marginTop: 12 }}>
                                <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>
                                    {showMore || !longDesc ? video.description : video.description.slice(0, descLimit) + '…'}
                                </p>
                                {longDesc && (
                                    <button onClick={() => setShowMore(v => !v)}
                                        style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}>
                                        {showMore ? 'Show less ▲' : 'Show more ▼'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Share */}
                        <ShareButtons title={video.title} />
                    </div>

                    {/* Ad below info */}
                    <div id="inline-banner-ad" className="ad-banner" style={{ marginTop: 16, marginBottom: 8 }} />

                    {/* Related Videos */}
                    {related?.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Related Videos</h2>
                            <div className="video-grid">
                                {related.map(v => <VideoCard key={v.id} video={v} />)}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Sidebar ────────────────────────────────────────── */}
                <div style={{ width: 280, flexShrink: 0 }}>
                    <div id="sidebar-banner-ad" className="ad-banner" style={{ marginBottom: 14 }} />
                    <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        You May Also Like
                    </h2>
                    <div>
                        {recommended?.map(v => <SidebarCard key={v.id} video={v} />)}
                    </div>
                    <div id="sidebar-bottom-ad" className="ad-banner" style={{ marginTop: 16 }} />
                </div>
            </div>
        </div>
    )
}
