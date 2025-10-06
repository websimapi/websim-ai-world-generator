let conversationHistory = {};
let currentCharacter = null;
let currentWorldData = null;

export function showDialogue(character, worldData) {
    currentCharacter = character;
    currentWorldData = worldData;

    const dialogueBox = document.getElementById('dialogue-box');
    dialogueBox.style.display = 'block';

    document.getElementById('dialogue-name').textContent = character.name;
    document.getElementById('dialogue-avatar').src = `https://images.websim.com/avatar/${character.name}`;

    if (!conversationHistory[character.name]) {
        conversationHistory[character.name] = [];
        document.getElementById('dialogue-text').textContent = character.greeting;
    } else {
        document.getElementById('dialogue-text').textContent = '...';
    }

    const optionsHtml = `
        <button class="dialogue-option">Tell me about yourself</button>
        <button class="dialogue-option">What do you do here?</button>
        <button class="dialogue-option">Any advice for me?</button>
        <button class="dialogue-option" data-action="close">Goodbye</button>
    `;
    const optionsContainer = document.getElementById('dialogue-options');
    optionsContainer.innerHTML = optionsHtml;

    optionsContainer.querySelectorAll('.dialogue-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(e.target.dataset.action === 'close') {
                closeDialogue();
            } else {
                askCharacter(e.target.textContent);
            }
        });
    }); 

    document.addEventListener('keydown', handleEscKey);
}

async function askCharacter(question) {
    if (!currentCharacter) return;

    const dialogueText = document.getElementById('dialogue-text');
    dialogueText.textContent = '...';

    if (!conversationHistory[currentCharacter.name]) {
        conversationHistory[currentCharacter.name] = [];
    }

    conversationHistory[currentCharacter.name].push({ role: "user", content: question });

    try {
        const response = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are ${currentCharacter.name}, a ${currentCharacter.role} in ${currentWorldData.name}. 
Your personality: ${currentCharacter.personality}
Your backstory: ${currentCharacter.backstory}
Stay in character and respond as ${currentCharacter.name} would. Keep responses conversational and under 100 words.`
                },
                ...conversationHistory[currentCharacter.name].slice(-6)
            ]
        });

        const reply = response.content;
        conversationHistory[currentCharacter.name].push({ role: "assistant", content: reply });
        dialogueText.textContent = reply;

        try {
            const tts = await websim.textToSpeech({ text: reply, voice: "en-female" });
            const audio = new Audio(tts.url);
            audio.play();
        } catch (e) {
            console.log('TTS not available');
        }

    } catch (error) {
        console.error('Dialogue error:', error);
        dialogueText.textContent = "I seem to have lost my train of thought...";
    }
}

export function closeDialogue() {
    document.getElementById('dialogue-box').style.display = 'none';
    currentCharacter = null;
    document.removeEventListener('keydown', handleEscKey);
}

function handleEscKey(e) {
    if (e.key === 'Escape') {
        closeDialogue();
    }
}