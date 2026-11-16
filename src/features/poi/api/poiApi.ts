import type { AxiosRequestConfig } from 'axios'
import { apiClient, type ApiResponse } from '../../../api/client'

export interface LoadAllPoisOptions {
  lang: string
  ifNoneMatch?: string
  updatedAfter?: string
  signal?: AbortSignal
}

export function loadAllPois<TResponse = unknown>(
  options: LoadAllPoisOptions,
): Promise<ApiResponse<TResponse>> {
  const headers: AxiosRequestConfig['headers'] = {}

  if (options.ifNoneMatch) {
    headers['If-None-Match'] = options.ifNoneMatch
  }

  const params: Record<string, string> = {
    lang: options.lang,
  }

  if (options.updatedAfter) {
    params.updated_after = options.updatedAfter
  }

  return apiClient.get<TResponse>('/poi/load-all', {
    headers,
    params,
    signal: options.signal,
  })
}
