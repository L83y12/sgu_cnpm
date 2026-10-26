import sguBuilding from '../../../assets/sgu-building.png'

export type DemoPlaceCategory = 'Kiến trúc' | 'Học tập' | 'Ẩm thực' | 'Không gian xanh' | 'Thể thao'
export type CampusId = 'main' | 'campus-1' | 'campus-2'

export interface DemoPlace {
  id: number
  name: string
  category: DemoPlaceCategory
  description: string
  narration?: string
  distance: string
  walk: string
  rating: string
  image: string
  tag: string
  location: string
  lat: number
  lng: number
  campusId: CampusId
}

function place(
  id: number,
  name: string,
  category: DemoPlaceCategory,
  lat: number,
  lng: number,
  campusId: CampusId,
  location: string,
  description = `Địa điểm ${name} tại ${location}. Hãy theo dõi bảng chỉ dẫn tại chỗ khi tham quan.`,
): DemoPlace {
  return {
    id,
    name,
    category,
    description,
    narration: description,
    distance: 'Trong khuôn viên',
    walk: '—',
    rating: '—',
    image: sguBuilding,
    tag: category,
    location,
    lat,
    lng,
    campusId,
  }
}

export const demoPlaces: DemoPlace[] = [
  place(1, 'Tòa nhà chính SGU - Tòa C', 'Kiến trúc', 10.759988109684326, 106.68214083789893, 'main', '273 An Dương Vương, TP.HCM'),
  place(2, 'Trung tâm học liệu - KLF', 'Học tập', 10.759846314437505, 106.68250612374378, 'main', 'Cơ sở chính SGU'),
  place(5, 'Sân bóng chuyền', 'Thể thao', 10.759754176422225, 106.68234773658983, 'main', 'Cơ sở chính SGU'),
  place(6, 'Căn tin', 'Ẩm thực', 10.759644137207344, 106.68199776223139, 'main', 'Cơ sở chính SGU'),
  place(7, 'Khu B', 'Học tập', 10.759486821794933, 106.68235634484213, 'main', 'Cơ sở chính SGU'),
  place(8, 'Phòng Khảo thí và Đảm bảo chất lượng giáo dục', 'Học tập', 10.759229251078123, 106.68294766487438, 'main', 'Cơ sở chính SGU'),
  place(9, 'Sân bóng đá', 'Thể thao', 10.75964525637814, 106.68143341142253, 'main', 'Cơ sở chính SGU'),
  place(10, 'Nhà đa năng - sân bóng rổ', 'Thể thao', 10.75957763302768, 106.68181199492993, 'main', 'Nhà đa năng, Cơ sở chính SGU'),
  place(11, 'Nhà đa năng - sân cầu lông', 'Thể thao', 10.759480794792038, 106.68153036298408, 'main', 'Nhà đa năng, Cơ sở chính SGU'),
  place(12, 'Nhà đa năng - khu vực bóng bàn', 'Thể thao', 10.759316762604941, 106.68158199550778, 'main', 'Nhà đa năng, Cơ sở chính SGU'),
  place(13, 'Tòa E', 'Kiến trúc', 10.759056558527996, 106.6818267073545, 'main', 'Cơ sở chính SGU'),
  place(14, 'Tòa A', 'Kiến trúc', 10.75909281217745, 106.68241024658684, 'main', 'Cơ sở chính SGU'),
  place(15, 'Tòa nhà hội trường A', 'Học tập', 10.759629468856865, 106.6830846497268, 'main', 'Cơ sở chính SGU'),
  place(16, 'Khu tự học (1)', 'Học tập', 10.760005861266407, 106.68255311273134, 'main', 'Cơ sở chính SGU'),
  place(17, 'Khu tự học (2)', 'Học tập', 10.759748943794909, 106.68265168391322, 'main', 'Cơ sở chính SGU'),
  place(18, 'Hội trường C', 'Học tập', 10.76008934399489, 106.68244113162366, 'main', 'Cơ sở chính SGU'),
  place(19, 'Hội trường B', 'Học tập', 10.759622281169316, 106.68262352183645, 'main', 'Cơ sở chính SGU'),
  place(20, 'Khu Hiệu Bộ - HB', 'Kiến trúc', 10.76046995404809, 106.68224883220537, 'main', 'Cơ sở chính SGU'),
  place(21, 'Tòa D', 'Kiến trúc', 10.760277065043367, 106.68176021257332, 'main', 'Cơ sở chính SGU'),
  place(22, 'Tòa A', 'Kiến trúc', 10.779236017474704, 106.68458720350972, 'campus-1', '105 Bà Huyện Thanh Quan, TP.HCM'),
  place(23, 'Khu tự học', 'Học tập', 10.77927488221519, 106.6842995360494, 'campus-1', 'Cơ sở 1'),
  place(24, 'Tòa B', 'Kiến trúc', 10.779278175818034, 106.68389116972537, 'campus-1', 'Cơ sở 1'),
  place(25, 'Tòa C', 'Kiến trúc', 10.77907858349214, 106.68352169543397, 'campus-1', 'Cơ sở 1'),
  place(26, 'Căn tin', 'Ẩm thực', 10.77915631253372, 106.68347207456736, 'campus-1', 'Cơ sở 1'),
  place(27, 'Tòa B', 'Kiến trúc', 10.782978273047895, 106.7061686392335, 'campus-2', '4 Tôn Đức Thắng, TP.HCM'),
  place(28, 'Tòa A', 'Kiến trúc', 10.783124472482674, 106.70595754077915, 'campus-2', 'Cơ sở 2'),
  place(29, 'Tòa C', 'Kiến trúc', 10.783606678010011, 106.70673011804736, 'campus-2', 'Cơ sở 2'),
]
