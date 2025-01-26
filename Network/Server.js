const WebSocket = require('ws');

const IP = 'Enter IP'; 
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

    if(name.length >10)
    {
        name = "stupid" + numbername;
        numbername+=1;
    }

    if (users.includes(name)) {
        name+= ""+numbername;
        numbername+=1;
    }

    users.push(name);
    // Associate the WebSocket connection with the player's name
    ws.name = ""+cID;
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
    if (!(x >= 0 && x < cols && y >= 0 && y < rows))
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
