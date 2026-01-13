import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

// Cache em memória para evitar múltiplas requisições
let configCheckCache = null
let lastCheckTime = 0
const CACHE_DURATION = 30000 // 30 segundos

/**
 * Hook para gerenciar as imagens do site
 */
export function useSiteImages() {
  const [images, setImages] = useState(DEFAULT_IMAGES) // Começar com imagens padrão
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false)

  // Buscar imagens do banco
  const fetchImages = async (skipCache = false) => {
    try {
      setLoading(true)
      setError(null)

      // Usar cache se disponível e recente (exceto quando forçado a recarregar)
      const now = Date.now()
      if (!skipCache && configCheckCache !== null && (now - lastCheckTime) < CACHE_DURATION) {
        setImages(configCheckCache.images)
        setIsSupabaseConfigured(configCheckCache.isConfigured)
        setError(configCheckCache.error)
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('site_images')
        .select('*')
        .limit(1)
        .single()

      if (fetchError) {
        // Se a tabela não existir, usar imagens padrão e marcar como não configurado
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('relation') || fetchError.message.includes('does not exist')) {
          console.log('⚠️  Tabela site_images não configurada, usando imagens padrão')
          setImages(DEFAULT_IMAGES)
          setIsSupabaseConfigured(false)
          setError('Supabase não configurado')

          // Cachear resultado negativo para evitar requisições repetidas
          configCheckCache = {
            images: DEFAULT_IMAGES,
            isConfigured: false,
            error: 'Supabase não configurado'
          }
          lastCheckTime = now
        } else {
          console.error('❌ Erro ao buscar imagens:', fetchError.message)
          setImages(DEFAULT_IMAGES)
          setIsSupabaseConfigured(false)
          setError(fetchError.message)
        }
      } else {
        // Sucesso! Usar imagens do banco
        setImages(data)
        setIsSupabaseConfigured(true)
        console.log('✅ Imagens carregadas do Supabase!')

        // Cachear resultado positivo
        configCheckCache = {
          images: data,
          isConfigured: true,
          error: null
        }
        lastCheckTime = now
      }
    } catch (err) {
      console.error('❌ Erro ao buscar imagens:', err)
      setImages(DEFAULT_IMAGES) // Sempre usar fallback em caso de erro
      setIsSupabaseConfigured(false)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Função auxiliar para garantir que existe uma linha no banco
  const ensureRowExists = async () => {
    // 1. Tentar buscar linha existente
    const { data: existingData } = await supabase
      .from('site_images')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (existingData?.id) {
      return existingData.id
    }

    // 2. Se não existir, criar nova
    const { data: newData, error: createError } = await supabase
      .from('site_images')
      .insert([{ updated_by: 'system_auto_create' }])
      .select('id')
      .single()

    if (createError) throw createError
    return newData.id
  }

  // Upload de imagem para o Supabase Storage
  const uploadImage = async (file, fieldName) => {
    try {
      setUploading(true)
      setError(null)

      // Validar arquivo
      if (!file || !file.type.startsWith('image/')) {
        throw new Error('Por favor, selecione um arquivo de imagem válido')
      }

      // Limitar tamanho (5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('A imagem deve ter no máximo 5MB')
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${fieldName}_${Date.now()}.${fileExt}`
      const filePath = `site-images/${fileName}`

      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('site-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('site-images')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      // Atualizar no banco de dados (Singleton Pattern)
      const rowId = await ensureRowExists()

      const updateData = {
        [fieldName]: publicUrl,
        updated_by: 'admin',
        updated_at: new Date().toISOString()
      }

      const { error: updateError, count } = await supabase
        .from('site_images')
        .update(updateData)
        .eq('id', rowId)
        .select('id', { count: 'exact', head: true }) // Contar linhas afetadas

      if (updateError) throw updateError

      console.log(`✅ Imagem atualizada! Linhas afetadas: ${count}`)

      // Recarregar imagens para garantir estado atualizado
      await fetchImages(true)
      return { success: true, url: publicUrl }

    } catch (err) {
      console.error('❌ Erro ao fazer upload:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setUploading(false)
    }
  }

  // Atualizar URL de imagem diretamente
  const updateImageUrl = async (fieldName, url) => {
    try {
      setUploading(true)
      setError(null)

      const updateData = {
        [fieldName]: url,
        updated_by: 'admin',
        updated_at: new Date().toISOString()
      }

      // Garantir linha e atualizar (Singleton)
      const rowId = await ensureRowExists()

      const { error: updateError } = await supabase
        .from('site_images')
        .update(updateData)
        .eq('id', rowId)

      if (updateError) throw updateError

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

  // Carregar imagens ao montar o componente
  useEffect(() => {
    fetchImages()
  }, [])

  return {
    images,
    loading,
    uploading,
    error,
    isSupabaseConfigured,
    fetchImages,
    uploadImage,
    updateImageUrl
  }
}
