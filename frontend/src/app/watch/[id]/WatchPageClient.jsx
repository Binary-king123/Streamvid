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
        <Link href={`/watch/${video.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div style={{
                display: 'flex', gap: 10, padding: '8px 0',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'opacity 0.2s'
            }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
                <div style={{ width: 100, flexShrink: 0, borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9', background: '#0d0d16' }}>
                    <img src={videoUrl(video.thumbnailPath)} alt={video.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {video.code && <div style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 2 }}>{video.code}</div>}
                    <div style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                        lineClamp: 2, WebkitBoxOrient: 'vertical'
                    }}>{video.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{video.genre?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{formatViews(video.viewsCount)}</div>
                    {video.actors?.length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                            {video.actors.slice(0, 2).map(a => a.name).join(', ')}
                        </div>
                    )}
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

    useEffect(() => {
        if (!id) return
        setLoading(true)
        api.video(id).then(d => { setData(d); setLoading(false) })
    }, [id])

    if (loading) return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24, display: 'flex', gap: 24 }}>
            <div style={{ flex: 1, background: 'var(--bg-card)', aspectRatio: '16/9', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: 300, background: 'var(--bg-card)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
        </div>
    )

    const { video, recommended, related } = data || {}

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

                {/* Player Area */}
                <div style={{ flex: '1 1 640px', minWidth: 0 }}>
                    <VideoPlayer video={video} />

                    {/* Video Info */}
                    <div style={{ marginTop: 16 }}>
                        {video?.code && (
                            <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 6 }}>
                                {video.code}
                            </div>
                        )}
                        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>{video?.title}</h1>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, color: 'var(--text-muted)', fontSize: 13, flexWrap: 'wrap' }}>
                            <span>{formatViews(video?.viewsCount)}</span>
                            <span style={{ color: 'var(--accent)' }}>{video?.genre?.name}</span>
                            <span>{formatDuration(video?.durationSeconds)}</span>
                        </div>

                        {/* Actors */}
                        {video?.actors?.length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {video.actors.map(a => (
                                    <Link key={a.id} href={`/actor/${a.slug}`}
                                        style={{ fontSize: 12, background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '3px 10px', borderRadius: 20, textDecoration: 'none' }}>
                                        👤 {a.name}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Tags */}
                        {video?.tags?.length > 0 && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {video.tags.map(t => (
                                    <Link key={t.id} href={`/tag/${t.slug}`}
                                        style={{ fontSize: 11, background: 'rgba(124,58,237,0.12)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, textDecoration: 'none' }}>
                                        #{t.name}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {video?.description && (
                            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, background: 'var(--bg-card)', padding: 14, borderRadius: 8 }}>
                                {video.description}
                            </p>
                        )}

                        {/* Share Buttons — Drive viral WhatsApp/Telegram traffic */}
                        <ShareButtons title={video?.title} />
                    </div>

                    <div id="inline-banner-ad" className="ad-banner" style={{ marginTop: 20 }} />


                    {/* Related Videos */}
                    <div style={{ marginTop: 28 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Related Videos</h2>
                        <div className="video-grid">
                            {related?.map(v => <VideoCard key={v.id} video={v} />)}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div style={{ width: 300, flexShrink: 0 }}>
                    <div id="sidebar-banner-ad" className="ad-banner" style={{ marginBottom: 16 }} />
                    <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Recommended
                    </h2>
                    <div>
                        {recommended?.map(v => <SidebarCard key={v.id} video={v} />)}
                    </div>
                </div>
            </div>
        </div>
    )
}
