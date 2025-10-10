export function captureError(err: unknown, context?: any) {
  console.error('[captureError]', err, context || '');
}

export default captureError;
