import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Hook para alertar usuário sobre mudanças não salvas
 * @param {boolean} hasUnsavedChanges - Se há mudanças não salvas
 * @param {string} message - Mensagem customizada (opcional)
 * @returns {Object} - Objeto com função para confirmar navegação
 */
export function useUnsavedChanges(hasUnsavedChanges, message = 'Você tem alterações não salvas. Deseja realmente sair?') {
  const navigate = useNavigate()

  // Bloquear navegação do navegador (refresh, fechar aba, etc)
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = message
      return message
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges, message])

  // Função para navegar com confirmação se houver mudanças não salvas
  const navigateWithConfirmation = (path) => {
    if (!hasUnsavedChanges || window.confirm(message)) {
      navigate(path)
    }
  }

  return {
    navigateWithConfirmation,
    hasUnsavedChanges, // Retorna o estado para que o componente possa usar
  }
}
