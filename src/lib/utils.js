// Format malinha items for WhatsApp
export function formatMalinhaMessage(items, customerData) {
    const totalValue = items.reduce((sum, item) => sum + item.price, 0)
    const message = `🦋 *STUDIO 30 CLOSET - Pedido de Malinha*

Cliente: *${customerData.name}*
Telefone: ${customerData.phone}

Peças selecionadas:
${items.map((item, index) => `${index + 1}. ${item.name} - R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')}

Valor total: *R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })*

Aguardo confirmação do envio da malinha! 💕`
    return encodeURIComponent(message)
}

// Format price
export function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRS',
        minimumFractionDigits: 2
    }).format(price)
}

// Format currency
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(value)
}

// Format percentage
export function formatPercentage(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100)
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Class name utility
export function cn(...classes) {
    return classes.filter(Boolean).join(' ')
}