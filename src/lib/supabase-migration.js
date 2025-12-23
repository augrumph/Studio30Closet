/*
 * Script de migração de dados do localStorage para Supabase
 * 
 * Este script contém funções para migrar os dados que atualmente estão armazenados 
 * em localStorage para as tabelas correspondentes no Supabase.
 * 
 * Para usar este script, você precisa:
 * 1. Ter as tabelas necessárias criadas no Supabase (verifique supabase_schema.sql)
 * 2. Configurar as permissões adequadas para escrita
 * 3. Obter um token de serviço (service role) para execução das operações
 */

import { supabase } from '../lib/supabase';

// Tabelas que precisam ser criadas no Supabase para substituir o localStorage
const SUPABASE_TABLES = {
  suppliers: 'suppliers',
  purchases: 'purchases',
  expenses: 'fixed_expenses',
  materials_stock: 'materials_stock'
};

/**
 * Função para migrar dados de fornecedores do localStorage para Supabase
 */
export const migrateSuppliers = async (serviceRoleSupabase = null) => {
  const client = serviceRoleSupabase || supabase;
  
  try {
    // Recuperar dados do localStorage
    const localStorageData = localStorage.getItem('studio30_suppliers');
    if (!localStorageData) {
      console.log('Nenhum dado de fornecedores encontrado no localStorage');
      return { success: true, message: 'Nenhum dado para migrar' };
    }
    
    const suppliers = JSON.parse(localStorageData);
    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      console.log('Nenhum dado de fornecedores válido encontrado');
      return { success: true, message: 'Nenhum dado válido para migrar' };
    }
    
    // Preparar dados para Supabase (ajustando campos conforme necessário)
    const supabaseSuppliers = suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      cnpj: supplier.cnpj,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      created_at: supplier.createdAt || new Date().toISOString(),
      updated_at: supplier.updatedAt || supplier.createdAt || new Date().toISOString()
    }));
    
    // Inserir dados no Supabase
    const { data, error } = await client
      .from(SUPABASE_TABLES.suppliers)
      .upsert(supabaseSuppliers, { onConflict: ['id'] }); // Upsert para evitar duplicados
    
    if (error) {
      console.error('Erro ao migrar fornecedores:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`Migração de ${suppliers.length} fornecedores concluída`);
    return { 
      success: true, 
      count: suppliers.length,
      message: `Migração de ${suppliers.length} fornecedores concluída` 
    };
  } catch (error) {
    console.error('Erro durante a migração de fornecedores:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Função para migrar dados de compras do localStorage para Supabase
 */
export const migratePurchases = async (serviceRoleSupabase = null) => {
  const client = serviceRoleSupabase || supabase;
  
  try {
    const localStorageData = localStorage.getItem('studio30_purchases');
    if (!localStorageData) {
      console.log('Nenhum dado de compras encontrado no localStorage');
      return { success: true, message: 'Nenhum dado para migrar' };
    }
    
    const purchases = JSON.parse(localStorageData);
    if (!Array.isArray(purchases) || purchases.length === 0) {
      console.log('Nenhum dado de compras válido encontrado');
      return { success: true, message: 'Nenhum dado válido para migrar' };
    }
    
    const supabasePurchases = purchases.map(purchase => ({
      id: purchase.id,
      supplier_id: purchase.supplier_id || null,
      product_id: purchase.product_id || null,
      quantity: purchase.quantity,
      unit_cost: purchase.unitCost || purchase.unit_cost,
      total_cost: purchase.totalCost || purchase.total_cost,
      purchase_date: purchase.purchaseDate || purchase.purchase_date || new Date().toISOString(),
      status: purchase.status || 'completed',
      created_at: purchase.createdAt || purchase.created_at || new Date().toISOString(),
      updated_at: purchase.updatedAt || purchase.updated_at || new Date().toISOString()
    }));
    
    const { data, error } = await client
      .from(SUPABASE_TABLES.purchases)
      .upsert(supabasePurchases, { onConflict: ['id'] });
    
    if (error) {
      console.error('Erro ao migrar compras:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`Migração de ${purchases.length} compras concluída`);
    return { 
      success: true, 
      count: purchases.length,
      message: `Migração de ${purchases.length} compras concluída` 
    };
  } catch (error) {
    console.error('Erro durante a migração de compras:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Função para migrar dados de gastos fixos do localStorage para Supabase
 */
export const migrateFixedExpenses = async (serviceRoleSupabase = null) => {
  const client = serviceRoleSupabase || supabase;
  
  try {
    const localStorageData = localStorage.getItem('studio30_fixed_expenses');
    if (!localStorageData) {
      console.log('Nenhum dado de gastos fixos encontrado no localStorage');
      return { success: true, message: 'Nenhum dado para migrar' };
    }
    
    const expenses = JSON.parse(localStorageData);
    if (!Array.isArray(expenses) || expenses.length === 0) {
      console.log('Nenhum dado de gastos fixos válido encontrado');
      return { success: true, message: 'Nenhum dado válido para migrar' };
    }
    
    const supabaseExpenses = expenses.map(expense => ({
      id: expense.id,
      description: expense.description,
      amount: parseFloat(expense.amount),
      category: expense.category,
      frequency: expense.frequency || 'monthly', // monthly, yearly, one-time
      due_date: expense.dueDate || expense.due_date,
      paid: expense.paid || false,
      created_at: expense.createdAt || expense.created_at || new Date().toISOString(),
      updated_at: expense.updatedAt || expense.updated_at || new Date().toISOString()
    }));
    
    const { data, error } = await client
      .from(SUPABASE_TABLES.expenses)
      .upsert(supabaseExpenses, { onConflict: ['id'] });
    
    if (error) {
      console.error('Erro ao migrar gastos fixos:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`Migração de ${expenses.length} gastos fixos concluída`);
    return { 
      success: true, 
      count: expenses.length,
      message: `Migração de ${expenses.length} gastos fixos concluída` 
    };
  } catch (error) {
    console.error('Erro durante a migração de gastos fixos:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Função para migrar dados de estoque de materiais do localStorage para Supabase
 */
export const migrateMaterialsStock = async (serviceRoleSupabase = null) => {
  const client = serviceRoleSupabase || supabase;
  
  try {
    const localStorageData = localStorage.getItem('studio30_materials_stock');
    if (!localStorageData) {
      console.log('Nenhum dado de estoque de materiais encontrado no localStorage');
      return { success: true, message: 'Nenhum dado para migrar' };
    }
    
    const materials = JSON.parse(localStorageData);
    if (!Array.isArray(materials) || materials.length === 0) {
      console.log('Nenhum dado de estoque de materiais válido encontrado');
      return { success: true, message: 'Nenhum dado válido para migrar' };
    }
    
    const supabaseMaterials = materials.map(material => ({
      id: material.id,
      name: material.name,
      description: material.description,
      quantity: parseInt(material.quantity) || 0,
      unit_cost: parseFloat(material.unit_cost) || 0,
      category: material.category,
      supplier_id: material.supplier_id || null,
      min_stock_level: parseInt(material.min_stock_level) || 0,
      created_at: material.createdAt || material.created_at || new Date().toISOString(),
      updated_at: material.updatedAt || material.updated_at || new Date().toISOString()
    }));
    
    const { data, error } = await client
      .from(SUPABASE_TABLES.materials_stock)
      .upsert(supabaseMaterials, { onConflict: ['id'] });
    
    if (error) {
      console.error('Erro ao migrar estoque de materiais:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`Migração de ${materials.length} materiais em estoque concluída`);
    return { 
      success: true, 
      count: materials.length,
      message: `Migração de ${materials.length} materiais em estoque concluída` 
    };
  } catch (error) {
    console.error('Erro durante a migração de estoque de materiais:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Função principal para executar todas as migrações
 */
export const runAllMigrations = async (serviceRoleSupabase = null) => {
  console.log('Iniciando processo de migração de dados do localStorage para Supabase...');
  
  const results = {};
  
  // Executar todas as migrações em sequência
  results.suppliers = await migrateSuppliers(serviceRoleSupabase);
  results.purchases = await migratePurchases(serviceRoleSupabase);
  results.fixedExpenses = await migrateFixedExpenses(serviceRoleSupabase);
  results.materialsStock = await migrateMaterialsStock(serviceRoleSupabase);
  
  const successfulMigrations = Object.values(results).filter(r => r.success).length;
  const totalMigrations = Object.keys(results).length;
  
  console.log(`Migrações concluídas: ${successfulMigrations}/${totalMigrations}`);
  
  return {
    success: successfulMigrations === totalMigrations,
    results,
    summary: `${successfulMigrations} de ${totalMigrations} migrações realizadas com sucesso`
  };
};

/**
 * Função para verificar e exibir o conteúdo do localStorage
 */
export const checkLocalStorageContent = () => {
  const localStorageKeys = Object.keys(localStorage).filter(key => key.includes('studio30_'));
  
  console.log('Dados atuais no localStorage:');
  localStorageKeys.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      const parsed = JSON.parse(data);
      console.log(`${key}: ${Array.isArray(parsed) ? parsed.length : 1} item(ns)`);
    } catch (e) {
      console.log(`${key}: Dado não parseável`);
    }
  });
  
  return localStorageKeys.map(key => {
    try {
      const data = localStorage.getItem(key);
      const parsed = JSON.parse(data);
      return {
        key,
        count: Array.isArray(parsed) ? parsed.length : 1,
        data: parsed
      };
    } catch (e) {
      return {
        key,
        count: 0,
        error: 'Could not parse data'
      };
    }
  });
};