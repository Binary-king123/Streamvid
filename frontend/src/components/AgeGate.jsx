'use client'
import { useState, useEffect } from 'react'

const COOKIE_NAME = 'age_verified'
const COOKIE_DAYS = 30

function setCookie(name, value, days) {
    const d = new Date()
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

function getCookie(name) {
    return document.cookie.split(';').some(c => c.trim().startsWith(`${name}=`))
}

export default function AgeGate({ children }) {
    const [verified, setVerified] = useState(null) // null = loading

    useEffect(() => {
        setVerified(getCookie(COOKIE_NAME))
    }, [])

    function handleConfirm() {
        setCookie(COOKIE_NAME, '1', COOKIE_DAYS)
        setVerified(true)
    }

    function handleDeny() {
        window.location.href = 'https://google.com'
    }

    // Loading — show nothing to avoid flash
    if (verified === null) return null

    // Already verified — show site
    if (verified) return children

    // Show age gate
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'radial-gradient(ellipse at center, #0d0d1a 0%, #000 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24
        }}>
            <div style={{
                maxWidth: 480, width: '100%', textAlign: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 16, padding: '48px 32px',
                backdropFilter: 'blur(20px)'
            }}>
                {/* Logo */}
                <div style={{
                    fontSize: 32, fontWeight: 900,
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    WebkitBackgroundClip: 'text', backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent', marginBottom: 8
                }}>
                    18+
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px', color: '#fff' }}>
                    Adults Only
                </h1>
                <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, marginBottom: 32 }}>
                    This website contains adult content intended for viewers aged <strong style={{ color: '#fff' }}>18 years or older</strong>.
                    By entering you confirm that you are of legal age in your jurisdiction to view such content.
                </p>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={handleConfirm}
                        style={{
                            flex: 1, padding: '14px', borderRadius: 8, border: 'none',
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.opacity = '0.85'}
                        onMouseLeave={e => e.target.style.opacity = '1'}
                    >
                        I am 18+ — Enter
                    </button>
                    <button
                        onClick={handleDeny}
                        style={{
                            flex: 1, padding: '14px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'transparent', color: '#9ca3af',
                            fontSize: 15, cursor: 'pointer', transition: 'opacity 0.2s'
                        }}
                    >
                        Exit
                    </button>
                </div>

                <p style={{ fontSize: 11, color: '#4b5563', marginTop: 20, lineHeight: 1.5 }}>
                    By entering you confirm compliance with your local laws.
                    We use cookies to remember your age verification for {COOKIE_DAYS} days.
                </p>
            </div>
        </div>
    )
}
