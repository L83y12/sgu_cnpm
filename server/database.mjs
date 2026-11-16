import 'dotenv/config'
import sql from 'mssql'

function envBoolean(name, fallback) {
  const value = process.env[name]
  if (value === undefined || value === '') return fallback
  return value.toLowerCase() === 'true'
}

const server = process.env.DB_SERVER || 'localhost'
const instanceName = process.env.DB_INSTANCE?.trim()
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined
const user = process.env.DB_USER?.trim()
const password = process.env.DB_PASSWORD
const database = process.env.DB_NAME || 'SGUGo'

if (!user || !password || /^(change|replace|your[_-])/i.test(user) || /^(change|replace|your[_-])/i.test(password)) {
  throw new Error('Set a real DB_USER and DB_PASSWORD in the root .env file before starting the API.')
}
if (instanceName && port) {
  throw new Error('Set either DB_INSTANCE or DB_PORT, not both.')
}
if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
  throw new Error('DB_PORT must be a valid TCP port number.')
}

const options = {
  encrypt: envBoolean('DB_ENCRYPT', false),
  trustServerCertificate: envBoolean('DB_TRUST_SERVER_CERTIFICATE', true),
}
if (instanceName) options.instanceName = instanceName

const config = {
  server,
  ...(port ? { port } : {}),
  user,
  password,
  database,
  options,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
  connectionTimeout: 15_000,
  requestTimeout: 15_000,
}

export const pool = await new sql.ConnectionPool(config).connect()
pool.on('error', (error) => console.error('SQL Server connection error:', error.message))
export { sql }
