
# Our Place

Our Place is a collaborative pixel art web application inspired by R/Place. Users join a shared canvas, pick a color, and place pixels on a grid. A cooldown period ensures fair collaboration.

---

## Features

- **Real-Time Collaboration**: Updates to the canvas are broadcast to all connected users instantly.
- **Customizable Colors**: Users choose from a color palette to place pixels.
- **Cooldown Mechanism**: Users wait briefly before placing the next pixel.
- **Dynamic Player List**: Displays a live list of connected players.

---

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with WebSocket for real-time updates

---

## How to Use

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/IthamarBaron/OurSpace/tree/main
   cd our-place
   
2. **Install Dependencies**:
   ```bash
   npm install ws
   
3. **Run the Server**:
   ```bash
   node Server.js
The server will run on ws://localhost:8080 by default.

**4. Access the Application:**

Open welcomePage.html in your browser, enter your name, and start placing pixels.

---

## How It Works

- **Welcome Page**: Users enter their name to join the game. Duplicate names are adjusted for uniqueness.
- **Pixel Placement**: Users pick a color and place pixels on the grid. A cooldown prevents spamming.
- **Real-Time Updates**: WebSockets ensure everyone sees the latest canvas updates instantly.

## Acknowledgments

Inspired by R/Place and built to have some fun with Node.js and web development in jeneral.
