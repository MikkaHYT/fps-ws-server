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

    if (command === 'spawn') {
        const playerId = parts[1];
        const playerName = parts[2];
        const position = {
            x: parseFloat(parts[3]),
            y: parseFloat(parts[4]),
            z: parseFloat(parts[5]),
        };
        const rotation = {
            x: parseFloat(parts[6]),
            y: parseFloat(parts[7]),
            z: parseFloat(parts[8]),
        };

        console.log(`Spawning new player: ${playerName} (ID: ${playerId}) at position`, position, 'with rotation', rotation);
        // Handle player spawn logic here (e.g., notify other clients)
        broadcast(message, clientId);
    } else if (command === 'update') {
        const playerId = parts[1];
        const position = {
            x: parseFloat(parts[2]),
            y: parseFloat(parts[3]),
            z: parseFloat(parts[4]),
        };
        const rotation = {
            x: parseFloat(parts[5]),
            y: parseFloat(parts[6]),
            z: parseFloat(parts[7]),
        };

        console.log(`Updating player: ${playerId} to position`, position, 'with rotation', rotation);
        // Handle player update logic here (e.g., notify other clients)
        broadcast(message, clientId);
    } else {
        console.warn(`Unknown command: ${command}`);
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

// Generate 3 random numbers
function generateUniqueId() {
    return `${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 1000)}`;
}
