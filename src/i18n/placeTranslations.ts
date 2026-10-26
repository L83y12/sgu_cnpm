import type { Locale } from './translations'

type PlaceCopy = { name: string; description: string; narration: string; tag?: string; location?: string; distance?: string }

const english: Record<number, PlaceCopy> = {
  1: { name: 'SGU Main Building – Building C', description: 'A landmark building that preserves the character and history of Saigon University.', narration: 'You are at Building C, one of the recognizable landmarks on Saigon University’s main campus. Notice the details of the facade and its distinctive arched entrance before continuing to your next stop.', tag: 'SGU landmark', location: '273 An Duong Vuong Street, District 5' },
  2: { name: 'KLF Learning Resource Center', description: 'A quiet place for reading, group study, and exploring learning resources.', narration: 'This is the KLF Learning Resource Center, a space for studying and consulting learning materials. Check the posted opening hours and visitor guidance if you plan to go inside.', tag: 'Quiet corner', location: 'KLF Library, Saigon University' },
  5: { name: 'Volleyball Court', description: 'An outdoor volleyball court on SGU’s main campus.', narration: 'This is the outdoor volleyball court on the main campus, used for exercise and sports activities. Please check the court schedule and give way to classes or teams that are practicing.', location: 'SGU Main Campus' },
  6: { name: 'Main Campus Cafeteria', description: 'A convenient place for students to take a break and have a meal.', narration: 'You are at the main campus cafeteria, where students can take a break and have a meal. Menus and service hours may change, so please check with the counter when you visit.', location: 'SGU Main Campus' },
  7: { name: 'Building B', description: 'Use the building signs and campus directories to find classrooms and university offices.', narration: 'This is Building B on the main campus. Check the building signs and directory near the entrances to find the classroom or office you need.', tag: 'Campus building', location: 'SGU Main Campus' },
  8: { name: 'Testing and Educational Quality Assurance Office', description: 'The university office responsible for examinations and educational quality assurance.', narration: 'This is the Office of Testing and Educational Quality Assurance. For assistance or contact details, please check the information posted at the office.', tag: 'University office', location: 'SGU Main Campus' },
  9: { name: 'Football Field', description: 'An outdoor sports field on SGU’s main campus.', narration: 'You are at the main campus football field, an outdoor space for sports and recreation. Please check the schedule and take care when a match or practice is in progress.', location: 'SGU Main Campus' },
  10: { name: 'Multipurpose Hall – Basketball Court', description: 'An indoor court for basketball practice and games.', narration: 'This is the basketball court in the main campus multipurpose hall. Please check the schedule before entering for practice or a game.', location: 'Multipurpose Hall, SGU Main Campus' },
  11: { name: 'Multipurpose Hall – Badminton Court', description: 'Indoor badminton courts in the university multipurpose hall.', narration: 'This is the badminton area in the multipurpose hall. Follow the court markings and check the booking or usage information posted at the venue.', location: 'Multipurpose Hall, SGU Main Campus' },
  12: { name: 'Multipurpose Hall – Table Tennis Area', description: 'An indoor area for table tennis practice and friendly games.', narration: 'This is the table tennis area in the multipurpose hall. Please use the tables and shared equipment carefully and follow the university’s facility guidelines.', location: 'Multipurpose Hall, SGU Main Campus' },
  13: { name: 'Building E', description: 'A campus building. Use the floor directory and room numbers to find your destination.', narration: 'You are at Building E on the main campus. Check the floor directory and room numbers to find the classroom or area you are looking for.', tag: 'Campus building', location: 'SGU Main Campus' },
  14: { name: 'Building A', description: 'A campus building. Check the floor directory and room numbers to find your way around.', narration: 'This is Building A on the main campus. Check the floor directory and room numbers to find your destination, or ask the staff for guidance.', tag: 'Campus building', location: 'SGU Main Campus' },
  15: { name: 'Auditorium A', description: 'A venue for university events, programs, and shared activities.', narration: 'This is Auditorium A, a venue for university programs and events. Check the event information for its time, entrance, and seating arrangements.', tag: 'Auditorium', location: 'SGU Main Campus' },
  16: { name: 'Self-Study Area 1', description: 'A space for individual study and group work. Please keep the area quiet.', narration: 'You are at Self-Study Area 1 on the main campus. It is intended for individual study and group work. Please keep your voice low and follow the posted rules.', tag: 'Study space', location: 'SGU Main Campus' },
  17: { name: 'Self-Study Area 2', description: 'A shared space for reviewing lessons and working with classmates.', narration: 'This is Self-Study Area 2 on the main campus. You can use it to review lessons or work with classmates. Please take care of the furniture and shared space.', tag: 'Study space', location: 'SGU Main Campus' },
  18: { name: 'Auditorium C', description: 'A university venue for meetings and campus activities.', narration: 'You are at Auditorium C on the main campus. Check the notice board at the entrance for the schedule and visitor guidance.', tag: 'Auditorium', location: 'SGU Main Campus' },
  19: { name: 'Auditorium B', description: 'A campus venue for university programs and events.', narration: 'This is Auditorium B on the main campus. If you are attending an event, check the notice at the entrance for its start time and the correct entry area.', tag: 'Auditorium', location: 'SGU Main Campus' },
  20: { name: 'Administration Building', description: 'The university’s administrative offices. Follow the visitor signs at the entrance.', narration: 'You are at the Administration Building, marked HB on the main campus map. Visitors should check the guidance board and follow the instructions at the entrance.', tag: 'University office', location: 'SGU Main Campus' },
  21: { name: 'Building D', description: 'Use the building sign, floor directory, and room numbers to find your destination.', narration: 'This is Building D on the main campus. Use the building sign, floor directory, and room numbers to find your destination, then continue your campus visit with the map.', tag: 'Campus building', location: 'SGU Main Campus' },
  22: { name: 'Building A – Campus 1', description: 'Check the directory and room numbers to find a classroom or office.', narration: 'You are at Building A on Campus 1. Check the directory and room numbers to find the classroom or office you need.', tag: 'Campus building', location: 'SGU Campus 1' },
  23: { name: 'Study Area – Campus 1', description: 'A place to study quietly or work with classmates. Please follow the room rules.', narration: 'This is the study area on Campus 1. You can focus on your work or study with classmates. Please keep the area quiet and follow its rules.', tag: 'Study space', location: 'SGU Campus 1' },
  24: { name: 'Building B – Campus 1', description: 'Use the room signs and directory to find the right classroom or office.', narration: 'This is Building B on Campus 1. Check the room numbers and signs along the corridors to find the classroom or office you are looking for.', tag: 'Campus building', location: 'SGU Campus 1' },
  25: { name: 'Building C – Campus 1', description: 'A campus building. Check the building sign and floor directory before you go.', narration: 'This is Building C on Campus 1. Check the building sign and floor directory to find your classroom before moving on.', tag: 'Campus building', location: 'SGU Campus 1' },
  26: { name: 'Cafeteria – Campus 1', description: 'A place to take a break and have a meal on Campus 1.', narration: 'You are at the cafeteria on Campus 1. You can stop here for a meal or a short break. Check the service hours and menu at the counter.', location: 'SGU Campus 1' },
  27: { name: 'Building B – Campus 2', description: 'Use the building signs and floor directory to locate a classroom or office.', narration: 'This is Building B on Campus 2. Use the building signs and directory to find the classroom or office you need.', tag: 'Campus building', location: 'SGU Campus 2' },
  28: { name: 'Building A – Campus 2', description: 'Check the room numbers and visitor signs to find your way around.', narration: 'You are at Building A on Campus 2. Check the room numbers and signs to find the right route to your destination.', tag: 'Campus building', location: 'SGU Campus 2' },
  29: { name: 'Building C – Campus 2', description: 'Use the building directory to find a classroom or university office.', narration: 'This is Building C on Campus 2. Check the directory in the area to find the classroom or university office you want to visit.', tag: 'Campus building', location: 'SGU Campus 2' },
}

export function localizedPlace<T extends { id: number; name: string; description: string; narration?: string; tag: string; location: string; distance: string }>(place: T, locale: Locale): T {
  if (locale === 'vi') return place
  const copy = locale === 'en' ? english[place.id] : undefined
  if (copy) return { ...place, ...copy, distance: copy.distance ?? (place.distance === 'Trong khuôn viên' ? 'On campus' : place.distance) } as T
  if (locale === 'en') {
    return {
      ...place,
      description: `Explore ${place.name} on the SGU campus. Check the information posted at the location before your visit.`,
      narration: `You are at ${place.name} on the SGU campus. Check the information posted at the location and enjoy your visit.`,
      tag: 'Campus place',
      distance: place.distance === 'Trong khuôn viên' ? 'On campus' : place.distance,
    } as T
  }

  // Keep proper names intact for locales without a reviewed POI translation.
  return place
}

export function narrationLanguage(locale: Locale): string {
  return ({ vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', ja: 'ja-JP', zh: 'zh-CN' })[locale]
}

export function localizedCampusAddress(campusId: string, locale: Locale, original: string): string {
  if (locale !== 'en') return original
  return ({
    main: '273 An Duong Vuong Street, District 5, Ho Chi Minh City',
    'campus-1': '105 Ba Huyen Thanh Quan Street, Xuan Hoa Ward, Ho Chi Minh City',
    'campus-2': '4 Ton Duc Thang Street, Ho Chi Minh City',
  } as Record<string, string>)[campusId] ?? original
}
