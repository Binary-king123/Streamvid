'use client'
import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { videoUrl } from '@/lib/api'
import { trackVideoView } from '@/lib/tracker'

// Detect video type from URL
function getVideoType(url) {
    if (!url) return null
    const u = url.toLowerCase()
    if (u.includes('.m3u8')) return 'hls'
    if (u.match(/\.(mp4|webm|ogg|mov|mkv|avi)(\?|$)/)) return 'mp4'
    return 'iframe'
}

export default function VideoPlayer({ video }) {
    const videoRef = useRef(null)
    const hlsRef = useRef(null)
    const [viewRecorded, setViewRecorded] = useState(false)
    const [playing, setPlaying] = useState(false)
    const watchTime = useRef(0)
    const interval = useRef(null)

    // Determine which mode to render
    const mode = video?.embedUrl
        ? (getVideoType(video.embedUrl) === 'mp4' ? 'mp4' : 'iframe')
        : video?.hlsPath
            ? 'hls'
            : null

    const thumbSrc = videoUrl(video?.thumbnailPath) || ''

    // Count view after 5s of interaction
    function recordView() {
        if (viewRecorded) return
        setViewRecorded(true)
        trackVideoView(video.id, 5)
    }

    // HLS setup
    useEffect(() => {
        if (mode !== 'hls') return
        const el = videoRef.current
        if (!el) return
        const src = videoUrl(video.hlsPath)

        if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, maxBufferLength: 30, startLevel: -1 })
            hlsRef.current = hls
            hls.loadSource(src)
            hls.attachMedia(el)
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                el.play().catch(() => { })
            })
        } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
            el.src = src
        }

        return () => { hlsRef.current?.destroy(); hlsRef.current = null }
    }, [video?.hlsPath, mode])

    // Track watch time for HLS/MP4
    useEffect(() => {
        if (mode === 'iframe') return
        const el = videoRef.current
        if (!el || !video?.id) return
        watchTime.current = 0

        function onPlay() {
            setPlaying(true)
            interval.current = setInterval(() => {
                watchTime.current++
                if (watchTime.current >= 5) recordView()
            }, 1000)
        }
        function onPause() { setPlaying(false); clearInterval(interval.current) }
        function onEnded() { setPlaying(false); clearInterval(interval.current) }

        el.addEventListener('play', onPlay)
        el.addEventListener('pause', onPause)
        el.addEventListener('ended', onEnded)
        return () => {
            el.removeEventListener('play', onPlay)
            el.removeEventListener('pause', onPause)
            el.removeEventListener('ended', onEnded)
            clearInterval(interval.current)
        }
    }, [video?.id, mode])

    if (!mode) {
        return (
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#111', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 14 }}>
                No video available
            </div>
        )
    }

    return (
        <div style={{ width: '100%', background: '#000', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
            {/* ── Iframe embed (YouTube, external player, etc.) ──────── */}
            {mode === 'iframe' && !playing && (
                /* Click-to-play poster for iframe — avoids CSP issues and enables clean first-click */
                <div
                    onClick={() => { setPlaying(true); recordView() }}
                    style={{ position: 'relative', width: '100%', paddingTop: '56.25%', cursor: 'pointer', background: '#000' }}
                >
                    {thumbSrc && (
                        <img
                            src={thumbSrc}
                            alt={video.title}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                        />
                    )}
                    {/* Big play button */}
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'rgba(124,58,237,0.9)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, boxShadow: '0 0 30px rgba(124,58,237,0.5)',
                            transition: 'transform 0.2s',
                        }}>▶</div>
                    </div>
                    {/* Duration badge */}
                    {video.durationSeconds > 0 && (
                        <div style={{
                            position: 'absolute', bottom: 10, right: 10,
                            background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 11,
                            padding: '2px 7px', borderRadius: 4
                        }}>
                            {Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, '0')}
                        </div>
                    )}
                </div>
            )}

            {mode === 'iframe' && playing && (
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                    <iframe
                        src={video.embedUrl}
                        frameBorder="0"
                        allowFullScreen
                        allow="autoplay; fullscreen; picture-in-picture"
                        scrolling="no"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    />
                </div>
            )}

            {/* ── Direct MP4 / WebM / all native video formats ──────── */}
            {mode === 'mp4' && (
                <video
                    ref={videoRef}
                    controls
                    autoPlay
                    playsInline
                    poster={thumbSrc}
                    style={{ width: '100%', display: 'block', aspectRatio: '16/9', background: '#000' }}
                    crossOrigin="anonymous"
                >
                    <source src={video.embedUrl} />
                    Your browser does not support video playback.
                </video>
            )}

            {/* ── HLS (.m3u8) stream ─────────────────────────────────── */}
            {mode === 'hls' && (
                <video
                    ref={videoRef}
                    controls
                    autoPlay
                    playsInline
                    poster={thumbSrc}
                    style={{ width: '100%', display: 'block', aspectRatio: '16/9', background: '#000' }}
                />
            )}
        </div>
    )
}
