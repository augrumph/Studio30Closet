import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Credenciais do Supabase não configuradas. Verifique as variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to generate random test data
function generateRandomString(prefix = 'test') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function generateRandomNumber(min = 1, max = 1000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Test data generators
const generateProductData = () => ({
  name: generateRandomString('Produto Teste'),
  price: generateRandomNumber(50, 500),
  cost_price: generateRandomNumber(20, 300),
  description: `Descrição do produto ${generateRandomString()}`,
  stock: generateRandomNumber(1, 50),
  sizes: ['P', 'M', 'G', 'GG'],
  images: [`https://example.com/image_${generateRandomString()}.jpg`],
  category: ['Vestidos', 'Blusas', 'Calças', 'Saias', 'Camisas'][Math.floor(Math.random() * 5)],
  is_featured: false,
  active: true
});

const generateCustomerData = () => ({
  name: generateRandomString('Cliente'),
  phone: `+55119${generateRandomNumber(900000000, 999999999)}`,
  email: `${generateRandomString()}@email.com`,
  cpf: `${generateRandomNumber(100, 999)}.${generateRandomNumber(100, 999)}.${generateRandomNumber(100, 999)}-${generateRandomNumber(10, 99)}`,
  address: `${generateRandomString('Rua')}, ${generateRandomNumber(1, 999)}`,
  complement: `Apto ${generateRandomNumber(1, 100)}`,
  instagram: `@${generateRandomString('insta')}`,
  addresses: JSON.stringify([{
    street: generateRandomString('Rua'),
    number: generateRandomNumber(1, 999),
    complement: `Apto ${generateRandomNumber(1, 100)}`,
    neighborhood: generateRandomString('Bairro'),
    city: generateRandomString('Cidade'),
    state: 'SP',
    zipCode: `${generateRandomNumber(10000, 99999)}-${generateRandomNumber(100, 999)}`
  }])
});

const generateOrderData = () => ({
  status: ['pending', 'shipped', 'completed', 'cancelled'][Math.floor(Math.random() * 4)],
  total_value: generateRandomNumber(100, 1000),
  delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  pickup_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  converted_to_sale: false
});

const generateSaleData = () => ({
  total_value: generateRandomNumber(100, 1000),
  cost_price: generateRandomNumber(50, 500),
  items: JSON.stringify([{ id: generateRandomNumber(1, 100), quantity: 1, price: generateRandomNumber(50, 500) }]),
  payment_method: ['pix', 'credit_card', 'debit_card', 'cash'][Math.floor(Math.random() * 4)],
  card_brand: ['Visa', 'Mastercard', 'Amex', 'Elo'][Math.floor(Math.random() * 4)],
  fee_percentage: generateRandomNumber(2, 5),
  fee_amount: generateRandomNumber(5, 50),
  net_amount: generateRandomNumber(50, 950)
});

const generateCouponData = () => ({
  code: generateRandomString('CUPOM').toUpperCase(),
  discount_type: ['percentage', 'fixed'][Math.floor(Math.random() * 2)],
  discount_value: generateRandomNumber(5, 50),
  min_purchase: generateRandomNumber(100, 300),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  is_active: true,
  description: `Cupom de desconto ${generateRandomString()}`
});

const generateSupplierData = () => ({
  name: generateRandomString('Fornecedor'),
  cnpj: `${generateRandomNumber(10, 99)}.${generateRandomNumber(100, 999)}.${generateRandomNumber(100, 999)}/${generateRandomNumber(1000, 9999)}-${generateRandomNumber(10, 99)}`,
  phone: `+55119${generateRandomNumber(900000000, 999999999)}`,
  email: `${generateRandomString()}@fornecedor.com`,
  address: `${generateRandomString('Rua Fornecedor')}, ${generateRandomNumber(1, 999)}`,
  city: generateRandomString('Cidade'),
  state: 'SP',
  notes: `Notas do fornecedor ${generateRandomString()}`,
  contact_person: generateRandomString('Contato'),
  zip_code: `${generateRandomNumber(10000, 99999)}-${generateRandomNumber(100, 999)}`
});

const generatePurchaseData = () => ({
  value: generateRandomNumber(500, 5000),
  date: new Date().toISOString().split('T')[0],
  payment_method: ['pix', 'credit_card', 'debit_card', 'bank_transfer'][Math.floor(Math.random() * 4)],
  pieces: generateRandomNumber(5, 50),
  parcelas: generateRandomNumber(1, 12),
  notes: `Notas da compra ${generateRandomString()}`
});

const generateFixedExpenseData = () => ({
  name: generateRandomString('Despesa Fixa'),
  value: generateRandomNumber(100, 2000),
  category: ['Aluguel', 'Salário', 'Internet', 'Energia', 'Água'][Math.floor(Math.random() * 5)],
  recurrence: ['monthly', 'yearly'][Math.floor(Math.random() * 2)],
  due_day: generateRandomNumber(1, 28),
  paid: false,
  notes: `Notas da despesa ${generateRandomString()}`
});

const generateMaterialData = () => ({
  name: generateRandomString('Material'),
  description: `Descrição do material ${generateRandomString()}`,
  quantity: generateRandomNumber(10, 100),
  unit_cost: generateRandomNumber(1, 50),
  category: ['Embalagem', 'Etiqueta', 'Cabide', 'Sacola', 'Outro'][Math.floor(Math.random() * 5)],
  min_stock_level: generateRandomNumber(5, 20),
  supplier_id: null
});

const generatePaymentFeeData = () => ({
  payment_method: ['pix', 'credit_card', 'debit_card', 'bank_transfer'][Math.floor(Math.random() * 4)],
  card_brand: ['Visa', 'Mastercard', 'Amex', 'Elo', null][Math.floor(Math.random() * 5)],
  fee_percentage: generateRandomNumber(2, 6),
  fee_fixed: generateRandomNumber(1, 5),
  description: `Taxa de pagamento ${generateRandomString()}`,
  is_active: true
});

// CRUD Test Functions
async function testProductsCRUD() {
  console.log('\n--- Testing Products CRUD ---');
  
  // CREATE
  console.log('1. Testing CREATE product...');
  const productData = generateProductData();
  let { data: createdProduct, error: createError } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating product:', createError);
    return null;
  }
  console.log('✅ Product created successfully:', createdProduct.name);

  // READ
  console.log('2. Testing READ product...');
  let { data: readProduct, error: readError } = await supabase
    .from('products')
    .select('*')
    .eq('id', createdProduct.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading product:', readError);
    return null;
  }
  console.log('✅ Product read successfully:', readProduct.name);

  // UPDATE
  console.log('3. Testing UPDATE product...');
  const updatedName = generateRandomString('Produto Atualizado');
  let { data: updatedProduct, error: updateError } = await supabase
    .from('products')
    .update({ name: updatedName })
    .eq('id', createdProduct.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return null;
  }
  console.log('✅ Product updated successfully:', updatedProduct.name);

  // DELETE
  console.log('4. Testing DELETE product...');
  let { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('id', createdProduct.id);
  
  if (deleteError) {
    console.error('❌ Error deleting product:', deleteError);
    return null;
  }
  console.log('✅ Product deleted successfully');

  console.log('✅ Products CRUD test completed successfully!');
  return true;
}

async function testCustomersCRUD() {
  console.log('\n--- Testing Customers CRUD ---');
  
  // CREATE
  console.log('1. Testing CREATE customer...');
  const customerData = generateCustomerData();
  let { data: createdCustomer, error: createError } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating customer:', createError);
    return null;
  }
  console.log('✅ Customer created successfully:', createdCustomer.name);

  // READ
  console.log('2. Testing READ customer...');
  let { data: readCustomer, error: readError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', createdCustomer.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading customer:', readError);
    return null;
  }
  console.log('✅ Customer read successfully:', readCustomer.name);

  // UPDATE
  console.log('3. Testing UPDATE customer...');
  const updatedName = generateRandomString('Cliente Atualizado');
  let { data: updatedCustomer, error: updateError } = await supabase
    .from('customers')
    .update({ name: updatedName })
    .eq('id', createdCustomer.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating customer:', updateError);
    return null;
  }
  console.log('✅ Customer updated successfully:', updatedCustomer.name);

  // DELETE
  console.log('4. Testing DELETE customer...');
  let { error: deleteError } = await supabase
    .from('customers')
    .delete()
    .eq('id', createdCustomer.id);
  
  if (deleteError) {
    console.error('❌ Error deleting customer:', deleteError);
    return null;
  }
  console.log('✅ Customer deleted successfully');

  console.log('✅ Customers CRUD test completed successfully!');
  return true;
}

async function testOrdersCRUD() {
  console.log('\n--- Testing Orders CRUD ---');
  
  // First create a customer for the order
  console.log('1. Creating customer for order test...');
  const customerData = generateCustomerData();
  let { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();
  
  if (customerError) {
    console.error('❌ Error creating customer for order test:', customerError);
    return null;
  }
  console.log('✅ Customer created for order test:', customer.name);

  // CREATE
  console.log('2. Testing CREATE order...');
  const orderData = { ...generateOrderData(), customer_id: customer.id };
  let { data: createdOrder, error: createError } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating order:', createError);
    // Clean up customer
    await supabase.from('customers').delete().eq('id', customer.id);
    return null;
  }
  console.log('✅ Order created successfully:', createdOrder.id);

  // READ
  console.log('3. Testing READ order...');
  let { data: readOrder, error: readError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', createdOrder.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading order:', readError);
    // Clean up
    await supabase.from('orders').delete().eq('id', createdOrder.id);
    await supabase.from('customers').delete().eq('id', customer.id);
    return null;
  }
  console.log('✅ Order read successfully:', readOrder.id);

  // UPDATE
  console.log('4. Testing UPDATE order...');
  const updatedStatus = 'shipped';
  let { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ status: updatedStatus })
    .eq('id', createdOrder.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating order:', updateError);
    // Clean up
    await supabase.from('orders').delete().eq('id', createdOrder.id);
    await supabase.from('customers').delete().eq('id', customer.id);
    return null;
  }
  console.log('✅ Order updated successfully:', updatedOrder.status);

  // DELETE
  console.log('5. Testing DELETE order...');
  let { error: deleteError } = await supabase
    .from('orders')
    .delete()
    .eq('id', createdOrder.id);
  
  if (deleteError) {
    console.error('❌ Error deleting order:', deleteError);
    // Clean up
    await supabase.from('customers').delete().eq('id', customer.id);
    return null;
  }
  console.log('✅ Order deleted successfully');

  // Clean up customer
  let { error: customerDeleteError } = await supabase
    .from('customers')
    .delete()
    .eq('id', customer.id);
  
  if (customerDeleteError) {
    console.error('⚠️ Error deleting customer (cleanup):', customerDeleteError);
  } else {
    console.log('✅ Customer cleaned up successfully');
  }

  console.log('✅ Orders CRUD test completed successfully!');
  return true;
}

async function testSalesCRUD() {
  console.log('\n--- Testing Sales CRUD ---');
  
  // First create a customer for the sale
  console.log('1. Creating customer for sale test...');
  const customerData = generateCustomerData();
  let { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();
  
  if (customerError) {
    console.error('❌ Error creating customer for sale test:', customerError);
    return null;
  }
  console.log('✅ Customer created for sale test:', customer.name);

  // CREATE
  console.log('2. Testing CREATE sale...');
  const saleData = { ...generateSaleData(), customer_id: customer.id };
  let { data: createdSale, error: createError } = await supabase
    .from('vendas')
    .insert([saleData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating sale:', createError);
    // Clean up customer
    await supabase.from('customers').delete().eq('id', customer.id);
    return null;
  }
  console.log('✅ Sale created successfully:', createdSale.id);

  // READ
  console.log('3. Testing READ sale...');
  let { data: readSale, error: readError } = await supabase
    .from('vendas')
    .select('*')
    .eq('id', createdSale.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading sale:', readError);
    // Clean up
    await supabase.from('vendas').delete().eq('id', createdSale.id);
    await supabase.from('customers').delete().eq('id', customer.id);
    return null;
  }
  console.log('✅ Sale read successfully:', readSale.id);

  // UPDATE
  console.log('4. Testing UPDATE sale...');
  const updatedValue = generateRandomNumber(200, 1200);
  let { data: updatedSale, error: updateError } = await supabase
    .from('vendas')
    .update({ total_value: updatedValue })
    .eq('id', createdSale.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating sale:', updateError);
    // Clean up
    await supabase.from('vendas').delete().eq('id', createdSale.id);
    await supabase.from('customers').delete().eq('id', customer.id);
    return null;
  }
  console.log('✅ Sale updated successfully:', updatedSale.total_value);

  // DELETE
  console.log('5. Testing DELETE sale...');
  let { error: deleteError } = await supabase
    .from('vendas')
    .delete()
    .eq('id', createdSale.id);
  
  if (deleteError) {
    console.error('❌ Error deleting sale:', deleteError);
    // Clean up
    await supabase.from('customers').delete().eq('id', customer.id);
    return null;
  }
  console.log('✅ Sale deleted successfully');

  // Clean up customer
  let { error: customerDeleteError } = await supabase
    .from('customers')
    .delete()
    .eq('id', customer.id);
  
  if (customerDeleteError) {
    console.error('⚠️ Error deleting customer (cleanup):', customerDeleteError);
  } else {
    console.log('✅ Customer cleaned up successfully');
  }

  console.log('✅ Sales CRUD test completed successfully!');
  return true;
}

async function testCouponsCRUD() {
  console.log('\n--- Testing Coupons CRUD ---');
  
  // CREATE
  console.log('1. Testing CREATE coupon...');
  const couponData = generateCouponData();
  let { data: createdCoupon, error: createError } = await supabase
    .from('coupons')
    .insert([couponData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating coupon:', createError);
    return null;
  }
  console.log('✅ Coupon created successfully:', createdCoupon.code);

  // READ
  console.log('2. Testing READ coupon...');
  let { data: readCoupon, error: readError } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', createdCoupon.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading coupon:', readError);
    return null;
  }
  console.log('✅ Coupon read successfully:', readCoupon.code);

  // UPDATE
  console.log('3. Testing UPDATE coupon...');
  const updatedCode = generateRandomString('CUPOM_ATUALIZADO').toUpperCase();
  let { data: updatedCoupon, error: updateError } = await supabase
    .from('coupons')
    .update({ code: updatedCode })
    .eq('id', createdCoupon.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating coupon:', updateError);
    return null;
  }
  console.log('✅ Coupon updated successfully:', updatedCoupon.code);

  // DELETE
  console.log('4. Testing DELETE coupon...');
  let { error: deleteError } = await supabase
    .from('coupons')
    .delete()
    .eq('id', createdCoupon.id);
  
  if (deleteError) {
    console.error('❌ Error deleting coupon:', deleteError);
    return null;
  }
  console.log('✅ Coupon deleted successfully');

  console.log('✅ Coupons CRUD test completed successfully!');
  return true;
}

async function testSuppliersCRUD() {
  console.log('\n--- Testing Suppliers CRUD ---');
  
  // CREATE
  console.log('1. Testing CREATE supplier...');
  const supplierData = generateSupplierData();
  let { data: createdSupplier, error: createError } = await supabase
    .from('suppliers')
    .insert([supplierData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating supplier:', createError);
    return null;
  }
  console.log('✅ Supplier created successfully:', createdSupplier.name);

  // READ
  console.log('2. Testing READ supplier...');
  let { data: readSupplier, error: readError } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', createdSupplier.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading supplier:', readError);
    return null;
  }
  console.log('✅ Supplier read successfully:', readSupplier.name);

  // UPDATE
  console.log('3. Testing UPDATE supplier...');
  const updatedName = generateRandomString('Fornecedor Atualizado');
  let { data: updatedSupplier, error: updateError } = await supabase
    .from('suppliers')
    .update({ name: updatedName })
    .eq('id', createdSupplier.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating supplier:', updateError);
    return null;
  }
  console.log('✅ Supplier updated successfully:', updatedSupplier.name);

  // DELETE
  console.log('4. Testing DELETE supplier...');
  let { error: deleteError } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', createdSupplier.id);
  
  if (deleteError) {
    console.error('❌ Error deleting supplier:', deleteError);
    return null;
  }
  console.log('✅ Supplier deleted successfully');

  console.log('✅ Suppliers CRUD test completed successfully!');
  return true;
}

async function testPurchasesCRUD() {
  console.log('\n--- Testing Purchases CRUD ---');
  
  // First create a supplier for the purchase
  console.log('1. Creating supplier for purchase test...');
  const supplierData = generateSupplierData();
  let { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .insert([supplierData])
    .select()
    .single();
  
  if (supplierError) {
    console.error('❌ Error creating supplier for purchase test:', supplierError);
    return null;
  }
  console.log('✅ Supplier created for purchase test:', supplier.name);

  // CREATE
  console.log('2. Testing CREATE purchase...');
  const purchaseData = { ...generatePurchaseData(), supplier_id: supplier.id };
  let { data: createdPurchase, error: createError } = await supabase
    .from('purchases')
    .insert([purchaseData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating purchase:', createError);
    // Clean up supplier
    await supabase.from('suppliers').delete().eq('id', supplier.id);
    return null;
  }
  console.log('✅ Purchase created successfully:', createdPurchase.id);

  // READ
  console.log('3. Testing READ purchase...');
  let { data: readPurchase, error: readError } = await supabase
    .from('purchases')
    .select('*')
    .eq('id', createdPurchase.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading purchase:', readError);
    // Clean up
    await supabase.from('purchases').delete().eq('id', createdPurchase.id);
    await supabase.from('suppliers').delete().eq('id', supplier.id);
    return null;
  }
  console.log('✅ Purchase read successfully:', readPurchase.id);

  // UPDATE
  console.log('4. Testing UPDATE purchase...');
  const updatedValue = generateRandomNumber(600, 6000);
  let { data: updatedPurchase, error: updateError } = await supabase
    .from('purchases')
    .update({ value: updatedValue })
    .eq('id', createdPurchase.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating purchase:', updateError);
    // Clean up
    await supabase.from('purchases').delete().eq('id', createdPurchase.id);
    await supabase.from('suppliers').delete().eq('id', supplier.id);
    return null;
  }
  console.log('✅ Purchase updated successfully:', updatedPurchase.value);

  // DELETE
  console.log('5. Testing DELETE purchase...');
  let { error: deleteError } = await supabase
    .from('purchases')
    .delete()
    .eq('id', createdPurchase.id);
  
  if (deleteError) {
    console.error('❌ Error deleting purchase:', deleteError);
    // Clean up
    await supabase.from('suppliers').delete().eq('id', supplier.id);
    return null;
  }
  console.log('✅ Purchase deleted successfully');

  // Clean up supplier
  let { error: supplierDeleteError } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplier.id);
  
  if (supplierDeleteError) {
    console.error('⚠️ Error deleting supplier (cleanup):', supplierDeleteError);
  } else {
    console.log('✅ Supplier cleaned up successfully');
  }

  console.log('✅ Purchases CRUD test completed successfully!');
  return true;
}

async function testFixedExpensesCRUD() {
  console.log('\n--- Testing Fixed Expenses CRUD ---');
  
  // CREATE
  console.log('1. Testing CREATE fixed expense...');
  const expenseData = generateFixedExpenseData();
  let { data: createdExpense, error: createError } = await supabase
    .from('fixed_expenses')
    .insert([expenseData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating fixed expense:', createError);
    return null;
  }
  console.log('✅ Fixed expense created successfully:', createdExpense.description);

  // READ
  console.log('2. Testing READ fixed expense...');
  let { data: readExpense, error: readError } = await supabase
    .from('fixed_expenses')
    .select('*')
    .eq('id', createdExpense.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading fixed expense:', readError);
    return null;
  }
  console.log('✅ Fixed expense read successfully:', readExpense.name);

  // UPDATE
  console.log('3. Testing UPDATE fixed expense...');
  const updatedName = generateRandomString('Despesa Atualizada');
  let { data: updatedExpense, error: updateError } = await supabase
    .from('fixed_expenses')
    .update({ name: updatedName })
    .eq('id', createdExpense.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating fixed expense:', updateError);
    return null;
  }
  console.log('✅ Fixed expense updated successfully:', updatedExpense.description);

  // DELETE
  console.log('4. Testing DELETE fixed expense...');
  let { error: deleteError } = await supabase
    .from('fixed_expenses')
    .delete()
    .eq('id', createdExpense.id);
  
  if (deleteError) {
    console.error('❌ Error deleting fixed expense:', deleteError);
    return null;
  }
  console.log('✅ Fixed expense deleted successfully');

  console.log('✅ Fixed Expenses CRUD test completed successfully!');
  return true;
}

async function testMaterialsStockCRUD() {
  console.log('\n--- Testing Materials Stock CRUD ---');
  
  // CREATE
  console.log('1. Testing CREATE material...');
  const materialData = generateMaterialData();
  let { data: createdMaterial, error: createError } = await supabase
    .from('materials_stock')
    .insert([materialData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating material:', createError);
    return null;
  }
  console.log('✅ Material created successfully:', createdMaterial.name);

  // READ
  console.log('2. Testing READ material...');
  let { data: readMaterial, error: readError } = await supabase
    .from('materials_stock')
    .select('*')
    .eq('id', createdMaterial.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading material:', readError);
    return null;
  }
  console.log('✅ Material read successfully:', readMaterial.name);

  // UPDATE
  console.log('3. Testing UPDATE material...');
  const updatedName = generateRandomString('Material Atualizado');
  let { data: updatedMaterial, error: updateError } = await supabase
    .from('materials_stock')
    .update({ name: updatedName })
    .eq('id', createdMaterial.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating material:', updateError);
    return null;
  }
  console.log('✅ Material updated successfully:', updatedMaterial.name);

  // DELETE
  console.log('4. Testing DELETE material...');
  let { error: deleteError } = await supabase
    .from('materials_stock')
    .delete()
    .eq('id', createdMaterial.id);
  
  if (deleteError) {
    console.error('❌ Error deleting material:', deleteError);
    return null;
  }
  console.log('✅ Material deleted successfully');

  console.log('✅ Materials Stock CRUD test completed successfully!');
  return true;
}

async function testPaymentFeesCRUD() {
  console.log('\n--- Testing Payment Fees CRUD ---');
  
  // CREATE
  console.log('1. Testing CREATE payment fee...');
  const feeData = generatePaymentFeeData();
  let { data: createdFee, error: createError } = await supabase
    .from('payment_fees')
    .insert([feeData])
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating payment fee:', createError);
    return null;
  }
  console.log('✅ Payment fee created successfully:', createdFee.payment_method, createdFee.card_brand);

  // READ
  console.log('2. Testing READ payment fee...');
  let { data: readFee, error: readError } = await supabase
    .from('payment_fees')
    .select('*')
    .eq('id', createdFee.id)
    .single();
  
  if (readError) {
    console.error('❌ Error reading payment fee:', readError);
    return null;
  }
  console.log('✅ Payment fee read successfully:', readFee.payment_method, readFee.card_brand);

  // UPDATE
  console.log('3. Testing UPDATE payment fee...');
  const updatedFee = generateRandomNumber(3, 7);
  let { data: updatedFeeData, error: updateError } = await supabase
    .from('payment_fees')
    .update({ fee_percentage: updatedFee })
    .eq('id', createdFee.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating payment fee:', updateError);
    return null;
  }
  console.log('✅ Payment fee updated successfully:', updatedFeeData.fee_percentage);

  // DELETE
  console.log('4. Testing DELETE payment fee...');
  let { error: deleteError } = await supabase
    .from('payment_fees')
    .delete()
    .eq('id', createdFee.id);
  
  if (deleteError) {
    console.error('❌ Error deleting payment fee:', deleteError);
    return null;
  }
  console.log('✅ Payment fee deleted successfully');

  console.log('✅ Payment Fees CRUD test completed successfully!');
  return true;
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting comprehensive CRUD tests for all admin operations...\n');
  
  let allTestsPassed = true;
  
  // Test all CRUD operations
  const tests = [
    { name: 'Products', fn: testProductsCRUD },
    { name: 'Customers', fn: testCustomersCRUD },
    { name: 'Orders', fn: testOrdersCRUD },
    { name: 'Sales', fn: testSalesCRUD },
    { name: 'Coupons', fn: testCouponsCRUD },
    { name: 'Suppliers', fn: testSuppliersCRUD },
    { name: 'Purchases', fn: testPurchasesCRUD },
    { name: 'Fixed Expenses', fn: testFixedExpensesCRUD },
    { name: 'Materials Stock', fn: testMaterialsStockCRUD },
    { name: 'Payment Fees', fn: testPaymentFeesCRUD }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n📋 Running ${test.name} tests...`);
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name} CRUD test PASSED`);
      } else {
        console.log(`❌ ${test.name} CRUD test FAILED`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.error(`❌ ${test.name} CRUD test ERROR:`, error.message);
      allTestsPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 ALL CRUD TESTS PASSED! All admin operations are working correctly.');
  } else {
    console.log('⚠️ SOME CRUD TESTS FAILED! Please check the errors above.');
  }
  console.log('='.repeat(60));
  
  return allTestsPassed;
}

// Run the tests when the script is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Error running tests:', error);
      process.exit(1);
    });
}

export {
  runAllTests,
  testProductsCRUD,
  testCustomersCRUD,
  testOrdersCRUD,
  testSalesCRUD,
  testCouponsCRUD,
  testSuppliersCRUD,
  testPurchasesCRUD,
  testFixedExpensesCRUD,
  testMaterialsStockCRUD,
  testPaymentFeesCRUD
};