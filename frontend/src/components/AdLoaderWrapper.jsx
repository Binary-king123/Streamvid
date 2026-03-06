'use client'
import dynamic from 'next/dynamic'

// Must be a Client Component wrapper — `ssr: false` not allowed in Server Components
const AdLoader = dynamic(() => import('./AdLoader'), { ssr: false })

export default function AdLoaderWrapper() {
    return <AdLoader />
}
