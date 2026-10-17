import { useEffect, useState } from 'react'
import { Rectangle } from 'react-leaflet'
import { decodeGeohash } from '@navisecret/sdk'
import type { LocationCore } from '@navisecret/sdk'

interface ExplorationLayerProps {
  sdk: LocationCore
}

interface CellDisplay {
  id: string
  bounds: [[number, number], [number, number]]
  visit_count: number
}

export default function ExplorationLayer({ sdk }: ExplorationLayerProps) {
  const [cells, setCells] = useState<CellDisplay[]>([])

  useEffect(() => {
    let cancelled = false

    const fetchCells = async () => {
      try {
        const data = await sdk.getMyVisitedCells()
        if (!cancelled) {
          const realCells: CellDisplay[] = data.map((c) => {
            const { lat, lon } = decodeGeohash(c.geohash)
            const dlat = 0.00068
            const dlon = 0.00086
            return {
              id: c.geohash,
              bounds: [
                [lat - dlat, lon - dlon],
                [lat + dlat, lon + dlon],
              ] as [[number, number], [number, number]],
              visit_count: c.visit_count,
            }
          })
          setCells(realCells)
        }
      } catch {
        if (!cancelled) setCells([])
      }
    }

    fetchCells()
    const interval = setInterval(fetchCells, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [sdk])

  if (cells.length === 0) return null

  const maxVisits = Math.max(1, ...cells.map((c) => c.visit_count))

  return (
    <>
      {cells.map((cell) => {
        const baseOpacity = 0.15
        const maxOpacity = 0.55
        const opacity = baseOpacity + (cell.visit_count / maxVisits) * (maxOpacity - baseOpacity)
        return (
          <Rectangle
            key={cell.id}
            bounds={cell.bounds}
            pathOptions={{
              color: '#00F5B8',
              fillColor: '#00F5B8',
              fillOpacity: opacity,
              weight: 0.8,
              opacity: 0.45,
            }}
          />
        )
      })}
    </>
  )
}
