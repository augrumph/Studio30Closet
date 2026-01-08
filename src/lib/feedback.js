/**
 * Sistema de Feedback Universal
 * Funciona em iOS, Android e Desktop
 * 
 * Combina múltiplas formas de feedback para melhor UX
 */

/**
 * Tenta vibrar o dispositivo (funciona apenas em Android)
 * Silently fails em iOS e outros dispositivos sem suporte
 */
export function triggerHaptic(pattern = [15]) {
    try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern)
        }
    } catch (e) {
        // Silently fail - vibration not supported
    }
}

/**
 * Feedback visual: adiciona classe de animação temporária a um elemento
 * @param {HTMLElement} element - Elemento para animar
 * @param {string} animationClass - Classe CSS de animação
 * @param {number} duration - Duração em ms
 */
export function triggerVisualFeedback(element, animationClass = 'animate-feedback-pulse', duration = 300) {
    if (!element) return

    element.classList.add(animationClass)
    setTimeout(() => {
        element.classList.remove(animationClass)
    }, duration)
}

/**
 * Feedback completo: combina visual + haptic
 * @param {object} options
 * @param {HTMLElement} options.element - Elemento para animar (opcional)
 * @param {string} options.type - Tipo: 'success', 'error', 'tap'
 */
export function triggerFeedback({ element = null, type = 'tap' } = {}) {
    // Padrões de vibração por tipo
    const hapticPatterns = {
        success: [15, 50, 15], // vibra-pausa-vibra
        error: [50, 30, 50],   // mais intenso
        tap: [10],              // sutil
        remove: [10]            // sutil
    }

    // Tenta vibrar (Android only)
    triggerHaptic(hapticPatterns[type] || [10])

    // Feedback visual se elemento fornecido
    if (element) {
        triggerVisualFeedback(element, 'animate-feedback-pulse', 300)
    }
}

/**
 * Efeito de "shake" para erros
 */
export function triggerShake(element) {
    if (!element) return

    element.classList.add('animate-shake')
    setTimeout(() => {
        element.classList.remove('animate-shake')
    }, 500)
}

/**
 * Efeito de "bounce" para sucesso
 */
export function triggerBounce(element) {
    if (!element) return

    element.classList.add('animate-bounce-once')
    setTimeout(() => {
        element.classList.remove('animate-bounce-once')
    }, 400)
}
