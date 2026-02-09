import sharp from 'sharp'

/**
 * Optimizes images for web delivery
 * - Converts base64 to WebP format
 * - Applies compression
 * - Resizes if needed
 */
export async function optimizeImage(base64String, options = {}) {
  try {
    const {
      format = 'webp',
      quality = 80,
      width = null,
      height = null,
      fit = 'inside'
    } = options

    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    let pipeline = sharp(buffer)

    // Resize if dimensions provided
    if (width || height) {
      pipeline = pipeline.resize(width, height, { fit })
    }

    // Convert to desired format with compression
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality, effort: 4 })
    } else if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true })
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality, compressionLevel: 9 })
    }

    const optimizedBuffer = await pipeline.toBuffer()
    return optimizedBuffer.toString('base64')
  } catch (error) {
    console.error('Error optimizing image:', error)
    return base64String // Return original on error
  }
}

/**
 * Batch optimize multiple images
 */
export async function optimizeImages(images, options = {}) {
  return Promise.all(
    images.map(img => optimizeImage(img, options))
  )
}

/**
 * Get image metadata without loading full image
 */
export async function getImageMetadata(base64String) {
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const metadata = await sharp(buffer).metadata()
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
      hasAlpha: metadata.hasAlpha
    }
  } catch (error) {
    console.error('Error getting image metadata:', error)
    return null
  }
}

/**
 * Create multiple sizes for responsive images
 */
export async function createResponsiveImages(base64String) {
  const sizes = [
    { name: 'thumbnail', width: 150, quality: 70 },
    { name: 'small', width: 320, quality: 75 },
    { name: 'medium', width: 640, quality: 80 },
    { name: 'large', width: 1024, quality: 85 }
  ]

  const results = {}

  for (const size of sizes) {
    results[size.name] = await optimizeImage(base64String, {
      width: size.width,
      quality: size.quality,
      format: 'webp'
    })
  }

  return results
}

/**
 * Middleware to optimize images in response
 */
export function imageOptimizationMiddleware(options = {}) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = async function(data) {
      // Check if response contains images (base64)
      const hasImages = JSON.stringify(data).includes('data:image')

      if (hasImages && req.query.optimizeImages !== 'false') {
        data = await optimizeResponseImages(data, options)
      }

      return originalJson(data)
    }

    next()
  }
}

/**
 * Recursively optimize images in response data
 */
async function optimizeResponseImages(obj, options = {}) {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => optimizeResponseImages(item, options)))
  }

  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    // Check if value looks like base64 image
    if (typeof value === 'string' && value.startsWith('data:image')) {
      result[key] = await optimizeImage(value, options)
    } else if (typeof value === 'object') {
      result[key] = await optimizeResponseImages(value, options)
    } else {
      result[key] = value
    }
  }
  return result
}
