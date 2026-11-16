import { useRef, useState, type ChangeEvent } from 'react'
import { fallbackPoiImage, resolvePoiImage } from '../../assets/poiImage'
import type { AdminPoi } from './AdminDashboard'

export type CategoryOption = { vi: string; en: string }

export type PoiEditorPayload = {
  name: string
  category: string
  description: string
  narration: string
  lat: number | undefined
  lng: number | undefined
  image: string
  localizations: Record<string, { name?: string; description?: string; category?: string; narration?: string }>
}

const limits = { name: 300, description: 1000, narration: 4000 }
const maxImageBytes = 8 * 1024 * 1024
const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Text field with a character counter; warns when the limit is near and when it is reached. */
function LimitedField({ label, value, max, onChange, multiline = false, required = false, hint }: {
  label: string
  value: string
  max: number
  onChange: (value: string) => void
  multiline?: boolean
  required?: boolean
  hint?: string
}) {
  const ratio = value.length / max
  const state = ratio >= 1 ? 'is-full' : ratio >= 0.9 ? 'is-near' : ''
  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}{required && <b> *</b>}</span>
      {multiline
        ? <textarea required={required} maxLength={max} value={value} onChange={(event) => onChange(event.target.value)} />
        : <input required={required} maxLength={max} value={value} onChange={(event) => onChange(event.target.value)} />}
      <span className={`admin-field-meta ${state}`}>
        <span>{ratio >= 1 ? `Đã đạt giới hạn ${max} ký tự, không nhập thêm được.` : hint ?? `Tối đa ${max} ký tự.`}</span>
        <span>{value.length}/{max}</span>
      </span>
    </label>
  )
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Add / edit form for a place. Vietnamese is the base text; English is what the app shows. */
export function PoiEditor({ initial, initialStatus, categories, saving, onCancel, onSave, onDelete }: {
  initial: AdminPoi
  initialStatus: 'draft' | 'published'
  categories: CategoryOption[]
  saving: boolean
  onCancel: () => void
  onSave: (payload: PoiEditorPayload, status: 'draft' | 'published') => void
  onDelete?: () => void
}) {
  const en = initial.localizations?.en ?? {}
  const [viName, setViName] = useState(initial.name)
  const [viDescription, setViDescription] = useState(initial.description)
  const [viNarration, setViNarration] = useState(initial.localizations?.vi?.narration ?? initial.narration ?? '')
  const [enName, setEnName] = useState(en.name ?? '')
  const [enDescription, setEnDescription] = useState(en.description ?? '')
  const [enNarration, setEnNarration] = useState(en.narration ?? '')
  const [category, setCategory] = useState(initial.category)
  const [lat, setLat] = useState(initial.lat === undefined || initial.lat === null ? '' : String(initial.lat))
  const [lng, setLng] = useState(initial.lng === undefined || initial.lng === null ? '' : String(initial.lng))
  const [image, setImage] = useState(initial.image ?? '')
  const [imageError, setImageError] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const fileInput = useRef<HTMLInputElement>(null)

  const knownCategory = categories.some((item) => item.vi === category)
  const options = knownCategory || !category ? categories : [...categories, { vi: category, en: category }]
  const preview = image.startsWith('data:') ? image : resolvePoiImage(image)

  async function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!imageTypes.includes(file.type)) { setImageError('Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF.'); return }
    if (file.size > maxImageBytes) { setImageError('Ảnh tối đa 8 MB.'); return }
    setImageError('')
    setImage(await readAsDataUrl(file))
  }

  function submit() {
    const chosen = options.find((item) => item.vi === category)
    onSave({
      name: viName.trim(),
      category,
      description: viDescription.trim(),
      narration: viNarration.trim(),
      lat: lat === '' ? undefined : Number(lat),
      lng: lng === '' ? undefined : Number(lng),
      image,
      localizations: {
        en: { name: enName.trim(), description: enDescription.trim(), category: chosen?.en ?? category, narration: enNarration.trim() },
      },
    }, status)
  }

  return (
    <div className="admin-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="admin-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-editor-title">
        <div className="admin-editor-heading">
          <div><h2 id="admin-editor-title">{initial.id ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm'}</h2><p>Mục có dấu * là bắt buộc.</p></div>
          <button type="button" onClick={onCancel} aria-label="Đóng">×</button>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); submit() }}>
          <label className="admin-field">
            <span className="admin-field-label">Danh mục<b> *</b></span>
            <select required value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="" disabled>Chọn danh mục…</option>
              {options.map((item) => <option key={item.vi} value={item.vi}>{item.en} · {item.vi}</option>)}
            </select>
          </label>

          <fieldset className="admin-locale-fields">
            <legend>Tiếng Anh · hiển thị trong app</legend>
            <LimitedField label="Name" required value={enName} max={limits.name} onChange={setEnName} />
            <LimitedField label="Description" required multiline value={enDescription} max={limits.description} onChange={setEnDescription} />
            <LimitedField label="Narration (audio script)" multiline value={enNarration} max={limits.narration} onChange={setEnNarration}
              hint="Nếu địa điểm có file audio tiếng Anh thì app phát file; nội dung này được đọc bằng giọng máy khi chưa có file." />
          </fieldset>

          <fieldset className="admin-locale-fields">
            <legend>Tiếng Việt</legend>
            <LimitedField label="Tên" required value={viName} max={limits.name} onChange={setViName} />
            <LimitedField label="Mô tả" required multiline value={viDescription} max={limits.description} onChange={setViDescription} />
            <LimitedField label="Nội dung thuyết minh" multiline value={viNarration} max={limits.narration} onChange={setViNarration} />
          </fieldset>

          <div className="admin-editor-grid">
            <label className="admin-field"><span className="admin-field-label">Vĩ độ<b> *</b></span><input required inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} placeholder="10.7600" /></label>
            <label className="admin-field"><span className="admin-field-label">Kinh độ<b> *</b></span><input required inputMode="decimal" value={lng} onChange={(event) => setLng(event.target.value)} placeholder="106.6822" /></label>
          </div>
          <small className="admin-editor-help">Cơ sở và địa chỉ được suy ra từ tọa độ.</small>

          <div className="admin-field">
            <span className="admin-field-label">Ảnh địa điểm</span>
            <div className="admin-image-upload">
              {image ? <img src={preview || fallbackPoiImage} alt="Ảnh xem trước" onError={(event) => { event.currentTarget.src = fallbackPoiImage }} /> : <span className="admin-image-empty">Chưa có ảnh</span>}
              <div>
                <button type="button" className="admin-editor-cancel" onClick={() => fileInput.current?.click()}>Tải ảnh lên</button>
                {image && <button type="button" className="admin-link-button" onClick={() => setImage('')}>Bỏ ảnh</button>}
                <small>JPG, PNG, WebP hoặc GIF, tối đa 8 MB.</small>
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => void pickImage(event)} />
            </div>
            {imageError && <span className="admin-field-meta is-full"><span>{imageError}</span></span>}
          </div>

          <label className="admin-field"><span className="admin-field-label">Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value as 'draft' | 'published')}><option value="draft">Bản nháp (khách chưa thấy)</option><option value="published">Đang hiển thị</option></select></label>

          <div className="admin-editor-actions">
            {onDelete && <button type="button" className="admin-delete-button" onClick={onDelete}>Xóa địa điểm</button>}
            <button type="button" className="admin-editor-cancel" onClick={onCancel}>Hủy</button>
            <button type="submit" className="admin-add-button" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
