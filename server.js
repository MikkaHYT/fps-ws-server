const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 25565 });

console.log('WebSocket server is running on ws://localhost:25565');

// Store connected clients and player data
const clients = new Map();
const players = new Map(); // Store player data: { clientId: { playerId, playerName, position, rotation } }

wss.on('connection', (ws) => {
    const clientId = generateUniqueId();
    clients.set(clientId, ws);

    console.log(`Client connected: ${clientId}`);

    // Send the list of currently connected players to the new client
    sendPlayersList(ws);

    // Handle incoming messages
    ws.on('message', (message) => {
        console.log(`Received message from ${clientId}: ${message}`);
        handleMessage(clientId, message);
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        clients.delete(clientId);
        players.delete(clientId);

        // Notify other clients about the disconnection
        broadcast(`disconnect|${clientId}`, clientId);
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

        // Store player data
        players.set(clientId, { playerId, playerName, position, rotation });

        console.log(`Spawning new player: ${playerName} (ID: ${playerId}) at position`, position, 'with rotation', rotation);

        // Broadcast the spawn message to all clients
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

        // Update player data
        if (players.has(clientId)) {
            players.get(clientId).position = position;
            players.get(clientId).rotation = rotation;
        }

        console.log(`Updating player: ${playerId} to position`, position, 'with rotation', rotation);

        // Broadcast the update message to all clients
        broadcast(message, clientId);
    } else {
        console.warn(`Unknown command: ${command}`);
    }
}

// Send the list of all currently connected players to a specific client
function sendPlayersList(ws) {
    const playerList = Array.from(players.values())
        .map(({ playerId, playerName, position, rotation }) =>
            `${playerId}|${playerName}|${position.x}|${position.y}|${position.z}|${rotation.x}|${rotation.y}|${rotation.z}`
        )
        .join('|');

    const message = `players|${players.size}|${playerList}`;
    ws.send(message);
}

// Broadcast a message to all clients except the sender
function broadcast(message, senderId) {
    clients.forEach((client, clientId) => {
        if (clientId !== senderId && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Generate a unique ID
function generateUniqueId() {
    return `${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 1000)}`;
}
