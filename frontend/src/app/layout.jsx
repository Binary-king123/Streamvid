import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import AgeGateWrapper from '@/components/AgeGateWrapper'
import dynamic from 'next/dynamic'

const AdLoader = dynamic(() => import('@/components/AdLoader'), { ssr: false })


const inter = Inter({ subsets: ['latin'] })

const isAdultSite = process.env.NEXT_PUBLIC_SITE_MODE === 'adult'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || (isAdultSite ? 'DesiXX' : 'StreamVid')
const DOMAIN = process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com'

// ─── SEO Keyword Sets ────────────────────────────────────────────────────────
const ADULT_KEYWORDS = [
    // Indian / Desi
    'desi', 'indian sex', 'desi bhabhi', 'indian aunty', 'desi video', 'hindi sex',
    'indian porn', 'desi xxx', 'desi mms', 'tamil sex', 'telugu sex', 'mallu sex',
    'bengali sex', 'punjabi sex', 'desi girl sex', 'indian bhabhi', 'desi couple',
    'desi leaked', 'indian homemade', 'desi teen', 'village sex', 'bhabi sex',
    // Popular categories
    'milf', 'mature', 'indian milf', 'desi milf', 'aunty sex', 'hot aunty',
    'big boobs indian', 'chudai', 'chut', 'lund', 'xxx videos', 'hot videos',
    'sex videos', 'porn videos', 'free sex videos', 'hd sex videos',
    // Genres
    'amateur', 'homemade', 'hidden cam', 'mms video', 'leaked video',
    'office sex', 'romance', 'hardcore', 'blowjob', 'anal',
    // Technical terms that rank
    'free porn', 'watch sex videos', 'online sex videos', 'hd porn', 'xvideos',
    'xnxx', 'pornhub', 'xxx', 'sex', 'nude videos', 'hot sex',
].join(', ')

const MAINSTREAM_KEYWORDS = [
    'free videos', 'short videos', 'viral videos', 'trending videos',
    'watch videos online', 'hd videos', 'video streaming', 'online videos',
].join(', ')

export const metadata = {
    metadataBase: new URL(DOMAIN),
    title: {
        default: isAdultSite
            ? `${SITE_NAME} — Free Desi Indian Sex Videos, Bhabhi, Milf, XXX 18+`
            : `${SITE_NAME} — Free Short Videos`,
        template: `%s | ${SITE_NAME}`,
    },
    description: isAdultSite
        ? `Watch free desi Indian sex videos, hot bhabhi, milf, aunty, Tamil, Telugu, Mallu, Bengali XXX videos. Latest leaked MMS, homemade desi sex clips. HD Indian porn updated daily.`
        : `Watch free short-form videos. Trending content updated daily.`,
    keywords: isAdultSite ? ADULT_KEYWORDS : MAINSTREAM_KEYWORDS,
    robots: isAdultSite
        ? { index: true, follow: true, googleBot: { index: true, follow: true } }
        : { index: true, follow: true },
    openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        title: isAdultSite
            ? `${SITE_NAME} — Free Desi Indian Sex Videos 18+`
            : `${SITE_NAME} — Free Short Videos`,
        description: isAdultSite
            ? 'Free desi, Indian bhabhi, milf, aunty XXX videos. Updated every day.'
            : 'Free short-form videos updated daily.',
    },
    alternates: {
        canonical: DOMAIN,
    },
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                {/* Verification tags — add yours from Google Search Console */}
                {/* <meta name="google-site-verification" content="YOUR_CODE" /> */}

                {/* Preconnect to API/CDN for speed */}
                <link rel="preconnect" href={DOMAIN} />
                <link rel="dns-prefetch" href={DOMAIN} />
                {isAdultSite && (
                    // RTA label — required by most ad networks for adult sites
                    <meta name="rating" content="adult" />
                )}
            </head>
            <body className={inter.className}>
                <AgeGateWrapper isAdultSite={isAdultSite}>
                    <AdLoader />
                    <Navbar siteName={SITE_NAME} isAdultSite={isAdultSite} />
                    <main style={{ minHeight: 'calc(100vh - 60px)' }}>
                        {children}
                    </main>
                    <footer style={{
                        textAlign: 'center', padding: '24px', color: 'var(--text-muted)',
                        fontSize: 12, borderTop: '1px solid var(--border)'
                    }}>
                        {isAdultSite
                            ? `© ${new Date().getFullYear()} ${SITE_NAME} — 18+ Adults Only. All models are 18 years or older.`
                            : `© ${new Date().getFullYear()} ${SITE_NAME}`}
                    </footer>
                </AgeGateWrapper>
            </body>
        </html>
    )
}
