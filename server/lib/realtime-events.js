const clients = new Set()
let eventSequence = 0

// Ring buffer: keep last 200 events for Last-Event-ID replay on reconnect
const EVENT_BUFFER_SIZE = 200
const eventBuffer = []

function bufferEvent(event) {
    eventBuffer.push(event)
    if (eventBuffer.length > EVENT_BUFFER_SIZE) {
        eventBuffer.shift()
    }
}

export function addRealtimeClient(res, lastEventId) {
    clients.add(res)

    // Replay missed events if client sent Last-Event-ID
    const lastId = lastEventId ? parseInt(lastEventId, 10) : null
    if (lastId && !isNaN(lastId)) {
        const missed = eventBuffer.filter(e => e.id > lastId)
        for (const event of missed) {
            try {
                res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
            } catch {
                // client already gone
            }
        }
    }

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, clients: clients.size, timestamp: Date.now(), lastEventId: eventSequence })}\n\n`)

    return () => {
        clients.delete(res)
    }
}

export function emitRealtimeEvent(type, payload = {}) {
    eventSequence += 1
    const event = {
        id: eventSequence,
        type,
        payload,
        timestamp: Date.now()
    }

    bufferEvent(event)

    const specificMessage = `id: ${event.id}\nevent: ${type}\ndata: ${JSON.stringify(event)}\n\n`
    const genericMessage = `id: ${event.id}\nevent: admin.changed\ndata: ${JSON.stringify(event)}\n\n`

    for (const client of [...clients]) {
        try {
            client.write(specificMessage)
            if (type !== 'admin.changed') {
                client.write(genericMessage)
            }
        } catch {
            clients.delete(client)
        }
    }
}

export function getRealtimeStats() {
    return {
        clients: clients.size,
        lastEventId: eventSequence
    }
}
