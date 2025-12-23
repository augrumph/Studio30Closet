import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseTester = () => {
  const [status, setStatus] = useState('Inicializando...');
  const [testResults, setTestResults] = useState([]);

  // Função para testar as diferentes tabelas do Supabase
  const runTests = async () => {
    const results = [];
    
    // Testar tabela de settings (deve estar acessível publicamente)
    try {
      setStatus('Testando conexão com tabela de configurações...');
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .limit(1);
        
      if (settingsError) {
        results.push({
          table: 'settings',
          status: 'ERRO',
          message: settingsError.message
        });
      } else {
        results.push({
          table: 'settings',
          status: 'OK',
          message: `Encontrados ${settingsData?.length || 0} registros`
        });
      }
    } catch (error) {
      results.push({
        table: 'settings',
        status: 'ERRO',
        message: error.message
      });
    }

    // Testar tabela de products (deve estar acessível publicamente)
    try {
      setStatus('Testando conexão com tabela de produtos...');
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .limit(1);
        
      if (productsError) {
        results.push({
          table: 'products',
          status: 'ERRO',
          message: productsError.message
        });
      } else {
        results.push({
          table: 'products',
          status: 'OK',
          message: `Encontrados ${productsData?.length || 0} registros`
        });
      }
    } catch (error) {
      results.push({
        table: 'products',
        status: 'ERRO',
        message: error.message
      });
    }

    // Testar tabela de customers (requer role de admin)
    try {
      setStatus('Testando conexão com tabela de clientes...');
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);
        
      if (customersError) {
        results.push({
          table: 'customers',
          status: 'ACESSO NEGADO',
          message: customersError.message
        });
      } else {
        results.push({
          table: 'customers',
          status: 'OK',
          message: `Encontrados ${customersData?.length || 0} registros`
        });
      }
    } catch (error) {
      results.push({
        table: 'customers',
        status: 'ERRO',
        message: error.message
      });
    }

    // Testar inserção em uma nova entrada no settings (apenas se estiver autenticado como admin)
    try {
      setStatus('Testando escrita na tabela de configurações...');
      const testSetting = {
        key: 'test_connection',
        value: { timestamp: new Date().toISOString(), status: 'working' }
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('settings')
        .insert([testSetting])
        .select();
        
      if (insertError) {
        results.push({
          table: 'settings_write',
          status: 'ACESSO NEGADO',
          message: insertError.message
        });
      } else {
        results.push({
          table: 'settings_write',
          status: 'OK',
          message: `Registro criado com ID: ${insertData?.[0]?.id}`
        });

        // Excluir o registro de teste
        await supabase
          .from('settings')
          .delete()
          .eq('key', 'test_connection');
      }
    } catch (error) {
      results.push({
        table: 'settings_write',
        status: 'ERRO',
        message: error.message
      });
    }

    setTestResults(results);
    setStatus('Testes concluídos!');
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Teste de Conexão com Supabase</h1>
      <p className="mb-4"><strong>Status:</strong> {status}</p>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold mt-6 mb-2">Resultados dos Testes:</h2>
        {testResults.length > 0 ? (
          testResults.map((result, index) => (
            <div 
              key={index} 
              className={`p-3 rounded border ${
                result.status === 'OK' 
                  ? 'bg-green-100 border-green-300 text-green-800' 
                  : result.status === 'ACESSO NEGADO'
                  ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                  : 'bg-red-100 border-red-300 text-red-800'
              }`}
            >
              <div className="font-medium">{result.table}:</div>
              <div><strong>{result.status}</strong> - {result.message}</div>
            </div>
          ))
        ) : (
          <p>Nenhum teste executado ainda...</p>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Resumo:</h3>
        <p>O Supabase está configurado corretamente se:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Tabelas públicas (settings, products) retornam dados ou pelo menos não dão erro de conexão</li>
          <li>Tabelas restritas (customers, etc.) retornam "ACESSO NEGADO" (o que é esperado sem autenticação)</li>
          <li>Escrita em settings retorna "ACESSO NEGADO" (padrão para usuários anônimos)</li>
        </ul>
      </div>
    </div>
  );
};

export default SupabaseTester;