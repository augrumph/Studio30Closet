const clients = new Set()

export function addRealtimeClient(res) {
    clients.add(res)

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, timestamp: Date.now() })}\n\n`)

    return () => {
        clients.delete(res)
    }
}

export function emitRealtimeEvent(type, payload = {}) {
    const event = {
        type,
        payload,
        timestamp: Date.now()
    }

    const message = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`

    for (const client of [...clients]) {
        try {
            client.write(message)
        } catch {
            clients.delete(client)
        }
    }
}
