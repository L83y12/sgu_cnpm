import { Link, useParams } from 'react-router-dom'

export function PoiDetailPage() {
  const { poiId } = useParams()

  return (
    <section aria-labelledby="poi-detail-heading">
      <h1 className="page-heading" id="poi-detail-heading">
        Chi tiết địa điểm
      </h1>
      <p className="page-description">
        Địa điểm: <code>{poiId}</code>
      </p>
      <p className="page-description">
        Nội dung chi tiết sẽ được kết nối với dữ liệu POI.
      </p>
      <Link className="page-link" to="/">
        Quay lại danh sách địa điểm
      </Link>
    </section>
  )
}
