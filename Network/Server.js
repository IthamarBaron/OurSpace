const WebSocket = require('ws');

const IP = 'ENTER IP'; 
const PORT = 8080; 

const cooldownSeconds = 9; // Cooldown in seconds
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

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('A new client connected');

    // Handle incoming messages
    ws.on('message', (message) => {
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
        handleDisconnect(ws); // Handle player disconnection
    });
});

// Function to handle player join
function handleJoin(ws, data) {
    let name = data.name;


    if (users.includes(name)) {
        name+= ""+numbername;
        numbername+=1;
    }

    users.push(name);
    // Associate the WebSocket connection with the player's name
    ws.name = name;

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

    const now = Date.now();
    // Check if the player has a valid name
    if (!ws.name) {
        ws.send(JSON.stringify({ type: 'error', message: 'Player not recognized' }));
        return;
    }
    // Check the last placement time for this player
    const lastPlacement = lastPixelPlacement.get(ws.name) || 0;


    if (now - lastPlacement < cooldownSeconds * 1000) {
        // Reject if within cooldown period
        ws.send(
            JSON.stringify({
                type: 'error',
                message: `Cooldown active. Please wait ${Math.ceil(
                    (cooldownSeconds * 1000 - (now - lastPlacement)) / 1000
                )} seconds.`,
            })
        );
        return;
    }

    // Update the last placement time
    lastPixelPlacement.set(ws.name, now);

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
        console.log(`${ws.name} disconnected`);

        // Remove the player from the list
        users = users.filter((user) => user !== ws.name);

        // Broadcast the updated player list to all clients
        broadcast({
            type: 'update',
            users,
        });
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

