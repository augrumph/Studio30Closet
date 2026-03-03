/**
 * Script para aplicar todas as migrations de blindagem
 * Execute: node server/database/apply-bulletproof.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function applyMigrations() {
    console.log('🛡️  INICIANDO APLICAÇÃO DE BLINDAGEM...\n')

    try {
        // Ler arquivo SQL
        const sqlFile = join(__dirname, 'bulletproof-migrations.sql')
        const sql = readFileSync(sqlFile, 'utf8')

        console.log('📄 Lendo arquivo de migrations...')
        console.log(`   Arquivo: ${sqlFile}`)
        console.log(`   Tamanho: ${sql.length} caracteres\n`)

        // Executar SQL
        console.log('⚡ Executando migrations...')
        await pool.query(sql)

        console.log('✅ Migrations aplicadas com sucesso!\n')

        // Verificar resultados
        console.log('🔍 Verificando instalação...\n')

        // 1. Verificar triggers
        const { rows: triggers } = await pool.query(`
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            AND trigger_name LIKE '%updated_at%'
        `)

        console.log('✅ Triggers instalados:')
        triggers.forEach(t => {
            console.log(`   - ${t.trigger_name} em ${t.event_object_table}`)
        })

        // 2. Verificar constraints
        const { rows: constraints } = await pool.query(`
            SELECT conname, conrelid::regclass as table_name
            FROM pg_constraint
            WHERE conname LIKE 'check_%'
            AND connamespace = 'public'::regnamespace
        `)

        console.log('\n✅ Constraints instalados:')
        constraints.slice(0, 5).forEach(c => {
            console.log(`   - ${c.conname} em ${c.table_name}`)
        })
        if (constraints.length > 5) {
            console.log(`   ... e mais ${constraints.length - 5} constraints`)
        }

        // 3. Verificar tabela de auditoria
        const { rows: auditTable } = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'audit_log'
            ) as exists
        `)

        if (auditTable[0].exists) {
            console.log('\n✅ Tabela de auditoria criada')
            const { rows: auditCount } = await pool.query('SELECT COUNT(*) as count FROM audit_log')
            console.log(`   Total de registros de auditoria: ${auditCount[0].count}`)
        }

        // 4. Verificar indexes
        const { rows: indexes } = await pool.query(`
            SELECT indexname, tablename
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND indexname LIKE 'idx_%'
        `)

        console.log(`\n✅ ${indexes.length} indexes de performance instalados`)

        console.log('\n🎉 BLINDAGEM COMPLETA APLICADA COM SUCESSO!')
        console.log('\n📊 Resumo:')
        console.log(`   - ${triggers.length} triggers automáticos`)
        console.log(`   - ${constraints.length} constraints de validação`)
        console.log(`   - ${indexes.length} indexes de performance`)
        console.log(`   - 1 sistema de auditoria completo`)

        process.exit(0)
    } catch (error) {
        console.error('\n❌ ERRO ao aplicar migrations:', error)
        console.error('Stack:', error.stack)
        process.exit(1)
    }
}

applyMigrations()
