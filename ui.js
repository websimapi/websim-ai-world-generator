export function switchView(view) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${view}-view`).classList.add('active');

    if (view === 'explore') {
        document.getElementById('world-info').style.display = 'block';
    } else {
        document.getElementById('world-info').style.display = 'none';
    }
}

export function displayGeneratedWorld(worldData) {
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

    document.getElementById('world-preview').scrollIntoView({ behavior: 'smooth' });
}

export function displayWorlds(worlds) {
    const worldsGrid = document.getElementById('worlds-grid');
    if (!worlds || worlds.length === 0) {
        worldsGrid.innerHTML = '<p class="empty-state">No worlds yet. Create your first AI-generated world!</p>';
        return;
    }

    worldsGrid.innerHTML = worlds.slice().reverse().map(world => `
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

export function updateWorldInfoPanel(currentWorldData) {
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

export function showLoading(text) {
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('loading-text').textContent = text;
}

export function updateLoadingText(text) {
    document.getElementById('loading-text').textContent = text;
}

export function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

