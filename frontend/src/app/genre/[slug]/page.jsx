import GenrePageClient from './GenrePageClient'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'https://yourdomain.com'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'StreamVid'

export async function generateMetadata({ params }) {
    const { slug } = await params
    try {
        const data = await fetch(`${API}/api/videos/genre/${slug}?page=1`, { next: { revalidate: 3600 } }).then(r => r.json())
        const genre = data?.genre
        if (!genre) return {}
        const title = `${genre.name} Videos — Free ${genre.name} Porn | ${SITE_NAME}`
        const description = `Watch the best ${genre.name} videos online. Browse ${data.total || 0}+ free ${genre.name} sex videos. Updated daily on ${SITE_NAME}.`
        return {
            title,
            description,
            keywords: `${genre.name}, ${genre.name} videos, free ${genre.name} porn`,
            openGraph: { title, description, siteName: SITE_NAME, type: 'website' },
            twitter: { card: 'summary', title, description },
            alternates: { canonical: `${DOMAIN}/genre/${slug}` },
        }
    } catch { return {} }
}

export default async function GenrePage({ params }) {
    const { slug } = await params
    return <GenrePageClient slug={slug} />
}
