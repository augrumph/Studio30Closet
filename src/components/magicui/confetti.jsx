import confetti from "canvas-confetti"

export const triggerConfetti = (options = {}) => {
  console.log('🎉 Disparando confetti!', options)
  const defaults = {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#C75D3B', '#4A3B32', '#E8C4B0', '#FDF0ED'],
    zIndex: 9999999, // Garante que apareça na frente de tudo
  }

  const result = confetti({
    ...defaults,
    ...options,
  })
  console.log('✅ Confetti retornou:', result)
  return result
}

export const triggerSideConfetti = () => {
  const end = Date.now() + 2 * 1000
  const colors = ['#C75D3B', '#4A3B32', '#E8C4B0']

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

export const triggerFireworks = () => {
  console.log('🎆 Disparando fogos de artifício!')
  const duration = 3 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999999 }

  const randomInRange = (min, max) => Math.random() * (max - min) + min

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#C75D3B', '#4A3B32', '#E8C4B0'],
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#C75D3B', '#4A3B32', '#E8C4B0'],
    })
  }, 250)
}

// Expor funções globalmente para debug (apenas em desenvolvimento)
if (typeof window !== 'undefined') {
  window.testConfetti = () => {
    console.log('🧪 Teste manual de confetti disparado!')
    triggerConfetti({ particleCount: 200, spread: 120 })
  }
  window.testFireworks = () => {
    console.log('🧪 Teste manual de fogos disparado!')
    triggerFireworks()
  }
}
