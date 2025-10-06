import * as THREE from 'three';

let scene, camera, renderer, player, controls;
let characterMeshes = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let onCharacterClickCallback = null;
let animationFrameId = null;

export function initGame(worldData, onCharacterClick) {
    destroyGame(); // Clean up previous instance if any

    onCharacterClickCallback = onCharacterClick;
    const container = document.getElementById('game-canvas');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 100);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 3, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 1.5, 0);
    player.castShadow = true;
    scene.add(player);

    characterMeshes = [];
    if (worldData && worldData.characters) {
        worldData.characters.forEach((char, i) => {
            const angle = (i / worldData.characters.length) * Math.PI * 2;
            const radius = 8;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const charGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
            const charMaterial = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color().setHSL(i / worldData.characters.length, 0.8, 0.6)
            });
            const charMesh = new THREE.Mesh(charGeometry, charMaterial);
            charMesh.position.set(x, 1, z);
            charMesh.castShadow = true;
            charMesh.userData = char;
            scene.add(charMesh);
            characterMeshes.push(charMesh);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 256; canvas.height = 64;
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

    controls = { forward: false, backward: false, left: false, right: false };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('click', onCanvasClick);
    window.addEventListener('resize', onWindowResize);

    animate();
}

export function destroyGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onWindowResize);

    const canvas = document.querySelector('#game-canvas canvas');
    if (canvas) canvas.remove();

    scene = null;
    camera = null;
    renderer = null;
    player = null;
    controls = null;
    characterMeshes = [];
}

function onKeyDown(e) {
    if (!controls) return;
    switch(e.key.toLowerCase()) {
        case 'w': controls.forward = true; break;
        case 's': controls.backward = true; break;
        case 'a': controls.left = true; break;
        case 'd': controls.right = true; break;
    }
}

function onKeyUp(e) {
    if (!controls) return;
    switch(e.key.toLowerCase()) {
        case 'w': controls.forward = false; break;
        case 's': controls.backward = false; break;
        case 'a': controls.left = false; break;
        case 'd': controls.right = false; break;
    }
}

function onCanvasClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(characterMeshes);

    if (intersects.length > 0 && onCharacterClickCallback) {
        onCharacterClickCallback(intersects[0].object.userData);
    }
}

function onWindowResize() {
    if (camera && renderer) {
        const container = document.getElementById('game-canvas');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

export function focusCharacterInGame(index) {
    if (characterMeshes[index] && onCharacterClickCallback) {
        onCharacterClickCallback(characterMeshes[index].userData);
    }
};

function animate() {
    animationFrameId = requestAnimationFrame(animate);

    if (player && controls && camera) {
        const speed = 0.1;
        if (controls.forward) player.position.z -= speed;
        if (controls.backward) player.position.z += speed;
        if (controls.left) player.position.x -= speed;
        if (controls.right) player.position.x += speed;

        camera.position.x = player.position.x;
        camera.position.z = player.position.z + 10;
        camera.lookAt(player.position);

        characterMeshes.forEach(char => {
            char.lookAt(player.position);
        });
    }

    if(renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}