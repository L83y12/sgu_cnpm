import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 className="page-heading" id="not-found-heading">
        Không tìm thấy trang
      </h1>
      <p className="page-description">
        Địa chỉ bạn mở không tồn tại hoặc đã được thay đổi.
      </p>
      <Link className="page-link" to="/">
        Quay lại danh sách địa điểm
      </Link>
    </section>
  )
}
