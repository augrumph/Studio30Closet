// Script para testar finalização de malinha e envio de email
import fetch from 'node-fetch'

const API_URL = 'http://localhost:3001'

async function testCheckout() {
    console.log('🧪 Iniciando teste de finalização de malinha...\n')

    try {
        // 1. Buscar um produto para adicionar à malinha
        console.log('📦 Buscando produtos disponíveis...')
        const productsRes = await fetch(`${API_URL}/api/products?page=1&pageSize=5`)
        const productsData = await productsRes.json()

        if (!productsData.products || productsData.products.length === 0) {
            console.log('❌ Nenhum produto encontrado no sistema')
            return
        }

        const product = productsData.products[0]
        console.log(`✅ Produto encontrado: ${product.name}\n`)

        // 2. Criar pedido (malinha)
        console.log('🛍️ Criando malinha de teste...')
        const orderData = {
            customer: {
                name: 'Cliente Teste Email',
                email: 'teste@example.com',
                phone: '41999999999',
                cpf: '12345678900',
                birth_date: '1990-01-01',
                addresses: [{
                    zipCode: '80000-000',
                    street: 'Rua Teste',
                    number: '123',
                    neighborhood: 'Centro',
                    complement: 'Apto 1',
                    city: 'Curitiba',
                    state: 'PR'
                }]
            },
            items: [
                {
                    productId: product.id,
                    quantity: 2,
                    selectedSize: 'M',
                    selectedColor: product.variants?.[0]?.colorName || 'Padrão',
                    price: product.price || 0
                }
            ],
            status: 'pending',
            totalValue: (product.price || 0) * 2
        }

        console.log('📋 Dados do pedido:')
        console.log('   Cliente:', orderData.customer.name)
        console.log('   Email:', orderData.customer.email)
        console.log('   Produto:', product.name)
        console.log('   Quantidade:', orderData.items[0].quantity)
        console.log('   Total: R$', orderData.totalValue.toFixed(2))
        console.log('\n📤 Enviando pedido para API...\n')

        const orderRes = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        })

        if (!orderRes.ok) {
            const error = await orderRes.text()
            console.log('❌ Erro ao criar pedido:', error)
            return
        }

        const orderResult = await orderRes.json()
        console.log('✅ Pedido criado com sucesso!')
        console.log('   Order ID:', orderResult.order.id)
        console.log('\n📧 IMPORTANTE: O email será enviado pelo FRONTEND, não pelo backend.')
        console.log('   Para testar o email, você precisa:')
        console.log('   1. Acessar http://localhost:5173')
        console.log('   2. Adicionar produtos à malinha')
        console.log('   3. Finalizar o checkout pelo site')
        console.log('   4. Abrir o Console (F12) e verificar os logs do EmailJS')
        console.log('\n⚠️ O EmailJS só funciona no navegador, não via Node.js\n')

    } catch (error) {
        console.error('❌ Erro no teste:', error.message)
    }
}

testCheckout()
