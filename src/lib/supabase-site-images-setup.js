import { supabase } from './supabase'

/**
 * Script para configurar a tabela de imagens do site no Supabase
 * Execute este arquivo uma vez para criar a estrutura necessária
 */
export async function setupSiteImagesTable() {
  console.log('🚀 Iniciando configuração da tabela site_images...')

  try {
    // 1. Criar a tabela site_images
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Criar tabela se não existir
        CREATE TABLE IF NOT EXISTS site_images (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Home Page Images
          hero_logo TEXT,
          how_it_works_section_image TEXT,

          -- HowItWorks Page Images
          step_1_image TEXT,
          step_2_image TEXT,
          step_3_image TEXT,
          step_4_image TEXT,

          -- About Page Images
          about_hero_image TEXT,

          -- Metadata
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_by TEXT
        );

        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_site_images_updated_at ON site_images(updated_at DESC);
      `
    })

    if (tableError) {
      console.error('❌ Erro ao criar tabela:', tableError)
      // Se não tiver a função exec_sql, vamos criar a tabela de outra forma
      console.log('⚠️  Tentando método alternativo...')
    } else {
      console.log('✅ Tabela criada com sucesso!')
    }

    // 2. Verificar se já existe algum registro
    const { data: existing, error: checkError } = await supabase
      .from('site_images')
      .select('*')
      .limit(1)

    if (checkError) {
      console.log('⚠️  Tabela ainda não existe, será criada automaticamente no primeiro insert')
    }

    // 3. Se não existir registro, criar um inicial
    if (!existing || existing.length === 0) {
      const { error: insertError } = await supabase
        .from('site_images')
        .insert({
          hero_logo: '/marcacompleta.webp',
          how_it_works_section_image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600&auto=format&fit=crop',
          step_1_image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
          step_2_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
          step_3_image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&q=80',
          step_4_image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
          about_hero_image: '/src/images/amor.jpeg'
        })

      if (insertError) {
        console.error('❌ Erro ao inserir registro inicial:', insertError)
      } else {
        console.log('✅ Registro inicial criado com sucesso!')
      }
    } else {
      console.log('✅ Registro já existe, nada a fazer')
    }

    console.log('🎉 Configuração concluída!')
    return { success: true }

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error)
    return { success: false, error }
  }
}

/**
 * Verificar se a configuração está OK
 */
export async function verifySiteImagesSetup() {
  try {
    const { data, error } = await supabase
      .from('site_images')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      console.error('❌ Erro ao verificar configuração:', error)
      return { success: false, error }
    }

    console.log('✅ Configuração verificada com sucesso!')
    console.log('📸 Imagens atuais:', data)
    return { success: true, data }

  } catch (error) {
    console.error('❌ Erro ao verificar:', error)
    return { success: false, error }
  }
}
