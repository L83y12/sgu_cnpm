import { Link, useParams } from 'react-router-dom'

export function PoiDetailPage() {
  const { poiId } = useParams()

  return (
    <section aria-labelledby="poi-detail-heading">
      <h1 className="page-heading" id="poi-detail-heading">
        Chi tiết địa điểm SGU
      </h1>
      <p className="page-description">
        Địa điểm: <code>{poiId}</code>
      </p>
      <p className="page-description">
        Trang chi tiết sẽ hiển thị khi dữ liệu POI campus được kết nối.
      </p>
      <Link className="page-link" to="/">
        Quay lại khám phá SGU
      </Link>
    </section>
  )
}
