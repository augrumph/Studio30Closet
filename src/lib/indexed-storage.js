
// Zustand Wrapper for IndexedDB
// Needed because localStorage has a 5MB limit which causes QuotaExceededError

const DB_NAME = 'AdminStoreDB'
const STORE_NAME = 'admin-store'
const DB_VERSION = 1

export const indexedDBStorage = {
    getItem: async (name) => {
        // console.log(`💾 [IndexedDB] Reading ${name}...`)
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION)

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME)
                }
            }

            request.onsuccess = (event) => {
                const db = event.target.result
                const transaction = db.transaction(STORE_NAME, 'readonly')
                const store = transaction.objectStore(STORE_NAME)
                const getRequest = store.get(name)

                getRequest.onsuccess = () => {
                    resolve(getRequest.result || null)
                }

                getRequest.onerror = () => {
                    console.error('Error reading from IndexedDB')
                    resolve(null)
                }
            }

            request.onerror = () => {
                console.error('Error opening IndexedDB')
                resolve(null)
            }
        })
    },

    setItem: async (name, value) => {
        // console.log(`💾 [IndexedDB] Writing ${name}...`)
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION)

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME)
                }
            }

            request.onsuccess = (event) => {
                const db = event.target.result
                const transaction = db.transaction(STORE_NAME, 'readwrite')
                const store = transaction.objectStore(STORE_NAME)

                try {
                    const putRequest = store.put(value, name)
                    putRequest.onsuccess = () => resolve()
                    putRequest.onerror = () => resolve()
                } catch (err) {
                    console.error("IndexedDB Save Error:", err)
                    resolve()
                }
            }
        })
    },

    removeItem: async (name) => {
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION)
            request.onsuccess = (event) => {
                const db = event.target.result
                const transaction = db.transaction(STORE_NAME, 'readwrite')
                const store = transaction.objectStore(STORE_NAME)
                const deleteRequest = store.delete(name)
                deleteRequest.onsuccess = () => resolve()
            }
        })
    }
}
