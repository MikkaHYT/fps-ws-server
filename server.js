const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 25565 });

console.log('WebSocket server is running on ws://localhost:8080');

// Store connected clients
const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = generateUniqueId();
    clients.set(clientId, ws);

    console.log(`Client connected: ${clientId}`);

    // Handle incoming messages
    ws.on('message', (message) => {
        console.log(`Received message from ${clientId}: ${message}`);
        handleMessage(clientId, message);
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        clients.delete(clientId);
    });
});

// Handle incoming messages
function handleMessage(clientId, message) {
    const parts = message.toString().split('|'); // Ensure message is a string
    const command = parts[0];

    if (command === 'update') {
        // Broadcast player position and rotation to all other clients
        broadcast(message, clientId);
    } else if (command === 'shoot') {
        // Notify all other clients about the shooting event
        broadcast(message, clientId);
    }
}

// Broadcast a message to all clients except the sender
function broadcast(message, senderId) {
    clients.forEach((client, clientId) => {
        if (clientId !== senderId && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Generate a unique ID for each client
function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}
