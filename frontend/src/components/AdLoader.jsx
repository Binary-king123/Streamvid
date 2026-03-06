'use client'
/**
 * AdLoader — Runs once on mount, fetches ad config from DB,
 * then injects HTML into each slot and fires popunder once per session.
 *
 * SLOT IDs used across the site:
 *   Homepage:   #top-banner-ad  #inline-ad  #footer-banner-ad
 *   Watch page: #preroll-ad-container  #sidebar-banner-ad  #inline-banner-ad
 *   Others:     #top-banner-ad  #footer-banner-ad  #inline-ad
 *
 * Revenue order (high→low):
 *   1. Popunder  — fires once per session on first user click
 *   2. Pre-roll VAST — fires when video player mounts (handled in VideoPlayer)
 *   3. Sidebar banner
 *   4. Top/inline/footer banners
 */

import { useEffect } from 'react'
import { api } from '@/lib/api'

const POPUNDER_SESSION_KEY = 'svpop'

function injectSlot(id, html) {
    if (!html) return
    const el = document.getElementById(id)
    if (!el) return
    el.innerHTML = html
    // Re-execute any <script> tags inside the injected HTML
    el.querySelectorAll('script').forEach(old => {
        const s = document.createElement('script')
        if (old.src) s.src = old.src
        else s.textContent = old.textContent
        s.async = true
        old.replaceWith(s)
    })
}

function firePopunder(script) {
    if (!script) return
    // Only once per browser session
    if (sessionStorage.getItem(POPUNDER_SESSION_KEY)) return

    // Trigger on first real user interaction (click / touch)
    function trigger() {
        if (sessionStorage.getItem(POPUNDER_SESSION_KEY)) return
        sessionStorage.setItem(POPUNDER_SESSION_KEY, '1')

        // Inject popunder script
        const s = document.createElement('script')
        s.textContent = script
        s.async = true
        document.head.appendChild(s)

        // Cleanup listeners
        document.removeEventListener('click', trigger, { once: true })
        document.removeEventListener('touchstart', trigger, { once: true })
    }

    document.addEventListener('click', trigger, { passive: true, once: true })
    document.addEventListener('touchstart', trigger, { passive: true, once: true })
}

export default function AdLoader() {
    useEffect(() => {
        api.adsConfig()
            .then(cfg => {
                if (!cfg) return

                // ── Banner slots ────────────────────────────────────
                injectSlot('top-banner-ad', cfg.topBanner)
                injectSlot('inline-ad', cfg.inlineBanner)
                injectSlot('footer-banner-ad', cfg.footerBanner)
                injectSlot('sidebar-banner-ad', cfg.sidebarBanner)
                injectSlot('inline-banner-ad', cfg.inlineBanner)

                // ── Pre-roll VAST URL (passed to window for VideoPlayer) ──
                if (cfg.preRollVast) {
                    window.__VAST_URL__ = cfg.preRollVast
                }

                // ── Popunder — once per session ──────────────────────
                firePopunder(cfg.popunderScript)
            })
            .catch(() => { }) // Silent fail — never break the site over ads
    }, [])

    return null // No UI — purely a side-effects component
}
