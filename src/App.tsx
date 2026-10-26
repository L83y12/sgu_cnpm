import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import sguBuilding from './assets/sgu-building.png'
import auditoriumAMain from './assets/hoi-truong-a-co-so-chinh.jpg'
import tableTennisMain from './assets/bong-ban-co-so-chinh.jpg'
import badmintonCourtMain from './assets/san-cau-long-co-so-chinh.jpg'
import volleyballCourtMain from './assets/san-bong-chuyen-co-so-chinh.jpg'
import soccerFieldMain from './assets/san-bong-da-co-so-chinh.jpg'
import basketballCourtMain from './assets/san-bong-ro-co-so-chinh.jpg'
import toaACampusOne from './assets/toa-a-coso-1.jpg'
import toaBCampusOne from './assets/toa-b-coso-1.jpg'
import toaCCampusOne from './assets/toa-c-coso-1.jpg'
import canteenCampusOne from './assets/cantin-coso-1.jpg'
import studySpaceMainOne from './assets/khu-tu-hoc-1-co-so-chinh.jpg'
import canteenMain from './assets/cantin-co-so-chinh.jpg'
import klfMain from './assets/klf-co-so-chinh.jpg'
import buildingEMain from './assets/toa-e-co-so-chinh.jpg'
import adminBuildingMain from './assets/khu-hieu-bo-co-so-chinh.jpg'
import buildingAMain from './assets/toa-a-co-so-chinh.jpg'
import buildingCMain from './assets/toa-c-co-so-chinh.jpg'
import buildingDMain from './assets/toa-d-co-so-chinh.jpg'
import { LeafletMapView, type MapPoi } from './features/map/LeafletMapView'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { AdminLogin } from './features/admin/AdminLogin'
import { clearAdminToken, fetchPublishedPois, getAdminToken } from './features/admin/adminApi'
import { fetchAnalytics, reportListeningEnd, reportListeningStart, sendHeartbeat, type AnalyticsSnapshot } from './analytics'
import { localeOptions, translate, type Locale, type TranslationKey } from './i18n/translations'
import './App.css'

type Category = 'Tất cả' | 'Kiến trúc' | 'Học tập' | 'Ẩm thực' | 'Không gian xanh' | 'Thể thao'
type Place = {
  id: number
  name: string
  category: Exclude<Category, 'Tất cả'>
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
  campusId?: (typeof campusMaps)[number]['id']
}

type Coordinates = { lat: number; lng: number }

const localeTags: Record<Locale, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
}

const categoryTranslationKeys: Record<Category, TranslationKey> = {
  'Tất cả': 'all',
  'Kiến trúc': 'architecture',
  'Học tập': 'study',
  'Ẩm thực': 'food',
  'Không gian xanh': 'green',
  'Thể thao': 'sports',
}

function distanceBetween(first: Coordinates, second: Coordinates): number {
  const radians = Math.PI / 180
  const latitudeDifference = (second.lat - first.lat) * radians
  const longitudeDifference = (second.lng - first.lng) * radians
  const firstLatitude = first.lat * radians
  const secondLatitude = second.lat * radians
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function formatDistance(distance: number, locale: Locale): string {
  const formatter = new Intl.NumberFormat(localeTags[locale], { maximumFractionDigits: distance >= 1000 ? 1 : 0 })
  return distance >= 1000
    ? `${formatter.format(distance / 1000)} ${translate(locale, 'kilometers')}`
    : `${formatter.format(Math.round(distance))} ${translate(locale, 'meters')}`
}

const places: Place[] = [
  {
    id: 1,
    name: 'Tòa nhà chính SGU - Tòa C',
    category: 'Kiến trúc',
    description: 'Một góc Sài Gòn xưa giữa lòng khuôn viên đại học, nơi lưu giữ những câu chuyện của nhiều thế hệ sinh viên.',
    narration: 'Bạn đang đứng trước Tòa C, một trong những công trình dễ nhận biết của Cơ sở chính Đại học Sài Gòn. Hãy ngắm các chi tiết mặt tiền và lối vòm đặc trưng, rồi dùng bản đồ để tiếp tục đến điểm tham quan kế tiếp.',
    distance: '120 m', walk: '2 phút', rating: '4.9', tag: 'Biểu tượng SGU', location: '273 An Dương Vương, Quận 5', lat: 10.759988109684326, lng: 106.68214083789893, campusId: 'main',
    image: buildingCMain,
  },
  {
    id: 2,
    name: 'Trung tâm học liệu - KLF',
    category: 'Học tập',
    description: 'Không gian yên tĩnh để đọc, học nhóm và khám phá kho tài liệu dành cho sinh viên.',
    narration: 'Đây là Trung tâm Hỗ trợ học tập KLF, một không gian phục vụ hoạt động học tập và tra cứu của sinh viên. Nếu muốn vào bên trong, hãy xem giờ mở cửa và hướng dẫn sử dụng được niêm yết tại trung tâm.',
    distance: '260 m', walk: '4 phút', rating: '4.8', tag: 'Góc yên tĩnh', location: 'Thư viện KLF, Trường Đại học Sài Gòn', lat: 10.759846314437505, lng: 106.68250612374378, campusId: 'main',
    image: klfMain,
  },
  {
    id: 5,
    name: 'Sân bóng chuyền',
    category: 'Thể thao',
    description: 'Khu vực sân bóng chuyền dùng trong khuôn viên Cơ sở chính SGU.',
    narration: 'Đây là sân bóng chuyền ngoài trời của Cơ sở chính, nơi diễn ra các hoạt động vận động và giao lưu thể thao. Hãy chú ý lịch sử dụng sân và nhường khu vực chơi khi có lớp hoặc đội đang tập luyện.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Thể thao', location: 'Cơ sở chính SGU', lat: 10.759754176422225, lng: 106.68234773658983, campusId: 'main',
    image: volleyballCourtMain,
  },
  {
    id: 6,
    name: 'Căn tin',
    category: 'Ẩm thực',
    description: 'Khu vực căn tin trong khuôn viên Cơ sở chính SGU.',
    narration: 'Bạn đang ở căn tin Cơ sở chính, nơi sinh viên có thể dừng chân nghỉ ngơi và dùng bữa. Thực đơn và giờ phục vụ có thể thay đổi, vì vậy hãy xem thông tin tại quầy khi ghé thăm.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Ẩm thực', location: 'Cơ sở chính SGU', lat: 10.759644137207344, lng: 106.68199776223139, campusId: 'main',
    image: canteenMain,
  },
  {
    id: 7,
    name: 'Khu B',
    category: 'Học tập',
    description: 'Khu nhà B thuộc khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Đây là Khu B trong khuôn viên Cơ sở chính. Hãy quan sát ký hiệu tòa và bảng chỉ dẫn ở các lối vào để xác định phòng học hoặc đơn vị mình cần tìm.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở chính SGU', lat: 10.759486821794933, lng: 106.68235634484213, campusId: 'main',
    image: sguBuilding,
  },
  {
    id: 8,
    name: 'Phòng Khảo thí và Đảm bảo chất lượng giáo dục',
    category: 'Học tập',
    description: 'Địa điểm Phòng Khảo thí và Đảm bảo chất lượng giáo dục trong khuôn viên SGU.',
    narration: 'Đây là Phòng Khảo thí và Đảm bảo chất lượng giáo dục của trường. Đơn vị phụ trách các công việc liên quan đến khảo thí và bảo đảm chất lượng; nếu cần liên hệ, hãy xem thông tin hướng dẫn tại văn phòng.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Phòng chức năng', location: 'Cơ sở chính SGU', lat: 10.759229251078123, lng: 106.68294766487438, campusId: 'main',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 9,
    name: 'Sân bóng đá',
    category: 'Thể thao',
    description: 'Khu vực sân bóng đá trong khuôn viên Cơ sở chính SGU.',
    narration: 'Bạn đang ở sân bóng đá của Cơ sở chính. Đây là không gian dành cho hoạt động thể thao ngoài trời; hãy theo dõi lịch sử dụng và giữ an toàn khi sân đang có trận đấu hoặc buổi tập.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Thể thao', location: 'Cơ sở chính SGU', lat: 10.75964525637814, lng: 106.68143341142253, campusId: 'main',
    image: soccerFieldMain,
  },
  {
    id: 10,
    name: 'Nhà đa năng - sân bóng rổ',
    category: 'Thể thao',
    description: 'Khu vực sân bóng rổ thuộc Nhà đa năng của Cơ sở chính SGU.',
    narration: 'Đây là sân bóng rổ trong Nhà đa năng của Cơ sở chính. Khu sân phục vụ hoạt động luyện tập và thi đấu; vui lòng kiểm tra lịch sử dụng trước khi vào sân.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Thể thao', location: 'Nhà đa năng, Cơ sở chính SGU', lat: 10.75957763302768, lng: 106.68181199492993, campusId: 'main',
    image: basketballCourtMain,
  },
  {
    id: 11,
    name: 'Nhà đa năng - sân cầu lông',
    category: 'Thể thao',
    description: 'Khu vực sân cầu lông thuộc Nhà đa năng của Cơ sở chính SGU.',
    narration: 'Bạn đang ở sân cầu lông thuộc Nhà đa năng. Hãy quan sát các vạch sân và lưới, đồng thời xem lịch đăng ký hoặc hướng dẫn sử dụng được thông báo tại địa điểm.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Thể thao', location: 'Nhà đa năng, Cơ sở chính SGU', lat: 10.759480794792038, lng: 106.68153036298408, campusId: 'main',
    image: badmintonCourtMain,
  },
  {
    id: 12,
    name: 'Nhà đa năng - khu vực bóng bàn',
    category: 'Thể thao',
    description: 'Khu vực bóng bàn thuộc Nhà đa năng của Cơ sở chính SGU.',
    narration: 'Đây là khu vực bóng bàn trong Nhà đa năng, phù hợp cho những trận đấu và buổi luyện tập trong nhà. Hãy sử dụng bàn, vợt và không gian chung đúng hướng dẫn của nhà trường.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Thể thao', location: 'Nhà đa năng, Cơ sở chính SGU', lat: 10.759316762604941, lng: 106.68158199550778, campusId: 'main',
    image: tableTennisMain,
  },
  {
    id: 13,
    name: 'Tòa E',
    category: 'Kiến trúc',
    description: 'Tòa E trong khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Bạn đang ở Tòa E của Cơ sở chính. Hãy đối chiếu tên tòa với sơ đồ tầng và số phòng trên bảng chỉ dẫn để tìm đúng lớp học hoặc khu vực cần đến.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở chính SGU', lat: 10.759056558527996, lng: 106.6818267073545, campusId: 'main',
    image: buildingEMain,
  },
  {
    id: 14,
    name: 'Tòa A',
    category: 'Kiến trúc',
    description: 'Tòa A trong khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Đây là Tòa A trong khuôn viên Cơ sở chính. Khi vào tòa, hãy kiểm tra sơ đồ tầng và số phòng để định hướng; nếu chưa rõ, bạn có thể hỏi bộ phận hướng dẫn tại chỗ.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở chính SGU', lat: 10.75909281217745, lng: 106.68241024658684, campusId: 'main',
    image: buildingAMain,
  },
  {
    id: 15,
    name: 'Tòa nhà hội trường A',
    category: 'Học tập',
    description: 'Tòa nhà hội trường A trong khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Đây là Hội trường A, nơi tổ chức các chương trình và hoạt động chung của trường. Khi tham dự sự kiện, hãy xem thông báo về thời gian, lối vào và chỗ ngồi tại khu vực hội trường.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Hội trường', location: 'Cơ sở chính SGU', lat: 10.759629468856865, lng: 106.6830846497268, campusId: 'main',
    image: auditoriumAMain,
  },
  {
    id: 16,
    name: 'Khu tự học (1)',
    category: 'Học tập',
    description: 'Khu vực tự học trong khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Bạn đang ở Khu tự học 1 của Cơ sở chính. Đây là điểm dừng dành cho việc học cá nhân hoặc học nhóm; hãy giữ yên lặng và tuân thủ nội quy được niêm yết tại phòng.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Tự học', location: 'Cơ sở chính SGU', lat: 10.760005861266407, lng: 106.68255311273134, campusId: 'main',
    image: studySpaceMainOne,
  },
  {
    id: 17,
    name: 'Khu tự học (2)',
    category: 'Học tập',
    description: 'Khu vực tự học trong khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Đây là Khu tự học 2 trong khuôn viên Cơ sở chính. Bạn có thể dùng nơi này để ôn bài hoặc làm việc nhóm, đồng thời giữ gìn bàn ghế và không gian chung.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Tự học', location: 'Cơ sở chính SGU', lat: 10.759748943794909, lng: 106.68265168391322, campusId: 'main',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 18,
    name: 'Hội trường C',
    category: 'Học tập',
    description: 'Hội trường C trong khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Bạn đang ở Hội trường C của Cơ sở chính, một địa điểm tổ chức hoạt động trong trường. Hãy theo dõi bảng thông báo tại lối vào để biết lịch sử dụng và hướng dẫn khi có sự kiện.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Hội trường', location: 'Cơ sở chính SGU', lat: 10.76008934399489, lng: 106.68244113162366, campusId: 'main',
    image: sguBuilding,
  },
  {
    id: 19,
    name: 'Hội trường B',
    category: 'Học tập',
    description: 'Hội trường B trong khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Đây là Hội trường B trong khuôn viên Cơ sở chính. Nếu đến dự chương trình, hãy kiểm tra thông báo tại cửa hội trường để biết giờ bắt đầu và khu vực vào phù hợp.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Hội trường', location: 'Cơ sở chính SGU', lat: 10.759622281169316, lng: 106.68262352183645, campusId: 'main',
    image: sguBuilding,
  },
  {
    id: 20,
    name: 'Khu Hiệu Bộ - HB',
    category: 'Kiến trúc',
    description: 'Khu Hiệu Bộ (HB) trong khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Bạn đang ở Khu Hiệu Bộ, ký hiệu HB trên bản đồ Cơ sở chính. Đây là khu làm việc của nhà trường; khách đến liên hệ nên xem bảng hướng dẫn và làm theo chỉ dẫn tại lối vào.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở chính SGU', lat: 10.76046995404809, lng: 106.68224883220537, campusId: 'main',
    image: adminBuildingMain,
  },
  {
    id: 21,
    name: 'Tòa D',
    category: 'Kiến trúc',
    description: 'Tòa D trong khuôn viên Cơ sở chính Trường Đại học Sài Gòn.',
    narration: 'Đây là Tòa D của Cơ sở chính. Hãy dùng ký hiệu tòa, sơ đồ tầng và số phòng để tìm điểm đến; bản đồ có thể giúp bạn tiếp tục hành trình trong khuôn viên.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở chính SGU', lat: 10.760277065043367, lng: 106.68176021257332, campusId: 'main',
    image: buildingDMain,
  },
  {
    id: 22,
    name: 'Tòa A',
    category: 'Kiến trúc',
    description: 'Tòa A thuộc Cơ sở 1 Trường Đại học Sài Gòn.',
    narration: 'Bạn đang ở Tòa A thuộc Cơ sở 1. Hãy kiểm tra bảng sơ đồ và số phòng trong tòa để xác định lớp học hoặc văn phòng cần đến.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở 1', lat: 10.779236017474704, lng: 106.68458720350972, campusId: 'campus-1',
    image: toaACampusOne,
  },
  {
    id: 23,
    name: 'Khu tự học',
    category: 'Học tập',
    description: 'Khu vực tự học tại Cơ sở 1 Trường Đại học Sài Gòn.',
    narration: 'Đây là khu tự học của Cơ sở 1, nơi bạn có thể tập trung ôn bài hoặc học cùng bạn bè. Vui lòng giữ yên lặng và làm theo nội quy của không gian.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Tự học', location: 'Cơ sở 1', lat: 10.77927488221519, lng: 106.6842995360494, campusId: 'campus-1',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 24,
    name: 'Tòa B',
    category: 'Kiến trúc',
    description: 'Tòa B thuộc Cơ sở 1 Trường Đại học Sài Gòn.',
    narration: 'Bạn đang ở Tòa B của Cơ sở 1. Hãy đối chiếu số phòng với bảng chỉ dẫn tại các lối đi để tìm đúng lớp hoặc đơn vị.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở 1', lat: 10.779278175818034, lng: 106.68389116972537, campusId: 'campus-1',
    image: toaBCampusOne,
  },
  {
    id: 25,
    name: 'Tòa C',
    category: 'Kiến trúc',
    description: 'Tòa C thuộc Cơ sở 1 Trường Đại học Sài Gòn.',
    narration: 'Đây là Tòa C thuộc Cơ sở 1. Hãy quan sát biển tên tòa và sơ đồ tầng để định hướng trước khi di chuyển đến phòng học.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở 1', lat: 10.77907858349214, lng: 106.68352169543397, campusId: 'campus-1',
    image: toaCCampusOne,
  },
  {
    id: 26,
    name: 'Căn tin',
    category: 'Ẩm thực',
    description: 'Căn tin trong khuôn viên Cơ sở 1 Trường Đại học Sài Gòn.',
    narration: 'Bạn đang ở căn tin Cơ sở 1, nơi có thể dừng chân nghỉ ngơi và dùng bữa. Thực đơn và thời gian phục vụ được cập nhật tại quầy.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Ẩm thực', location: 'Cơ sở 1', lat: 10.77915631253372, lng: 106.68347207456736, campusId: 'campus-1',
    image: canteenCampusOne,
  },
  {
    id: 27,
    name: 'Tòa B',
    category: 'Kiến trúc',
    description: 'Tòa B thuộc Cơ sở 2 Trường Đại học Sài Gòn.',
    narration: 'Đây là Tòa B của Cơ sở 2. Hãy dùng biển tên và sơ đồ khu vực để tìm đúng phòng học hoặc nơi cần liên hệ.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở 2', lat: 10.782978273047895, lng: 106.7061686392335, campusId: 'campus-2',
    image: sguBuilding,
  },
  {
    id: 28,
    name: 'Tòa A',
    category: 'Kiến trúc',
    description: 'Tòa A thuộc Cơ sở 2 Trường Đại học Sài Gòn.',
    narration: 'Bạn đang ở Tòa A thuộc Cơ sở 2. Khi vào tòa, hãy xem số phòng và bảng hướng dẫn để xác định lối đi phù hợp.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở 2', lat: 10.783124472482674, lng: 106.70595754077915, campusId: 'campus-2',
    image: sguBuilding,
  },
  {
    id: 29,
    name: 'Tòa C',
    category: 'Kiến trúc',
    description: 'Tòa C thuộc Cơ sở 2 Trường Đại học Sài Gòn.',
    narration: 'Đây là Tòa C của Cơ sở 2. Hãy quan sát bảng chỉ dẫn tại khu vực để tìm lớp học hoặc đơn vị bạn muốn ghé thăm.',
    distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Khuôn viên SGU', location: 'Cơ sở 2', lat: 10.783606678010011, lng: 106.70673011804736, campusId: 'campus-2',
    image: sguBuilding,
  },
]

const categories: Category[] = ['Tất cả', 'Kiến trúc', 'Học tập', 'Ẩm thực', 'Không gian xanh', 'Thể thao']

const campusMaps = [
  {
    id: 'main',
    label: 'Cơ sở chính',
    address: '273 An Dương Vương, Chợ Quán, TP.HCM',
    center: [10.759694263941617, 106.68134847001345],
  },
  {
    id: 'campus-1',
    label: 'Cơ sở 1',
    address: '105 Bà Huyện Thanh Quan, Xuân Hòa, TP.HCM',
    center: [10.779396081899925, 106.68336718765391],
  },
  {
    id: 'campus-2',
    label: 'Cơ sở 2',
    address: '4 Tôn Đức Thắng, Sài Gòn, TP.HCM',
    center: [10.784147728899818, 106.70524251410139],
  },
] as const

function resolveQrPlace(value: string, places: readonly Place[]) {
  const normalized = value.trim().toLocaleLowerCase('vi')
  const id = value.match(/(?:poi|place)[=/:-]?(\d+)/i)?.[1]
    ?? value.match(/(?:^|\/)(\d+)\/?(?:\?.*)?$/)?.[1]
  return places.find((place) => String(place.id) === id || place.name.toLocaleLowerCase('vi') === normalized)
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.7 8.3-2.5 5-4.9 2.4 2.4-4.9 5-2.5Z" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    heart: <path d="M20.8 8.8c0 4.3-8.8 10-8.8 10s-8.8-5.7-8.8-10A4.8 4.8 0 0 1 12 6.5a4.8 4.8 0 0 1 8.8 2.3Z" />,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    headphones: <><path d="M3 13v-1a9 9 0 0 1 18 0v1" /><path d="M5 13h2v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Zm14 0h-2v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    sliders: <><path d="M4 7h9m4 0h3M4 17h3m4 0h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
    play: <path d="m8 5 12 7-12 7V5Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function App() {
  const isAdminRoute = window.location.pathname.replace(/\/+$/, '').endsWith('/admin') || window.location.hash === '#admin' || window.location.hash === '#/admin'
  const [adminSignedIn, setAdminSignedIn] = useState(() => Boolean(getAdminToken()))
  const [activeNav, setActiveNav] = useState('Khám phá')
  const [activeCampus, setActiveCampus] = useState<(typeof campusMaps)[number]['id']>('main')
  const [category, setCategory] = useState<Category>('Tất cả')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState<number[]>([2])
  const [selected, setSelected] = useState<Place | null>(null)
  const [mapSelection, setMapSelection] = useState<Place | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrMessage, setQrMessage] = useState('')
  const [qrCode, setQrCode] = useState('')
  const qrVideo = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [playingPoiId, setPlayingPoiId] = useState<number | null>(null)
  const listeningPoiId = useRef<number | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot>({ activeUsers: 0, pois: {} })
  const [narrationMessage, setNarrationMessage] = useState('')
  const [language, setLanguage] = useState<Locale>('vi')
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null)
  const [poiStatus, setPoiStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [poiItems, setPoiItems] = useState<Place[]>([])
  const t = useCallback((key: TranslationKey, values?: Record<string, string | number>) => translate(language, key, values), [language])
  const activeCampusPlaces = useMemo(() => poiItems.filter((place) => place.campusId === activeCampus), [activeCampus, poiItems])
  const activeCampusNearbyPlaces = useMemo(() => {
    if (!userPosition) return activeCampusPlaces
    return [...activeCampusPlaces].sort((first, second) =>
      distanceBetween(userPosition, first) - distanceBetween(userPosition, second))
  }, [activeCampusPlaces, userPosition])
  const sortedPlaces = useMemo(() => {
    if (!userPosition) return poiItems
    return [...poiItems].sort((first, second) =>
      distanceBetween(userPosition, first) - distanceBetween(userPosition, second))
  }, [poiItems, userPosition])
  const handleUserLocation = useCallback((position: Coordinates) => setUserPosition(position), [])

  useEffect(() => {
    document.title = isAdminRoute ? 'Quản trị nội dung · SGU Go' : t('pageTitle')
  }, [isAdminRoute, t])

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      await sendHeartbeat()
      try {
        const snapshot = await fetchAnalytics()
        if (!cancelled) setAnalytics(snapshot)
      } catch { /* Keep last known counts while offline. */ }
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 12_000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [])

  function displayDistance(place: Place): string {
    return userPosition ? formatDistance(distanceBetween(userPosition, place), language) : place.distance
  }

  function poiListeningStats(poiId: number) {
    return analytics.pois[String(poiId)] ?? { heard: 0, active: 0 }
  }

  function listenerLabels() {
    if (language === 'en') return { heard: 'heard', active: 'listening' }
    if (language === 'ko') return { heard: '청취함', active: '청취 중' }
    if (language === 'ja') return { heard: '聴取済み', active: '再生中' }
    if (language === 'zh') return { heard: '已收听', active: '正在收听' }
    return { heard: 'đã nghe', active: 'đang nghe' }
  }

  function changeLanguage(nextLanguage: Locale) {
    setLanguage(nextLanguage)
    setNarrationMessage(mapSelection
      ? translate(nextLanguage, mapSelection && nextLanguage === 'vi' ? 'selectedReady' : 'narrationUnsupported', mapSelection ? { name: mapSelection.name } : undefined)
      : translate(nextLanguage, 'narrationIdle'))
    if (qrOpen) setQrMessage(translate(nextLanguage, 'qrStart'))
  }

  const handleMapSelect = useCallback((place: MapPoi) => {
    const matchingPlace = poiItems.find((item) => item.id === place.id)
    if (matchingPlace) {
      setMapSelection(matchingPlace)
      setNarrationMessage(language === 'vi'
        ? translate(language, 'selectedReady', { name: matchingPlace.name })
        : translate(language, 'narrationUnsupported'))
    }
  }, [language, poiItems])

  function stopListeningFor(poiId: number) {
    if (listeningPoiId.current === poiId) {
      listeningPoiId.current = null
      void reportListeningEnd(poiId)
    }
    setPlaying(false)
    setPlayingPoiId(null)
  }

  function toggleNarration(place: Place | null) {
    if (!place) return
    if (language !== 'vi') {
      setNarrationMessage(t('narrationUnsupported'))
      return
    }
    if (playing && playingPoiId === place.id) {
      window.speechSynthesis?.cancel()
      stopListeningFor(place.id)
      setNarrationMessage(t('narrationStopped'))
      return
    }
    if (!('speechSynthesis' in window)) {
      setNarrationMessage(t('narrationUnsupportedBrowser'))
      return
    }
    window.speechSynthesis.cancel()
    if (playingPoiId !== null) stopListeningFor(playingPoiId)
    const narration = new SpeechSynthesisUtterance(place.narration || `${place.name}. ${place.description}`)
    narration.lang = 'vi-VN'
    narration.rate = 0.95
    narration.onstart = () => {
      listeningPoiId.current = place.id
      setPlayingPoiId(place.id)
      void reportListeningStart(place.id)
      setPlaying(true)
      setNarrationMessage(t('narrationPlaying', { name: place.name }))
    }
    narration.onend = () => { stopListeningFor(place.id); setNarrationMessage(t('narrationFinished')) }
    narration.onerror = () => { stopListeningFor(place.id); setNarrationMessage(t('narrationError')) }
    window.speechSynthesis.speak(narration)
  }

  useEffect(() => () => {
    window.speechSynthesis?.cancel()
    if (listeningPoiId.current !== null) void reportListeningEnd(listeningPoiId.current)
  }, [])

  useEffect(() => {
    if (!qrOpen) return
    const videoElement = qrVideo.current
    let stream: MediaStream | null = null
    let timer: number | null = null
    let scanning = false
    const Detector = (window as Window & {
      BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> }
    }).BarcodeDetector

    async function startScanner() {
      if (!Detector) {
        setQrMessage(t('qrUnsupported'))
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setQrMessage(t('cameraUnavailable'))
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (!videoElement) return
        videoElement.srcObject = stream
        await videoElement.play()
        setQrMessage(t('cameraReady'))
        const detector = new Detector({ formats: ['qr_code'] })
        timer = window.setInterval(async () => {
          if (scanning || !videoElement || videoElement.readyState < 2) return
          scanning = true
          try {
            const codes = await detector.detect(videoElement)
            const rawValue = codes[0]?.rawValue?.trim()
            if (rawValue) {
              const match = resolveQrPlace(rawValue, poiItems)
              if (match) {
                handleMapSelect(match)
                setQrMessage(t('selectedReady', { name: match.name }))
                setQrOpen(false)
              } else {
                setQrMessage(`${rawValue}: ${t('qrNotFound')}`)
              }
            }
          } catch { setQrMessage(t('cameraUnavailable')) }
          scanning = false
        }, 500)
      } catch {
        setQrMessage(t('cameraPermission'))
      }
    }
    void startScanner()
    return () => {
      if (timer !== null) window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
      if (videoElement) videoElement.srcObject = null
    }
  }, [handleMapSelect, poiItems, qrOpen, t])

  useEffect(() => {
    const demoError = new URLSearchParams(window.location.search).get('poiState') === 'error'
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (demoError) {
        setPoiStatus('error')
      } else {
        void fetchPublishedPois().then((remotePois) => {
          if (cancelled) return
          const additional = remotePois.filter((poi) => !places.some((place) => place.id === poi.id)).map((poi) => ({
            ...poi,
            category: poi.category as Exclude<Category, 'Tất cả'>,
            distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Địa điểm mới',
            image: poi.image || sguBuilding,
            lat: Number(poi.lat), lng: Number(poi.lng),
            campusId: campusMaps.find((campus) => campus.id === poi.campusId)?.id,
          } satisfies Place))
          setPoiItems([...places, ...additional])
          setPoiStatus('success')
        }).catch(() => {
          if (!cancelled) { setPoiItems(places); setPoiStatus('success') }
        })
      }
    }, 650)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [])

  function retryLoadPlaces() {
    setPoiStatus('loading')
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`)
    void fetchPublishedPois().then((remotePois) => {
      const additional = remotePois.filter((poi) => !places.some((place) => place.id === poi.id)).map((poi) => ({ ...poi, category: poi.category as Exclude<Category, 'Tất cả'>, distance: 'Trong khuôn viên', walk: '—', rating: '—', tag: 'Địa điểm mới', image: poi.image || sguBuilding, lat: Number(poi.lat), lng: Number(poi.lng), campusId: campusMaps.find((campus) => campus.id === poi.campusId)?.id } satisfies Place))
      setPoiItems([...places, ...additional]); setPoiStatus('success')
    }).catch(() => { setPoiItems(places); setPoiStatus('success') })
  }

  const filteredPlaces = useMemo(() => sortedPlaces.filter((place) => {
    const matchesCategory = category === 'Tất cả' || place.category === category
    const matchesQuery = `${place.name} ${place.category} ${place.location}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery && (activeNav !== 'Đã lưu' || saved.includes(place.id))
  }), [activeNav, category, query, saved, sortedPlaces])

  function toggleSaved(id: number) {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const navItems: { label: string; key: TranslationKey; icon: string }[] = [
    { label: 'Khám phá', key: 'discover', icon: 'compass' },
    { label: 'Bản đồ', key: 'map', icon: 'map' },
    { label: 'Đã lưu', key: 'saved', icon: 'heart' },
  ]

  if (isAdminRoute) {
    if (!adminSignedIn) return <AdminLogin onLogin={() => setAdminSignedIn(true)} />

    return <div className="admin-site">
      <header className="admin-site-header">
        <a className="admin-site-brand" href={`${import.meta.env.BASE_URL}#home`}><span>SGU</span> Go</a>
        <span className="admin-site-context">CỔNG QUẢN TRỊ · QUẢN LÝ ĐỊA ĐIỂM</span>
        <div className="admin-site-actions"><button className="admin-site-logout" onClick={() => { clearAdminToken(); setAdminSignedIn(false) }}>Đăng xuất</button><a className="admin-site-back" href={`${import.meta.env.BASE_URL}#home`}>Trang khách</a></div>
      </header>
      <main className="admin-site-main"><AdminDashboard places={poiItems} /></main>
      <footer className="admin-site-footer">SGU Go <span>·</span> Hệ thống quản lý nội dung tham quan</footer>
    </div>
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={() => setActiveNav('Khám phá')} aria-label={t('home')}>
          <span className="brand-mark"><img src={sguBuilding} alt="" /></span>
          <span className="brand-copy"><strong>sgu<span>go</span></strong><small>ĐI MỘT VÒNG, THẤY THÂN QUEN</small></span>
        </a>
        <div className="side-label">{t('navGroup')}</div>
        <nav className="main-nav" aria-label={t('navigation')}>
          {navItems.map((item) => <button key={item.label} className={`nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => setActiveNav(item.label)}><Icon name={item.icon} /><span>{t(item.key)}</span>{item.label === 'Đã lưu' && <span className="nav-count">{saved.length}</span>}</button>)}
        </nav>
        <div className="side-divider" />
        <div className="side-label">{t('suggestions')}</div>
        <button className="route-card" onClick={() => setActiveNav('Khám phá')}>
          <span className="route-icon"><Icon name="sun" size={19} /></span>
          <span><strong>{t('route')}</strong><small>{t('routeDuration')}</small></span>
          <Icon name="chevron" size={16} />
        </button>
        <div className="sidebar-bottom">
          <div className="offline-card"><span className="offline-dot" /><div><strong>{t('online')}</strong><small>{t('mapReady')}</small></div><Icon name="map" size={17} /></div>
          <div className="profile-button"><span className="avatar">G</span><span><strong>{t('guest')}</strong><small>{t('guestMode')}</small></span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>SGU Go</span><Icon name="chevron" size={14} /><strong>{t(activeNav === 'Bản đồ' ? 'map' : activeNav === 'Đã lưu' ? 'saved' : 'discover')}</strong></div>
          <div className="top-actions"><span className="app-user-count" title="Người đang sử dụng ứng dụng"><i />{analytics.activeUsers} <span>đang dùng</span></span><label className="language-select-label"><span className="visually-hidden">{t('language')}</span><select className="language-select" value={language} onChange={(event) => { const selectedLocale = localeOptions.find((option) => option.code === event.target.value); if (selectedLocale) changeLanguage(selectedLocale.code) }} aria-label={t('language')}>{localeOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label><span className="top-divider" /><button className="help-button">{t('help')}</button></div>
        </header>

        <div className="page-content">
          {activeNav === 'Bản đồ' ? <section className="map-page">
            <header className="map-page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {t('mapKicker')}</div><h1>{t('mapTitle')}</h1><p>{t('mapDescription')}</p></div><button className="qr-scan-button" onClick={() => { setQrMessage(t('qrStart')); setQrOpen(true) }}>▦ <span>{t('scanQr')}</span></button></header>
            <div className="map-utility-bar"><span>♫ {t('audioVietnamese')}</span></div>
            <div className="campus-map-tabs" role="tablist" aria-label={t('campusTabs')}>{campusMaps.map((campus) => <button key={campus.id} className={`campus-map-tab ${activeCampus === campus.id ? 'is-active' : ''}`} role="tab" aria-selected={activeCampus === campus.id} onClick={() => { setActiveCampus(campus.id); setMapSelection(null); setNarrationMessage(t('narrationIdle')) }}>{t(campus.id === 'main' ? 'mainCampus' : campus.id === 'campus-1' ? 'campusOne' : 'campusTwo')}</button>)}<span className="campus-map-address">{campusMaps.find((campus) => campus.id === activeCampus)?.address}</span></div>
            <div className="map-workspace">
              <section className="hero-map map-screen-canvas" aria-label={`${t('mapTitle')} · ${t(activeCampus === 'main' ? 'mainCampus' : activeCampus === 'campus-1' ? 'campusOne' : 'campusTwo')}`}><LeafletMapView key={activeCampus} places={activeCampusPlaces} selectedPlaceId={mapSelection?.id ?? null} onSelectPlace={handleMapSelect} center={campusMaps.find((campus) => campus.id === activeCampus)!.center} language={language} onLocate={handleUserLocation} /></section>
              <aside className="map-side-panels" aria-label={`${t('narrationTitle')} · ${t('map')}`}>
                <section className="map-panel audio-panel"><div className="map-panel-title"><span className="panel-icon">♫</span><h2>{t('narrationTitle')}</h2></div><div className="narration-status"><p>{narrationMessage || t('narrationIdle')}</p></div><div className="narration-controls"><button className="narration-play" onClick={() => toggleNarration(mapSelection)} disabled={!mapSelection} aria-label={t(playing && playingPoiId === mapSelection?.id ? 'stopNarration' : 'playNarration')}>{playing && playingPoiId === mapSelection?.id ? 'Ⅱ' : '▶'}</button><div className="narration-track"><strong>{mapSelection ? mapSelection.name : t('noPlaceSelected')}</strong><span><i className={playing && playingPoiId === mapSelection?.id ? 'track-playing' : ''} /></span></div><small>{t('audioVietnamese')}</small></div></section>
                <section className="map-panel place-panel"><div className="map-panel-title"><span className="panel-icon">⌖</span><h2>{mapSelection ? t('placeInfo') : t('placeCount', { count: activeCampusPlaces.length })}</h2></div>{mapSelection ? <div className="map-selected-place"><span className="map-selected-category">{t(categoryTranslationKeys[mapSelection.category])}{mapSelection.walk !== '—' ? ` · ${mapSelection.walk}` : ''}</span><h3>{mapSelection.name}</h3><p>{mapSelection.description}</p><small><Icon name="pin" size={14} /> {mapSelection.location}</small><div className="poi-listener-stats"><span>♫ {poiListeningStats(mapSelection.id).heard} {listenerLabels().heard}</span><span><i /> {poiListeningStats(mapSelection.id).active} {listenerLabels().active}</span></div><div className="map-selected-actions"><button className="map-open-detail" onClick={() => setSelected(mapSelection)}>{t('details')}</button><a href={`https://www.google.com/maps/dir/?api=1&destination=${mapSelection.lat},${mapSelection.lng}`} target="_blank" rel="noreferrer">{t('directions')}</a><button className="map-reset-selection" onClick={() => { setMapSelection(null); setNarrationMessage(t('narrationIdle')) }}>{t('otherPlace')}</button></div></div> : activeCampusPlaces.length ? <><p className="map-select-hint">{t('selectPlace')}</p><div className="map-place-list">{activeCampusNearbyPlaces.map((place, index) => <button className="map-place-row" key={place.id} onClick={() => handleMapSelect(place)}><span className="map-place-number">{index + 1}</span><span className="map-place-copy"><strong>{place.name}</strong><small>{t(categoryTranslationKeys[place.category])} <i>·</i> {place.location}</small></span><Icon name="chevron" size={17} /></button>)}</div></> : <p className="map-select-hint">{t('noCoordinates')}</p>}</section>
                <p className="map-coordinate-note">{t('coordinateNote', { count: activeCampusPlaces.length })}</p>
              </aside>
            </div>
          </section> : <>
            <section className="welcome-row">
              <div><div className="eyebrow"><span className="eyebrow-line" /> {t('homeEyebrow')}</div><h1>{t('homeTitleFirst')}<br /><em>{t('homeTitleSecond')}</em></h1><p className="welcome-copy">{t('homeCopy')}</p></div>
              <div className="today-note"><span className="weather-icon"><Icon name="sun" size={24} /></span><div><strong>{t('today')}</strong><small>{t('district')}</small></div></div>
            </section>

            {activeNav === 'Khám phá' && <section className="explore-discovery-panel">
              <div className="explore-discovery-copy"><span className="explore-discovery-kicker">⌕ {t('nearbyHeading')}</span><h2>{t('discoveryHeading')}</h2><p>{t('homeCopy')}</p><button onClick={() => setActiveNav('Bản đồ')}>{t('viewMap')} <Icon name="arrow" size={16} /></button></div>
              <div className="explore-category-shortcuts"><strong>{t('filterCategories')}</strong><div>{categories.filter((item) => item !== 'Tất cả').map((item) => <button key={item} onClick={() => { setCategory(item); document.querySelector('.places-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><span className={`explore-category-dot category-${item === 'Kiến trúc' ? 'architecture' : item === 'Học tập' ? 'study' : item === 'Ẩm thực' ? 'food' : item === 'Không gian xanh' ? 'green' : 'sports'}`} />{t(categoryTranslationKeys[item])}<Icon name="chevron" size={13} /></button>)}</div></div>
              <div className="explore-discovery-count"><strong>{poiItems.length}</strong><span>{t('samplePlaces')}</span></div>
            </section>}

            <section className="places-section">
              <div className="section-heading"><div><div className="section-kicker">{t('nearbyHeading')}</div><h2>{activeNav === 'Đã lưu' ? t('savedHeading') : t('discoveryHeading')}</h2><p>{activeNav === 'Đã lưu' ? t('savedCount', { count: filteredPlaces.length }) : userPosition ? t('distanceMode') : t('nearbyCopy')}</p></div><button className="view-all" onClick={() => setActiveNav('Bản đồ')}>{t('viewMap')} <Icon name="arrow" size={16} /></button></div>
              <div className="toolbar"><div className="category-list" role="group" aria-label={t('filterCategories')}>{categories.map((item) => <button key={item} className={`category-chip ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item === 'Tất cả' && <span className="chip-dot" />}{t(categoryTranslationKeys[item])}</button>)}</div><div className="filter-actions"><label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} aria-label={t('search')} />{query && <button aria-label={t('clearSearch')} onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}</label><button className="filter-button" aria-label={t('filterCategories')}><Icon name="sliders" size={17} /></button></div></div>

              {poiStatus === 'loading' ? <div className="poi-grid" aria-label={t('placesLoading')} aria-busy="true">{[1, 2, 3, 4].map((item) => <article className="poi-skeleton" key={item}><div className="skeleton-image" /><div className="skeleton-body"><i className="skeleton-line short" /><i className="skeleton-line title" /><i className="skeleton-line" /><i className="skeleton-line medium" /><div className="skeleton-footer"><i /><i /></div></div></article>)}</div> : poiStatus === 'error' ? <div className="error-state" role="alert"><span className="error-icon"><Icon name="map" size={22} /></span><div className="error-copy"><strong>{t('loadError')}</strong><p>{t('loadErrorCopy')}</p></div><button className="retry-button" onClick={retryLoadPlaces}><Icon name="arrow" size={15} /> {t('retry')}</button></div> : filteredPlaces.length > 0 ? <div className="poi-grid">{filteredPlaces.map((place) => <article className="poi-card" key={place.id}>
                <button className="poi-image-button" onClick={() => setSelected(place)} aria-label={t('placeDetails', { name: place.name })}><img className="poi-image" src={place.image} alt="" /><span className="image-tag">{place.tag}</span></button>
                <button className={`save-button ${saved.includes(place.id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(place.id)} aria-label={saved.includes(place.id) ? t('removeSaved') : t('savePlace')}><Icon name="heart" size={18} /></button>
                <div className="poi-info"><div className="poi-meta"><span>{t(categoryTranslationKeys[place.category])}</span>{place.rating !== '—' && <span className="rating"><Icon name="star" size={13} /> {place.rating}</span>}</div><button className="poi-title" onClick={() => setSelected(place)}>{place.name}</button><p className="poi-description">{place.description}</p><div className="poi-listener-stats"><span>♫ {poiListeningStats(place.id).heard} {listenerLabels().heard}</span><span><i /> {poiListeningStats(place.id).active} {listenerLabels().active}</span></div><div className="poi-footer"><span><Icon name="pin" size={14} /> {displayDistance(place)}</span>{place.walk !== '—' && <><span className="footer-separator" /><span><Icon name="clock" size={14} /> {place.walk} đi bộ</span></>}<button onClick={() => setSelected(place)} aria-label={t('placeDetails', { name: place.name })}><Icon name="arrow" size={16} /></button></div></div>
              </article>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name={activeNav === 'Đã lưu' ? 'heart' : 'search'} size={24} /></span><strong>{activeNav === 'Đã lưu' ? t('noSaved') : t('noMatches')}</strong><p>{activeNav === 'Đã lưu' ? t('noSavedCopy') : t('noMatchesCopy')}</p></div>}
            </section>
          </>}
          <footer className="page-footer"><span>SGU Go <span className="footer-bullet">·</span> {t('footer')}</span><span>{t('madeAtSgu')}</span></footer>
        </div>
      </main>

      {qrOpen && <div className="modal-backdrop" role="presentation" onClick={() => setQrOpen(false)}><section className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setQrOpen(false)} aria-label={t('close')}><Icon name="close" /></button><div className="qr-modal-heading"><span className="qr-modal-icon">▦</span><div><h2 id="qr-title">{t('qrTitle')}</h2><p>{t('qrDescription')}</p></div></div><video className="qr-video" ref={qrVideo} muted playsInline /><p className="qr-message" role="status">{qrMessage}</p><form className="qr-manual-form" onSubmit={(event) => { event.preventDefault(); const match = resolveQrPlace(qrCode, poiItems); if (match) { handleMapSelect(match); setQrOpen(false); setQrCode('') } else setQrMessage(t('qrNotFound')) }}><input value={qrCode} onChange={(event) => setQrCode(event.target.value)} placeholder={t('qrInput')} aria-label={t('qrInput')} /><button type="submit">{t('findPlace')}</button></form><div className="qr-place-options">{poiItems.map((place) => <button key={place.id} onClick={() => { handleMapSelect(place); setQrOpen(false) }}>{place.name}</button>)}</div></section></div>}

      {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label={t('close')}><Icon name="close" /></button><div className="detail-image-wrap"><img src={selected.image} alt="" /><span className="image-tag">{selected.tag}</span></div><div className="detail-content"><div className="poi-meta"><span>{t(categoryTranslationKeys[selected.category])}</span><span className="rating"><Icon name="star" size={13} /> {selected.rating}</span></div><h2 id="detail-title">{selected.name}</h2><p>{selected.description}</p><div className="detail-location"><Icon name="pin" size={17} /> {selected.location}<span>·</span>{displayDistance(selected)}</div><div className="poi-listener-stats"><span>♫ {poiListeningStats(selected.id).heard} {listenerLabels().heard}</span><span><i /> {poiListeningStats(selected.id).active} {listenerLabels().active}</span></div><div className="audio-guide"><button className={`audio-play ${playing && playingPoiId === selected.id ? 'playing' : ''}`} onClick={() => toggleNarration(selected)} aria-label={t(playing && playingPoiId === selected.id ? 'stopNarration' : 'playNarration')}><Icon name={playing && playingPoiId === selected.id ? 'headphones' : 'play'} size={18} /></button><div className="audio-copy"><strong>{playing && playingPoiId === selected.id ? t('narrationPlaying', { name: selected.name }) : t('narrationTitle')}</strong><small>{t('audioVietnamese')}</small></div><div className={`audio-wave ${playing && playingPoiId === selected.id ? 'wave-playing' : ''}`}><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div><div className="detail-actions"><button className="primary-action" onClick={() => { setSelected(null); setActiveNav('Bản đồ') }}><Icon name="map" size={18} /> {t('directions')}</button><button className={`detail-save ${saved.includes(selected.id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(selected.id)}><Icon name="heart" size={18} /> {saved.includes(selected.id) ? t('removeSaved') : t('savePlace')}</button></div></div></section></div>}

    </div>
  )
}

export default App
