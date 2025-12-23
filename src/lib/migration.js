import { supabase } from './supabase';
import productsData from '../../public/data/products.json';
import customersData from '../../public/data/customers.json';
import ordersData from '../../public/data/orders.json';
import vendasData from '../../public/data/vendas.json';
import settingsData from '../../public/data/settings.json';
import couponsData from '../../public/data/coupons.json';

async function migrateProducts() {
  const { products } = productsData;
  const { error } = await supabase.from('products').insert(products);
  if (error) console.error('Error migrating products:', error);
  else console.log('Products migrated successfully!');
}

async function migrateCustomers() {
  const { customers } = customersData;
  const { error } = await supabase.from('customers').insert(customers);
  if (error) console.error('Error migrating customers:', error);
  else console.log('Customers migrated successfully!');
}

async function migrateOrders() {
  const { orders } = ordersData;
  const { error } = await supabase.from('orders').insert(orders);
  if (error) console.error('Error migrating orders:', error);
  else console.log('Orders migrated successfully!');
}

async function migrateVendas() {
  const { vendas } = vendasData;
  const { error } = await supabase.from('vendas').insert(vendas);
  if (error) console.error('Error migrating vendas:', error);
  else console.log('Vendas migrated successfully!');
}

async function migrateSettings() {
  const settingsArray = Object.keys(settingsData).map(key => ({ setting_key: key, value: settingsData[key] }));
  const { error } = await supabase.from('settings').insert(settingsArray);
  if (error) console.error('Error migrating settings:', error);
  else console.log('Settings migrated successfully!');
}

async function migrateCoupons() {
  const { coupons } = couponsData;
  const { error } = await supabase.from('coupons').insert(coupons);
  if (error) console.error('Error migrating coupons:', error);
  else console.log('Coupons migrated successfully!');
}

export async function runMigration() {
  await migrateProducts();
  await migrateCustomers();
  await migrateOrders();
  await migrateVendas();
  await migrateSettings();
  await migrateCoupons();
}