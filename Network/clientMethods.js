const IP = 'ws://ENTER IP:8080';
// Handle the form submission
const joinForm = document.getElementById('joinForm');
const ws = new WebSocket(IP); // Connect to the WebSocket server

joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const playerName = document.getElementById('playerName').value;

    if (playerName) {
        // Save the player's name in localStorage
        localStorage.setItem('playerName', playerName);

        // Send the player's name to the server
        ws.send(JSON.stringify({ type: 'join', name: playerName }));
        console.log(`Sent player name to server: ${playerName}`);

        // Redirect to the game page
        window.location.href = '../Place/place.html';
    }
});

ws.addEventListener('message', (message) => {
    const data = JSON.parse(message.data);

    if (data.type === 'error') {
        // Display the error message
        console.warn(data.message);

        // Optionally, show it in the UI
        const cooldownElement = document.getElementById('cooldown');
        cooldownElement.textContent = data.message;
        cooldownElement.classList.add('cooldown-warning');

        setTimeout(() => {
            cooldownElement.classList.remove('cooldown-warning');
        }, 3000); // Remove warning after 3 seconds
    }

});
