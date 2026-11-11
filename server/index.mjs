import 'dotenv/config'
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, sql } from './database.mjs'

const scrypt = promisify(scryptCallback)
const root = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(root, 'data')
const uploadsDir = path.join(root, 'uploads')
const legacyPoiFile = path.join(dataDir, 'pois.json')
const legacyUserFile = path.join(dataDir, 'admins.json')
const legacyAnalyticsFile = path.join(dataDir, 'analytics.json')
const port = Number(process.env.API_PORT || 8787)
const sessionTtlMs = 12 * 60 * 60 * 1000

await mkdir(dataDir, { recursive: true })
await mkdir(uploadsDir, { recursive: true })

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: (await scrypt(password, salt, 64)).toString('hex') }
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

function cleanPoi(poi, { requireLocation = true } = {}) {
  const name = String(poi.name || '').trim()
  const category = String(poi.category || '').trim()
  const location = String(poi.location || '').trim()
  const description = String(poi.description || '').trim()
  const lat = poi.lat === null || poi.lat === undefined || poi.lat === '' ? null : Number(poi.lat)
  const lng = poi.lng === null || poi.lng === undefined || poi.lng === '' ? null : Number(poi.lng)
  if (!name || !category || (requireLocation && !location) || !description) throw Object.assign(new Error('Tên, danh mục, vị trí và mô tả là bắt buộc.'), { status: 400 })
  if ((lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
      (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180))) {
    throw Object.assign(new Error('Tọa độ vĩ độ/kinh độ không hợp lệ.'), { status: 400 })
  }
  return { name, category, location, description, lat, lng, narration: String(poi.narration || ''), campusId: String(poi.campusId || 'main') }
}

function validBootstrapPoi(poi) {
  return poi && Number.isInteger(Number(poi.id)) && Number(poi.id) > 0 && poi.name && poi.category && poi.location
}

function bootstrapPoi(poi) {
  const lat = poi.lat === null || poi.lat === undefined || poi.lat === '' ? null : Number(poi.lat)
  const lng = poi.lng === null || poi.lng === undefined || poi.lng === '' ? null : Number(poi.lng)
  if ((lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
      (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180))) {
    throw Object.assign(new Error('Tọa độ vĩ độ/kinh độ không hợp lệ.'), { status: 400 })
  }
  return {
    id: Number(poi.id),
    name: String(poi.name).trim(),
    category: String(poi.category).trim(),
    location: String(poi.location).trim(),
    description: String(poi.description || ''),
    narration: String(poi.narration || ''),
    campusId: String(poi.campusId || 'main'),
    lat,
    lng,
    image: String(poi.image || ''),
    status: 'published',
  }
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

function toPoi(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    narration: row.narration || '',
    location: row.location,
    campusId: row.campus_id,
    lat: row.latitude === null ? null : Number(row.latitude),
    lng: row.longitude === null ? null : Number(row.longitude),
    image: row.image_url || '',
    localized: Boolean(row.localized_name || row.localized_description || row.localized_category || row.localized_location),
    status: row.active ? 'published' : 'draft',
  }
}

function bindPoi(request, poi) {
  return request
    .input('id', sql.Int, poi.id)
    .input('name', sql.NVarChar(300), poi.name)
    .input('category', sql.NVarChar(100), poi.category)
    .input('description', sql.NVarChar(sql.MAX), poi.description)
    .input('narration', sql.NVarChar(sql.MAX), poi.narration || null)
    .input('lat', sql.Decimal(10, 7), poi.lat)
    .input('lng', sql.Decimal(11, 7), poi.lng)
    .input('image', sql.NVarChar(2048), poi.image || null)
    .input('active', sql.Bit, poi.status === 'published' || poi.active === true)
}

async function insertPoi(request, poi) {
  bindPoi(request, poi)
  await request.query(`
    INSERT INTO dbo.POI
      (id, name, description, category, latitude, longitude, image_url, active)
    VALUES
      (@id, @name, @description, @category, @lat, @lng, @image, @active);

    IF @narration IS NOT NULL
      MERGE dbo.POI_LOCALIZATION WITH (HOLDLOCK) AS target
      USING (SELECT @id AS poi_id, N'vi' AS lang, @narration AS translated_text) AS source
        ON target.poi_id = source.poi_id AND target.lang = source.lang
      WHEN MATCHED THEN UPDATE SET translated_text = source.translated_text
      WHEN NOT MATCHED THEN INSERT (poi_id, lang, translated_text)
        VALUES (source.poi_id, source.lang, source.translated_text);
  `)
}

async function upsertPoiLocalization(request, poiId, locale, copy = {}) {
  await request
    .input('localizedPoiId', sql.Int, poiId)
    .input('localizedLanguage', sql.NVarChar(10), locale)
    .input('localizedNarration', sql.NVarChar(sql.MAX), copy.narration ? String(copy.narration) : null)
    .input('localizedName', sql.NVarChar(300), copy.name ? String(copy.name) : null)
    .input('localizedDescription', sql.NVarChar(sql.MAX), copy.description ? String(copy.description) : null)
    .input('localizedCategory', sql.NVarChar(100), copy.category ? String(copy.category) : null)
    .input('localizedLocation', sql.NVarChar(500), copy.location ? String(copy.location) : null)
    .query(`
      MERGE dbo.POI_LOCALIZATION WITH (HOLDLOCK) AS target
      USING (SELECT @localizedPoiId AS poi_id, @localizedLanguage AS lang) AS source
        ON target.poi_id = source.poi_id AND target.lang = source.lang
      WHEN MATCHED THEN UPDATE SET
        translated_text = COALESCE(@localizedNarration, target.translated_text),
        translated_name = COALESCE(@localizedName, target.translated_name),
        translated_description = COALESCE(@localizedDescription, target.translated_description),
        translated_category = COALESCE(@localizedCategory, target.translated_category),
        translated_location = COALESCE(@localizedLocation, target.translated_location)
      WHEN NOT MATCHED THEN INSERT
        (poi_id, lang, translated_text, translated_name, translated_description, translated_category, translated_location)
        VALUES (@localizedPoiId, @localizedLanguage, COALESCE(@localizedNarration, N''), @localizedName, @localizedDescription, @localizedCategory, @localizedLocation);
    `)
}

async function fetchPoiLocalizations(poiIds) {
  if (!poiIds.length) return {}
  const request = pool.request()
  const parameters = poiIds.map((id, index) => {
    request.input(`poiId${index}`, sql.Int, id)
    return `@poiId${index}`
  })
  const result = await request.query(`
    SELECT poi_id, lang, translated_name, translated_description, translated_category, translated_location, translated_text
    FROM dbo.POI_LOCALIZATION
    WHERE poi_id IN (${parameters.join(', ')})
  `)
  const localizations = {}
  for (const row of result.recordset) {
    const poiId = String(row.poi_id)
    localizations[poiId] ??= {}
    localizations[poiId][row.lang] = {
      name: row.translated_name || '',
      description: row.translated_description || '',
      category: row.translated_category || '',
      location: row.translated_location || '',
      narration: row.translated_text || '',
    }
  }
  return localizations
}

async function migrateLegacyJson() {
  const transaction = new sql.Transaction(pool)
  await transaction.begin()
  try {
    const adminCount = await new sql.Request(transaction).query('SELECT COUNT_BIG(1) AS count FROM dbo.ADMIN_USER')
    if (Number(adminCount.recordset[0].count) === 0) {
      const legacyAdmins = await readJson(legacyUserFile, [])
      const roleResult = await new sql.Request(transaction)
        .input('roleName', sql.NVarChar(100), 'Administrator')
        .query('SELECT id FROM dbo.[ROLE] WHERE name = @roleName')
      const roleId = roleResult.recordset[0]?.id
      if (Array.isArray(legacyAdmins)) for (const admin of legacyAdmins) {
        if (!admin.email || !admin.name || !admin.salt || !admin.hash) continue
        await new sql.Request(transaction)
          .input('roleId', sql.Int, roleId)
          .input('email', sql.NVarChar(320), String(admin.email).toLowerCase())
          .input('name', sql.NVarChar(200), String(admin.name))
          .input('salt', sql.Char(32), admin.salt)
          .input('hash', sql.Char(128), admin.hash)
          .query('INSERT INTO dbo.ADMIN_USER (role_id, email, name, password_salt, password_hash) VALUES (@roleId, @email, @name, @salt, @hash)')
      }
    }

    const poiCount = await new sql.Request(transaction).query('SELECT COUNT_BIG(1) AS count FROM dbo.POI')
    if (Number(poiCount.recordset[0].count) === 0) {
      const legacyPois = await readJson(legacyPoiFile, [])
      if (Array.isArray(legacyPois)) for (const item of legacyPois) {
        if (!validBootstrapPoi(item)) continue
        await insertPoi(new sql.Request(transaction), bootstrapPoi(item))
      }
    }

    const listenerCount = await new sql.Request(transaction).query('SELECT COUNT_BIG(1) AS count FROM dbo.POI_HEARD')
    if (Number(listenerCount.recordset[0].count) === 0) {
      const legacyAnalytics = await readJson(legacyAnalyticsFile, { heardUsers: {} })
      const heardUsers = legacyAnalytics?.heardUsers
      if (heardUsers && typeof heardUsers === 'object') {
        for (const [poiId, visitorIds] of Object.entries(heardUsers)) {
          if (!Number.isInteger(Number(poiId)) || !Array.isArray(visitorIds)) continue
          for (const visitorId of visitorIds) {
            if (typeof visitorId !== 'string' || visitorId.length < 8 || visitorId.length > 100) continue
            await new sql.Request(transaction)
              .input('poiId', sql.Int, Number(poiId))
              .input('visitorId', sql.NVarChar(100), visitorId)
              .query(`
                IF EXISTS (SELECT 1 FROM dbo.POI WHERE id = @poiId)
                  INSERT INTO dbo.POI_HEARD (poi_id, visitor_id) VALUES (@poiId, @visitorId)
              `)
          }
        }
      }
    }
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

async function seedDefaultAdmin() {
  const email = (process.env.SGU_ADMIN_EMAIL || '').trim().toLowerCase()
  const configuredPassword = process.env.SGU_ADMIN_PASSWORD
  if (!email || !configuredPassword || /^(change|replace|your[_-])/i.test(configuredPassword)) {
    throw new Error('Set a real SGU_ADMIN_EMAIL and SGU_ADMIN_PASSWORD in the root .env file before starting the API.')
  }
  const password = configuredPassword
  const found = await pool.request()
    .input('email', sql.NVarChar(320), email)
    .query('SELECT id, email, password_salt AS salt, password_hash FROM dbo.ADMIN_USER WHERE email = @email')
  if (found.recordset.length) {
    if (!configuredPassword) return
    const current = found.recordset[0]
    const supplied = await passwordHash(password, current.salt)
    if (timingSafeEqual(Buffer.from(supplied.hash, 'hex'), Buffer.from(current.password_hash, 'hex'))) return
    const credentials = await passwordHash(password)
    await pool.request()
      .input('email', sql.NVarChar(320), email)
      .input('salt', sql.Char(32), credentials.salt)
      .input('hash', sql.Char(128), credentials.hash)
      .query('UPDATE dbo.ADMIN_USER SET password_salt = @salt, password_hash = @hash WHERE email = @email')
    return
  }
  const credentials = await passwordHash(password)
  const role = await pool.request()
    .input('roleName', sql.NVarChar(100), 'Administrator')
    .query('SELECT id FROM dbo.[ROLE] WHERE name = @roleName')
  await pool.request()
    .input('roleId', sql.Int, role.recordset[0].id)
    .input('email', sql.NVarChar(320), email)
    .input('name', sql.NVarChar(200), 'Quản trị viên SGU')
    .input('salt', sql.Char(32), credentials.salt)
    .input('hash', sql.Char(128), credentials.hash)
    .query('INSERT INTO dbo.ADMIN_USER (role_id, email, name, password_salt, password_hash) VALUES (@roleId, @email, @name, @salt, @hash)')
}

await migrateLegacyJson()
await seedDefaultAdmin()

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

async function requireAuth(request, response) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) {
    send(response, 401, { error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' })
    return false
  }
  const hash = tokenHash(token)
  const session = await pool.request()
    .input('tokenHash', sql.Char(64), hash)
    .query('SELECT token_hash FROM dbo.ADMIN_AUTH_SESSION WHERE token_hash = @tokenHash AND expires_at > SYSUTCDATETIME()')
  if (session.recordset.length) return true
  await pool.request().input('tokenHash', sql.Char(64), hash)
    .query('DELETE FROM dbo.ADMIN_AUTH_SESSION WHERE token_hash = @tokenHash')
  send(response, 401, { error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' })
  return false
}

function validVisitorId(value) {
  const visitorId = String(value || '')
  if (visitorId.length < 8 || visitorId.length > 100) throw Object.assign(new Error('Phiên khách không hợp lệ.'), { status: 400 })
  return visitorId
}

async function updateActiveVisitor(visitorId, action, poiId = null) {
  await pool.request()
    .input('visitorId', sql.NVarChar(100), visitorId)
    .input('action', sql.VarChar(10), action)
    .input('poiId', sql.Int, poiId)
    .query(`
      MERGE dbo.VISITOR_SESSION WITH (HOLDLOCK) AS target
      USING (SELECT @visitorId AS visitor_id) AS source
        ON target.visitor_id = source.visitor_id
      WHEN MATCHED THEN UPDATE SET
        last_seen = SYSUTCDATETIME(),
        current_poi_id = CASE
          WHEN @action = 'start' THEN @poiId
          WHEN @action = 'end' AND current_poi_id = @poiId THEN NULL
          ELSE current_poi_id
        END
      WHEN NOT MATCHED THEN INSERT (visitor_id, last_seen, current_poi_id)
        VALUES (@visitorId, SYSUTCDATETIME(), CASE WHEN @action = 'start' THEN @poiId ELSE NULL END);
    `)
}

async function removeExpiredVisitors() {
  await pool.request().query("DELETE FROM dbo.VISITOR_SESSION WHERE last_seen < DATEADD(SECOND, -45, SYSUTCDATETIME())")
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

    if (request.method === 'GET' && url.pathname === '/api/health') {
      await pool.request().query('SELECT 1 AS ok')
      return send(response, 200, { ok: true, database: 'connected' })
    }

    if (request.method === 'GET' && url.pathname === '/api/languages') {
      const result = await pool.request().query(`
        SELECT locale, display_name, translations_json
        FROM dbo.UI_TRANSLATION_BUNDLE
        WHERE namespace = N'app' AND status = N'ready'
        ORDER BY locale
      `)
      const items = result.recordset.map((row) => {
        let translations = {}
        try { translations = row.translations_json ? JSON.parse(row.translations_json) : {} } catch { /* Invalid bundles fall back to Vietnamese strings. */ }
        return { code: row.locale, label: row.display_name || row.locale, translations }
      })
      return send(response, 200, { items })
    }

    if (request.method === 'GET' && url.pathname === '/api/analytics') {
      await removeExpiredVisitors()
      const [activeResult, poiResult] = await Promise.all([
        pool.request().query('SELECT COUNT_BIG(1) AS count FROM dbo.VISITOR_SESSION'),
        pool.request().query(`
          WITH heard AS (
            SELECT poi_id, COUNT_BIG(1) AS heard FROM dbo.POI_HEARD GROUP BY poi_id
          ),
          active AS (
            SELECT current_poi_id AS poi_id, COUNT_BIG(1) AS active
            FROM dbo.VISITOR_SESSION WHERE current_poi_id IS NOT NULL GROUP BY current_poi_id
          )
          SELECT COALESCE(heard.poi_id, active.poi_id) AS poiId,
            ISNULL(heard.heard, 0) AS heard, ISNULL(active.active, 0) AS active
          FROM heard FULL OUTER JOIN active ON heard.poi_id = active.poi_id
        `),
      ])
      const pois = Object.fromEntries(poiResult.recordset.map((row) => [
        String(row.poiId),
        { heard: Number(row.heard), active: Number(row.active) },
      ]))
      return send(response, 200, { activeUsers: Number(activeResult.recordset[0].count), pois })
    }

    if (request.method === 'POST' && ['/api/analytics/heartbeat', '/api/analytics/listen/start', '/api/analytics/listen/end'].includes(url.pathname)) {
      const body = await bodyJson(request)
      const visitorId = validVisitorId(body.visitorId)
      const isStart = url.pathname.endsWith('/start')
      const isEnd = url.pathname.endsWith('/end')
      let poiId = null
      if (isStart || isEnd) {
        poiId = Number(body.poiId)
        if (!Number.isInteger(poiId) || poiId <= 0) return send(response, 400, { error: 'Mã POI không hợp lệ.' })
      }
      if (isStart) {
        const poi = await pool.request()
          .input('poiId', sql.Int, poiId)
          .query('SELECT id FROM dbo.POI WHERE id = @poiId')
        if (!poi.recordset.length) return send(response, 404, { error: 'Không tìm thấy địa điểm.' })
      }
      await updateActiveVisitor(visitorId, isStart ? 'start' : isEnd ? 'end' : 'heartbeat', poiId)
      if (isStart) {
        await pool.request()
          .input('poiId', sql.Int, poiId)
          .input('visitorId', sql.NVarChar(100), visitorId)
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM dbo.POI_HEARD WITH (UPDLOCK, SERIALIZABLE)
              WHERE poi_id = @poiId AND visitor_id = @visitorId
            )
              INSERT INTO dbo.POI_HEARD (poi_id, visitor_id) VALUES (@poiId, @visitorId)
          `)
      }
      return send(response, 200, { ok: true })
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/login') {
      const body = await bodyJson(request)
      const email = String(body.email || '').trim().toLowerCase()
      const result = await pool.request()
        .input('email', sql.NVarChar(320), email)
        .query('SELECT id, email, name, password_salt AS salt, password_hash FROM dbo.ADMIN_USER WHERE email = @email')
      const admin = result.recordset[0]
      const supplied = admin
        ? await passwordHash(String(body.password || ''), admin.salt)
        : await passwordHash(String(body.password || ''), 'invalid-account-salt')
      if (!admin || !timingSafeEqual(Buffer.from(supplied.hash, 'hex'), Buffer.from(admin.password_hash, 'hex'))) {
        return send(response, 401, { error: 'Email hoặc mật khẩu chưa chính xác.' })
      }
      const token = randomBytes(32).toString('base64url')
      const expiresAt = new Date(Date.now() + sessionTtlMs)
      await pool.request().query('DELETE FROM dbo.ADMIN_AUTH_SESSION WHERE expires_at <= SYSUTCDATETIME()')
      await pool.request()
        .input('tokenHash', sql.Char(64), tokenHash(token))
        .input('adminUserId', sql.Int, admin.id)
        .input('expiresAt', sql.DateTime2(3), expiresAt)
        .query('INSERT INTO dbo.ADMIN_AUTH_SESSION (token_hash, admin_user_id, expires_at) VALUES (@tokenHash, @adminUserId, @expiresAt)')
      return send(response, 200, { token, expiresIn: sessionTtlMs, admin: { name: admin.name, email: admin.email } })
    }

    if (request.method === 'GET' && url.pathname === '/api/pois') {
      const requestedLanguage = (url.searchParams.get('lang') || 'vi').trim()
      const language = /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(requestedLanguage) ? requestedLanguage : 'vi'
      const result = await pool.request()
        .input('language', sql.NVarChar(10), language)
        .query(`
          SELECT api.id,
            localized.translated_name AS localized_name,
            localized.translated_description AS localized_description,
            localized.translated_category AS localized_category,
            localized.translated_location AS localized_location,
            COALESCE(localized.translated_name, api.name) AS name,
            COALESCE(localized.translated_category, api.category) AS category,
            COALESCE(localized.translated_description, api.description) AS description,
            COALESCE(localized.translated_text, api.narration, api.description) AS narration,
            COALESCE(localized.translated_location, api.location) AS location,
            api.campus_id, api.latitude, api.longitude, api.image_url, api.active
          FROM dbo.V_POI_API AS api
          LEFT JOIN dbo.POI_LOCALIZATION AS localized
            ON localized.poi_id = api.id AND localized.lang = @language
          WHERE api.active = 1
          ORDER BY api.id
        `)
      return send(response, 200, result.recordset.map(toPoi))
    }

    if (url.pathname.startsWith('/api/admin/')) {
      if (!await requireAuth(request, response)) return

      if (request.method === 'PUT' && url.pathname === '/api/admin/languages') {
        const body = await bodyJson(request)
        const code = String(body.code || '').trim()
        const label = String(body.label || '').trim()
        const translations = body.translations
        if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(code) || !label || label.length > 100 || !translations || typeof translations !== 'object' || Array.isArray(translations)) {
          return send(response, 400, { error: 'Nhập mã ngôn ngữ, tên hiển thị và gói dịch JSON hợp lệ.' })
        }
        const translationsJson = JSON.stringify(translations)
        const sourceHash = createHash('sha256').update(translationsJson).digest('hex')
        await pool.request()
          .input('code', sql.NVarChar(10), code)
          .input('label', sql.NVarChar(100), label)
          .input('sourceHash', sql.NVarChar(128), sourceHash)
          .input('translationsJson', sql.NVarChar(sql.MAX), translationsJson)
          .query(`
            MERGE dbo.UI_TRANSLATION_BUNDLE WITH (HOLDLOCK) AS target
            USING (SELECT N'app' AS namespace, @code AS locale) AS source
              ON target.namespace = source.namespace AND target.locale = source.locale
            WHEN MATCHED THEN UPDATE SET display_name = @label, translations_json = @translationsJson,
              source_hash = @sourceHash, status = N'ready', updated_at = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT
              (namespace, locale, source_hash, status, display_name, translations_json)
              VALUES (N'app', @code, @sourceHash, N'ready', @label, @translationsJson);
          `)
        return send(response, 200, { code, label })
      }

      if (request.method === 'GET' && url.pathname === '/api/admin/pois') {
        const q = (url.searchParams.get('q') || '').trim()
        const status = url.searchParams.get('status') || ''
        const requestedPage = Number(url.searchParams.get('page') || 1)
        const requestedPageSize = Number(url.searchParams.get('pageSize') || 100)
        const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1
        const pageSize = Number.isFinite(requestedPageSize) ? Math.min(100, Math.max(1, Math.floor(requestedPageSize))) : 100
        const baseRequest = () => new sql.Request(pool)
          .input('q', sql.NVarChar(300), q)
          .input('status', sql.VarChar(20), ['draft', 'published'].includes(status) ? status : '')
        const where = `
          (@status = '' OR (@status = 'published' AND active = 1) OR (@status = 'draft' AND active = 0))
          AND (@q = '' OR name LIKE N'%' + @q + N'%' OR category LIKE N'%' + @q + N'%' OR location LIKE N'%' + @q + N'%')
        `
        const [countResult, itemsResult] = await Promise.all([
          baseRequest().query(`SELECT COUNT_BIG(1) AS total FROM dbo.V_POI_API WHERE ${where}`),
          baseRequest()
            .input('offset', sql.Int, (page - 1) * pageSize)
            .input('pageSize', sql.Int, pageSize)
            .query(`
              SELECT id, name, category, description, narration, location, campus_id, latitude, longitude, image_url, active
              FROM dbo.V_POI_API WHERE ${where}
              ORDER BY id OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            `),
        ])
        const baseItems = itemsResult.recordset.map(toPoi)
        const localizations = await fetchPoiLocalizations(baseItems.map((poi) => poi.id))
        return send(response, 200, {
          items: baseItems.map((poi) => ({ ...poi, localizations: localizations[String(poi.id)] || {} })),
          total: Number(countResult.recordset[0].total),
          page,
          pageSize,
        })
      }

      if (request.method === 'POST' && url.pathname === '/api/admin/pois') {
        const body = await bodyJson(request)
        const clean = cleanPoi(body, { requireLocation: false })
        if (body.status === 'published' && (clean.lat === null || clean.lng === null)) {
          return send(response, 400, { error: 'Cần có đủ tọa độ để đăng địa điểm lên bản đồ.' })
        }
        const image = String(body.image || '').startsWith('data:')
          ? await storeImage(body.image)
          : String(body.image || '')
        const transaction = new sql.Transaction(pool)
        await transaction.begin()
        try {
          const nextId = await new sql.Request(transaction).query(`
            DECLARE @lockResult INT;
            EXEC @lockResult = sys.sp_getapplock
              @Resource = N'SGUGo.POI.Create', @LockMode = N'Exclusive', @LockOwner = N'Transaction';
            IF @lockResult < 0 THROW 50001, 'Không thể khóa cấp mã POI.', 1;
            SELECT ISNULL(MAX(id), 0) + 1 AS id FROM dbo.POI;
          `)
          const poi = {
            ...clean,
            id: Number(nextId.recordset[0].id),
            image,
            status: body.status === 'published' ? 'published' : 'draft',
          }
          await insertPoi(new sql.Request(transaction), poi)
          if (body.localizations && typeof body.localizations === 'object') {
            for (const [locale, copy] of Object.entries(body.localizations)) {
              if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)) continue
              await upsertPoiLocalization(new sql.Request(transaction), poi.id, locale, copy || {})
            }
          }
          await transaction.commit()
          const created = await pool.request()
            .input('id', sql.Int, poi.id)
            .query('SELECT id, name, category, description, narration, location, campus_id, latitude, longitude, image_url, active FROM dbo.V_POI_API WHERE id = @id')
          return send(response, 201, toPoi(created.recordset[0]))
        } catch (error) {
          await transaction.rollback()
          throw error
        }
      }

      const poiMatch = url.pathname.match(/^\/api\/admin\/pois\/(\d+)$/)
      if (poiMatch && request.method === 'PATCH') {
        const id = Number(poiMatch[1])
        const existingResult = await pool.request()
          .input('id', sql.Int, id)
          .query('SELECT id, name, category, description, narration, location, campus_id, latitude, longitude, image_url, active FROM dbo.V_POI_API WHERE id = @id')
        const existing = existingResult.recordset[0]
        if (!existing) return send(response, 404, { error: 'Không tìm thấy địa điểm.' })
        const patch = await bodyJson(request)
        const current = toPoi(existing)
        const updated = { ...current }
        if (patch.status !== undefined) {
          if (!['draft', 'published'].includes(patch.status)) return send(response, 400, { error: 'Trạng thái không hợp lệ.' })
          updated.status = patch.status
        }
        if (patch.narration !== undefined) updated.narration = String(patch.narration || '')
        updated.active = updated.status === 'published'
        if (updated.active && (updated.lat === null || updated.lng === null)) {
          return send(response, 400, { error: 'Cần có đủ tọa độ để đăng địa điểm lên bản đồ.' })
        }
        if (patch.image !== undefined) {
          const imageValue = String(patch.image || '')
          updated.image = imageValue.startsWith('data:') ? await storeImage(imageValue) : imageValue
        }
        if (patch.name || patch.category || patch.location || patch.description || patch.lat !== undefined || patch.lng !== undefined) {
          Object.assign(updated, cleanPoi({ ...current, ...patch }))
        }
        await bindPoi(new sql.Request(pool), {
          ...updated,
          narration: patch.narration === undefined ? '' : updated.narration,
        })
          .query(`
            UPDATE dbo.POI SET name = @name, category = @category, description = @description,
              latitude = @lat, longitude = @lng, image_url = @image, active = @active
            WHERE id = @id

            IF @narration IS NOT NULL
              MERGE dbo.POI_LOCALIZATION WITH (HOLDLOCK) AS target
              USING (SELECT @id AS poi_id, N'vi' AS lang, @narration AS translated_text) AS source
                ON target.poi_id = source.poi_id AND target.lang = source.lang
              WHEN MATCHED THEN UPDATE SET translated_text = source.translated_text
              WHEN NOT MATCHED THEN INSERT (poi_id, lang, translated_text)
                VALUES (source.poi_id, source.lang, source.translated_text);
          `)
        if (patch.localizations && typeof patch.localizations === 'object') {
          for (const [locale, copy] of Object.entries(patch.localizations)) {
            if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)) continue
            await upsertPoiLocalization(pool.request(), id, locale, copy || {})
          }
        }
        return send(response, 200, updated)
      }

      if (poiMatch && request.method === 'DELETE') {
        const id = Number(poiMatch[1])
        const result = await pool.request()
          .input('id', sql.Int, id)
          .query('DELETE FROM dbo.POI OUTPUT deleted.id WHERE id = @id')
        if (!result.recordset.length) return send(response, 404, { error: 'Không tìm thấy địa điểm.' })
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
