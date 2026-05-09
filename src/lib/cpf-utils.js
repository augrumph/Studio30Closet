export function onlyCpfDigits(value = '') {
    return String(value).replace(/\D/g, '').slice(0, 11)
}

export function formatCpf(value = '') {
    const digits = onlyCpfDigits(value)

    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function isValidCpf(value = '') {
    const cpf = onlyCpfDigits(value)

    if (cpf.length !== 11) return false
    if (/^(\d)\1{10}$/.test(cpf)) return false

    const calculateDigit = (base) => {
        let sum = 0
        for (let i = 0; i < base.length; i++) {
            sum += Number(base[i]) * (base.length + 1 - i)
        }
        const remainder = (sum * 10) % 11
        return remainder === 10 ? 0 : remainder
    }

    const firstDigit = calculateDigit(cpf.slice(0, 9))
    const secondDigit = calculateDigit(cpf.slice(0, 10))

    return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10])
}
