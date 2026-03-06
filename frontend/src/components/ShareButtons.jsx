'use client'
/**
 * ShareButtons — WhatsApp, Telegram, Twitter, Copy Link
 * These are the #1 social traffic drivers for Indian adult traffic.
 * WhatsApp alone drives 40-60% of referral traffic from India.
 */
export default function ShareButtons({ title, url }) {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
    const shareText = title ? `${title} 🔥` : 'Watch this video 🔥'

    function copyLink() {
        navigator.clipboard?.writeText(shareUrl).catch(() => { })
        // Brief visual feedback
        const btn = document.getElementById('copy-link-btn')
        if (btn) {
            const prev = btn.textContent
            btn.textContent = '✅ Copied!'
            setTimeout(() => { btn.textContent = prev }, 1800)
        }
    }

    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(shareText)

    const shares = [
        {
            id: 'whatsapp',
            label: 'WhatsApp',
            emoji: '💬',
            color: '#25D366',
            url: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
        },
        {
            id: 'telegram',
            label: 'Telegram',
            emoji: '✈️',
            color: '#0088cc',
            url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        },
        {
            id: 'twitter',
            label: 'X (Twitter)',
            emoji: '🐦',
            color: '#1DA1F2',
            url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        },
        {
            id: 'reddit',
            label: 'Reddit',
            emoji: '🔺',
            color: '#FF4500',
            url: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
        },
    ]

    return (
        <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Share
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {shares.map(s => (
                    <a
                        key={s.id}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 6, textDecoration: 'none',
                            background: `${s.color}18`,
                            border: `1px solid ${s.color}40`,
                            color: s.color, fontSize: 12, fontWeight: 600,
                            transition: 'background 0.2s, transform 0.1s',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${s.color}30`}
                        onMouseLeave={e => e.currentTarget.style.background = `${s.color}18`}
                    >
                        <span>{s.emoji}</span> {s.label}
                    </a>
                ))}

                {/* Copy Link button */}
                <button
                    id="copy-link-btn"
                    onClick={copyLink}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-dim)', fontSize: 12, fontWeight: 600,
                        transition: 'background 0.2s',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                    🔗 Copy Link
                </button>
            </div>
        </div>
    )
}
