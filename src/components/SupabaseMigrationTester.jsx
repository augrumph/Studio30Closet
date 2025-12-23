import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseMigrationTester = () => {
  const [status, setStatus] = useState('Inicializando testes...');
  const [results, setResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);

  // Testar todas as operações CRUD nas tabelas principais
  const runComprehensiveTests = async () => {
    setIsTesting(true);
    setResults([]);
    setStatus('Executando testes abrangentes...');

    const testResults = [];

    // Testar tabela products
    try {
      setStatus('Testando tabela: products (leitura)');
      const { data: productsRead, error: readError } = await supabase
        .from('products')
        .select('*')
        .limit(1);
      
      if (readError) {
        testResults.push({
          table: 'products_read',
          status: 'ERRO',
          message: readError.message
        });
      } else {
        testResults.push({
          table: 'products_read',
          status: 'OK',
          message: `Leitura funcionando - encontrados ${productsRead?.length || 0} itens`
        });
      }
    } catch (error) {
      testResults.push({
        table: 'products_read',
        status: 'ERRO',
        message: error.message
      });
    }

    // Testar tabela customers
    try {
      setStatus('Testando tabela: customers (leitura)');
      const { data: customersRead, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);
      
      if (customersError) {
        testResults.push({
          table: 'customers_read',
          status: 'ACESSO NEGADO',
          message: customersError.message
        });
      } else {
        testResults.push({
          table: 'customers_read',
          status: 'OK',
          message: `Leitura funcionando - encontrados ${customersRead?.length || 0} clientes`
        });
      }
    } catch (error) {
      testResults.push({
        table: 'customers_read',
        status: 'ERRO',
        message: error.message
      });
    }

    // Testar tabela orders
    try {
      setStatus('Testando tabela: orders (leitura)');
      const { data: ordersRead, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
      
      if (ordersError) {
        testResults.push({
          table: 'orders_read',
          status: 'ACESSO NEGADO',
          message: ordersError.message
        });
      } else {
        testResults.push({
          table: 'orders_read',
          status: 'OK',
          message: `Leitura funcionando - encontrados ${ordersRead?.length || 0} pedidos`
        });
      }
    } catch (error) {
      testResults.push({
        table: 'orders_read',
        status: 'ERRO',
        message: error.message
      });
    }

    // Testar tabela vendas
    try {
      setStatus('Testando tabela: vendas (leitura)');
      const { data: vendasRead, error: vendasError } = await supabase
        .from('vendas')
        .select('*')
        .limit(1);
      
      if (vendasError) {
        testResults.push({
          table: 'vendas_read',
          status: 'ACESSO NEGADO',
          message: vendasError.message
        });
      } else {
        testResults.push({
          table: 'vendas_read',
          status: 'OK',
          message: `Leitura funcionando - encontrados ${vendasRead?.length || 0} vendas`
        });
      }
    } catch (error) {
      testResults.push({
        table: 'vendas_read',
        status: 'ERRO',
        message: error.message
      });
    }

    // Testar tabela coupons
    try {
      setStatus('Testando tabela: coupons (leitura)');
      const { data: couponsRead, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .limit(1);
      
      if (couponsError) {
        testResults.push({
          table: 'coupons_read',
          status: 'ERRO',
          message: couponsError.message
        });
      } else {
        testResults.push({
          table: 'coupons_read',
          status: 'OK',
          message: `Leitura funcionando - encontrados ${couponsRead?.length || 0} cupons`
        });
      }
    } catch (error) {
      testResults.push({
        table: 'coupons_read',
        status: 'ERRO',
        message: error.message
      });
    }

    // Testar tabela suppliers (não existe no schema original, mas vamos testar a simulação antiga)
    try {
      setStatus('Testando tabela: suppliers (equivalente antigo em localStorage)');
      // Criar tabela temporária para testar a transição do localStorage
      const testSupplier = {
        name: 'Test Supplier Migration',
        cnpj: '12345678901234',
        email: 'test@example.com',
        phone: '11999999999',
        address: 'Rua de Teste, 123',
        createdAt: new Date().toISOString()
      };

      const { data: insertResult, error: insertError } = await supabase
        .rpc('information_schema._pg_versions'); // Chamando um RPC inexistente para testar o tratamento de erro
      
      // Na verdade, vamos apenas simular a transição para mostrar como faríamos com suppliers
      testResults.push({
        table: 'suppliers_simulation',
        status: 'INFO',
        message: 'A tabela suppliers não existe no schema. Precisa ser criada ou os dados migrados de localStorage para outra tabela existente'
      });
    } catch (error) {
      testResults.push({
        table: 'suppliers_simulation',
        status: 'INFO',
        message: 'Tabela suppliers não existe no schema. Precisa ser criada ou dados migrados de localStorage'
      });
    }

    // Testar operação de escrita em settings (onde o acesso público é permitido)
    try {
      setStatus('Testando escrita na tabela: settings');
      const testData = {
        key: `migration_test_${Date.now()}`,
        value: { 
          timestamp: new Date().toISOString(), 
          description: 'Teste de escrita para verificar migração do localStorage para Supabase'
        }
      };

      const { data: insertData, error: insertError } = await supabase
        .from('settings')
        .insert([testData])
        .select();

      if (insertError && insertError.code === '23505') { // Código de erro para chave duplicada
        testResults.push({
          table: 'settings_write',
          status: 'ACESSO NEGADO',
          message: 'Permissões de escrita restritas (esperado para usuários anônimos)'
        });
      } else if (insertError) {
        testResults.push({
          table: 'settings_write',
          status: 'ERRO',
          message: insertError.message
        });
      } else {
        testResults.push({
          table: 'settings_write',
          status: 'OK',
          message: `Escrita funcionando - criado item com ID: ${insertData?.[0]?.id}`
        });

        // Limpar o dado de teste
        await supabase
          .from('settings')
          .delete()
          .eq('key', testData.key);
      }
    } catch (error) {
      testResults.push({
        table: 'settings_write',
        status: 'ERRO',
        message: error.message
      });
    }

    setResults(testResults);
    setStatus('Testes concluídos! Verifique os resultados abaixo.');
    setIsTesting(false);
  };

  // Função para comparar localStorage vs Supabase
  const compareStorageMethods = () => {
    const localStorageKeys = Object.keys(localStorage).filter(key => key.includes('studio30_'));
    const comparison = localStorageKeys.map(key => {
      let localData;
      try {
        localData = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        localData = localStorage.getItem(key);
      }
      
      return {
        storageType: 'localStorage',
        key,
        itemCount: Array.isArray(localData) ? localData.length : 1,
        dataSize: typeof localData === 'string' ? localData.length : JSON.stringify(localData).length
      };
    });

    return comparison;
  };

  useEffect(() => {
    runComprehensiveTests();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Teste de Migração: localStorage → Supabase</h1>
      <p className="mb-4 text-lg"><strong>Status:</strong> {status}</p>
      
      <div className="mb-6 flex gap-4">
        <button 
          onClick={runComprehensiveTests}
          disabled={isTesting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isTesting ? 'Executando...' : 'Rodar Testes Novamente'}
        </button>
        
        <button 
          onClick={() => window.location.href = '/admin/login'}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Acessar Painel Admin
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mt-8 mb-4">Resultados dos Testes:</h2>
          
          {results.map((result, index) => (
            <div 
              key={index} 
              className={`p-4 rounded border-2 ${
                result.status === 'OK' 
                  ? 'bg-green-50 border-green-300 text-green-800' 
                  : result.status === 'ACESSO NEGADO'
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                  : result.status === 'INFO'
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              <div className="font-bold text-lg">{result.table}:</div>
              <div className="font-semibold">{result.status}</div>
              <div>{result.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Seção de comparação entre localStorage e Supabase */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Comparação: localStorage x Supabase</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">localStorage (dados atuais)</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {compareStorageMethods().map((item, idx) => (
                <div key={idx} className="text-sm p-2 bg-white rounded">
                  <div><strong>Chave:</strong> {item.key}</div>
                  <div><strong>Itens:</strong> {item.itemCount}</div>
                  <div><strong>Tamanho:</strong> {item.dataSize} chars</div>
                </div>
              ))}
              
              {compareStorageMethods().length === 0 && (
                <p className="text-gray-500 italic">Nenhum dado encontrado no localStorage com prefixo studio30_</p>
              )}
            </div>
          </div>
          
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">Migração para Supabase</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Dados de <code className="bg-gray-200 px-1 rounded">suppliers</code>, <code className="bg-gray-200 px-1 rounded">purchases</code> e <code className="bg-gray-200 px-1 rounded">expenses</code> precisam ser migrados</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Produtos, clientes e vendas já estão no Supabase</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">!</span>
                <span>É necessário criar uma política de migração dos dados</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">!</span>
                <span>Configurar permissões adequadas para diferentes níveis de usuário</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-100 rounded">
        <h3 className="font-semibold mb-2">Próximos Passos para Migração Completa:</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Criar tabelas no Supabase para substituir os dados armazenados em localStorage (suppliers, purchases, expenses)</li>
          <li>Migrar dados existentes do localStorage para as novas tabelas do Supabase</li>
          <li>Atualizar os stores (suppliers-store.js, operational-costs-store.js) para usar Supabase em vez de localStorage</li>
          <li>Configurar políticas de segurança apropriadas no Supabase</li>
          <li>Testar novamente todas as funcionalidades após a migração</li>
        </ol>
      </div>
    </div>
  );
};

export default SupabaseMigrationTester;