'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatViews, formatDuration, videoUrl, truncate } from '@/lib/api'

export default function VideoCard({ video }) {
    const [hovered, setHovered] = useState(false)

    const thumb = videoUrl(video.thumbnailPath) || '/placeholder.jpg'
    const hasEmbed = !!video.embedUrl
    const hasPreview = !!video.previewPath

    return (
        <Link href={`/watch/${video.id}`} style={{ textDecoration: 'none' }}>
            <div
                className="video-card"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {/* Thumbnail Area */}
                <div className="thumbnail-wrap">
                    <img
                        src={thumb}
                        alt={video.title}
                        loading="lazy"
                        style={{ transition: 'opacity 0.2s', opacity: (hovered && hasPreview) ? 0 : 1 }}
                    />

                    {/* Hover preview — only for self-hosted videos */}
                    {hasPreview && hovered && (
                        <video
                            src={videoUrl(video.previewPath)}
                            autoPlay muted playsInline loop
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )}

                    {/* Play icon overlay on hover */}
                    {hovered && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.25)', zIndex: 2, transition: 'background 0.2s'
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '50%',
                                background: 'rgba(124,58,237,0.9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.5)'
                            }}>▶</div>
                        </div>
                    )}

                    {/* Duration badge */}
                    <span className="duration-badge">{formatDuration(video.durationSeconds)}</span>

                    {/* 18+ badge */}
                    {video.isAdult && (
                        <span style={{
                            position: 'absolute', top: 6, left: 6, zIndex: 3,
                            background: 'rgba(239,68,68,0.92)', color: '#fff',
                            fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3
                        }}>18+</span>
                    )}

                    {/* HD/Embed badge */}
                    {hasEmbed && (
                        <span style={{
                            position: 'absolute', top: 6, right: 36, zIndex: 3,
                            background: 'rgba(16,185,129,0.85)', color: '#fff',
                            fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3
                        }}>▶ PLAY</span>
                    )}
                </div>

                {/* Card Info */}
                <div className="card-info">
                    {video.code && (
                        <div style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 2, opacity: 0.85 }}>
                            {video.code}
                        </div>
                    )}

                    <div className="card-title" title={video.title}>
                        {truncate(video.title, 55)}
                    </div>

                    {video.actors?.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {video.actors.slice(0, 2).map(a => a.name).join(' · ')}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <div className="card-genre">{video.genre?.name}</div>
                        <div className="card-views">{formatViews(video.viewsCount)}</div>
                    </div>

                    {video.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                            {video.tags.slice(0, 3).map(t => (
                                <span key={t.id} style={{
                                    fontSize: 9, background: 'rgba(124,58,237,0.15)',
                                    color: 'var(--accent)', padding: '1px 5px', borderRadius: 3
                                }}>{t.name}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}
