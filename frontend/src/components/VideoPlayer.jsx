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

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                // Browsers block unmuted autoplay, capture the promise to prevent console errors
                const playPromise = el.play()
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log('Autoplay prevented by browser, waiting for user interaction.')
                    })
                }
            })

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

            {/* ─── Video Player (Iframe OR HLS) ───────────────────────────── */}
            {video?.embedUrl ? (
                // OPTION 1: Third-Party Iframe Embed (zero hosting cost)
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                    <iframe
                        src={video.embedUrl}
                        frameBorder="0"
                        allowFullScreen
                        scrolling="no"
                        loading="lazy"
                        style={{
                            position: 'absolute', top: 0, left: 0,
                            width: '100%', height: '100%'
                        }}
                    ></iframe>
                    {/* Invisible overlay to capture the first click for Pop-unders while letting subsequent clicks pass to iframe */}
                    {!viewRecorded && (
                        <div
                            style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer' }}
                            onClick={() => {
                                // Record view on first interaction
                                trackVideoView(video.id, 5);
                                setViewRecorded(true);
                                // The first click gets captured here. 
                                // In production, ExoClick/TrafficJunky script handles the pop-under on ANY body click.
                            }}
                        />
                    )}
                </div>
            ) : (
                // OPTION 2: Self-hosted HLS Stream
                <video
                    ref={videoRef}
                    controls
                    playsInline
                    autoPlay
                    style={{ width: '100%', display: 'block', aspectRatio: '16/9' }}
                    poster={videoUrl(video?.thumbnailPath)}
                    crossOrigin="anonymous"
                />
            )}

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
