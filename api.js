import { updateLoadingText } from './ui.js';
import { state } from './agent-builder.js';

export async function generateWorldAndCharacters(prompt) {
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

    const worldImage = await websim.imageGen({
        prompt: `${prompt}, game environment, isometric view, vibrant colors, atmospheric lighting`,
        aspect_ratio: "16:9"
    });

    return {
        ...worldData,
        userPrompt: prompt,
        characters: charactersData.characters,
        imageUrl: worldImage.url
    };
}

export async function saveWorld(worldData) {
    return state.room.collection('world').create({
        name: worldData.name,
        description: worldData.description,
        userPrompt: worldData.userPrompt,
        atmosphere: worldData.atmosphere,
        setting: worldData.setting,
        theme: worldData.theme,
        imageUrl: worldData.imageUrl,
        characters: JSON.stringify(worldData.characters)
    });
}

export async function getWorlds() {
    return state.room.collection('world').getList();
}

export async function getWorldById(id) {
    const worlds = await getWorlds();
    return worlds.find(w => w.id === id);
}