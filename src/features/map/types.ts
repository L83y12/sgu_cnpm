import type { MappablePoi, Poi } from '../poi/types'

export interface CampusMapProps {
  pois: readonly MappablePoi[]
  selectedPoiId?: Poi['id']
  onSelectPoi: (poiId: Poi['id']) => void
}
