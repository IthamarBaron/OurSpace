const IP = 'ws://ENTER IP:8080';


const cooldownAmount = 10;//dont bother changing, this is validated by the server ;) this is just for your display
let cooldownTime = 0; 
const cooldownElement = document.getElementById('cooldown');

// Create a 25x30 grid dynamically
const grid = document.getElementById('grid');
const rows = 25;
const cols = 30;

for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = y;
        cell.dataset.col = x;

        // Log cell clicks to the console
        cell.addEventListener('click', () => {
            if (cooldownTime == 0) {
                console.log(`Clicked cell at row: ${y}, column: ${x}`);
            } else {
                // Add red glow to the cooldown box
                cooldownElement.classList.add('cooldown-warning');

                // Remove the red glow after a short delay
                setTimeout(() => {
                    cooldownElement.classList.remove('cooldown-warning');
                }, 500); // 500ms delay
            }
        });
        grid.appendChild(cell);
    }
}

// Handle color palette selection
const palette = document.getElementById('palette');
let selectedColor = null;

palette.addEventListener('click', (e) => {
    if (e.target.classList.contains('color')) {
        // Remove previous selection
        document.querySelectorAll('.color').forEach(button => button.classList.remove('selected'));

        // Mark the clicked color as selected
        e.target.classList.add('selected');
        selectedColor = e.target.dataset.color;

        console.log(`Selected color: ${selectedColor}`);
    }
});



// Function to update the cooldown timer
function updateCooldown() {
    if (cooldownTime > 0) {
        cooldownElement.textContent = `Next Pixel: ${cooldownTime} s`;
        cooldownTime--;
        cooldownElement.classList.remove('cooldown-ready'); // Remove green halo if not ready
    } else {
        cooldownElement.textContent = 'Next Pixel: Ready';
        cooldownElement.classList.add('cooldown-ready'); // Add green halo when ready
    }
}

// Start the cooldown timer
setInterval(updateCooldown, 1000);


// websocket stuff
const ws = new WebSocket(IP);
const playerName = localStorage.getItem('playerName'); // Retrieve the player's name

if (playerName) {
    // Notify the server about the player joining
    ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ type: 'join', name: playerName }));
        console.log(`Reconnected to the server as: ${playerName}`);
    });
}

// Update the player list dynamically
ws.addEventListener('message', (message) => {
    const data = JSON.parse(message.data);

    if (data.type === 'update') {
        const playerList = document.getElementById('player-list');
        playerList.innerHTML = ''; // Clear the list

        // Add each player to the list
        data.users.forEach((user) => {
            const listItem = document.createElement('li');
            listItem.textContent = user;
            playerList.appendChild(listItem);
        });
    }
});



// Handle clicks on the grid
grid.addEventListener('click', (e) => {

    if (cooldownTime == 0 )
    {
        cooldownTime = cooldownAmount;
        if (e.target.classList.contains('cell')) {
            const x = e.target.dataset.col;
            const y = e.target.dataset.row;
            const color = selectedColor || '#FFFFFF'; // Default to white if no color is selected
    
            // Send the pixel placement to the server
            ws.send(
                JSON.stringify({
                    type: 'pixelPlaced',
                    color,
                    x: parseInt(x),
                    y: parseInt(y),
                })
            );
    
            console.log(`Sent pixel placement: Color=${color}, X=${x}, Y=${y}`);
        }
    }

});

ws.addEventListener('message', (message) => {
    const data = JSON.parse(message.data);

    if (data.type === 'updatePixel') {
        const { x, y, color } = data;

        // Update the grid cell color
        const cell = document.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
        if (cell) {
            if (color === 'secret') {
                // Rainbow mode
                let hue = 0;
                if (cell.rainbowInterval) {
                    clearInterval(cell.rainbowInterval); // Clear any existing interval to avoid conflicts
                }
                cell.rainbowInterval = setInterval(() => {
                    cell.style.backgroundColor = `hsl(${hue}, 100%, 50%)`; // Cycle through HSL colors
                    hue = (hue + 10) % 360; // Increment hue and wrap around at 360
                }, 100); 
            } else {
                // Clear rainbow mode if any and set the specified color
                if (cell.rainbowInterval) {
                    clearInterval(cell.rainbowInterval);
                    delete cell.rainbowInterval;
                }
                cell.style.backgroundColor = color;
            }
        }
    }
});

ws.addEventListener('message', (message) => {
    const data = JSON.parse(message.data);

    if (data.type === 'canvasState') {
        const canvasData = data.canvas;

        // Populate the grid with the canvas data
        canvasData.forEach((row, y) => {
            row.forEach((color, x) => {
                const cell = document.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
                if (cell) {
                    cell.style.backgroundColor = color;
                }
            });
        });
    }
});
