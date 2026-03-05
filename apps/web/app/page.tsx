'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFamilyStore } from '@/src/lib/store/familyStore'

export default function RootPage() {
  const router = useRouter()
  const family = useFamilyStore((s) => s.family)

  useEffect(() => {
    if (family) router.replace('/home/transactions')
    else router.replace('/welcome')
  }, [family, router])

  return null
}
