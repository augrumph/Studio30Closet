import { supabase } from './supabase'

/**
 * Setup automático completo do sistema de imagens
 * Execute esta função UMA vez para configurar tudo
 */
export async function autoSetupSiteImages() {
  console.log('🚀 Iniciando configuração automática do sistema de imagens...')

  const errors = []
  const steps = []

  try {
    // ============================================================================
    // PASSO 1: Criar tabela site_images
    // ============================================================================
    console.log('📦 Passo 1/4: Criando tabela site_images...')

    const { error: tableError } = await supabase.rpc('create_site_images_table', {})

    // Se não tem a função RPC, criar diretamente via insert (forçar criação da tabela)
    if (tableError) {
      console.log('⚠️  RPC não disponível, criando via insert...')

      // Tentar inserir direto (isso cria a tabela se não existir via migrations)
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
        .select()

      if (insertError && !insertError.message.includes('duplicate')) {
        errors.push(`Erro ao criar tabela: ${insertError.message}`)
        steps.push('❌ Tabela site_images - FALHOU')
      } else {
        steps.push('✅ Tabela site_images - OK')
      }
    } else {
      steps.push('✅ Tabela site_images - OK')
    }

    // ============================================================================
    // PASSO 2: Verificar se já existe registro
    // ============================================================================
    console.log('🔍 Passo 2/4: Verificando registros existentes...')

    const { data: existing, error: checkError } = await supabase
      .from('site_images')
      .select('*')
      .limit(1)

    if (checkError) {
      errors.push(`Erro ao verificar registros: ${checkError.message}`)
      steps.push('❌ Verificação de registros - FALHOU')
    } else if (!existing || existing.length === 0) {
      // Criar registro inicial
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
        errors.push(`Erro ao criar registro inicial: ${insertError.message}`)
        steps.push('❌ Registro inicial - FALHOU')
      } else {
        steps.push('✅ Registro inicial criado - OK')
      }
    } else {
      steps.push('✅ Registro já existe - OK')
    }

    // ============================================================================
    // PASSO 3: Verificar bucket de storage
    // ============================================================================
    console.log('🗄️  Passo 3/4: Verificando bucket site-images...')

    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets()

    if (bucketsError) {
      errors.push(`Erro ao listar buckets: ${bucketsError.message}`)
      steps.push('❌ Verificação de bucket - FALHOU')
    } else {
      const bucketExists = buckets.some(b => b.name === 'site-images')

      if (!bucketExists) {
        // Tentar criar bucket
        const { error: createBucketError } = await supabase
          .storage
          .createBucket('site-images', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
          })

        if (createBucketError) {
          errors.push(`Erro ao criar bucket: ${createBucketError.message}`)
          steps.push('⚠️  Bucket site-images - CRIE MANUALMENTE NO DASHBOARD')
        } else {
          steps.push('✅ Bucket site-images criado - OK')
        }
      } else {
        steps.push('✅ Bucket site-images já existe - OK')
      }
    }

    // ============================================================================
    // PASSO 4: Teste de leitura
    // ============================================================================
    console.log('🧪 Passo 4/4: Testando leitura de dados...')

    const { data: testData, error: testError } = await supabase
      .from('site_images')
      .select('*')
      .limit(1)
      .single()

    if (testError) {
      errors.push(`Erro ao ler dados: ${testError.message}`)
      steps.push('❌ Teste de leitura - FALHOU')
    } else {
      steps.push('✅ Teste de leitura - OK')
      console.log('📸 Dados carregados:', testData)
    }

    // ============================================================================
    // RESULTADO FINAL
    // ============================================================================
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMO DA CONFIGURAÇÃO')
    console.log('='.repeat(60))
    steps.forEach(step => console.log(step))

    if (errors.length > 0) {
      console.log('\n⚠️  AVISOS/ERROS:')
      errors.forEach(err => console.log('  - ' + err))
    }

    console.log('='.repeat(60))

    if (errors.length === 0) {
      console.log('🎉 CONFIGURAÇÃO COMPLETA COM SUCESSO!')
      return {
        success: true,
        message: 'Sistema configurado e pronto para uso!',
        steps,
        data: testData
      }
    } else {
      console.log('⚠️  CONFIGURAÇÃO PARCIAL - Algumas etapas precisam ser feitas manualmente')
      return {
        success: false,
        message: 'Algumas etapas falharam. Veja os detalhes acima.',
        steps,
        errors
      }
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error)
    return {
      success: false,
      message: 'Erro crítico durante configuração',
      error: error.message,
      steps,
      errors
    }
  }
}

/**
 * Verificar se o sistema está configurado
 */
export async function checkSetupStatus() {
  try {
    // Verificar se a tabela existe e tem dados
    const { data, error } = await supabase
      .from('site_images')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      return {
        configured: false,
        message: 'Tabela não encontrada ou sem dados',
        needsSetup: true
      }
    }

    // Verificar se bucket existe
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'site-images')

    return {
      configured: true,
      hasData: !!data,
      hasBucket: bucketExists,
      message: bucketExists
        ? 'Sistema totalmente configurado'
        : 'Tabela OK, mas bucket precisa ser criado manualmente',
      needsSetup: false,
      data
    }

  } catch (error) {
    return {
      configured: false,
      message: 'Erro ao verificar configuração',
      error: error.message,
      needsSetup: true
    }
  }
}
