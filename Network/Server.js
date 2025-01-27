const WebSocket = require('ws');

const idToNameMap = new Map(); // Maps ws.name (ID) to user names
const IP = 'Enter ServerIP'; 
const PORT = 8080; 
const ipCooldownMap = new Map(); // Tracks cooldowns for each IP
var cID = 0;
const cooldownSeconds = 10; // Cooldown in seconds
const lastPixelPlacement = new Map(); // Tracks last placement timestamps per client
let numbername = 1;
const canvas = Array(25) // rows
    .fill(null)
    .map(() => Array(30).fill('#FFFFFF')); // Adjust columns and default color

// Create the WebSocket server
const wss = new WebSocket.Server({ host: IP, port: PORT }, () => {
    console.log(`WebSocket server is running on ws://${IP}:${PORT}`);
});
let users = []; // List of connected players

const connectionCount = new Map(); // Tracks connection counts per IP
const maxConnectionsPerIP = 5;

// Handle WebSocket connections
wss.on('connection', (ws) => {
    const clientIp = ws._socket.remoteAddress;
    const currentConnections = connectionCount.get(clientIp) || 0;

    // Limit connections per IP
    if (currentConnections >= maxConnectionsPerIP) {
        ws.close(1000, "Too many connections from your IP.");
        console.log(`Connection from IP ${clientIp} rejected: Too many connections.`);
        return;
    }

    // Increment the connection count for this IP
    connectionCount.set(clientIp, currentConnections + 1);
    console.log(`A new client connected from IP ${clientIp}. Current connections: ${connectionCount.get(clientIp)}`);

    const messageRateLimit = 5; // Max 5 messages per second
const messageTimestamps = new Map(); // Tracks the last message timestamp for each client

ws.on('message', (message) => {
    const now = Date.now();
    const lastMessageTime = messageTimestamps.get(ws.name) || 0;

    // Check the rate limit
    if (now - lastMessageTime < 1000 / messageRateLimit) {
        console.log(`Message rate limit exceeded for client ID: ${ws.name}`);
        return; // Drop excessive messages
    }

    // Update the timestamp for this client
    messageTimestamps.set(ws.name, now);

    // Process the message
    try {
        const data = JSON.parse(message);

        if (data.type === 'join') {
            handleJoin(ws, data); // Call handleJoin for "join" messages
        } else if (data.type === 'pixelPlaced') {
            handlePixelPlaced(ws, data); // Call handlePixelPlaced for pixel updates
        } else {
            console.log('Unknown message type:', data.type);
        }
    } catch (err) {
        console.error('Error parsing message:', err);
    }
});


    // Handle client disconnections
    ws.on('close', () => {
        console.log(`Client disconnected from IP ${clientIp}.`);
        
        // Decrement the connection count for this IP
        const updatedConnections = connectionCount.get(clientIp) - 1;
        if (updatedConnections <= 0) {
            connectionCount.delete(clientIp); // Clean up if no connections remain
        } else {
            connectionCount.set(clientIp, updatedConnections);
        }

        handleDisconnect(ws); // Handle player disconnection
    });
});

function handleJoin(ws, data) {
    let name = data.name;

    // Ensure the name is not too long; otherwise, replace it
    if (name.length > 10) {
        name = "stupid" + numbername;
        numbername += 1;
    }

    // Ensure the name is unique in the users list
    if (users.includes(name)) {
        name = name + numbername;
        numbername += 1;
    }

    // Push the final unique name to the users list
    users.push(name);

    // Associate the WebSocket connection with a unique ID (for security)
    ws.name = "" + cID; // Use cID as a unique identifier
    idToNameMap.set(ws.name, name); // Map the ws.name (ID) to the actual name
    cID++;

    console.log(`${name} joined the game`);

    // Send the full canvas state to the new client
    ws.send(JSON.stringify({ type: 'canvasState', canvas }));

    // Broadcast the updated player list to all clients
    broadcast({
        type: 'update',
        users,
    });
}



// Function to handle pixel placement
function handlePixelPlaced(ws, data) {
    const { color, x, y } = data;
    
    console.log(`${ws.name} attempted to placed a pixel at (${x}, ${y}) with color ${color}`);
    if (!(x >= 0 && x < 30 && y >= 0 && y < 25))
    {
        console.log("PIXEL IS OUT OF BOUND!")
        return;
    }

    const now = Date.now();
    const clientIp = ws._socket.remoteAddress; // Get the client's IP address

    // Check if the player has a valid name
    if (!ws.name) {
        ws.send(JSON.stringify({ type: 'error', message: 'Player not recognized' }));
        return;
    }

    // Check IP-based cooldown
    const lastIpPlacement = ipCooldownMap.get(clientIp) || 0;

    if (now - lastIpPlacement < cooldownSeconds * 1000) {
        ws.send(
            JSON.stringify({
                type: 'error',
                message: `Cooldown active. Please wait ${Math.ceil(
                    (cooldownSeconds * 1000 - (now - lastIpPlacement)) / 1000
                )} seconds.`,
            })
        );
        return;
    }

    // Update the last placement time for the IP
    ipCooldownMap.set(clientIp, now);

    // Update the canvas state
    canvas[y][x] = color;

    // Broadcast the pixel update
    broadcast({
        type: 'updatePixel',
        color,
        x,
        y,
    });

    console.log(`${ws.name} placed a pixel at (${x}, ${y}) with color ${color}`);
}


// Function to handle player disconnect
function handleDisconnect(ws) {
    if (ws.name) {
        const name = idToNameMap.get(ws.name); // Get the actual name using ws.name (ID)

        if (name) {
            console.log(`${name} (ID: ${ws.name}) disconnected`);

            // Remove the player from the list
            users = users.filter((user) => user !== name);

            // Remove the name from the mapping
            idToNameMap.delete(ws.name);

            // Broadcast the updated player list to all clients
            broadcast({
                type: 'update',
                users,
            });
        } else {
            console.log(`Unknown ID ${ws.name} attempted to disconnect.`);
        }
    }
}

// Function to broadcast a message to all clients
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}
