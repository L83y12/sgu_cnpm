import sguBuilding from '../../../assets/sgu-building.png'

export type DemoPlaceCategory = 'Kiến trúc' | 'Học tập' | 'Ẩm thực' | 'Không gian xanh'

export interface DemoPlace {
  id: number
  name: string
  category: DemoPlaceCategory
  description: string
  distance: string
  walk: string
  rating: string
  image: string
  tag: string
  location: string
}

export const demoPlaces: DemoPlace[] = [
  {
    id: 1,
    name: 'Tòa nhà chính SGU',
    category: 'Kiến trúc',
    description: 'Một góc Sài Gòn xưa giữa lòng khuôn viên đại học, nơi lưu giữ những câu chuyện của nhiều thế hệ sinh viên.',
    distance: '120 m',
    walk: '2 phút',
    rating: '4.9',
    tag: 'Biểu tượng SGU',
    location: '273 An Dương Vương, Quận 5',
    image: sguBuilding,
  },
  {
    id: 2,
    name: 'Thư viện trung tâm',
    category: 'Học tập',
    description: 'Không gian yên tĩnh để đọc, học nhóm và khám phá kho tài liệu dành cho sinh viên.',
    distance: '260 m',
    walk: '4 phút',
    rating: '4.8',
    tag: 'Góc yên tĩnh',
    location: 'Khu B, Trường Đại học Sài Gòn',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 3,
    name: 'Sân trường thân quen',
    category: 'Không gian xanh',
    description: 'Hàng cây rợp bóng và những chiếc ghế đá quen thuộc — điểm hẹn giữa các tiết học.',
    distance: '340 m',
    walk: '5 phút',
    rating: '4.7',
    tag: 'Được yêu thích',
    location: 'Sân trung tâm, SGU',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 4,
    name: 'Cà phê Góc Nhỏ',
    category: 'Ẩm thực',
    description: 'Cà phê rang thơm, món ăn nhẹ và một chỗ nghỉ chân dễ chịu sau vòng tham quan.',
    distance: '450 m',
    walk: '6 phút',
    rating: '4.6',
    tag: 'Sinh viên gợi ý',
    location: 'Nguyễn Trãi, Quận 5',
    image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1000&q=85',
  },
]
