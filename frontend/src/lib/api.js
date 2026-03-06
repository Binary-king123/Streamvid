const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API Error ${res.status}`)
    }
    return res.json()
}

export const api = {
    // ─ Public video endpoints ─────────────────────────────────────
    home: (page = 1, sort = 'latest') => apiFetch(`/api/videos/home?page=${page}&sort=${sort}`),
    genre: (slug, page = 1) => apiFetch(`/api/videos/genre/${slug}?page=${page}`),
    tag: (slug, page = 1) => apiFetch(`/api/videos/tag/${slug}?page=${page}`),
    actor: (slug, page = 1) => apiFetch(`/api/videos/actor/${slug}?page=${page}`),
    video: (id) => apiFetch(`/api/videos/${id}`),
    search: (q, page = 1) => apiFetch(`/api/videos/search?q=${encodeURIComponent(q)}&page=${page}`),
    genres: () => apiFetch('/api/videos/genres/list'),
    stats: () => apiFetch('/api/analytics/stats'),
    adsConfig: () => apiFetch('/api/ads/config'),

    // ─ Admin endpoints ────────────────────────────────────────────
    login: (email, password) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
    me: () => apiFetch('/api/auth/me'),

    adminVideos: (page = 1, params = {}) => {
        const q = new URLSearchParams({ page, ...params }).toString()
        return apiFetch(`/api/admin/videos?${q}`)
    },
    updateVideo: (id, data) => apiFetch(`/api/admin/videos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteVideo: (id) => apiFetch(`/api/admin/videos/${id}`, { method: 'DELETE' }),
    embedVideo: (data) => apiFetch('/api/admin/videos/embed', { method: 'POST', body: JSON.stringify(data) }),
    bulkEmbedVideos: (rows) => apiFetch('/api/admin/videos/bulk-embed', { method: 'POST', body: JSON.stringify(rows) }),

    adminGenres: () => apiFetch('/api/admin/genres'),
    adminTags: () => apiFetch('/api/admin/tags'),
    adminActors: () => apiFetch('/api/admin/actors'),
    createGenre: (data) => apiFetch('/api/admin/genres', { method: 'POST', body: JSON.stringify(data) }),
    deleteGenre: (id) => apiFetch(`/api/admin/genres/${id}`, { method: 'DELETE' }),

    adminAnalytics: (days = 30) => apiFetch(`/api/admin/analytics?days=${days}`),

    getAds: () => apiFetch('/api/admin/ads'),
    updateAds: (data) => apiFetch('/api/admin/ads', { method: 'PUT', body: JSON.stringify(data) }),
}

// ─ Formatters ─────────────────────────────────────────────────────
export function formatViews(n) {
    const num = Number(n)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K views`
    return `${num} views`
}

export function formatDuration(seconds) {
    if (!seconds) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

export function videoUrl(path) {
    if (!path) return ''
    const cdn = process.env.NEXT_PUBLIC_CDN_URL || ''
    // Already absolute URL — return as-is
    if (path.startsWith('http')) return path
    return `${cdn}${path}`
}

export function truncate(str, len = 60) {
    return str?.length > len ? str.slice(0, len) + '…' : str || ''
}
