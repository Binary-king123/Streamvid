'use client'
import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { videoUrl } from '@/lib/api'
import { trackVideoView, getTracker } from '@/lib/tracker'

export default function VideoPlayer({ video }) {
    const videoRef = useRef(null)
    const [viewRecorded, setViewRecorded] = useState(false)
    const watchTime = useRef(0)
    const interval = useRef(null)

    // Initialize human tracker immediately when player mounts
    useEffect(() => { getTracker() }, [])

    // HLS setup
    useEffect(() => {
        if (!video?.hlsPath) return
        const el = videoRef.current
        const src = videoUrl(video.hlsPath)

        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                maxBufferLength: 30,         // Buffer 30s ahead
                maxMaxBufferLength: 60,
                startLevel: -1,              // Auto quality
            })
            hls.loadSource(src)
            hls.attachMedia(el)
            return () => hls.destroy()
        } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
            el.src = src
        }
    }, [video?.hlsPath])

    // Real-user view tracking — uses HumanTracker, not raw API call
    useEffect(() => {
        const el = videoRef.current
        if (!el || !video?.id) return
        watchTime.current = 0

        function onPlay() {
            interval.current = setInterval(() => {
                watchTime.current++
                // Count view after 5 continuous seconds of real playback
                if (watchTime.current >= 5 && !viewRecorded) {
                    setViewRecorded(true)
                    clearInterval(interval.current)
                    // Uses HumanTracker — includes human token + watch time
                    trackVideoView(video.id, watchTime.current)
                }
            }, 1000)
        }

        function onPause() { clearInterval(interval.current) }
        function onEnded() { clearInterval(interval.current) }

        el.addEventListener('play', onPlay)
        el.addEventListener('pause', onPause)
        el.addEventListener('ended', onEnded)

        return () => {
            el.removeEventListener('play', onPlay)
            el.removeEventListener('pause', onPause)
            el.removeEventListener('ended', onEnded)
            clearInterval(interval.current)
        }
    }, [video?.id, viewRecorded])

    return (
        <div style={{
            width: '100%', background: '#000',
            borderRadius: 10, overflow: 'hidden', position: 'relative'
        }}>
            {/* ─── Pre-roll Ad Slot ───────────────────────────── */}
            {/* Ad network JS injects into this div BEFORE video plays */}
            <div id="preroll-ad-container" style={{ width: '100%' }} />

            {/* ─── HLS Video Player ───────────────────────────── */}
            <video
                ref={videoRef}
                controls
                playsInline
                autoPlay
                style={{ width: '100%', display: 'block', aspectRatio: '16/9' }}
                poster={videoUrl(video?.thumbnailPath)}
                crossOrigin="anonymous"
            />

            {/* ─── View Badge (debug — remove in prod if desired) ─ */}
            {viewRecorded && (
                <div style={{
                    position: 'absolute', bottom: 8, right: 8,
                    background: 'rgba(0,0,0,0.5)', color: '#10b981',
                    fontSize: 10, padding: '2px 6px', borderRadius: 4, pointerEvents: 'none'
                }}>
                    ✓ Viewed
                </div>
            )}
        </div>
    )
}
