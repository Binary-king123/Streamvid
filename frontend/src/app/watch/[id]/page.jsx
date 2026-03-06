import WatchPageClient from './WatchPageClient'

const API_INTERNAL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const DOMAIN = process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'DesiXX'
const isAdultSite = process.env.NEXT_PUBLIC_SITE_MODE === 'adult'

// ─── Server-side metadata for each video page ────────────────────────────────
export async function generateMetadata({ params }) {
    const { id } = await params
    try {
        const data = await fetch(`${API_INTERNAL}/api/videos/${id}`, { next: { revalidate: 3600 } })
            .then(r => r.json())
        const { video } = data || {}
        if (!video) return {}

        const tags = video.tags?.map(t => t.name).join(', ') || ''
        const actors = video.actors?.map(a => a.name).join(', ') || ''
        const code = video.code ? `[${video.code}] ` : ''

        // Build SEO title with keywords
        const titleParts = [code + video.title]
        if (actors) titleParts.push(actors)
        if (isAdultSite) titleParts.push('Free Desi Indian Sex Video')
        const seoTitle = `${titleParts.join(' — ')} | ${SITE_NAME}`

        const descParts = [
            isAdultSite ? `Watch ${code}${video.title} free.` : `Watch ${video.title}.`,
            actors ? `Starring ${actors}.` : '',
            tags ? `Tags: ${tags}.` : '',
            video.genre ? `Genre: ${video.genre.name}.` : '',
            isAdultSite ? `Free HD Indian sex videos on ${SITE_NAME}.` : '',
        ].filter(Boolean)

        const thumbnailUrl = video.thumbnailPath
            ? `${DOMAIN}${video.thumbnailPath}`
            : `${DOMAIN}/og-default.jpg`

        return {
            title: seoTitle,
            description: descParts.join(' ').slice(0, 160),
            keywords: [tags, actors, video.genre?.name, isAdultSite ? 'desi sex video, indian porn, xxx, free sex video' : ''].filter(Boolean).join(', '),
            openGraph: {
                title: seoTitle,
                description: descParts.join(' ').slice(0, 160),
                type: 'video.other',
                siteName: SITE_NAME,
                images: [{ url: thumbnailUrl, width: 1280, height: 720, alt: video.title }],
                videos: video.hlsPath ? [{ url: `${DOMAIN}${video.hlsPath}`, type: 'application/x-mpegURL' }] : [],
            },
            twitter: {
                card: 'summary_large_image',
                title: seoTitle,
                description: descParts.join(' ').slice(0, 160),
                images: [thumbnailUrl],
            },
            alternates: { canonical: `${DOMAIN}/watch/${id}` },
        }
    } catch { return {} }
}

// ─── JSON-LD VideoObject structured data ─────────────────────────────────────
async function VideoSchema({ id }) {
    try {
        const data = await fetch(`${API_INTERNAL}/api/videos/${id}`, { next: { revalidate: 3600 } })
            .then(r => r.json())
        const { video } = data || {}
        if (!video) return null

        const thumbnailUrl = video.thumbnailPath
            ? `${DOMAIN}${video.thumbnailPath}`
            : null

        const schema = {
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            name: video.title,
            description: video.description || video.title,
            thumbnailUrl: thumbnailUrl,
            uploadDate: video.createdAt,
            duration: video.durationSeconds
                ? `PT${Math.floor(video.durationSeconds / 60)}M${video.durationSeconds % 60}S`
                : undefined,
            contentUrl: video.hlsPath ? `${DOMAIN}${video.hlsPath}` : undefined,
            embedUrl: `${DOMAIN}/watch/${video.id}`,
            publisher: {
                '@type': 'Organization',
                name: SITE_NAME,
                url: DOMAIN,
            },
            // Actors as schema.org Person
            actor: video.actors?.map(a => ({ '@type': 'Person', name: a.name })),
            genre: video.genre?.name,
            keywords: video.tags?.map(t => t.name).join(', '),
            interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/WatchAction',
                userInteractionCount: Number(video.viewsCount) || 0,
            },
        }

        return (
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
        )
    } catch { return null }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function WatchPage({ params }) {
    const { id } = await params
    return (
        <>
            <VideoSchema id={id} />
            <WatchPageClient id={id} />
        </>
    )
}
