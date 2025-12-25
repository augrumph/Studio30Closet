/**
 * IndexedDB Cache for Products
 * Armazena produtos localmente para acesso rápido
 */

const DB_NAME = 'studio30_closet'
const DB_VERSION = 1
const STORE_NAME = 'products'
const CACHE_KEY = 'products_cache'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 horas em ms

let db = null

// Inicializar banco de dados
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
            db = request.result
            resolve(db)
        }

        request.onupgradeneeded = (event) => {
            const database = event.target.result
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
    })
}

// Salvar produtos no cache
export async function cacheProducts(products) {
    try {
        if (!db) await initDB()

        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)

        // Limpar e adicionar novos
        await new Promise((resolve, reject) => {
            store.clear().onsuccess = () => {
                products.forEach(product => {
                    store.add({ ...product, cachedAt: Date.now() })
                })
                transaction.oncomplete = resolve
                transaction.onerror = reject
            }
        })

        console.log('💾 Produtos cacheados localmente:', products.length)
    } catch (error) {
        console.warn('⚠️ Erro ao cachear produtos:', error)
    }
}

// Recuperar produtos do cache
export async function getCachedProducts() {
    try {
        if (!db) await initDB()

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.getAll()

            request.onsuccess = () => {
                const products = request.result
                // Verificar expiração
                if (products.length > 0) {
                    const cachedAt = products[0].cachedAt
                    const isExpired = Date.now() - cachedAt > CACHE_EXPIRY

                    if (!isExpired) {
                        console.log('⚡ Produtos carregados do cache local:', products.length)
                        resolve(products)
                        return
                    }
                }
                resolve(null)
            }
            request.onerror = () => resolve(null)
        })
    } catch (error) {
        console.warn('⚠️ Erro ao recuperar cache:', error)
        return null
    }
}

// Limpar cache
export async function clearProductCache() {
    try {
        if (!db) await initDB()

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.clear()

            request.onsuccess = () => {
                console.log('🗑️ Cache de produtos limpo')
                resolve()
            }
            request.onerror = reject
        })
    } catch (error) {
        console.warn('⚠️ Erro ao limpar cache:', error)
    }
}

// Inicializar DB automaticamente
initDB().catch(() => console.warn('IndexedDB não disponível'))
