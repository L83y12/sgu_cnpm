import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { ApiError } from './errors'

export interface ApiResponse<T> {
  data: T
  status: number
  headers: AxiosResponse['headers']
}

const requestTimeoutMs = 10_000

function createHttpClient() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (!configuredBaseUrl) {
    throw new ApiError(
      'VITE_API_BASE_URL is not configured. Set it to the backend API base URL.',
      'configuration',
    )
  }

  let baseUrl: URL

  try {
    baseUrl = new URL(configuredBaseUrl)
  } catch (cause) {
    throw new ApiError(
      'VITE_API_BASE_URL must be an absolute HTTP or HTTPS URL.',
      'configuration',
      undefined,
      undefined,
      { cause },
    )
  }

  if (
    !['http:', 'https:'].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new ApiError(
      'VITE_API_BASE_URL must be an absolute HTTP or HTTPS URL without credentials, query, or hash.',
      'configuration',
    )
  }

  return axios.create({
    baseURL: baseUrl.toString().replace(/\/+$/, ''),
    timeout: requestTimeoutMs,
    headers: {
      Accept: 'application/json',
    },
  })
}

function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    throw error
  }

  if (error.code === 'ERR_CANCELED') {
    return new ApiError('The API request was cancelled.', 'cancelled', undefined, undefined, {
      cause: error,
    })
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError('The API request timed out.', 'timeout', undefined, undefined, {
      cause: error,
    })
  }

  if (error.response) {
    return new ApiError(
      `The API request failed with HTTP ${error.response.status}.`,
      'http',
      error.response.status,
      error.response.data,
      { cause: error },
    )
  }

  return new ApiError(
    'The API server could not be reached.',
    'network',
    undefined,
    undefined,
    { cause: error },
  )
}

async function send<T>(
  method: 'get' | 'post',
  path: string,
  config: AxiosRequestConfig,
  acceptNotModified = false,
): Promise<ApiResponse<T>> {
  try {
    const client = createHttpClient()
    const response: AxiosResponse<T> = await client.request<T>({
      ...config,
      method,
      url: path,
      validateStatus: (status) =>
        (status >= 200 && status < 300) || (acceptNotModified && status === 304),
    })

    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
    }
  } catch (error) {
    throw toApiError(error)
  }
}

export const apiClient = {
  get<T>(path: string, config: AxiosRequestConfig = {}) {
    return send<T>('get', path, config, true)
  },

  post<T, TBody>(path: string, body: TBody, config: AxiosRequestConfig = {}) {
    return send<T>('post', path, { ...config, data: body })
  },
}
