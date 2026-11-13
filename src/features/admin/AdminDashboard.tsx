import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { adminApi } from './adminApi'
import { fetchAnalytics, sendHeartbeat, type AnalyticsSnapshot } from '../../analytics'
import { createLocaleTranslationTemplate, fetchLocaleOptions, type LocaleOption } from '../../i18n/translations'
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

const categoryColors: Record<string, string> = {
  'Kiến trúc': '#668e72', 'Học tập': '#6c83b8', 'Ẩm thực': '#c18c4d',
  'Không gian xanh': '#5e9b79', 'Thể thao': '#9a76aa',
}

export function AdminDashboard() {
  const [places, setPlaces] = useState<AdminPoi[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot>({ activeUsers: 0, pois: {} })
  const [statuses, setStatuses] = useState<Record<number, PoiStatus>>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tất cả địa điểm')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<AdminPoi | null>(null)
  const [draftStatus, setDraftStatus] = useState<'draft' | 'published'>('draft')
  const [savingDraft, setSavingDraft] = useState(false)
  const [languages, setLanguages] = useState<LocaleOption[]>([])
  const [languageCode, setLanguageCode] = useState('')
  const [languageLabel, setLanguageLabel] = useState('')
  const [languageJson, setLanguageJson] = useState(() => JSON.stringify(createLocaleTranslationTemplate(), null, 2))

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
    void fetchLocaleOptions().then((items) => { if (!cancelled) setLanguages(items) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        await sendHeartbeat()
        const result = await fetchAnalytics()
        if (!cancelled) setAnalytics(result)
      } catch { /* Keep last known analytics counts while the API is unavailable. */ }
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 12_000)
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

  const visiblePlaces = useMemo(() => places.filter((place) => {
    const matchesQuery = `${place.name} ${place.category} ${place.location}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
    const status = statuses[place.id] ?? 'Đang hiển thị'
    return matchesQuery && (filter === 'Tất cả địa điểm' || status === filter)
  }), [filter, places, query, statuses])
  const narratedCount = places.filter((place) => Boolean(place.narration?.trim())).length
  const categories = [...new Set(places.map((place) => place.category))]

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
    setDraftStatus('draft')
  }

  function startEditPoi(place: AdminPoi) {
    setDraft({ ...place })
    setDraftStatus(statuses[place.id] === 'Bản nháp' ? 'draft' : 'published')
  }

  async function saveDraft() {
    if (!draft) return
    setSavingDraft(true)
    try {
      const saved = draft.id
        ? await adminApi.updatePoi(draft.id, { ...draft, status: draftStatus })
        : await adminApi.createPoi({
            name: draft.name,
            category: draft.category,
            description: draft.description,
            narration: draft.narration,
            lat: draft.lat,
            lng: draft.lng,
            image: draft.image,
            localizations: draft.localizations,
            status: draftStatus,
          })
      setPlaces((current) => draft.id
        ? current.map((place) => place.id === saved.id ? { ...saved, localizations: draft.localizations } : place)
        : [...current, { ...saved, localizations: draft.localizations }].sort((first, second) => first.id - second.id))
      setStatuses((current) => ({ ...current, [saved.id]: saved.status === 'draft' ? 'Bản nháp' : 'Đang hiển thị' }))
      setDraft(null)
      setNotice(draft.id ? 'Đã lưu thay đổi địa điểm vào database.' : 'Đã thêm địa điểm vào database.')
      window.setTimeout(() => setNotice(''), 3500)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Không thể lưu địa điểm.')
    } finally {
      setSavingDraft(false)
    }
  }

  async function saveLanguage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const translations = JSON.parse(languageJson)
      if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
        throw new Error('JSON dịch phải là một đối tượng key/value.')
      }
      const nonEmptyTranslations = Object.fromEntries(
        Object.entries(translations as Record<string, unknown>)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1].trim())),
      )
      await adminApi.saveLanguage(languageCode, languageLabel, nonEmptyTranslations)
      const refreshed = await fetchLocaleOptions()
      setLanguages(refreshed)
      setNotice(`Đã lưu ngôn ngữ ${languageLabel} vào database.`)
      setLanguageCode('')
      setLanguageLabel('')
      window.setTimeout(() => setNotice(''), 3500)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Không lưu được gói ngôn ngữ.')
    }
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
    </header>

    {notice && <div className="admin-notice" role="status">✓ {notice}</div>}
    {loadError && <div className="admin-notice admin-load-error" role="alert">{loadError} <button onClick={retryLoadPlaces}>Thử tải lại</button><span>Hãy chạy <code>npm run dev:api</code> trong terminal API.</span></div>}

    <div className="admin-stat-grid">
      <article className="admin-stat-card"><span className="admin-stat-icon green">⌖</span><span className="admin-stat-label">Tổng địa điểm</span><strong>{places.length}</strong><small>Trong danh sách POI</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon blue">♫</span><span className="admin-stat-label">Có thuyết minh</span><strong>{narratedCount}<small className="admin-stat-total"> / {places.length}</small></strong><small>Nội dung audio tiếng Việt</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon amber">◷</span><span className="admin-stat-label">Bản nháp</span><strong>{places.filter((place) => statuses[place.id] === 'Bản nháp').length}</strong><small>Chờ quản trị viên duyệt</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon violet">▦</span><span className="admin-stat-label">Danh mục</span><strong>{categories.length}</strong><small>Nhóm địa điểm hiện có</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon green">●</span><span className="admin-stat-label">Đang dùng app</span><strong>{analytics.activeUsers}</strong><small>Phiên hoạt động gần đây</small></article>
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

    <section className="admin-panel admin-language-panel">
      <div className="admin-panel-heading"><div><h2>Ngôn ngữ giao diện</h2><p>Thêm locale và gói dịch trong database; giao diện sẽ tải danh sách khi mở lại.</p></div><span className="admin-panel-badge">{languages.length} ngôn ngữ</span></div>
      <div className="admin-language-list">{languages.map((language) => <span key={language.code}>{language.label} <small>{language.code}</small></span>)}</div>
      <form className="admin-language-form" onSubmit={(event) => void saveLanguage(event)}>
        <label>Mã locale<input required pattern="[a-z]{2,3}(-[A-Z]{2})?" maxLength={10} value={languageCode} onChange={(event) => setLanguageCode(event.target.value)} placeholder="fr hoặc pt-BR" /></label>
        <label>Tên hiển thị<input required maxLength={100} value={languageLabel} onChange={(event) => setLanguageLabel(event.target.value)} placeholder="Français" /></label>
        <label className="admin-language-json">Gói dịch JSON<textarea required value={languageJson} onChange={(event) => setLanguageJson(event.target.value)} spellCheck={false} /></label>
        <p className="admin-editor-help">Các khóa chưa có trong JSON sẽ hiện bằng tiếng Việt. Dùng các khóa giao diện hiện có, ví dụ <code>pageTitle</code>, <code>discover</code>, <code>map</code>.</p>
        <button type="submit" className="admin-add-button">Lưu locale vào database</button>
      </form>
    </section>

    <section className="admin-panel admin-table-panel">
      <div className="admin-table-heading"><div><h2>Quản lý địa điểm</h2><p>Thêm POI và cập nhật nội dung đã lưu trong database.</p></div><div className="admin-table-actions"><button className="admin-add-button" onClick={startCreatePoi}>＋ Thêm địa điểm</button><button className="admin-export-button" onClick={exportCsv}>↓ <span>Xuất CSV</span></button></div></div>
      <div className="admin-table-tools"><label className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm địa điểm, danh mục..." aria-label="Tìm địa điểm" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Lọc theo trạng thái"><option>Tất cả địa điểm</option><option>Đang hiển thị</option><option>Bản nháp</option></select></div>
      <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>ĐỊA ĐIỂM</th><th>DANH MỤC</th><th>VỊ TRÍ</th><th>TỌA ĐỘ</th><th>AUDIO</th><th>ĐÃ NGHE</th><th>ĐANG NGHE</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>
        {loading ? <tr><td colSpan={9}>Đang tải dữ liệu địa điểm…</td></tr> : visiblePlaces.map((place) => {
          const status = statuses[place.id] ?? 'Đang hiển thị'
          return (
            <tr key={place.id}>
              <td><div className="admin-place-cell"><span className="admin-place-thumbnail">{place.image ? <img src={resolvePoiImage(place.image) || fallbackPoiImage} alt={`Ảnh ${place.name}`} onError={(event) => { event.currentTarget.src = fallbackPoiImage }} /> : '⌖'}</span><span><strong>{place.name}</strong><small>POI-{String(place.id).padStart(3, '0')}</small></span></div></td>
              <td><span className="admin-category-pill"><i style={{ background: categoryColors[place.category] ?? '#6c8475' }} />{place.category}</span></td>
              <td className="admin-location-cell">{place.location}</td>
              <td>{typeof place.lat === 'number' && typeof place.lng === 'number' ? `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}` : '—'}</td>
              <td><span className={`admin-audio-state ${place.narration ? 'has-audio' : ''}`}>{place.narration ? '♫ Có audio' : '— Chưa có'}</span></td>
              <td>{analytics.pois[String(place.id)]?.heard ?? 0}</td>
              <td><span className="admin-live-count"><i />{analytics.pois[String(place.id)]?.active ?? 0}</span></td>
              <td><span className={`admin-status-pill ${status === 'Bản nháp' ? 'draft' : ''}`}><i />{status}</span></td>
              <td><div className="admin-row-actions"><button className="admin-row-action" title="Chỉnh sửa địa điểm" onClick={() => startEditPoi(place)}>Sửa</button><button className="admin-row-action" title={status === 'Bản nháp' ? 'Đăng địa điểm' : 'Chuyển thành bản nháp'} onClick={() => void toggleStatus(place)}>{status === 'Bản nháp' ? 'Đăng' : '•••'}</button></div></td>
            </tr>
          )
          }
        )}
      </tbody></table></div>
      {!loading && !loadError && visiblePlaces.length === 0 && <div className="admin-table-empty"><strong>Không tìm thấy địa điểm</strong><span>Thử đổi từ khóa hoặc bộ lọc.</span></div>}
      {!loading && visiblePlaces.length > 0 && <div className="admin-table-footer">Đang hiển thị {visiblePlaces.length} trên {places.length} địa điểm <span>Dữ liệu được lưu trên máy chủ cục bộ.</span></div>}
    </section>

    {draft && <div className="admin-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null) }}><section className="admin-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-editor-title"><div className="admin-editor-heading"><div><h2 id="admin-editor-title">{draft.id ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm'}</h2><p>Nội dung được lưu trực tiếp vào database.</p></div><button type="button" onClick={() => setDraft(null)} aria-label="Đóng">×</button></div><form onSubmit={(event) => { event.preventDefault(); void saveDraft() }}><label>Tên địa điểm<input required maxLength={300} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Danh mục<input required maxLength={100} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label><label>Mô tả<textarea required value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>Nội dung thuyết minh tiếng Việt<textarea value={draft.narration || ''} onChange={(event) => setDraft({ ...draft, narration: event.target.value })} /></label>{languages.filter((item) => item.code !== 'vi').map((item) => { const copy = draft.localizations?.[item.code] || {}; const updateCopy = (field: 'name' | 'description' | 'category' | 'location' | 'narration', value: string) => setDraft({ ...draft, localizations: { ...draft.localizations, [item.code]: { ...copy, [field]: value } } }); return <fieldset className="admin-locale-fields" key={item.code}><legend>{item.label} · {item.code}</legend><label>Tên<input value={copy.name || ''} onChange={(event) => updateCopy('name', event.target.value)} /></label><label>Danh mục<input value={copy.category || ''} onChange={(event) => updateCopy('category', event.target.value)} /></label><label>Mô tả<textarea value={copy.description || ''} onChange={(event) => updateCopy('description', event.target.value)} /></label><label>Vị trí<textarea value={copy.location || ''} onChange={(event) => updateCopy('location', event.target.value)} /></label><label>Thuyết minh<textarea value={copy.narration || ''} onChange={(event) => updateCopy('narration', event.target.value)} /></label></fieldset>})}<div className="admin-editor-grid"><label>Vĩ độ<input required inputMode="decimal" value={draft.lat ?? ''} onChange={(event) => setDraft({ ...draft, lat: event.target.value === '' ? undefined : Number(event.target.value) })} /></label><label>Kinh độ<input required inputMode="decimal" value={draft.lng ?? ''} onChange={(event) => setDraft({ ...draft, lng: event.target.value === '' ? undefined : Number(event.target.value) })} /></label></div><small className="admin-editor-help">Vị trí/cơ sở được suy ra từ tọa độ; POI cần tọa độ để hiện đúng trên bản đồ.</small><label>Đường dẫn ảnh<input value={draft.image || ''} onChange={(event) => setDraft({ ...draft, image: event.target.value })} placeholder="/uploads/... hoặc URL ảnh" /></label><label>Trạng thái<select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as 'draft' | 'published')}><option value="draft">Bản nháp</option><option value="published">Đang hiển thị</option></select></label><div className="admin-editor-actions"><button type="button" className="admin-editor-cancel" onClick={() => setDraft(null)}>Hủy</button><button type="submit" className="admin-add-button" disabled={savingDraft}>{savingDraft ? 'Đang lưu…' : 'Lưu vào database'}</button></div></form></section></div>}

  </section>
}
