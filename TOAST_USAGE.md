# 🎨 Toast Notifications - Guia de Uso

Implementação usando **Sonner** - a biblioteca de toasts mais moderna e bonita do React.

## ✨ Características

- 🎯 **Posição**: Canto superior direito (top-right)
- 📱 **Mobile Otimizado**: Responsivo e adaptável
- 🎨 **Design Moderno**: Animações suaves e cores vibrantes
- ♿ **Acessível**: Suporte completo a leitores de tela
- 🔘 **Botão de Fechar**: Sempre visível
- 🌈 **Rich Colors**: Cores automáticas baseadas no tipo

## 📖 Como Usar

### Básico

```jsx
import { useToast } from '@/contexts/ToastContext'

function MyComponent() {
  const toast = useToast()

  const handleClick = () => {
    // Sucesso
    toast.success('Produto salvo com sucesso!')

    // Erro
    toast.error('Erro ao salvar produto')

    // Aviso
    toast.warning('Atenção: estoque baixo')

    // Info
    toast.info('Dados atualizados')
  }

  return <button onClick={handleClick}>Testar Toast</button>
}
```

### Com Duração Customizada

```jsx
// Padrão: success=4s, error=5s, warning=4s, info=4s
toast.success('Mensagem rápida', { duration: 2000 })
toast.error('Erro importante', { duration: 10000 })
```

### Loading State

```jsx
const handleSave = async () => {
  const toastId = toast.loading('Salvando produto...')

  try {
    await saveProduct()
    toast.success('Produto salvo!', { id: toastId }) // Substitui o loading
  } catch (error) {
    toast.error('Erro ao salvar', { id: toastId })
  }
}
```

### Promise Toast (Automático)

```jsx
toast.promise(
  saveProduct(),
  {
    loading: 'Salvando produto...',
    success: 'Produto salvo com sucesso!',
    error: 'Erro ao salvar produto'
  }
)
```

### Toast com Ação

```jsx
toast.success('Arquivo deletado', {
  action: {
    label: 'Desfazer',
    onClick: () => console.log('Desfazer')
  }
})
```

### Toast com Descrição

```jsx
toast.success('Venda criada', {
  description: 'Cliente: Maria Silva - R$ 299,90'
})
```

### Dismissing Toasts

```jsx
// Fechar toast específico
const id = toast.success('Mensagem')
toast.dismiss(id)

// Fechar todos
toast.dismiss()
```

## 🎨 Exemplos Práticos

### Salvar Produto

```jsx
const handleSave = async (data) => {
  toast.promise(
    createProduct(data),
    {
      loading: 'Criando produto...',
      success: (product) => `${product.name} criado com sucesso!`,
      error: (err) => `Erro: ${err.message}`
    }
  )
}
```

### Delete com Confirmação

```jsx
const handleDelete = (id) => {
  toast.warning('Produto será deletado em 5 segundos', {
    duration: 5000,
    action: {
      label: 'Cancelar',
      onClick: () => toast.dismiss()
    }
  })

  setTimeout(() => deleteProduct(id), 5000)
}
```

### Upload de Arquivo

```jsx
const handleUpload = async (file) => {
  const toastId = toast.loading('Fazendo upload...')

  try {
    const url = await uploadFile(file)
    toast.success('Upload concluído!', {
      id: toastId,
      description: url
    })
  } catch (error) {
    toast.error('Erro no upload', {
      id: toastId,
      description: error.message
    })
  }
}
```

## 🎯 Melhores Práticas

1. **Seja Específico**: Use mensagens claras
   - ❌ "Erro"
   - ✅ "Erro ao salvar produto: nome é obrigatório"

2. **Use Promise Toast**: Para operações assíncronas
   - Menos código, melhor UX

3. **Duração Apropriada**:
   - Sucesso: 3-4 segundos
   - Erro: 5-8 segundos (usuário precisa ler)
   - Loading: Sem duração (manual)

4. **Evite Spam**: Um toast por ação
   - Não mostre múltiplos toasts simultâneos

5. **Ações Reversíveis**: Use botão de ação
   - "Desfazer", "Ver detalhes", etc.

## 🚀 Migração do Toast Antigo

Código antigo **continua funcionando**! A API é 100% compatível:

```jsx
// Antes (ainda funciona)
toast.success('Mensagem', 5000)

// Agora (recomendado)
toast.success('Mensagem', { duration: 5000 })
```

## 📱 Mobile

Os toasts são **automaticamente otimizados** para mobile:
- Largura adaptável
- Posição ajustada
- Touch-friendly
- Safe area inset (notch do iPhone)

## 🎨 Customização

Os toasts usam as cores do tema Studio30:
- **Botão de ação**: #C75D3B (cor primária)
- **Fundo**: Branco com sombra
- **Borda**: Cor baseada no tipo (success, error, etc.)

---

**Documentação oficial**: https://sonner.emilkowal.ski/
