import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scrypt = promisify(scryptCallback)
const root = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(root, 'data')
const uploadsDir = path.join(root, 'uploads')
const poiFile = path.join(dataDir, 'pois.json')
const userFile = path.join(dataDir, 'admins.json')
const analyticsFile = path.join(dataDir, 'analytics.json')
const port = Number(process.env.API_PORT || 8787)
const sessionTtlMs = 12 * 60 * 60 * 1000
const sessions = new Map()
const activeVisitors = new Map()
let writeQueue = Promise.resolve()

await mkdir(dataDir, { recursive: true })
await mkdir(uploadsDir, { recursive: true })
let analytics = await readJson(analyticsFile, { heardUsers: {} })

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

function saveJson(file, value) {
  const write = async () => {
    const temporary = `${file}.${randomBytes(5).toString('hex')}.tmp`
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporary, file)
  }
  writeQueue = writeQueue.then(write, write)
  return writeQueue
}

async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: (await scrypt(password, salt, 64)).toString('hex') }
}

let admins = await readJson(userFile, [])
const defaultEmail = (process.env.SGU_ADMIN_EMAIL || 'admin@sgu.edu.vn').trim().toLowerCase()
const defaultPassword = process.env.SGU_ADMIN_PASSWORD || 'sguadmin2026'
if (!admins.some((admin) => admin.email === defaultEmail)) {
  admins.push({ name: 'Quản trị viên SGU', email: defaultEmail, ...(await passwordHash(defaultPassword)) })
  await saveJson(userFile, admins)
}

function send(response, status, data) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(data))
}

async function bodyJson(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 12 * 1024 * 1024) throw Object.assign(new Error('Dữ liệu gửi lên quá lớn (tối đa 12 MB).'), { status: 413 })
  }
  try { return raw ? JSON.parse(raw) : {} } catch { throw Object.assign(new Error('Dữ liệu JSON không hợp lệ.'), { status: 400 }) }
}

function cleanPoi(poi) {
  const name = String(poi.name || '').trim()
  const category = String(poi.category || '').trim()
  const location = String(poi.location || '').trim()
  const description = String(poi.description || '').trim()
  const lat = Number(poi.lat)
  const lng = Number(poi.lng)
  if (!name || !category || !location || !description) throw Object.assign(new Error('Tên, danh mục, vị trí và mô tả là bắt buộc.'), { status: 400 })
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw Object.assign(new Error('Tọa độ vĩ độ/kinh độ không hợp lệ.'), { status: 400 })
  }
  return { name, category, location, description, lat, lng, narration: String(poi.narration || ''), campusId: String(poi.campusId || 'main') }
}

async function storeImage(dataUrl) {
  if (!dataUrl) return ''
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([\w+/=]+)$/.exec(dataUrl)
  if (!match) throw Object.assign(new Error('Ảnh phải là JPG, PNG, WebP hoặc GIF.'), { status: 400 })
  const data = Buffer.from(match[2], 'base64')
  if (!data.length || data.length > 8 * 1024 * 1024) throw Object.assign(new Error('Ảnh tối đa 8 MB.'), { status: 413 })
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[match[1]]
  const filename = `${randomBytes(16).toString('hex')}.${ext}`
  await writeFile(path.join(uploadsDir, filename), data, { flag: 'wx' })
  return `/uploads/${filename}`
}

function authenticated(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  const expires = sessions.get(token)
  if (!token || !expires || expires < Date.now()) {
    sessions.delete(token)
    return false
  }
  return true
}

function requireAuth(request, response) {
  if (authenticated(request)) return true
  send(response, 401, { error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' })
  return false
}

function isPoiValid(poi) {
  return poi && Number.isInteger(Number(poi.id)) && poi.name && poi.category && poi.location
}

function cleanActiveVisitors() {
  const cutoff = Date.now() - 45_000
  for (const [visitorId, visitor] of activeVisitors) {
    if (visitor.lastSeen < cutoff) activeVisitors.delete(visitorId)
  }
}

function validVisitorId(value) {
  const visitorId = String(value || '')
  if (visitorId.length < 8 || visitorId.length > 100) throw Object.assign(new Error('Phiên khách không hợp lệ.'), { status: 400 })
  return visitorId
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  try {
    if (request.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      const filename = path.basename(url.pathname.slice('/uploads/'.length))
      if (filename !== url.pathname.slice('/uploads/'.length)) return send(response, 400, { error: 'Tên ảnh không hợp lệ.' })
      const file = path.join(uploadsDir, filename)
      const ext = path.extname(filename).toLowerCase()
      const types = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }
      if (!types[ext]) return send(response, 404, { error: 'Không tìm thấy ảnh.' })
      response.writeHead(200, { 'content-type': types[ext], 'cache-control': 'public, max-age=31536000, immutable' })
      createReadStream(file).on('error', () => { if (!response.headersSent) send(response, 404, { error: 'Không tìm thấy ảnh.' }) }).pipe(response)
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/health') return send(response, 200, { ok: true })

    if (request.method === 'GET' && url.pathname === '/api/analytics') {
      cleanActiveVisitors()
      const pois = {}
      for (const [poiId, visitorIds] of Object.entries(analytics.heardUsers)) {
        pois[poiId] = { heard: visitorIds.length, active: 0 }
      }
      for (const visitor of activeVisitors.values()) {
        if (!visitor.poiId) continue
        const stats = pois[visitor.poiId] || { heard: 0, active: 0 }
        stats.active += 1
        pois[visitor.poiId] = stats
      }
      return send(response, 200, { activeUsers: activeVisitors.size, pois })
    }

    if (request.method === 'POST' && ['/api/analytics/heartbeat', '/api/analytics/listen/start', '/api/analytics/listen/end'].includes(url.pathname)) {
      const body = await bodyJson(request)
      const visitorId = validVisitorId(body.visitorId)
      cleanActiveVisitors()
      const visitor = activeVisitors.get(visitorId) || { lastSeen: Date.now(), poiId: null }
      visitor.lastSeen = Date.now()
      if (url.pathname.endsWith('/start')) {
        const poiId = String(Number(body.poiId))
        if (!Number.isInteger(Number(body.poiId)) || Number(body.poiId) <= 0) return send(response, 400, { error: 'Mã POI không hợp lệ.' })
        visitor.poiId = poiId
        const ids = new Set(analytics.heardUsers[poiId] || [])
        ids.add(visitorId)
        analytics.heardUsers[poiId] = [...ids]
        await saveJson(analyticsFile, analytics)
      } else if (url.pathname.endsWith('/end')) {
        if (visitor.poiId === String(Number(body.poiId))) visitor.poiId = null
      }
      activeVisitors.set(visitorId, visitor)
      return send(response, 200, { ok: true })
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/login') {
      const body = await bodyJson(request)
      const email = String(body.email || '').trim().toLowerCase()
      const admin = admins.find((item) => item.email === email)
      const supplied = admin ? await passwordHash(String(body.password || ''), admin.salt) : await passwordHash(String(body.password || ''), 'invalid-account-salt')
      if (!admin || !timingSafeEqual(Buffer.from(supplied.hash, 'hex'), Buffer.from(admin.hash, 'hex'))) return send(response, 401, { error: 'Email hoặc mật khẩu chưa chính xác.' })
      const token = randomBytes(32).toString('base64url')
      sessions.set(token, Date.now() + sessionTtlMs)
      return send(response, 200, { token, expiresIn: sessionTtlMs, admin: { name: admin.name, email: admin.email } })
    }

    if (request.method === 'GET' && url.pathname === '/api/pois') {
      const pois = await readJson(poiFile, [])
      return send(response, 200, pois.filter((poi) => poi.status === 'published'))
    }

    if (url.pathname.startsWith('/api/admin/')) {
      if (!requireAuth(request, response)) return
      if (request.method === 'GET' && url.pathname === '/api/admin/pois') {
        const all = await readJson(poiFile, [])
        const q = (url.searchParams.get('q') || '').toLocaleLowerCase('vi')
        const status = url.searchParams.get('status') || ''
        const filtered = all.filter((poi) => (!status || poi.status === status) && (!q || `${poi.name} ${poi.category} ${poi.location}`.toLocaleLowerCase('vi').includes(q)))
        const page = Math.max(1, Number(url.searchParams.get('page') || 1))
        const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 100)))
        return send(response, 200, { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize })
      }
      if (request.method === 'POST' && url.pathname === '/api/admin/pois/bootstrap') {
        const current = await readJson(poiFile, [])
        if (current.length) return send(response, 200, { items: current, imported: false })
        const body = await bodyJson(request)
        if (!Array.isArray(body.items)) return send(response, 400, { error: 'Danh sách POI khởi tạo không hợp lệ.' })
        const initial = body.items.filter(isPoiValid).map((poi) => ({ ...poi, status: 'published' }))
        await saveJson(poiFile, initial)
        return send(response, 201, { items: initial, imported: true })
      }
      const poiMatch = url.pathname.match(/^\/api\/admin\/pois\/(\d+)$/)
      if (poiMatch && request.method === 'PATCH') {
        const id = Number(poiMatch[1])
        const patch = await bodyJson(request)
        const all = await readJson(poiFile, [])
        const index = all.findIndex((poi) => Number(poi.id) === id)
        if (index < 0) return send(response, 404, { error: 'Không tìm thấy địa điểm.' })
        if (patch.status !== undefined) {
          if (!['draft', 'published'].includes(patch.status)) return send(response, 400, { error: 'Trạng thái không hợp lệ.' })
          all[index].status = patch.status
        }
        if (patch.image) all[index].image = await storeImage(patch.image)
        if (patch.name || patch.category || patch.location || patch.description || patch.lat !== undefined || patch.lng !== undefined) {
          Object.assign(all[index], cleanPoi({ ...all[index], ...patch }))
        }
        await saveJson(poiFile, all)
        return send(response, 200, all[index])
      }
      if (poiMatch && request.method === 'DELETE') {
        const id = Number(poiMatch[1])
        const all = await readJson(poiFile, [])
        const found = all.find((poi) => Number(poi.id) === id)
        if (!found) return send(response, 404, { error: 'Không tìm thấy địa điểm.' })
        await saveJson(poiFile, all.filter((poi) => Number(poi.id) !== id))
        return send(response, 200, { deleted: true, id })
      }
    }

    return send(response, 404, { error: 'Không tìm thấy API.' })
  } catch (error) {
    console.error(error)
    return send(response, error.status || 500, { error: error.status ? error.message : 'Lỗi máy chủ. Vui lòng thử lại.' })
  }
})

server.listen(port, '127.0.0.1', () => console.log(`SGU Go API đang chạy tại http://127.0.0.1:${port}`))
