import { MetadataRoute } from 'next'

export default function robots() {
    const domain = process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com'
    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/watch/', '/genre/', '/tag/', '/actor/'],
                disallow: ['/admin', '/api/'],
            }
        ],
        sitemap: `${domain}/sitemap.xml`,
        host: domain,
    }
}
