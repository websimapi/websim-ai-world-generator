import { switchView, displayGeneratedWorld, displayWorlds, updateWorldInfoPanel, showLoading, hideLoading } from './ui.js';
import { generateWorldAndCharacters, saveWorld, getWorlds, getWorldById } from './api.js';
import { initGame, destroyGame, focusCharacterInGame } from './game.js';
import { showDialogue } from './dialogue.js';

// Initialize WebsimSocket
const room = new WebsimSocket();

// State
export const state = {
    currentWorld: null,
    currentWorldData: null,
    generatedWorldData: null,
    room: room
};

// View Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
        const view = e.currentTarget.dataset.view;
        switchView(view);
        
        if (view === 'worlds') {
            const worlds = await getWorlds();
            displayWorlds(worlds);
        } else if (view === 'explore' && state.currentWorld) {
            initGame(state.currentWorldData, (character) => {
                showDialogue(character, state.currentWorldData);
            });
            updateWorldInfoPanel(state.currentWorldData);
        } else {
            destroyGame();
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
        state.generatedWorldData = await generateWorldAndCharacters(prompt);
        displayGeneratedWorld(state.generatedWorldData);
    } catch (error) {
        console.error('World generation error:', error);
        alert('Error generating world. Please try again.');
    } finally {
        hideLoading();
    }
});

document.getElementById('regenerate-world').addEventListener('click', () => {
    document.getElementById('generate-world').click();
});

document.getElementById('save-world').addEventListener('click', async () => {
    if (!state.generatedWorldData) return;
    
    showLoading('Saving world...');
    
    try {
        const world = await saveWorld(state.generatedWorldData);
        
        state.currentWorld = world;
        state.currentWorldData = {
            ...state.generatedWorldData,
            characters: JSON.parse(world.characters) // Ensure characters are parsed
        };
        
        // Switch to explore view
        document.querySelector('[data-view="explore"]').click();
        
    } catch (error) {
        console.error('Save error:', error);
        alert('Error saving world.');
    } finally {
        hideLoading();
    }
});

// Load Worlds
window.loadWorld = async function(id) {
    const world = await getWorldById(id);
    
    if (!world) return;
    
    state.currentWorld = world;
    state.currentWorldData = {
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

window.focusCharacter = function(index) {
    focusCharacterInGame(index);
};

// Subscribe to world changes
room.collection('world').subscribe(async () => {
    if (document.getElementById('worlds-view').classList.contains('active')) {
        const worlds = await getWorlds();
        displayWorlds(worlds);
    }
});

// Initialize
(async () => {
    const worlds = await getWorlds();
    displayWorlds(worlds);
})();