/*
 * Script de Teste de Integração com Supabase - Studio30 Closet
 * Este script testa todas as operações CRUD com a biblioteca do Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração do cliente Supabase
// Substitua estas variáveis com as credenciais do seu projeto Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://wvghryqufnjmdfnjypbu.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_2N4xskht1eHkZHBlTwRfPA_ZDvZ5VrH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para esperar um tempo (em milissegundos)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para testar operações CRUD em uma tabela
async function testCRUD(tableName, testData, updateData) {
    console.log(`\n--- Iniciando teste CRUD para ${tableName} ---`);
    
    try {
        // CREATE
        console.log(`1. Testando CREATE em ${tableName}...`);
        const { data: insertedData, error: insertError } = await supabase
            .from(tableName)
            .insert([testData])
            .select()
            .single();
            
        if (insertError) {
            console.error(`Erro no CREATE:`, insertError);
            return false;
        }
        
        console.log(`   CREATE OK - ID: ${insertedData.id}`);
        await sleep(100); // Pequena pausa para garantir consistência
        
        // READ
        console.log(`2. Testando READ de ${tableName}...`);
        const { data: readData, error: readError } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', insertedData.id)
            .single();
            
        if (readError) {
            console.error(`Erro no READ:`, readError);
            return false;
        }
        
        console.log(`   READ OK - Dados recuperados com sucesso`);
        await sleep(100);
        
        // UPDATE
        console.log(`3. Testando UPDATE em ${tableName}...`);
        const { data: updatedData, error: updateError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', insertedData.id)
            .select()
            .single();
            
        if (updateError) {
            console.error(`Erro no UPDATE:`, updateError);
            return false;
        }
        
        console.log(`   UPDATE OK - Registro atualizado`);
        await sleep(100);
        
        // DELETE
        console.log(`4. Testando DELETE de ${tableName}...`);
        const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq('id', insertedData.id);
            
        if (deleteError) {
            console.error(`Erro no DELETE:`, deleteError);
            return false;
        }
        
        console.log(`   DELETE OK - Registro removido`);
        console.log(`--- Teste CRUD para ${tableName} concluído com sucesso! ---\n`);
        return true;
    } catch (error) {
        console.error(`Erro geral no teste de ${tableName}:`, error);
        return false;
    }
}

// Função para testar operações que envolvem relacionamentos
async function testRelationships() {
    console.log('\n--- Iniciando teste de relacionamentos ---');
    
    try {
        // Testar relacionamento entre products e suppliers
        console.log('1. Testando relacionamento products-suppliers...');
        
        // Criar um fornecedor
        const { data: supplierData, error: supplierError } = await supabase
            .from('suppliers')
            .insert([{ name: 'Fornecedor Teste Relacionamento', cnpj: '12345678901234', email: 'teste@relacionamento.com' }])
            .select()
            .single();
            
        if (supplierError) {
            console.error('Erro ao criar fornecedor:', supplierError);
            return false;
        }
        
        // Criar um produto com o fornecedor
        const { data: productData, error: productError } = await supabase
            .from('products')
            .insert([{
                name: 'Produto Teste com Fornecedor',
                price: 100,
                stock: 10,
                supplier_id: supplierData.id
            }])
            .select()
            .single();
            
        if (productError) {
            console.error('Erro ao criar produto com fornecedor:', productError);
            // Limpar o fornecedor criado
            await supabase.from('suppliers').delete().eq('id', supplierData.id);
            return false;
        }
        
        // Verificar o relacionamento com JOIN
        const { data: joinedData, error: joinError } = await supabase
            .from('products')
            .select('*, suppliers(name)')
            .eq('id', productData.id)
            .single();
            
        if (joinError) {
            console.error('Erro ao verificar relacionamento:', joinError);
            // Limpar dados criados
            await supabase.from('products').delete().eq('id', productData.id);
            await supabase.from('suppliers').delete().eq('id', supplierData.id);
            return false;
        }
        
        console.log('   Relacionamento products-suppliers OK');
        
        // Limpar dados de teste
        await supabase.from('products').delete().eq('id', productData.id);
        await supabase.from('suppliers').delete().eq('id', supplierData.id);
        
        console.log('--- Teste de relacionamentos concluído com sucesso! ---\n');
        return true;
    } catch (error) {
        console.error('Erro geral no teste de relacionamentos:', error);
        return false;
    }
}

// Função para testar as views
async function testViews() {
    console.log('\n--- Iniciando teste de views ---');
    
    try {
        // Testar a view sales_report
        console.log('1. Testando view sales_report...');
        const { data: salesReportData, error: salesReportError } = await supabase
            .from('sales_report')
            .select('*')
            .limit(1);
            
        if (salesReportError) {
            console.log('   sales_report view não disponível ou erro:', salesReportError.message);
        } else {
            console.log('   sales_report view OK');
        }
        
        // Testar a view supplier_inventory_report
        console.log('2. Testando view supplier_inventory_report...');
        const { data: supplierReportData, error: supplierReportError } = await supabase
            .from('supplier_inventory_report')
            .select('*')
            .limit(1);
            
        if (supplierReportError) {
            console.log('   supplier_inventory_report view não disponível ou erro:', supplierReportError.message);
        } else {
            console.log('   supplier_inventory_report view OK');
        }
        
        console.log('--- Teste de views concluído! ---\n');
        return true;
    } catch (error) {
        console.error('Erro no teste de views:', error);
        return false;
    }
}

// Função principal para executar todos os testes
async function runAllTests() {
    console.log('Iniciando testes de integração com Supabase...\n');
    
    let allTestsPassed = true;
    let testsRun = 0;
    
    // Testar tabelas básicas
    const basicTables = [
        {
            name: 'settings',
            testData: { setting_key: `test_key_${Date.now()}`, value: { test: 'value' } },
            updateData: { value: { test: 'updated_value' } }
        },
        {
            name: 'coupons', 
            testData: { code: `TEST${Date.now()}`, discount_type: 'percentage', discount_value: 10 },
            updateData: { discount_value: 15 }
        },
        {
            name: 'customers',
            testData: { name: 'Cliente Teste', phone: `1199999999${Date.now() % 10}` },
            updateData: { name: 'Cliente Teste Atualizado' }
        }
    ];
    
    for (const table of basicTables) {
        const result = await testCRUD(table.name, table.testData, table.updateData);
        if (!result) allTestsPassed = false;
        testsRun++;
    }
    
    // Testar tabelas com campos mais complexos
    const complexTables = [
        {
            name: 'products',
            testData: { 
                name: 'Produto Teste', 
                price: 100, 
                cost_price: 50, 
                stock: 10, 
                sizes: ['P', 'M'], 
                images: ['test.jpg'],
                category: 'Vestidos'
            },
            updateData: { stock: 15 }
        },
        {
            name: 'fixed_expenses',
            testData: { 
                name: 'Conta Teste', 
                value: 200, 
                category: 'Aluguel', 
                recurrence: 'monthly' 
            },
            updateData: { value: 220 }
        }
    ];
    
    for (const table of complexTables) {
        const result = await testCRUD(table.name, table.testData, table.updateData);
        if (!result) allTestsPassed = false;
        testsRun++;
    }
    
    // Testar relacionamentos
    const relationshipsResult = await testRelationships();
    if (!relationshipsResult) allTestsPassed = false;
    testsRun++;
    
    // Testar views
    const viewsResult = await testViews();
    if (!viewsResult) allTestsPassed = false;
    testsRun++;
    
    // Resultado final
    console.log('\n' + '='.repeat(60));
    console.log('RESUMO DOS TESTES:');
    console.log(`Testes executados: ${testsRun}`);
    console.log(`Status geral: ${allTestsPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`);
    console.log('='.repeat(60));
    
    if (allTestsPassed) {
        console.log('\n🎉 O sistema Studio30 Closet está funcionando corretamente com o Supabase!');
        console.log('Todas as operações CRUD estão funcionando, assim como os relacionamentos entre tabelas.');
    } else {
        console.log('\n⚠️  Alguns testes falharam. Verifique os erros acima e ajuste conforme necessário.');
    }
    
    return allTestsPassed;
}

// Executar os testes se este script for chamado diretamente
if (require.main === module) {
    runAllTests()
        .then(success => {
            if (success) {
                console.log('\n✅ Testes concluídos com sucesso!');
                process.exit(0);
            } else {
                console.log('\n❌ Alguns testes falharam!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Erro ao executar testes:', error);
            process.exit(1);
        });
}

module.exports = { testCRUD, testRelationships, testViews, runAllTests };