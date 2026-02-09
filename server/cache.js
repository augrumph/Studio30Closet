// Simple in-memory cache without Redis
class MemoryCache {
  constructor() {
    this.cache = new Map()
    this.timers = new Map()
  }

  set(key, value, ttlSeconds = 300) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key)
      this.timers.delete(key)
    }, ttlSeconds * 1000)

    this.timers.set(key, timer)
  }

  get(key) {
    const item = this.cache.get(key)
    return item ? item.value : null
  }

  has(key) {
    return this.cache.has(key)
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
      this.timers.delete(key)
    }
    return this.cache.delete(key)
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

export const cache = new MemoryCache()

// Cache middleware factory
export function cacheMiddleware(ttlSeconds = 300) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next()
    }

    const key = `${req.originalUrl || req.url}`
    const cachedResponse = cache.get(key)

    if (cachedResponse) {
      // Cache hit
      res.set('X-Cache', 'HIT')
      return res.json(cachedResponse)
    }

    // Cache miss - intercept res.json
    res.set('X-Cache', 'MISS')
    const originalJson = res.json.bind(res)
    res.json = (body) => {
      cache.set(key, body, ttlSeconds)
      return originalJson(body)
    }

    next()
  }
}
