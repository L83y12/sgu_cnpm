export interface GeoCoordinates {
  latitude: number
  longitude: number
}

export interface Poi {
  id: string
  name: string
  description: string
  category: string
  imageUrl?: string
  coordinates?: GeoCoordinates
}

export interface MappablePoi extends Poi {
  coordinates: GeoCoordinates
}

export interface PoiCardProps {
  poi: Poi
  onSelect?: (poiId: Poi['id']) => void
}

export interface PoiListProps {
  pois: readonly Poi[]
  selectedPoiId?: Poi['id']
  onSelectPoi: (poiId: Poi['id']) => void
}
