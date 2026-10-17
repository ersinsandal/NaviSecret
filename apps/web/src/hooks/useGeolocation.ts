import { useEffect, useRef, useState, useCallback } from 'react'

export interface GeolocationState {
  lat: number | null
  lon: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
  retry: () => void
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<Omit<GeolocationState, 'retry'>>({
    lat: null,
    lon: null,
    accuracy: null,
    error: null,
    loading: true,
  })
  const watchId = useRef<number | null>(null)

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        loading: false,
      }))
      return
    }

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        })
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          error: err.message,
          loading: false,
        }))
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      },
    )
  }, [])

  useEffect(() => {
    startWatching()
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [startWatching])

  return { ...state, retry: startWatching }
}

