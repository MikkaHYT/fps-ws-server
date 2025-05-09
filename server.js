const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 25565 });

console.log('WebSocket server is running on ws://localhost:25565');

// Store connected clients and player data
const clients = new Map();
const players = new Map(); // Store player data: { clientId: { playerId, playerName, position, rotation } }
var playerIdCounter = 0; // Counter for generating unique player IDs

// Debug mode: 0 = off, 1 = on
const debugMode = 1;

// Spawn a permanent debug player if debug mode is enabled
if (debugMode === 1) {
    const debugClientId = "debug_player";
    const debugPlayer = {
        playerId: "debug1",
        playerName: "DebugPlayer",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
    };

    players.set(debugClientId, debugPlayer);

    console.log("Debug mode enabled. Spawned a permanent debug player:");
    console.log(debugPlayer);
}

wss.on('connection', (ws) => {
    const clientId = generateUniqueId();
    clients.set(clientId, ws);

    console.log(`Client connected: ${clientId}`);

    // Send the list of currently connected players to the new client
    console.log("Sending players list to new client...");
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

        // Check if the client exists in the players map before deleting
        if (players.has(clientId)) {
            const playerId = players.get(clientId).playerId;
            players.delete(clientId);

            // Notify other clients about the disconnection
            broadcast(`disconnect|${playerId}`);
        } else {
            console.warn(`Client ${clientId} was not found in players map during disconnection.`);
        }
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
    } else if (command === 'disconnect') {
        const clientId = parts[1];

        if (clients.has(clientId)) {
            console.log(`Handling disconnect for client: ${clientId}`);
            clients.get(clientId).close(); // Close the WebSocket connection
            clients.delete(clientId);
            players.delete(clientId);

            // Notify other clients about the disconnection
            broadcast(`disconnect|${clientId}`, clientId);
        } else {
            console.warn(`Client ${clientId} not found for disconnect command`);
        }
    } else if (command === 'update_username') {
        const clientId = parts[1];
        const newUsername = parts[2];

        if (clients.has(clientId)) {
            console.log(`Handling username update for client: ${clientId}`);

            // Update the player's username
            if (players.has(clientId)) {
                players.get(clientId).playerName = newUsername;
                console.log(`Updated username for client ${clientId} to ${newUsername}`);
                // Update the player's username in the players map
                players.set(clientId, {
                    ...players.get(clientId),
                    playerName: newUsername
                });
                console.log('Updated players map:', Array.from(players.entries()));
            } else {
                console.warn(`Player data not found for client ${clientId}`);
            }

            // Notify other clients about the username update
            broadcast(`update_username|${clientId}|${newUsername}`);
        } else {
            broadcast(`update_username|${clientId}|${newUsername}`);
        }
    } else if (command === 'shoot') {
        const playerId = parts[1];
        const posX = parseFloat(parts[2]);
        const posY = parseFloat(parts[3]);
        const posZ = parseFloat(parts[4]);
        const rotX = parseFloat(parts[5]);
        const rotY = parseFloat(parts[6]);
        const rotZ = parseFloat(parts[7]);
        const rotW = parseFloat(parts[8]);

        console.log(`Player ${playerId} fired a shot from position (${posX}, ${posY}, ${posZ}) with rotation (${rotX}, ${rotY}, ${rotZ}, ${rotW})`);

        // Broadcast the shoot event to all clients
        const shootMessage = `shoot|${playerId}|${posX}|${posY}|${posZ}|${rotX}|${rotY}|${rotZ}|${rotW}`;
        broadcast(shootMessage, clientId);
    } else if (command === 'hit') {
        const shooterId = parts[1];
        const targetId = parts[2];

        console.log(`Player ${shooterId} hit player ${targetId}`);

        // Notify all clients about the hit event
        const hitMessage = `hit|${shooterId}|${targetId}`;
        broadcast(hitMessage, clientId);
    } else if (command === 'heartbeat') {
        // Handle heartbeat message
        console.log(`Heartbeat received from client ${clientId}`);
        // Optionally, you can send a heartbeat response back to the client
        clients.get(clientId)?.send(`heartbeat`);
    } else if (command === 'death') {
        const playerId = parts[1];
        const killerId = parts[2];

        console.log(`Player ${playerId} was killed by player ${killerId}`);

        // Notify all clients about the death event
        const deathMessage = `death|${playerId}|${killerId}`;
        broadcast(deathMessage, clientId);
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

    ws.send(`playerId|${playerIdCounter}`);
    const message = `players|${players.size}|${playerList}`;
    ws.send(message);
    console.log(`Sent players list to new client: ${message}`);
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
    // Increment the counter for each new ID
    playerIdCounter = playerIdCounter + 1;
    return `${playerIdCounter}`; // Increment the counter for each new ID
}