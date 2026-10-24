import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './AdminDashboard.css'

export type AdminPoi = {
  id: number
  name: string
  category: string
  description: string
  narration?: string
  location: string
  campusId?: string
}

type Props = { places: AdminPoi[] }
type PoiStatus = 'Đang hiển thị' | 'Bản nháp'

const categoryColors: Record<string, string> = {
  'Kiến trúc': '#668e72', 'Học tập': '#6c83b8', 'Ẩm thực': '#c18c4d',
  'Không gian xanh': '#5e9b79', 'Thể thao': '#9a76aa',
}

export function AdminDashboard({ places: initialPlaces }: Props) {
  const [places, setPlaces] = useState(initialPlaces)
  const [statuses, setStatuses] = useState<Record<number, PoiStatus>>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tất cả địa điểm')
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => setPlaces(initialPlaces), [initialPlaces])

  const visiblePlaces = useMemo(() => places.filter((place) => {
    const matchesQuery = `${place.name} ${place.category} ${place.location}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
    const status = statuses[place.id] ?? 'Đang hiển thị'
    return matchesQuery && (filter === 'Tất cả địa điểm' || status === filter)
  }), [filter, places, query, statuses])
  const narratedCount = places.filter((place) => Boolean(place.narration?.trim())).length
  const categories = [...new Set(places.map((place) => place.category))]

  function addPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nextId = Math.max(0, ...places.map((place) => place.id)) + 1
    const place: AdminPoi = {
      id: nextId,
      name: String(form.get('name') ?? '').trim(),
      category: String(form.get('category') ?? 'Kiến trúc'),
      location: String(form.get('location') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
    }
    setPlaces((current) => [place, ...current])
    setStatuses((current) => ({ ...current, [nextId]: 'Bản nháp' }))
    setShowForm(false)
    setNotice('Đã thêm địa điểm vào danh sách bản nháp.')
    window.setTimeout(() => setNotice(''), 3500)
  }

  function exportCsv() {
    const rows = [['Tên địa điểm', 'Danh mục', 'Vị trí', 'Trạng thái'], ...visiblePlaces.map((place) => [
      place.name, place.category, place.location, statuses[place.id] ?? 'Đang hiển thị',
    ])]
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'sgu-go-dia-diem.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="admin-dashboard">
    <header className="admin-heading">
      <div><div className="admin-eyebrow"><span /> TRUNG TÂM QUẢN TRỊ</div><h1>Tổng quan</h1><p>Theo dõi địa điểm và nội dung trên SGU Go.</p></div>
      <button className="admin-primary-button" onClick={() => setShowForm(true)}><span>＋</span> Thêm địa điểm</button>
    </header>

    {notice && <div className="admin-notice" role="status">✓ {notice}</div>}

    <div className="admin-stat-grid">
      <article className="admin-stat-card"><span className="admin-stat-icon green">⌖</span><span className="admin-stat-label">Tổng địa điểm</span><strong>{places.length}</strong><small>Trong danh sách POI</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon blue">♫</span><span className="admin-stat-label">Có thuyết minh</span><strong>{narratedCount}<small className="admin-stat-total"> / {places.length}</small></strong><small>Nội dung audio tiếng Việt</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon amber">◷</span><span className="admin-stat-label">Bản nháp</span><strong>{places.filter((place) => statuses[place.id] === 'Bản nháp').length}</strong><small>Chờ quản trị viên duyệt</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon violet">▦</span><span className="admin-stat-label">Danh mục</span><strong>{categories.length}</strong><small>Nhóm địa điểm hiện có</small></article>
    </div>

    <div className="admin-overview-grid">
      <section className="admin-panel admin-category-panel">
        <div className="admin-panel-heading"><div><h2>Địa điểm theo danh mục</h2><p>Phân bổ POI trong hệ thống</p></div><span className="admin-panel-badge">{places.length} POI</span></div>
        <div className="admin-category-list">{categories.map((category) => {
          const count = places.filter((place) => place.category === category).length
          const percent = places.length ? Math.round(count / places.length * 100) : 0
          return <div className="admin-category-row" key={category}><div className="admin-category-top"><span><i style={{ background: categoryColors[category] ?? '#6c8475' }} />{category}</span><strong>{count}<small> · {percent}%</small></strong></div><div className="admin-progress-track"><i style={{ width: `${percent}%`, background: categoryColors[category] ?? '#6c8475' }} /></div></div>
        })}</div>
      </section>
      <section className="admin-panel admin-health-panel">
        <div className="admin-panel-heading"><div><h2>Nội dung thuyết minh</h2><p>Mức độ sẵn sàng của audio guide</p></div><span className="admin-health-icon">♫</span></div>
        <div className="admin-health-number">{places.length ? Math.round(narratedCount / places.length * 100) : 0}<span>%</span></div>
        <p className="admin-health-caption">{narratedCount} trên {places.length} địa điểm có nội dung thuyết minh.</p>
        <div className="admin-progress-track admin-health-track"><i style={{ width: `${places.length ? narratedCount / places.length * 100 : 0}%` }} /></div>
        <div className="admin-health-foot"><span><i /> Đã có nội dung</span><span>{places.length - narratedCount} cần bổ sung</span></div>
      </section>
    </div>

    <section className="admin-panel admin-table-panel">
      <div className="admin-table-heading"><div><h2>Quản lý địa điểm</h2><p>Tra cứu và cập nhật trạng thái hiển thị của POI.</p></div><button className="admin-export-button" onClick={exportCsv}>↓ <span>Xuất CSV</span></button></div>
      <div className="admin-table-tools"><label className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm địa điểm, danh mục..." aria-label="Tìm địa điểm" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Lọc theo trạng thái"><option>Tất cả địa điểm</option><option>Đang hiển thị</option><option>Bản nháp</option></select></div>
      <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>ĐỊA ĐIỂM</th><th>DANH MỤC</th><th>VỊ TRÍ</th><th>AUDIO</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>
        {visiblePlaces.slice(0, 8).map((place) => {
          const status = statuses[place.id] ?? 'Đang hiển thị'
          return (
            <tr key={place.id}>
              <td><div className="admin-place-cell"><span className="admin-place-thumbnail">⌖</span><span><strong>{place.name}</strong><small>POI-{String(place.id).padStart(3, '0')}</small></span></div></td>
              <td><span className="admin-category-pill"><i style={{ background: categoryColors[place.category] ?? '#6c8475' }} />{place.category}</span></td>
              <td className="admin-location-cell">{place.location}</td>
              <td><span className={`admin-audio-state ${place.narration ? 'has-audio' : ''}`}>{place.narration ? '♫ Có audio' : '— Chưa có'}</span></td>
              <td><span className={`admin-status-pill ${status === 'Bản nháp' ? 'draft' : ''}`}><i />{status}</span></td>
              <td><button className="admin-row-action" title={status === 'Bản nháp' ? 'Đăng địa điểm' : 'Chuyển thành bản nháp'} onClick={() => setStatuses((current) => ({ ...current, [place.id]: status === 'Bản nháp' ? 'Đang hiển thị' : 'Bản nháp' }))}>{status === 'Bản nháp' ? 'Đăng' : '•••'}</button></td>
            </tr>
          )
          }
        )}
      </tbody></table></div>
      {visiblePlaces.length === 0 && <div className="admin-table-empty"><strong>Không tìm thấy địa điểm</strong><span>Thử đổi từ khóa hoặc bộ lọc.</span></div>}
      {visiblePlaces.length > 8 && <div className="admin-table-footer">Đang hiển thị 8 trên {visiblePlaces.length} địa điểm <span>Danh sách đầy đủ sẽ được phân trang khi kết nối dữ liệu.</span></div>}
    </section>

    {showForm && <div className="admin-modal-backdrop" onClick={() => setShowForm(false)}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-add-title" onClick={(event) => event.stopPropagation()}><button className="admin-modal-close" onClick={() => setShowForm(false)} aria-label="Đóng">×</button><div className="admin-modal-kicker">QUẢN LÝ POI</div><h2 id="admin-add-title">Thêm địa điểm</h2><p>Địa điểm mới sẽ được lưu thành bản nháp trên giao diện này.</p><form onSubmit={addPlace}><label>Tên địa điểm<input name="name" required placeholder="Ví dụ: Phòng truyền thống SGU" /></label><div className="admin-form-row"><label>Danh mục<select name="category">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Cơ sở / vị trí<input name="location" required placeholder="Ví dụ: Cơ sở chính" /></label></div><label>Mô tả<textarea name="description" required rows={3} placeholder="Mô tả ngắn về địa điểm" /></label><div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={() => setShowForm(false)}>Hủy</button><button className="admin-primary-button" type="submit">Lưu bản nháp</button></div></form></section></div>}
  </section>
}
