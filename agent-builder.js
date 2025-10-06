import * as THREE from 'three';

// Initialize WebsimSocket
const room = new WebsimSocket();

// State
let currentWorld = null;
let currentWorldData = null;
let generatedWorldData = null;
let scene, camera, renderer, player, controls;
let characterMeshes = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedCharacter = null;
let conversationHistory = {};

// View Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');
        
        if (view === 'worlds') {
            loadWorlds();
        } else if (view === 'explore' && currentWorld) {
            document.getElementById('world-info').style.display = 'block';
            initGame();
        } else {
            document.getElementById('world-info').style.display = 'none';
        }
    });
});

// Generate World
document.getElementById('generate-world').addEventListener('click', async () => {
    const prompt = document.getElementById('world-prompt').value.trim();
    if (!prompt) {
        alert('Please describe your world first!');
        return;
    }
    
    showLoading('Generating world...');
    
    try {
        // Generate world details with AI
        const worldGeneration = await websim.chat.completions.create({
            messages: [{
                role: "system",
                content: `You are a creative game world designer. Generate a rich, immersive game world based on the user's description. 
Respond with JSON following this schema:
{
  name: string,
  description: string (2-3 sentences),
  atmosphere: string,
  setting: string,
  theme: string
}`
            }, {
                role: "user",
                content: prompt
            }],
            json: true
        });
        
        const worldData = JSON.parse(worldGeneration.content);
        
        updateLoadingText('Generating characters...');
        
        // Generate 3-5 characters for the world
        const charactersGeneration = await websim.chat.completions.create({
            messages: [{
                role: "system",
                content: `You are a character creator for game worlds. Generate 3-5 unique, interesting characters that would inhabit this world.
Each character should have a distinct personality, role, and backstory that fits the world's theme.
Respond with JSON following this schema:
{
  characters: [
    {
      name: string,
      role: string (their job/purpose),
      personality: string (2-3 traits),
      backstory: string (2 sentences),
      greeting: string (what they say when first meeting the player)
    }
  ]
}`
            }, {
                role: "user",
                content: `World: ${worldData.name}\nDescription: ${worldData.description}\nTheme: ${worldData.theme}`
            }],
            json: true
        });
        
        const charactersData = JSON.parse(charactersGeneration.content);
        
        updateLoadingText('Generating world image...');
        
        // Generate world image
        const worldImage = await websim.imageGen({
            prompt: `${prompt}, game environment, isometric view, vibrant colors, atmospheric lighting`,
            aspect_ratio: "16:9"
        });
        
        generatedWorldData = {
            ...worldData,
            userPrompt: prompt,
            characters: charactersData.characters,
            imageUrl: worldImage.url
        };
        
        displayGeneratedWorld(generatedWorldData);
        hideLoading();
        
    } catch (error) {
        console.error('World generation error:', error);
        hideLoading();
        alert('Error generating world. Please try again.');
    }
});

function displayGeneratedWorld(worldData) {
    document.getElementById('world-preview').style.display = 'block';
    
    const infoHtml = `
        <h4>${worldData.name}</h4>
        <p style="margin: 12px 0;">${worldData.description}</p>
        <p style="font-size: 12px; color: #888;">
            <strong>Atmosphere:</strong> ${worldData.atmosphere}<br>
            <strong>Setting:</strong> ${worldData.setting}<br>
            <strong>Theme:</strong> ${worldData.theme}
        </p>
    `;
    
    document.getElementById('generated-world-info').innerHTML = infoHtml;
    
    const charactersHtml = worldData.characters.map(char => `
        <div class="character-card">
            <h4>${char.name}</h4>
            <p><strong>${char.role}</strong></p>
            <p style="margin-top: 8px;">${char.backstory}</p>
            <p style="margin-top: 8px; font-size: 11px; color: #666;">
                Personality: ${char.personality}
            </p>
        </div>
    `).join('');
    
    document.getElementById('generated-characters').innerHTML = charactersHtml;
    
    // Scroll to preview
    document.getElementById('world-preview').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('regenerate-world').addEventListener('click', () => {
    document.getElementById('generate-world').click();
});

document.getElementById('save-world').addEventListener('click', async () => {
    if (!generatedWorldData) return;
    
    showLoading('Saving world...');
    
    try {
        const world = await room.collection('world').create({
            name: generatedWorldData.name,
            description: generatedWorldData.description,
            userPrompt: generatedWorldData.userPrompt,
            atmosphere: generatedWorldData.atmosphere,
            setting: generatedWorldData.setting,
            theme: generatedWorldData.theme,
            imageUrl: generatedWorldData.imageUrl,
            characters: JSON.stringify(generatedWorldData.characters)
        });
        
        currentWorld = world;
        currentWorldData = generatedWorldData;
        
        hideLoading();
        
        // Switch to explore view
        document.querySelector('[data-view="explore"]').click();
        
    } catch (error) {
        console.error('Save error:', error);
        hideLoading();
        alert('Error saving world.');
    }
});

// Load Worlds
async function loadWorlds() {
    const worldsGrid = document.getElementById('worlds-grid');
    const worlds = room.collection('world').getList();
    
    if (worlds.length === 0) {
        worldsGrid.innerHTML = '<p class="empty-state">No worlds yet. Create your first AI-generated world!</p>';
        return;
    }
    
    worldsGrid.innerHTML = worlds.reverse().map(world => `
        <div class="world-card" onclick="loadWorld('${world.id}')">
            <img src="${world.imageUrl}" alt="${world.name}" class="world-card-image" onerror="this.style.display='none'">
            <div class="world-card-content">
                <h3>${world.name}</h3>
                <p>${world.description}</p>
                <div class="world-card-meta">
                    By ${world.username} • ${new Date(world.created_at).toLocaleDateString()}
                </div>
            </div>
        </div>
    `).join('');
}

window.loadWorld = async function(id) {
    const worlds = room.collection('world').getList();
    const world = worlds.find(w => w.id === id);
    
    if (!world) return;
    
    currentWorld = world;
    currentWorldData = {
        name: world.name,
        description: world.description,
        atmosphere: world.atmosphere,
        setting: world.setting,
        theme: world.theme,
        imageUrl: world.imageUrl,
        characters: JSON.parse(world.characters)
    };
    
    document.querySelector('[data-view="explore"]').click();
};

// Initialize 3D Game
function initGame() {
    if (scene) {
        // Clean up existing scene
        const canvas = document.querySelector('#game-canvas canvas');
        if (canvas) canvas.remove();
    }
    
    const container = document.getElementById('game-canvas');
    
    // Setup scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 100);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 3, 10);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Player
    const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 1.5, 0);
    player.castShadow = true;
    scene.add(player);
    
    // Create characters in world
    characterMeshes = [];
    if (currentWorldData && currentWorldData.characters) {
        currentWorldData.characters.forEach((char, i) => {
            const angle = (i / currentWorldData.characters.length) * Math.PI * 2;
            const radius = 8;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const charGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
            const charMaterial = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color().setHSL(i / currentWorldData.characters.length, 0.8, 0.6)
            });
            const charMesh = new THREE.Mesh(charGeometry, charMaterial);
            charMesh.position.set(x, 1, z);
            charMesh.castShadow = true;
            charMesh.userData = char;
            scene.add(charMesh);
            characterMeshes.push(charMesh);
            
            // Add name label (sprite)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, 256, 64);
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 24px Space Mono';
            ctx.textAlign = 'center';
            ctx.fillText(char.name, 128, 40);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(2, 0.5, 1);
            sprite.position.y = 2;
            charMesh.add(sprite);
        });
    }
    
    // Update world info panel
    updateWorldInfoPanel();
    
    // Controls
    controls = {
        forward: false,
        backward: false,
        left: false,
        right: false
    };
    
    document.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case 'w': controls.forward = true; break;
            case 's': controls.backward = true; break;
            case 'a': controls.left = true; break;
            case 'd': controls.right = true; break;
            case 'escape': 
                document.getElementById('dialogue-box').style.display = 'none';
                selectedCharacter = null;
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        switch(e.key.toLowerCase()) {
            case 'w': controls.forward = false; break;
            case 's': controls.backward = false; break;
            case 'a': controls.left = false; break;
            case 'd': controls.right = false; break;
        }
    });
    
    // Click to interact
    renderer.domElement.addEventListener('click', onCanvasClick);
    
    animate();
}

function updateWorldInfoPanel() {
    if (!currentWorldData) return;
    
    document.getElementById('world-details').innerHTML = `
        <p style="margin-bottom: 8px;"><strong>${currentWorldData.name}</strong></p>
        <p style="font-size: 11px;">${currentWorldData.description}</p>
    `;
    
    const charListHtml = currentWorldData.characters.map((char, i) => `
        <div class="character-item" onclick="focusCharacter(${i})">
            <div class="character-name">${char.name}</div>
            <div class="character-role">${char.role}</div>
        </div>
    `).join('');
    
    document.getElementById('character-list').innerHTML = charListHtml;
}

window.focusCharacter = function(index) {
    if (characterMeshes[index]) {
        selectedCharacter = characterMeshes[index];
        showDialogue(selectedCharacter.userData);
    }
};

function onCanvasClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(characterMeshes);
    
    if (intersects.length > 0) {
        selectedCharacter = intersects[0].object;
        showDialogue(selectedCharacter.userData);
    }
}

async function showDialogue(character) {
    const dialogueBox = document.getElementById('dialogue-box');
    dialogueBox.style.display = 'block';
    
    document.getElementById('dialogue-name').textContent = character.name;
    document.getElementById('dialogue-avatar').src = `https://images.websim.com/avatar/${character.name}`;
    
    // Initialize conversation history for this character
    if (!conversationHistory[character.name]) {
        conversationHistory[character.name] = [];
        document.getElementById('dialogue-text').textContent = character.greeting;
    } else {
        document.getElementById('dialogue-text').textContent = '...';
    }
    
    // Generate dialogue options
    const optionsHtml = `
        <button class="dialogue-option" onclick="askCharacter('Tell me about yourself')">Tell me about yourself</button>
        <button class="dialogue-option" onclick="askCharacter('What do you do here?')">What do you do here?</button>
        <button class="dialogue-option" onclick="askCharacter('Any advice for me?')">Any advice for me?</button>
        <button class="dialogue-option" onclick="closeDialogue()">Goodbye</button>
    `;
    
    document.getElementById('dialogue-options').innerHTML = optionsHtml;
}

window.askCharacter = async function(question) {
    if (!selectedCharacter) return;
    
    const character = selectedCharacter.userData;
    const dialogueText = document.getElementById('dialogue-text');
    
    dialogueText.textContent = '...';
    
    if (!conversationHistory[character.name]) {
        conversationHistory[character.name] = [];
    }
    
    conversationHistory[character.name].push({
        role: "user",
        content: question
    });
    
    try {
        const response = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are ${character.name}, a ${character.role} in ${currentWorldData.name}. 
Your personality: ${character.personality}
Your backstory: ${character.backstory}

Stay in character and respond as ${character.name} would. Keep responses conversational and under 100 words.`
                },
                ...conversationHistory[character.name].slice(-6)
            ]
        });
        
        const reply = response.content;
        conversationHistory[character.name].push({
            role: "assistant",
            content: reply
        });
        
        dialogueText.textContent = reply;
        
        // Optional TTS
        try {
            const tts = await websim.textToSpeech({
                text: reply,
                voice: "en-female"
            });
            const audio = new Audio(tts.url);
            audio.play();
        } catch (e) {
            console.log('TTS not available');
        }
        
    } catch (error) {
        console.error('Dialogue error:', error);
        dialogueText.textContent = "I seem to have lost my train of thought...";
    }
};

window.closeDialogue = function() {
    document.getElementById('dialogue-box').style.display = 'none';
    selectedCharacter = null;
};

function animate() {
    requestAnimationFrame(animate);
    
    if (player && controls) {
        const speed = 0.1;
        
        if (controls.forward) {
            player.position.z -= speed;
        }
        if (controls.backward) {
            player.position.z += speed;
        }
        if (controls.left) {
            player.position.x -= speed;
        }
        if (controls.right) {
            player.position.x += speed;
        }
        
        // Camera follows player
        camera.position.x = player.position.x;
        camera.position.z = player.position.z + 10;
        camera.lookAt(player.position);
        
        // Make characters face player
        characterMeshes.forEach(char => {
            char.lookAt(player.position);
        });
    }
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (camera && renderer) {
        const container = document.getElementById('game-canvas');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
});

// Loading helpers
function showLoading(text) {
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('loading-text').textContent = text;
}

function updateLoadingText(text) {
    document.getElementById('loading-text').textContent = text;
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// Subscribe to world changes
room.collection('world').subscribe(() => {
    if (document.getElementById('worlds-view').classList.contains('active')) {
        loadWorlds();
    }
});

// Initialize
loadWorlds();