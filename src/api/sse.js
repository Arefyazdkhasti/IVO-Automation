/**
 * Server-Sent Events (SSE) Broker
 * Manages active connected SSE clients and broadcasts real-time events.
 */

class SSEBroker {
    constructor() {
        this.clients = [];
    }

    addClient(req, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const clientId = Date.now();
        const client = { id: clientId, res };
        this.clients.push(client);

        req.on('close', () => {
            this.clients = this.clients.filter((c) => c.id !== clientId);
        });

        return client;
    }

    broadcast(eventType, data) {
        const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        this.clients.forEach((client) => {
            try {
                client.res.write(payload);
            } catch (e) {
                // Client disconnected
            }
        });
    }

    getClientCount() {
        return this.clients.length;
    }
}

const sseBroker = new SSEBroker();
module.exports = sseBroker;
