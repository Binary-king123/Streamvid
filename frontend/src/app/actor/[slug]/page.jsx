import ActorPageClient from './ActorPageClient'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'https://yourdomain.com'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'StreamVid'

export async function generateMetadata({ params }) {
    const { slug } = await params
    try {
        const data = await fetch(`${API}/api/videos/actor/${slug}?page=1`, { next: { revalidate: 3600 } }).then(r => r.json())
        const actor = data?.actor
        if (!actor) return {}
        const title = `${actor.name} Videos — Free ${actor.name} Porn | ${SITE_NAME}`
        const description = `Watch ${data.total || 0}+ free ${actor.name} sex videos. All ${actor.name} videos available free on ${SITE_NAME}.`
        return {
            title,
            description,
            keywords: `${actor.name}, ${actor.name} videos, ${actor.name} porn`,
            openGraph: { title, description, siteName: SITE_NAME, type: 'profile' },
            twitter: { card: 'summary', title, description },
            alternates: { canonical: `${DOMAIN}/actor/${slug}` },
        }
    } catch { return {} }
}

export default async function ActorPage({ params }) {
    const { slug } = await params
    return <ActorPageClient slug={slug} />
}
