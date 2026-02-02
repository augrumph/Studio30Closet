/**
 * API de Coleções
 * CRUD para gerenciar coleções de produtos (Inverno, Fitness, etc.)
 */

import { supabase } from '../supabase'
import { toCamelCase, toSnakeCase } from './helpers'

/**
 * Buscar todas as coleções
 */
export async function getCollections() {
    const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('title', { ascending: true })

    if (error) {
        console.error('❌ Erro ao buscar coleções:', error)
        throw error
    }

    return data.map(toCamelCase)
}

/**
 * Buscar apenas coleções ativas (para o Catálogo)
 */
export async function getActiveCollections() {
    const { data, error } = await supabase
        .from('collections')
        .select('id, title, slug')
        .eq('active', true)
        .order('title', { ascending: true })

    if (error) {
        console.error('❌ Erro ao buscar coleções ativas:', error)
        throw error
    }

    return data.map(toCamelCase)
}

/**
 * Criar nova coleção
 */
export async function createCollection(collectionData) {
    const slug = collectionData.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

    const { data, error } = await supabase
        .from('collections')
        .insert([{ title: collectionData.title, slug, active: true }])
        .select()
        .single()

    if (error) {
        console.error('❌ Erro ao criar coleção:', error)
        throw error
    }

    return toCamelCase(data)
}

/**
 * Atualizar coleção
 */
export async function updateCollection(id, updates) {
    const { data, error } = await supabase
        .from('collections')
        .update(toSnakeCase(updates))
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('❌ Erro ao atualizar coleção:', error)
        throw error
    }

    return toCamelCase(data)
}

/**
 * Deletar coleção
 */
export async function deleteCollection(id) {
    const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('❌ Erro ao deletar coleção:', error)
        throw error
    }

    return true
}
