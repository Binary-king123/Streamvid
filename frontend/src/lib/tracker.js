/**
 * Human Tracker — Client-side script
 * Runs invisibly in background to:
 * 1. Detect human signals (mouse, scroll, screen)
 * 2. Get a human token from the API
 * 3. Count real views after 5+ seconds of watching
 * 4. Never block VPN users — uses session cookies not IP
 */

const API = process.env.NEXT_PUBLIC_API_URL || ''

class HumanTracker {
    constructor() {
        this.signals = { hasMouse: false, hasScroll: false, screenW: 0, screenH: 0 }
        this.token = null
        this.tokenPromise = null
        this.init()
    }

    init() {
        if (typeof window === 'undefined') return
        this.signals.screenW = window.screen?.width || 0
        this.signals.screenH = window.screen?.height || 0

        // Detect mouse movement (bots rarely simulate this)
        const onMouse = () => { this.signals.hasMouse = true; window.removeEventListener('mousemove', onMouse) }
        window.addEventListener('mousemove', onMouse, { once: true, passive: true })

        // Detect scroll
        const onScroll = () => { this.signals.hasScroll = true; window.removeEventListener('scroll', onScroll) }
        window.addEventListener('scroll', onScroll, { once: true, passive: true })

        // Also count touch as human signal (mobile users)
        const onTouch = () => { this.signals.hasMouse = true; window.removeEventListener('touchstart', onTouch) }
        window.addEventListener('touchstart', onTouch, { once: true, passive: true })

        // Pre-fetch token after 2s (user had time to interact)
        setTimeout(() => this.fetchToken(), 2000)
    }

    async fetchToken() {
        if (this.token) return this.token
        if (this.tokenPromise) return this.tokenPromise

        this.tokenPromise = fetch(`${API}/api/analytics/token`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signals: this.signals })
        })
            .then(r => r.ok ? r.json() : null)
            .then(d => { this.token = d?.token || null; return this.token })
            .catch(() => null)

        return this.tokenPromise
    }

    async trackView(videoId, watchSeconds) {
        if (!videoId || watchSeconds < 5) return
        const token = await this.fetchToken()
        try {
            await fetch(`${API}/api/analytics/view`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, watchSeconds, humanToken: token })
            })
            // Reset token after use (one-time)
            this.token = null
            this.tokenPromise = null
        } catch { }
    }
}

// Singleton — shared across all components
let tracker = null

export function getTracker() {
    if (typeof window === 'undefined') return null
    if (!tracker) tracker = new HumanTracker()
    return tracker
}

export async function trackVideoView(videoId, watchSeconds) {
    const t = getTracker()
    if (t) await t.trackView(videoId, watchSeconds)
}
