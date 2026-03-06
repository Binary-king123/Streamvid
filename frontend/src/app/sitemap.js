const API = process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com'
const DOMAIN = API

export default async function sitemap() {
    // Static routes
    const staticRoutes = [
        { url: DOMAIN, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    ]

    // Fetch video pages for sitemap
    let videoRoutes = []
    try {
        // Fetch up to 10,000 videos for sitemap — split across pages
        const firstPage = await fetch(`${API}/api/videos/home?page=1`).then(r => r.json()).catch(() => null)
        const totalPages = firstPage?.totalPages || 1
        const pages = Math.min(totalPages, 50) // Max 50 pages × 24 = 1,200 in sitemap

        const allPages = await Promise.all(
            Array.from({ length: pages }, (_, i) =>
                fetch(`${API}/api/videos/home?page=${i + 1}`).then(r => r.json()).catch(() => null)
            )
        )

        videoRoutes = allPages
            .filter(Boolean)
            .flatMap(d => d.videos || [])
            .map(v => ({
                url: `${DOMAIN}/watch/${v.id}`,
                lastModified: new Date(v.createdAt),
                changeFrequency: 'monthly',
                priority: 0.8,
            }))
    } catch { }

    // Genre routes
    let genreRoutes = []
    try {
        const genres = await fetch(`${API}/api/videos/genres/list`).then(r => r.json()).catch(() => [])
        genreRoutes = (genres || []).map(g => ({
            url: `${DOMAIN}/genre/${g.slug}`,
            changeFrequency: 'daily',
            priority: 0.7,
        }))
    } catch { }

    return [...staticRoutes, ...genreRoutes, ...videoRoutes]
}
