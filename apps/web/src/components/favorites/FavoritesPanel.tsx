import { useState, useEffect } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import type { FavoritePlace, PlaceType } from '@navisecret/sdk'
import { NaviIcon } from '@/components/common/NaviIcons'

const PLACE_TYPES: { type: PlaceType; label: string }[] = [
  { type: 'home', label: 'Home' },
  { type: 'work', label: 'Work' },
  { type: 'school', label: 'School' },
  { type: 'gym', label: 'Gym' },
  { type: 'custom', label: 'Custom' },
]

interface FavoritesPanelProps {
  currentLocation?: { lat: number; lon: number } | null
}

export default function FavoritesPanel({ currentLocation }: FavoritesPanelProps) {
  const core = useSdk()

  const [places, setPlaces] = useState<FavoritePlace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [atPlace, setAtPlace] = useState<FavoritePlace | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<PlaceType>('custom')
  const [formLat, setFormLat] = useState('')
  const [formLon, setFormLon] = useState('')
  const [formRadius, setFormRadius] = useState('100')
  const [formIcon, setFormIcon] = useState('')

  useEffect(() => {
    loadPlaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core])

  useEffect(() => {
    if (currentLocation) {
      core
        .checkAtFavoritePlace(currentLocation.lat, currentLocation.lon)
        .then(setAtPlace)
        .catch(() => {})
    }
  }, [currentLocation, core])

  async function loadPlaces() {
    try {
      setLoading(true)
      setError('')
      const p = await core.getFavoritePlaces()
      setPlaces(p)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormName('')
    setFormType('custom')
    setFormLat(currentLocation?.lat.toString() ?? '')
    setFormLon(currentLocation?.lon.toString() ?? '')
    setFormRadius('100')
    setFormIcon('')
    setEditingId(null)
    setShowAdd(false)
  }

  function startAdd() {
    resetForm()
    setFormLat(currentLocation?.lat.toString() ?? '')
    setFormLon(currentLocation?.lon.toString() ?? '')
    setShowAdd(true)
  }

  function startEdit(place: FavoritePlace) {
    setFormName(place.name)
    setFormType(place.place_type)
    setFormLat(place.lat.toString())
    setFormLon(place.lon.toString())
    setFormRadius(place.radius_meters.toString())
    setFormIcon(place.icon ?? '')
    setEditingId(place.id)
    setShowAdd(true)
  }

  async function handleSubmit() {
    if (!formName.trim()) return
    const lat = parseFloat(formLat)
    const lon = parseFloat(formLon)
    const radius = parseInt(formRadius, 10)
    if (
      isNaN(lat) ||
      isNaN(lon) ||
      isNaN(radius) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180 ||
      radius < 1 ||
      radius > 100000
    ) {
      setError('Invalid geographical coordinates or geofence radius')
      return
    }
    try {
      setError('')
      if (editingId) {
        await core.updateFavoritePlace(editingId, {
          name: formName.trim(),
          place_type: formType,
          lat,
          lon,
          radius_meters: radius,
          icon: formIcon || null,
        })
      } else {
        await core.addFavoritePlace({
          name: formName.trim(),
          place_type: formType,
          lat,
          lon,
          radius_meters: radius,
          icon: formIcon || null,
        })
      }
      resetForm()
      await loadPlaces()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this saved place?')) return
    try {
      await core.deleteFavoritePlace(id)
      await loadPlaces()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function distanceText(place: FavoritePlace): string | null {
    if (!currentLocation) return null
    const d = core.calculateDistance(currentLocation.lat, currentLocation.lon, place.lat, place.lon)
    return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-xs">
        <span className="w-2 h-2 rounded-full bg-[#FFB800] animate-ping" />
        <p>Loading saved places...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

      {/* Current Location Alert */}
      {atPlace && (
        <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-[#00B894] flex items-center gap-2.5 shadow-xs">
          <NaviIcon.Pin size={18} className="text-[#00B894] shrink-0" />
          <div className="text-xs">
            <span className="text-slate-600">Currently at: </span>
            <strong className="text-slate-900 font-bold">{atPlace.name}</strong>
          </div>
        </div>
      )}

      {/* Place Creation / Edit Card */}
      {showAdd ? (
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <NaviIcon.Capsule size={14} className="text-[#FFB800]" />
              <span>{editingId ? 'Edit Place' : 'Add New Place'}</span>
            </h4>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              <NaviIcon.Close size={14} />
            </button>
          </div>

          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Place name (e.g., Home, Office, Gym)"
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-[#00B894] font-sans"
          />

          {/* Place Type Pills */}
          <div className="flex gap-1.5 flex-wrap">
            {PLACE_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => setFormType(t.type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  formType === t.type
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-500">Latitude</label>
              <input
                value={formLat}
                onChange={(e) => setFormLat(e.target.value)}
                placeholder="Latitude"
                type="number"
                step="any"
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500">Longitude</label>
              <input
                value={formLon}
                onChange={(e) => setFormLon(e.target.value)}
                placeholder="Longitude"
                type="number"
                step="any"
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500">Radius (meters)</label>
            <input
              value={formRadius}
              onChange={(e) => setFormRadius(e.target.value)}
              placeholder="Radius (e.g., 100)"
              type="number"
              className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none font-sans"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] transition-colors cursor-pointer shadow-xs"
            >
              {editingId ? 'Save Changes' : 'Save Place'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="w-full py-2.5 rounded-2xl text-xs font-bold bg-white/90 hover:bg-white border border-slate-200 text-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <NaviIcon.Pin size={14} className="text-[#FFB800]" />
          <span>+ Add New Place</span>
        </button>
      )}

      {/* Places List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Saved Places ({places.length})
        </h4>
        {places.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No saved places yet
          </p>
        ) : (
          <div className="space-y-2">
            {places.map((place) => (
              <div
                key={place.id}
                className={`p-3.5 rounded-2xl bg-white/90 border transition-all shadow-xs ${
                  atPlace?.id === place.id
                    ? 'border-[#00B894] ring-1 ring-[#00B894]/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                      <NaviIcon.Pin size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{place.name}</p>
                      <p className="text-[11px] text-slate-500 capitalize">
                        {place.place_type} (±{place.radius_meters}m)
                        {distanceText(place) ? ` · ${distanceText(place)} away` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(place)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(place.id)}
                      className="text-xs font-medium text-rose-500 hover:text-rose-600 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
