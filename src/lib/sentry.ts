// Lightweight fallback to avoid missing @sentry/node builds
export function captureError(err: unknown, context?: any) {
  console.error('[captureError]', err, context || '');
}

export default { captureError };
