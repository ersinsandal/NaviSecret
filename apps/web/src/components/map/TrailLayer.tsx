import { useEffect, useState } from 'react'
import { Polyline } from 'react-leaflet'
import type { LocationCore, LocationHistoryRow } from '@navisecret/sdk'

interface TrailLayerProps {
  sdk: LocationCore
}

interface TrailSegment {
  positions: [number, number][]
  opacity: number
  weight: number
  color: string
}

const SELF_COLOR = '#00F5B8'
const FRIEND_COLORS = ['#8B5CF6', '#38BDF8', '#FFB800', '#F43F5E', '#A855F7', '#06B6D4']

function getTimeStyle(recordedAt: string): { opacity: number; weight: number } {
  const age = Date.now() - new Date(recordedAt).getTime()
  const hours = age / 3600000
  if (hours < 1) return { opacity: 0.8, weight: 4 }
  if (hours < 4) return { opacity: 0.5, weight: 3 }
  if (hours < 12) return { opacity: 0.3, weight: 2 }
  return { opacity: 0.15, weight: 2 }
}

const GAP_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

function buildSegments(history: LocationHistoryRow[], color: string): TrailSegment[] {
  if (history.length < 2) return []
  // SDK returns DESC (newest first) — reverse to chronological order
  const sorted = [...history].reverse()
  const segments: TrailSegment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    const gap = new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    if (gap > GAP_THRESHOLD_MS) continue
    const style = getTimeStyle(a.recorded_at)
    segments.push({
      positions: [[a.lat, a.lon], [b.lat, b.lon]],
      ...style,
      color,
    })
  }
  return segments
}

async function fetchRealTrails(sdk: LocationCore): Promise<TrailSegment[]> {
  const since = new Date(Date.now() - 24 * 3600000)
  const user = await (sdk as any).getCurrentUser?.()
  if (!user) return []

  const allSegments: TrailSegment[] = []

  // Fetch own real history from PostgreSQL locations_history
  try {
    const myHistory = await sdk.getLocationHistory(user.id, { limit: 500, since })
    if (myHistory.length >= 2) {
      allSegments.push(...buildSegments(myHistory, SELF_COLOR))
    }
  } catch {
    // If table is empty or permission restricted, return empty
  }

  // Fetch trail-visible friends from PostgreSQL
  try {
    const friendIds = await sdk.getTrailFriendIds()
    if (friendIds.length > 0) {
      const results = await Promise.allSettled(
        friendIds.slice(0, 10).map((id, idx) =>
          sdk.getLocationHistory(id, { limit: 500, since }).then(h => ({
            history: h,
            color: FRIEND_COLORS[idx % FRIEND_COLORS.length],
          }))
        )
      )
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allSegments.push(...buildSegments(result.value.history, result.value.color))
        }
      }
    }
  } catch {
    // No friends sharing history
  }

  return allSegments
}

export default function TrailLayer({ sdk }: TrailLayerProps) {
  const [segments, setSegments] = useState<TrailSegment[]>([])

  useEffect(() => {
    let cancelled = false

    const fetchTrails = async () => {
      if (cancelled) return
      try {
        const realSegments = await fetchRealTrails(sdk)
        if (!cancelled) {
          setSegments(realSegments)
        }
      } catch {
        if (!cancelled) setSegments([])
      }
    }

    fetchTrails()
    const interval = setInterval(fetchTrails, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [sdk])

  if (segments.length === 0) return null

  return (
    <>
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.positions}
          pathOptions={{ color: seg.color, opacity: seg.opacity, weight: seg.weight }}
        />
      ))}
    </>
  )
}
