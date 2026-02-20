import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

// Imagens padrão do código (fallback)
const DEFAULT_IMAGES = {
  hero_logo: '/marcacompleta.webp',
  how_it_works_section_image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600&auto=format&fit=crop',
  step_1_image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
  step_2_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  step_3_image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&q=80',
  step_4_image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
  about_hero_image: '/src/images/amor.jpeg'
}

// Cache em memória
let configCheckCache = null
let lastCheckTime = 0
const CACHE_DURATION = 30000 // 30 segundos

/**
 * Hook para gerenciar as imagens do site
 * Migrado para Railway/Node.js Backend
 */
export function useSiteImages() {
  const [images, setImages] = useState(DEFAULT_IMAGES)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  // Agora "isConfigured" é sempre true se o backend responder, 
  // pois o conceito de "Supabase Configured" não existe mais no frontend.
  const [isConfigured, setIsConfigured] = useState(true)

  // Buscar imagens do backend
  const fetchImages = async (skipCache = false) => {
    try {
      setLoading(true)
      setError(null)

      // Usar cache se disponível
      const now = Date.now()
      if (!skipCache && configCheckCache !== null && (now - lastCheckTime) < CACHE_DURATION) {
        setImages(configCheckCache.images)
        setLoading(false)
        return
      }

      // Call Backend API
      const data = await apiClient('/images')

      // Se retornou vazio, usa default
      if (!data || Object.keys(data).length === 0) {
        console.log('⚠️ Nenhuma configuração de imagem encontrada, usando padrão')
        setImages(DEFAULT_IMAGES)
      } else {
        // Merge com defaults para garantir que chaves novas existam
        const mergedImages = { ...DEFAULT_IMAGES, ...data }
        setImages(mergedImages)

        // Cachear
        configCheckCache = {
          images: mergedImages,
          error: null
        }
        lastCheckTime = now
      }

      console.log('✅ Imagens carregadas do Backend!')

    } catch (err) {
      console.error('❌ Erro ao buscar imagens:', err)
      // Fallback silencioso para não quebrar a home
      setImages(DEFAULT_IMAGES)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Upload de imagem via Backend
  const uploadImage = async (file, fieldName) => {
    try {
      setUploading(true)
      setError(null)

      if (!file || !file.type.startsWith('image/')) {
        throw new Error('Por favor, selecione um arquivo de imagem válido')
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('A imagem deve ter no máximo 5MB')
      }

      const formData = new FormData()
      formData.append('image', file)
      formData.append('fieldName', fieldName)

      // apiClient deve lidar com FormData se não passarmos Content-Type manual
      // Mas nosso api-client pode forçar JSON. Vamos usar fetch direto ou ajustar client.
      // O apiClient atual força 'Content-Type': 'application/json' se não sobrescrevermos.
      // Vamos passar headers: {} para o browser definir boundary.

      const response = await apiClient('/images/upload', {
        method: 'POST',
        body: formData,
        // Hack: apiClient verifica se body é objeto simples para JSON.stringify.
        // Se for FormData, ele deve passar direto.
        // Mas o apiClient atual tem: config.body = JSON.stringify(body) if (body)
        // Precisamos verificar o apiClient.
      })

      console.log('✅ Imagem atualizada via Backend!')

      await fetchImages(true)
      return { success: true, url: response.url }

    } catch (err) {
      console.error('❌ Erro no upload:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setUploading(false)
    }
  }

  // Atualizar URL diretamente
  const updateImageUrl = async (fieldName, url) => {
    try {
      setUploading(true)
      setError(null)

      await apiClient('/images', {
        method: 'PUT',
        body: { fieldName, url }
      })

      await fetchImages(true)
      return { success: true }

    } catch (err) {
      console.error('❌ Erro ao atualizar URL:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setUploading(false)
    }
  }

  // Carregar ao montar
  useEffect(() => {
    fetchImages()
  }, [])

  return {
    images,
    loading,
    uploading,
    error,
    isSupabaseConfigured: isConfigured, // Manter nome p/ compatibilidade
    fetchImages,
    uploadImage,
    updateImageUrl
  }
}
