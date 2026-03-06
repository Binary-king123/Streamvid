'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { formatViews, formatDuration, videoUrl, truncate } from '@/lib/api'

export default function VideoCard({ video }) {
    const [showPreview, setShowPreview] = useState(false)
    const [previewLoaded, setPreviewLoaded] = useState(false)
    const videoRef = useRef(null)
    const hoverTimer = useRef(null)

    function handleMouseEnter() {
        if (!video.previewPath) return
        hoverTimer.current = setTimeout(() => {
            setShowPreview(true)
            if (videoRef.current && !videoRef.current.src) {
                videoRef.current.src = videoUrl(video.previewPath)
                videoRef.current.load()
            }
            videoRef.current?.play().catch(() => { })
        }, 150)
    }

    function handleMouseLeave() {
        clearTimeout(hoverTimer.current)
        setShowPreview(false)
        if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
        }
    }

    return (
        <Link href={`/watch/${video.id}`} style={{ textDecoration: 'none' }}>
            <div
                className="video-card"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="thumbnail-wrap">
                    <img
                        src={videoUrl(video.thumbnailPath) || '/placeholder.jpg'}
                        alt={video.title}
                        loading="lazy"
                        style={{ opacity: showPreview && previewLoaded ? 0 : 1 }}
                    />
                    {video.previewPath && (
                        <video
                            ref={videoRef}
                            muted playsInline loop preload="none"
                            onLoadedData={() => setPreviewLoaded(true)}
                            style={{ opacity: showPreview && previewLoaded ? 1 : 0 }}
                        />
                    )}
                    <span className="duration-badge">{formatDuration(video.durationSeconds)}</span>
                    {/* Adult badge */}
                    {video.isAdult && (
                        <span style={{
                            position: 'absolute', top: 6, left: 6,
                            background: 'rgba(239,68,68,0.9)', color: '#fff',
                            fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                            letterSpacing: '0.05em'
                        }}>18+</span>
                    )}
                </div>

                <div className="card-info">
                    {/* Video Code — MissAV style */}
                    {video.code && (
                        <div style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 2, opacity: 0.85 }}>
                            {video.code}
                        </div>
                    )}

                    <div className="card-title" title={video.title}>
                        {truncate(video.title, 55)}
                    </div>

                    {/* Actor names — MissAV style */}
                    {video.actors?.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {video.actors.slice(0, 2).map(a => a.name).join(' · ')}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <div className="card-genre">{video.genre?.name}</div>
                        <div className="card-views">{formatViews(video.viewsCount)}</div>
                    </div>

                    {/* Tags — first 3 only */}
                    {video.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                            {video.tags.slice(0, 3).map(t => (
                                <span key={t.id} style={{
                                    fontSize: 9, background: 'rgba(124,58,237,0.15)',
                                    color: 'var(--accent)', padding: '1px 5px', borderRadius: 3
                                }}>
                                    {t.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}
