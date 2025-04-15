// Set up the canvas and game context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const jumpSound = new Audio('JumpSoundEffect.mp3'); // Jump sound effect

canvas.width = 800;
canvas.height = 600;

// Players attributes 
let player = {
    x: 100,  // Starting X & Y position
    y: 500,
    width: 50,  // Player width
    height: 50,  // Player height
    speed: 5,  // Movement speed
    dx: 0,  // Horizontal movement
    dy: 0,  // Vertical movement
    gravity: 0.8,  // Gravity that effects player
    jumpPower: -12,  // Jumping power
    isJumping: false,  // Check to see if player is jumping
    grounded: false  // Check to see if player is grounded
};

// Platforms in the game
let platforms = [
    { x: 0, y: canvas.height - 40, width: canvas.width, height: 40 }, // Ground platform
    { x: 200, y: 530, width: 200, height: 20 }, // Floating platform
    { x: 500, y: 500, width: 200, height: 20 } // Another floating platform
];

// Game score and high score
let score = 0;
let highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0;

// Camera to follow the player
let camera = {
    x: 0,
    y: 0
};

// Inputs
let keys = {
    right: false,
    left: false,
    up: false
};

// Game over pop elements
const popup = document.getElementById('popup');
const finalScoreText = document.getElementById('finalScore');
const refreshButton = document.getElementById('refreshButton');

// Variables for the player trail effect
let trail = [];
const trailLength = 20;

// Event listeners for key presses
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowUp') {
        keys.up = true;
        if (!player.isJumping) { // Play jump sound only when not already jumping
            jumpSound.pause();
            jumpSound.currentTime = 0;
            jumpSound.play();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowUp') keys.up = false;
});

// Check if new platform overlaps with existing platforms
function checkOverlap(newPlatform) {
    for (let platform of platforms) {
        if (newPlatform.x < platform.x + platform.width &&
            newPlatform.x + newPlatform.width > platform.x &&
            newPlatform.y < platform.y + platform.height &&
            newPlatform.y + newPlatform.height > platform.y) {
            return true;
        }
    }
    return false;
}

// Show game over popup
function showGameOverPopup() {
    finalScoreText.textContent = score;
    popup.style.display = 'flex'; // Display the popup
    if (score > highScore) {  // Update high score if necessary
        highScore = score;
        localStorage.setItem('highScore', highScore); // Save new high score to localStorage
    }
}

// Refresh the game
refreshButton.addEventListener('click', () => {
    window.location.reload(); // Refresh the page
});

// Decide if a platform should move based on score
function shouldPlatformMove() {
    let probability = Math.min(0.2 + score / 1000, 0.5); // Increase chance of moving platform as score increases
    return Math.random() < probability;  // Random chance based on score
}

// Player Inputs
function update() {
    if (keys.right) player.dx = player.speed;  // Move player right
    if (keys.left) player.dx = -player.speed;  // Move player left
    if (!keys.right && !keys.left) player.dx = 0;  // No movement if no keys pressed

    if (!player.grounded) player.dy += player.gravity;  // Apply gravity if player is not grounded

    if (keys.up && !player.isJumping) {  // Jump button
        player.dy = player.jumpPower;
        player.isJumping = true;
    }

    player.x += player.dx;  // Move player horizontally
    player.y += player.dy;  // Move player vertically

    player.grounded = false;  // Player is not grounded initially

    // Add current player position to the trail array
    trail.push({ x: player.x, y: player.y });

    // Limit the trail length
    if (trail.length > trailLength) {
        trail.shift(); // Remove the oldest position if the trail is too long
    }

    // Check for collisions with platforms
    platforms.forEach(platform => {
        // If platform moves side-to-side
        if (platform.moving) {
            platform.x += platform.moveSpeed * platform.direction;
            if (platform.x < platform.originalX - platform.amplitude || platform.x > platform.originalX + platform.amplitude) {
                platform.direction *= -1;  // Change direction when platform reaches boundaries
            }
        }

        // Check if the player lands on a platform
        if (player.y + player.height <= platform.y && player.y + player.height + player.dy >= platform.y &&
            player.x + player.width > platform.x && player.x < platform.x + platform.width) {
            player.dy = 0;  // Stop vertical movement
            player.isJumping = false;
            player.y = platform.y - player.height;  // Place player on top of platform
            player.grounded = true;

            if (!platform.landed) {
                score++;  // Increase score
                platform.landed = true;
            }
        }
    });

    // Player misses a platform
    if (player.y + player.height > canvas.height) {
        showGameOverPopup();  // Show game over popup
        player.dy = 0;
        player.y = canvas.height;
        return;  // Stop the game update loop
    }

    // Camera code to follo player
    camera.x = player.x - canvas.width / 2;
    if (camera.x < 0) camera.x = 0;  // Camera to stay in frame

    // Preload new platforms ahead
    const platformsInView = platforms.filter(platform => platform.x > player.x);
    while (platformsInView.length < 2) {
        let lastPlatform = platforms[platforms.length - 1];
        let newPlatformX = lastPlatform.x + Math.random() * (350 - 250) + 250;
        let yOffset = Math.random() * (60 - 25) + 25;
        let direction = Math.random() > 0.5 ? 1 : -1;
        let newPlatformY = lastPlatform.y + direction * yOffset;

        if (newPlatformY < 20) newPlatformY = 20;
        if (newPlatformY > canvas.height - 40 - 20) newPlatformY = canvas.height - 40 - 20;

        let newPlatform = { x: newPlatformX, y: newPlatformY, width: 200, height: 20, landed: false };

        // Moving platforms
        if (shouldPlatformMove()) {
            newPlatform.moving = true;
            newPlatform.moveSpeed = Math.random() * 0.6 + 0.2;  // Side to side movement speed
            newPlatform.amplitude = 80;  // Horizontal range for movement
            newPlatform.originalX = newPlatformX;
            newPlatform.direction = Math.random() > 0.5 ? 1 : -1;
        }

        if (!checkOverlap(newPlatform)) platforms.push(newPlatform);
        platformsInView.push(newPlatform);
    }

    // Draw everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear canvas

    // Player trail effect
    trail.forEach((position, index) => {
        const fadeFactor = index / trail.length;
        const color = `rgb(${Math.round((1 - fadeFactor) * 138)}, ${Math.round((1 - fadeFactor) * 138)}, ${Math.round((1 - fadeFactor) * 138)})`;
        ctx.fillStyle = color;  // Set the color based on fade
        ctx.fillRect(position.x - camera.x, position.y, player.width, player.height);
    });

    // Player
    ctx.fillStyle = 'black';
    ctx.fillRect(player.x - camera.x, player.y, player.width, player.height);

    // Platforms
    ctx.fillStyle = 'brown';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x - camera.x, platform.y, platform.width, platform.height);
    });

    // Ground
    if (player.y >= canvas.height - 40) {
        ctx.fillStyle = 'brown';
        ctx.fillRect(-camera.x, canvas.height - 40, canvas.width + camera.x, 40);
    }

    // Draw score and high score
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 20, 30);
    ctx.fillText('High Score: ' + highScore, canvas.width - 160, 30);

    requestAnimationFrame(update);
}

// Fetch leaderboard data and display it
window.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
      .then(response => response.json())
      .then(data => {
        const leaderboard = document.getElementById('leaderboard');
        data.forEach(entry => {
          const row = document.createElement('div');
          row.classList.add('leaderboard-entry');
          row.textContent = `${entry.rank}. ${entry.username} - ${entry.score} pts`;
          leaderboard.appendChild(row);
        });
      })
      .catch(error => {
        console.error('Error loading data:', error);
      });

    update();  // Start the game loop
});
