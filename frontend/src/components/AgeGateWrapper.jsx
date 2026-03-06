'use client'
import dynamic from 'next/dynamic'

const AgeGate = dynamic(() => import('./AgeGate'), { ssr: false })

export default function AgeGateWrapper({ isAdultSite, children }) {
    if (!isAdultSite) return children
    return <AgeGate>{children}</AgeGate>
}
