export function apiError(code = 'internal_error', message = 'An internal error occurred', status = 500, details = null) {
  return { success: false, code, message, details }
}

export function handleMongooseError(err) {
  if (!err) return apiError('internal_error', 'Unknown error', 500)
  if (err.name === 'ValidationError') return apiError('validation_error', err.message, 400, err.errors)
  if (err.code === 11000) return apiError('duplicate_key', 'Duplicate key error', 409, err.keyValue)
  return apiError('internal_error', err.message || 'Database error', 500)
}
