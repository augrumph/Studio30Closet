// Size sorting utility (PP, P, M, G, GG, U)
const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'U']

export function sortSizes(sizes) {
    if (!sizes || !Array.isArray(sizes)) return []
    return [...sizes].sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(String(a).toUpperCase())
        const indexB = SIZE_ORDER.indexOf(String(b).toUpperCase())

        // Se não encontrar o tamanho no array de ordem, joga para o final
        const priorityA = indexA === -1 ? 999 : indexA
        const priorityB = indexB === -1 ? 999 : indexB

        return priorityA - priorityB
    })
}
