import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi, type UsageStats } from './adminApi'
import { fetchAnalytics, type AnalyticsSnapshot } from '../../analytics'
import { PoiEditor, type CategoryOption, type PoiEditorPayload } from './PoiEditor'
import { fallbackPoiImage, resolvePoiImage } from '../../assets/poiImage'
import './AdminDashboard.css'

export type AdminPoi = {
  id: number
  name: string
  category: string
  description: string
  narration?: string
  location: string
  campusId?: string
  lat?: number
  lng?: number
  image?: string
  triggerRadius?: number
  localized?: boolean
  localizations?: Record<string, { name?: string; description?: string; category?: string; location?: string; narration?: string }>
}

type PoiStatus = 'Đang hiển thị' | 'Bản nháp'
type SortKey = 'name-asc' | 'name-desc' | 'heard-desc' | 'heard-asc' | 'id-desc' | 'id-asc'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'name-asc', label: 'Tên A → Z' },
  { key: 'name-desc', label: 'Tên Z → A' },
  { key: 'heard-desc', label: 'Nghe nhiều nhất' },
  { key: 'heard-asc', label: 'Nghe ít nhất' },
  { key: 'id-desc', label: 'Mới thêm gần đây' },
  { key: 'id-asc', label: 'Thêm sớm nhất' },
]

/** The app shows English, so the admin list does too (falls back to the Vietnamese base text). */
const englishName = (place: AdminPoi) => place.localizations?.en?.name || place.name
const englishCategory = (place: AdminPoi) => place.localizations?.en?.category || place.category

const categoryColors: Record<string, string> = {
  'Kiến trúc': '#668e72', 'Học tập': '#6c83b8', 'Ẩm thực': '#c18c4d',
  'Không gian xanh': '#5e9b79', 'Thể thao': '#9a76aa',
}

export type AdminView = 'overview' | 'places'

const emptyUsage: UsageStats = {
  usageAvailable: true, devices: 0, devicesToday: 0, visits: 0, visitsToday: 0,
  deviceTypes: { mobile: 0, tablet: 0, desktop: 0 }, visitsByDay: [], heardTotal: 0, topPois: [],
}

export function AdminDashboard({ view }: { view: AdminView }) {
  const [places, setPlaces] = useState<AdminPoi[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot>({ activeUsers: 0, pois: {} })
  const [statuses, setStatuses] = useState<Record<number, PoiStatus>>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tất cả địa điểm')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<AdminPoi | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name-asc')
  const [usage, setUsage] = useState<UsageStats>(emptyUsage)

  const fetchPlaces = useCallback(async () => {
    const result = await adminApi.listPois()
    return result.items
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchPlaces().then((items) => {
      if (cancelled) return
      setLoadError('')
      setPlaces(items)
      setStatuses(Object.fromEntries(items.map((poi) => [poi.id, poi.status === 'draft' ? 'Bản nháp' : 'Đang hiển thị'])))
    }).catch((reason) => {
      if (!cancelled) setLoadError(reason instanceof Error ? reason.message : 'Không thể tải địa điểm.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchPlaces])

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        const [result, stats] = await Promise.all([fetchAnalytics(), adminApi.usage()])
        if (!cancelled) { setAnalytics(result); setUsage(stats) }
      } catch { /* Keep last known analytics counts while the API is unavailable. */ }
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 5_000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [])

  function retryLoadPlaces() {
    setLoading(true)
    setLoadError('')
    void fetchPlaces().then((items) => {
      setPlaces(items)
      setStatuses(Object.fromEntries(items.map((poi) => [poi.id, poi.status === 'draft' ? 'Bản nháp' : 'Đang hiển thị'])))
    }).catch((reason) => {
      setLoadError(reason instanceof Error ? reason.message : 'Không thể tải địa điểm.')
    }).finally(() => setLoading(false))
  }

  const visiblePlaces = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi')
    const heard = (place: AdminPoi) => analytics.pois[String(place.id)]?.heard ?? 0
    const byName = (a: AdminPoi, b: AdminPoi) => englishName(a).localeCompare(englishName(b), 'en', { sensitivity: 'base', numeric: true })
    const compare: Record<SortKey, (a: AdminPoi, b: AdminPoi) => number> = {
      'name-asc': byName,
      'name-desc': (a, b) => byName(b, a),
      'heard-desc': (a, b) => heard(b) - heard(a) || byName(a, b),
      'heard-asc': (a, b) => heard(a) - heard(b) || byName(a, b),
      'id-desc': (a, b) => b.id - a.id,
      'id-asc': (a, b) => a.id - b.id,
    }
    return places.filter((place) => {
      const text = `${englishName(place)} ${place.name} ${englishCategory(place)} ${place.category} ${place.location}`.toLocaleLowerCase('vi')
      const status = statuses[place.id] ?? 'Đang hiển thị'
      return (!needle || text.includes(needle))
        && (filter === 'Tất cả địa điểm' || status === filter)
        && (!categoryFilter || englishCategory(place) === categoryFilter)
    }).sort(compare[sortBy])
  }, [analytics.pois, categoryFilter, filter, places, query, sortBy, statuses])
  const categories = [...new Set(places.map((place) => place.category))]
  const englishCategories = [...new Set(places.map(englishCategory))].sort((a, b) => a.localeCompare(b))
  const categoryOptions: CategoryOption[] = useMemo(() => {
    const pairs = new Map<string, string>()
    for (const place of places) if (!pairs.has(place.category)) pairs.set(place.category, englishCategory(place))
    return [...pairs].map(([vi, en]) => ({ vi, en })).sort((a, b) => a.en.localeCompare(b.en))
  }, [places])

  async function reloadPlaces() {
    const items = await fetchPlaces()
    setPlaces(items)
    setStatuses(Object.fromEntries(items.map((poi) => [poi.id, poi.status === 'draft' ? 'Bản nháp' : 'Đang hiển thị'])))
  }

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  async function deletePlace(place: AdminPoi) {
    const ok = window.confirm(`Xóa "${englishName(place)}"?\n\nĐịa điểm, bản dịch và số lượt nghe của nó sẽ bị xóa vĩnh viễn khỏi database. Không thể hoàn tác.\nNếu chỉ muốn ẩn khỏi app, hãy chuyển sang "Bản nháp".`)
    if (!ok) return
    try {
      await adminApi.deletePoi(place.id)
      setDraft(null)
      await reloadPlaces()
      showNotice('Đã xóa địa điểm.')
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Không thể xóa địa điểm.') }
  }

  async function toggleStatus(place: AdminPoi) {
    const status = statuses[place.id] ?? 'Đang hiển thị'
    const next = status === 'Bản nháp' ? 'published' : 'draft'
    try {
      await adminApi.updatePoi(place.id, { status: next })
      setStatuses((current) => ({ ...current, [place.id]: next === 'draft' ? 'Bản nháp' : 'Đang hiển thị' }))
      setNotice(next === 'draft' ? 'Đã chuyển địa điểm thành bản nháp.' : 'Địa điểm đã được đăng công khai.')
      window.setTimeout(() => setNotice(''), 3500)
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Không thể cập nhật trạng thái.') }
  }

  function startCreatePoi() {
    setDraft({ id: 0, name: '', category: '', description: '', narration: '', location: '', lat: undefined, lng: undefined, image: '', localizations: {} })
  }

  function startEditPoi(place: AdminPoi) {
    setDraft({ ...place })
  }

  async function saveDraft(payload: PoiEditorPayload, status: 'draft' | 'published') {
    if (!draft) return
    setSavingDraft(true)
    try {
      if (draft.id) await adminApi.updatePoi(draft.id, { ...payload, status })
      else await adminApi.createPoi({ ...payload, status })
      await reloadPlaces()
      showNotice(draft.id ? 'Đã lưu thay đổi.' : 'Đã thêm địa điểm.')
      setDraft(null)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Không thể lưu địa điểm.')
    } finally {
      setSavingDraft(false)
    }
  }

  function exportCsv() {
    const rows = [['Name', 'Tên tiếng Việt', 'Category', 'Vị trí', 'Đã nghe', 'Nghe thử', 'Trạng thái'], ...visiblePlaces.map((place) => [
      englishName(place), place.name, englishCategory(place), place.location, String(analytics.pois[String(place.id)]?.heard ?? 0), String(analytics.pois[String(place.id)]?.preview ?? 0), statuses[place.id] ?? 'Đang hiển thị',
    ])]
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'sgu-go-dia-diem.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const maxVisits = Math.max(1, ...usage.visitsByDay.map((day) => day.visits))
  const deviceTotal = usage.deviceTypes.mobile + usage.deviceTypes.tablet + usage.deviceTypes.desktop
  const maxHeard = Math.max(1, ...usage.topPois.map((poi) => poi.heard))
  const dayLabel = (date: string) => { const [, month, day] = date.split('-'); return `${day}/${month}` }

  return <section className="admin-dashboard">
    <header className="admin-heading">
      <div><div className="admin-eyebrow"><span /> TRUNG TÂM QUẢN TRỊ</div><h1>{view === 'overview' ? 'Tổng quan' : 'Quản lý địa điểm'}</h1><p>{view === 'overview' ? 'Theo dõi thiết bị, lượt dùng và nội dung trên SGU Go.' : 'Thêm địa điểm và cập nhật nội dung đã lưu trong database.'}</p></div>
    </header>

    {notice && <div className="admin-notice" role="status">✓ {notice}</div>}
    {loadError && <div className="admin-notice admin-load-error" role="alert">{loadError} <button onClick={retryLoadPlaces}>Thử tải lại</button><span>Hãy chạy <code>npm run dev:api</code> trong terminal API.</span></div>}

    {view === 'overview' && <>
    {!usage.usageAvailable && <div className="admin-notice admin-load-error" role="status">Chưa bật thống kê thiết bị và lượt dùng. Hãy chạy file <code>server/sql/add_usage_stats.sql</code> trong SSMS, rồi tải lại trang.</div>}
    <div className="admin-stat-grid">
      <article className="admin-stat-card"><span className="admin-stat-icon green">●</span><span className="admin-stat-label">Đang dùng app</span><strong>{analytics.activeUsers}</strong><small>Thiết bị đang mở trang</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon blue">▯</span><span className="admin-stat-label">Thiết bị đã dùng</span><strong>{usage.devices}</strong><small>{usage.devicesToday} thiết bị mới hôm nay</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon amber">↻</span><span className="admin-stat-label">Lượt truy cập hôm nay</span><strong>{usage.visitsToday}</strong><small>Tổng {usage.visits} lượt</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon violet">♫</span><span className="admin-stat-label">Lượt nghe thuyết minh</span><strong>{usage.heardTotal}</strong><small>Chỉ tính khi đứng trong bán kính</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon green">⌖</span><span className="admin-stat-label">Tổng địa điểm</span><strong>{places.length}</strong><small>{categories.length} danh mục</small></article>
    </div>

    <div className="admin-overview-grid">
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Lượt truy cập 7 ngày qua</h2><p>Mỗi lượt là một lần mở app sau ít nhất 30 phút vắng mặt</p></div><span className="admin-panel-badge">{usage.visitsByDay.reduce((sum, day) => sum + day.visits, 0)} lượt</span></div>
        <div className="admin-bar-chart" role="img" aria-label="Biểu đồ lượt truy cập theo ngày">{usage.visitsByDay.map((day) => <div className="admin-bar" key={day.date}><span className="admin-bar-value">{day.visits}</span><i style={{ height: `${Math.max(4, day.visits / maxVisits * 100)}%` }} /><small>{dayLabel(day.date)}</small></div>)}</div>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Loại thiết bị</h2><p>Tính theo trình duyệt đã truy cập</p></div><span className="admin-panel-badge">{deviceTotal} thiết bị</span></div>
        <div className="admin-category-list">{([['mobile', 'Điện thoại', '#5978ab'], ['tablet', 'Máy tính bảng', '#c18c4d'], ['desktop', 'Máy tính', '#5e9b79']] as const).map(([key, label, color]) => {
          const count = usage.deviceTypes[key]
          const percent = deviceTotal ? Math.round(count / deviceTotal * 100) : 0
          return <div className="admin-category-row" key={key}><div className="admin-category-top"><span><i style={{ background: color }} />{label}</span><strong>{count}<small> · {percent}%</small></strong></div><div className="admin-progress-track"><i style={{ width: `${percent}%`, background: color }} /></div></div>
        })}</div>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Địa điểm được nghe nhiều nhất</h2><p>Số thiết bị đã nghe thuyết minh khi ở trong bán kính</p></div></div>
        <div className="admin-category-list">{usage.topPois.length === 0 ? <p className="admin-empty-note">Chưa có lượt nghe nào.</p> : usage.topPois.map((poi) => <div className="admin-category-row" key={poi.id}><div className="admin-category-top"><span>{poi.name}</span><strong>{poi.heard}</strong></div><div className="admin-progress-track"><i style={{ width: `${poi.heard / maxHeard * 100}%`, background: '#5e9b79' }} /></div></div>)}</div>
      </section>
      <section className="admin-panel admin-category-panel">
        <div className="admin-panel-heading"><div><h2>Địa điểm theo danh mục</h2><p>Phân bổ POI trong hệ thống</p></div><span className="admin-panel-badge">{places.length} POI</span></div>
        <div className="admin-category-list">{categories.map((category) => {
          const count = places.filter((place) => place.category === category).length
          const percent = places.length ? Math.round(count / places.length * 100) : 0
          return <div className="admin-category-row" key={category}><div className="admin-category-top"><span><i style={{ background: categoryColors[category] ?? '#6c8475' }} />{category}</span><strong>{count}<small> · {percent}%</small></strong></div><div className="admin-progress-track"><i style={{ width: `${percent}%`, background: categoryColors[category] ?? '#6c8475' }} /></div></div>
        })}</div>
      </section>
    </div>
    </>}

    {view === 'places' && <>
    <section className="admin-panel admin-table-panel">
      <div className="admin-table-heading"><div><h2>Quản lý địa điểm</h2><p>Thêm POI và cập nhật nội dung đã lưu trong database.</p></div><div className="admin-table-actions"><button className="admin-add-button" onClick={startCreatePoi}>＋ Thêm địa điểm</button><button className="admin-export-button" onClick={exportCsv}>↓ <span>Xuất CSV</span></button></div></div>
      <div className="admin-table-tools"><label className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm địa điểm, danh mục..." aria-label="Tìm địa điểm" /></label><div className="admin-table-filters"><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Lọc theo danh mục"><option value="">Tất cả danh mục</option>{englishCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Lọc theo trạng thái"><option>Tất cả địa điểm</option><option>Đang hiển thị</option><option>Bản nháp</option></select><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)} aria-label="Sắp xếp">{sortOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></div></div>
      <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>ĐỊA ĐIỂM</th><th>DANH MỤC</th><th>VỊ TRÍ</th><th>TỌA ĐỘ</th><th>AUDIO</th><th>ĐÃ NGHE</th><th>NGHE THỬ</th><th>ĐANG NGHE</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>
        {loading ? <tr><td colSpan={10}>Đang tải dữ liệu địa điểm…</td></tr> : visiblePlaces.map((place) => {
          const status = statuses[place.id] ?? 'Đang hiển thị'
          return (
            <tr key={place.id}>
              <td><div className="admin-place-cell"><span className="admin-place-thumbnail">{place.image ? <img src={resolvePoiImage(place.image) || fallbackPoiImage} alt={`Ảnh ${place.name}`} onError={(event) => { event.currentTarget.src = fallbackPoiImage }} /> : '⌖'}</span><span><strong>{englishName(place)}</strong><small>{place.name} · POI-{String(place.id).padStart(3, '0')}</small></span></div></td>
              <td><span className="admin-category-pill"><i style={{ background: categoryColors[place.category] ?? '#6c8475' }} />{englishCategory(place)}</span></td>
              <td className="admin-location-cell">{place.location}</td>
              <td>{typeof place.lat === 'number' && typeof place.lng === 'number' ? `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}` : '—'}</td>
              <td><span className={`admin-audio-state ${place.narration ? 'has-audio' : ''}`}>{place.narration ? '♫ Có audio' : '— Chưa có'}</span></td>
              <td>{analytics.pois[String(place.id)]?.heard ?? 0}</td>
              <td>{analytics.pois[String(place.id)]?.preview ?? 0}</td>
              <td><span className="admin-live-count"><i />{analytics.pois[String(place.id)]?.active ?? 0}</span></td>
              <td><span className={`admin-status-pill ${status === 'Bản nháp' ? 'draft' : ''}`}><i />{status}</span></td>
              <td><div className="admin-row-actions"><button className="admin-row-action" title="Chỉnh sửa địa điểm" onClick={() => startEditPoi(place)}>Sửa</button><button className="admin-row-action" title={status === 'Bản nháp' ? 'Đăng địa điểm' : 'Chuyển thành bản nháp'} onClick={() => void toggleStatus(place)}>{status === 'Bản nháp' ? 'Đăng' : 'Ẩn'}</button><button className="admin-row-action admin-row-delete" title="Xóa địa điểm" onClick={() => void deletePlace(place)}>Xóa</button></div></td>
            </tr>
          )
          }
        )}
      </tbody></table></div>
      {!loading && !loadError && visiblePlaces.length === 0 && <div className="admin-table-empty"><strong>Không tìm thấy địa điểm</strong><span>Thử đổi từ khóa hoặc bộ lọc.</span></div>}
      {!loading && visiblePlaces.length > 0 && <div className="admin-table-footer">Đang hiển thị {visiblePlaces.length} trên {places.length} địa điểm <span>Dữ liệu được lưu trên máy chủ cục bộ.</span></div>}
    </section>
    </>}

    {draft && <PoiEditor
      key={draft.id || 'new'}
      initial={draft}
      initialStatus={draft.id && statuses[draft.id] !== 'Bản nháp' ? 'published' : 'draft'}
      categories={categoryOptions}
      saving={savingDraft}
      onCancel={() => setDraft(null)}
      onSave={(payload, status) => void saveDraft(payload, status)}
      onDelete={draft.id ? () => void deletePlace(draft) : undefined}
    />}

  </section>
}
