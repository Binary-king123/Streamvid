import TagPageClient from './TagPageClient'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'https://yourdomain.com'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'StreamVid'

export async function generateMetadata({ params }) {
    const { slug } = await params
    try {
        const data = await fetch(`${API}/api/videos/tag/${slug}?page=1`, { next: { revalidate: 3600 } }).then(r => r.json())
        const tag = data?.tag
        if (!tag) return {}
        const title = `#${tag.name} Videos — Free ${tag.name} Porn | ${SITE_NAME}`
        const description = `Watch ${data.total || 0}+ free ${tag.name} videos. All the best ${tag.name} sex videos updated daily on ${SITE_NAME}.`
        return {
            title,
            description,
            keywords: `${tag.name}, ${tag.name} videos, ${tag.name} porn`,
            openGraph: { title, description, siteName: SITE_NAME, type: 'website' },
            twitter: { card: 'summary', title, description },
            alternates: { canonical: `${DOMAIN}/tag/${slug}` },
        }
    } catch { return {} }
}

export default async function TagPage({ params }) {
    const { slug } = await params
    return <TagPageClient slug={slug} />
}
