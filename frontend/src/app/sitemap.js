const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'https://yourdomain.com'

export default async function sitemap() {
    // ── Static routes ───────────────────────────────────────────────
    const staticRoutes = [
        { url: DOMAIN, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
        { url: `${DOMAIN}/search`, changeFrequency: 'weekly', priority: 0.5 },
    ]

    // ── Genres ──────────────────────────────────────────────────────
    let genreRoutes = []
    try {
        const genres = await fetch(`${API}/api/videos/genres/list`, { next: { revalidate: 3600 } })
            .then(r => r.json()).catch(() => [])
        genreRoutes = (genres || []).map(g => ({
            url: `${DOMAIN}/genre/${g.slug}`,
            changeFrequency: 'daily',
            priority: 0.8,
        }))
    } catch { }

    // ── Tags ────────────────────────────────────────────────────────
    let tagRoutes = []
    try {
        const tags = await fetch(`${API}/api/admin/tags`, { next: { revalidate: 3600 } })
            .then(r => r.json()).catch(() => [])
        tagRoutes = (tags || []).map(t => ({
            url: `${DOMAIN}/tag/${t.slug}`,
            changeFrequency: 'daily',
            priority: 0.7,
        }))
    } catch { }

    // ── Actors ──────────────────────────────────────────────────────
    let actorRoutes = []
    try {
        const actors = await fetch(`${API}/api/admin/actors`, { next: { revalidate: 3600 } })
            .then(r => r.json()).catch(() => [])
        actorRoutes = (actors || []).map(a => ({
            url: `${DOMAIN}/actor/${a.slug}`,
            changeFrequency: 'weekly',
            priority: 0.6,
        }))
    } catch { }

    // ── Videos (up to 50k via pagination) ──────────────────────────
    let videoRoutes = []
    try {
        const firstPage = await fetch(`${API}/api/videos/home?page=1`, { next: { revalidate: 3600 } })
            .then(r => r.json()).catch(() => null)
        const totalPages = firstPage?.totalPages || 1
        // 500 pages × 24 = 12,000 videos max in a single sitemap
        // For 50k+ use sitemap index (Next.js splits automatically above 50k)
        const pages = Math.min(totalPages, 500)

        const allPages = await Promise.all(
            Array.from({ length: pages }, (_, i) =>
                fetch(`${API}/api/videos/home?page=${i + 1}`, { next: { revalidate: 3600 } })
                    .then(r => r.json()).catch(() => null)
            )
        )

        videoRoutes = allPages
            .filter(Boolean)
            .flatMap(d => d.videos || [])
            .map(v => ({
                url: `${DOMAIN}/watch/${v.id}`,
                lastModified: new Date(v.createdAt),
                changeFrequency: 'monthly',
                priority: 0.9,
            }))
    } catch { }

    return [...staticRoutes, ...genreRoutes, ...tagRoutes, ...actorRoutes, ...videoRoutes]
}
