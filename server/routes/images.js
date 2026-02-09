import express from 'express'
import { supabase } from '../supabase.js'
import { optimizeImage, createResponsiveImages, getImageMetadata } from '../imageOptimizer.js'
import { cache } from '../cache.js'

const router = express.Router()

/**
 * GET /api/images/optimize
 * Optimizes a single image on-the-fly
 * Query params: id, table, column, format, quality, width, height
 */
router.get('/optimize', async (req, res) => {
  try {
    const { id, table, column = 'image', format = 'webp', quality = 80, width, height } = req.query

    if (!id || !table) {
      return res.status(400).json({ error: 'Missing required parameters: id, table' })
    }

    // Check cache first
    const cacheKey = `image:${table}:${id}:${format}:${quality}:${width}:${height}`
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)
      return res.json({ data: cached })
    }

    // Fetch image from database
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data || !data[column]) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Optimize image
    const optimized = await optimizeImage(data[column], {
      format,
      quality: parseInt(quality),
      width: width ? parseInt(width) : null,
      height: height ? parseInt(height) : null
    })

    // Cache for 1 hour
    cache.set(cacheKey, optimized, 3600)

    res.json({ data: optimized })
  } catch (error) {
    console.error('Error optimizing image:', error)
    res.status(500).json({ error: 'Failed to optimize image' })
  }
})

/**
 * GET /api/images/responsive/:table/:id
 * Creates multiple sizes for responsive images
 */
router.get('/responsive/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params
    const { column = 'image' } = req.query

    // Check cache
    const cacheKey = `responsive:${table}:${id}`
    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey))
    }

    // Fetch image
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data || !data[column]) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Create responsive sizes
    const responsive = await createResponsiveImages(data[column])

    // Cache for 2 hours
    cache.set(cacheKey, responsive, 7200)

    res.json(responsive)
  } catch (error) {
    console.error('Error creating responsive images:', error)
    res.status(500).json({ error: 'Failed to create responsive images' })
  }
})

/**
 * GET /api/images/metadata/:table/:id
 * Gets image metadata without loading full image
 */
router.get('/metadata/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params
    const { column = 'image' } = req.query

    // Check cache
    const cacheKey = `metadata:${table}:${id}`
    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey))
    }

    // Fetch image
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data || !data[column]) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Get metadata
    const metadata = await getImageMetadata(data[column])

    // Cache for 1 day
    cache.set(cacheKey, metadata, 86400)

    res.json(metadata)
  } catch (error) {
    console.error('Error getting image metadata:', error)
    res.status(500).json({ error: 'Failed to get image metadata' })
  }
})

/**
 * POST /api/images/batch-optimize
 * Optimizes multiple images in a single request
 * Body: { images: [{ id, table, column }], options: { format, quality } }
 */
router.post('/batch-optimize', async (req, res) => {
  try {
    const { images, options = {} } = req.body

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'Missing or invalid images array' })
    }

    const results = []

    for (const img of images) {
      const { id, table, column = 'image' } = img
      const cacheKey = `image:${table}:${id}:${options.format || 'webp'}:${options.quality || 80}`

      // Check cache
      if (cache.has(cacheKey)) {
        results.push({ id, table, data: cache.get(cacheKey), cached: true })
        continue
      }

      // Fetch and optimize
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .eq('id', id)
        .single()

      if (error || !data || !data[column]) {
        results.push({ id, table, error: 'Not found' })
        continue
      }

      const optimized = await optimizeImage(data[column], options)
      cache.set(cacheKey, optimized, 3600)
      results.push({ id, table, data: optimized, cached: false })
    }

    res.json({ results })
  } catch (error) {
    console.error('Error batch optimizing images:', error)
    res.status(500).json({ error: 'Failed to batch optimize images' })
  }
})

export default router
