// Utilidades para manipulação de imagens

/**
 * Converte um arquivo de imagem para base64
 * @param {File} file - Arquivo de imagem
 * @returns {Promise<string>} - String base64 da imagem
 */
export async function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

/**
 * Comprime uma imagem usando Canvas API
 * @param {string} base64String - Imagem em base64
 * @param {number} maxWidth - Largura máxima (default: 800px)
 * @param {number} quality - Qualidade JPEG 0-1 (default: 0.8)
 * @returns {Promise<string>} - Imagem comprimida em base64
 */
export async function compressImage(base64String, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            // Calcular dimensões mantendo aspect ratio
            let width = img.width
            let height = img.height

            if (width > maxWidth) {
                const ratio = maxWidth / width
                width = maxWidth
                height = height * ratio
            }

            canvas.width = width
            canvas.height = height

            // Desenhar imagem redimensionada
            ctx.drawImage(img, 0, 0, width, height)

            // Converter para base64 com compressão
            canvas.toBlob(
                (blob) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result)
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                },
                'image/jpeg',
                quality
            )
        }

        img.onerror = reject
        img.src = base64String
    })
}

/**
 * Valida o tamanho de um arquivo de imagem
 * @param {File} file - Arquivo de imagem
 * @param {number} maxSizeMB - Tamanho máximo em MB (default: 2)
 * @returns {boolean} - true se válido, false se não
 */
export function validateImageSize(file, maxSizeMB = 2) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    return file.size <= maxSizeBytes
}

/**
 * Valida o tipo de um arquivo de imagem
 * @param {File} file - Arquivo de imagem
 * @returns {boolean} - true se válido, false se não
 */
export function validateImageType(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return validTypes.includes(file.type)
}

/**
 * Gera um thumbnail de uma imagem
 * @param {string} base64String - Imagem em base64
 * @param {number} size - Tamanho do thumbnail (default: 150px)
 * @returns {Promise<string>} - Thumbnail em base64
 */
export async function generateThumbnail(base64String, size = 150) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            // Thumbnail quadrado
            canvas.width = size
            canvas.height = size

            // Calcular crop para manter aspecto
            const aspectRatio = img.width / img.height
            let sx, sy, sWidth, sHeight

            if (aspectRatio > 1) {
                // Paisagem
                sWidth = img.height
                sHeight = img.height
                sx = (img.width - sWidth) / 2
                sy = 0
            } else {
                // Retrato
                sWidth = img.width
                sHeight = img.width
                sx = 0
                sy = (img.height - sHeight) / 2
            }

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size)

            canvas.toBlob(
                (blob) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result)
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                },
                'image/jpeg',
                0.9
            )
        }

        img.onerror = reject
        img.src = base64String
    })
}

/**
 * Processa um arquivo de imagem: valida, comprime e converte para base64
 * @param {File} file - Arquivo de imagem
 * @param {Object} options - Opções de processamento
 * @returns {Promise<{base64: string, thumbnail: string, error: string|null}>}
 */
export async function processImage(file, options = {}) {
    const {
        maxSizeMB = 2,
        maxWidth = 800,
        quality = 0.8,
        generateThumb = false
    } = options

    try {
        // Validar tipo
        if (!validateImageType(file)) {
            return {
                base64: null,
                thumbnail: null,
                error: 'Tipo de arquivo inválido. Use JPG, PNG ou WEBP.'
            }
        }

        // Validar tamanho
        if (!validateImageSize(file, maxSizeMB)) {
            return {
                base64: null,
                thumbnail: null,
                error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB.`
            }
        }

        // Converter para base64
        let base64 = await convertImageToBase64(file)

        // Comprimir se necessário
        const fileSizeKB = file.size / 1024
        if (fileSizeKB > 500) {
            base64 = await compressImage(base64, maxWidth, quality)
        }

        // Gerar thumbnail se solicitado
        let thumbnail = null
        if (generateThumb) {
            thumbnail = await generateThumbnail(base64)
        }

        return {
            base64,
            thumbnail,
            error: null
        }
    } catch (error) {
        console.error('Erro ao processar imagem:', error)
        return {
            base64: null,
            thumbnail: null,
            error: 'Erro ao processar imagem. Tente novamente.'
        }
    }
}
