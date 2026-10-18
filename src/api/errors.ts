export type ApiErrorKind =
  | 'configuration'
  | 'http'
  | 'network'
  | 'timeout'
  | 'cancelled'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
    readonly details?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ApiError'
  }
}
