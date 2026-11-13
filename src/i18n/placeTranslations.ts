// The interface and POI content are English only. POI text comes from the
// database (dbo.POI_LOCALIZATION, lang = 'en'), so nothing is hard-coded here.
import type { Locale } from './translations'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function localizedPlace<T>(place: T, _locale?: Locale): T {
  return place
}


export function localizedCampusAddress(campusId: string, _locale: Locale, original: string): string {
  return ({
    main: '273 An Duong Vuong Street, District 5, Ho Chi Minh City',
    'campus-1': '105 Ba Huyen Thanh Quan Street, Xuan Hoa Ward, Ho Chi Minh City',
    'campus-2': '4 Ton Duc Thang Street, Ho Chi Minh City',
  } as Record<string, string>)[campusId] ?? original
}
