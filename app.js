// --- Initialisation ---
const video = document.getElementById('video');
const hls = new Hls();
let currentM3uData = null; // Stocke toute la liste parsée

window.onload = () => {
    loadProfiles();
};

// --- Navigation ---
function setActiveScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    // Stop video si on quitte le lecteur
    if (id !== 'player-screen' && video.src) {
        video.pause();
    }
}

// --- Gestion des Profils ---
function loadProfiles() {
    const list = document.getElementById('profile-list');
    const profiles = JSON.parse(localStorage.getItem('kpro_profiles') || '[]');
    list.innerHTML = profiles.map((p, i) => `
        <div class="profile-item">
            <div>
                <strong>${p.name}</strong><br>
                <span style="font-size:0.7rem; color:#aaa">${p.url.substring(0, 30)}...</span>
            </div>
            <div>
                <button class="btn btn-primary" onclick="loginProfile(${i})">Se Connecter</button>
                <button class="btn" style="background:#ff5252" onclick="deleteProfile(${i})">X</button>
            </div>
        </div>
    `).join('');
}

function showAddProfile() { document.getElementById('add-profile-modal').classList.remove('hidden'); }
function hideAddProfile() { document.getElementById('add-profile-modal').classList.add('hidden'); }

function addNewProfile() {
    const name = document.getElementById('p-name').value;
    const url = document.getElementById('p-url').value;
    if (!name || !url) return alert("Remplissez les champs !");

    let profiles = JSON.parse(localStorage.getItem('kpro_profiles') || '[]');
    profiles.push({ name, url });
    localStorage.setItem('kpro_profiles', JSON.stringify(profiles));
    
    hideAddProfile();
    loadProfiles();
}

function deleteProfile(i) {
    let profiles = JSON.parse(localStorage.getItem('kpro_profiles') || '[]');
    profiles.splice(i, 1);
    localStorage.setItem('kpro_profiles', JSON.stringify(profiles));
    loadProfiles();
}

// --- Login & Parsing M3U ---
async function loginProfile(i) {
    const profiles = JSON.parse(localStorage.getItem('kpro_profiles'));
    const profile = profiles[i];
    document.getElementById('active-profile-name').innerText = profile.name;
    setActiveScreen('main-screen');

    // Charger et parser le M3U (CORS Alert !)
    currentM3uData = await fetchAndParseM3u(profile.url);
}

// --- Système de Lecture ---
async function fetchAndParseM3u(url) {
    try {
        const response = await fetch(url); // Attention au CORS !
        const text = await response.text();
        return parseM3U(text);
    } catch (err) {
        alert("Erreur CORS détectée. Cette PWA doit être hébergée pour fonctionner pleinement.");
        return null;
    }
}

function parseM3U(content) {
    const lines = content.split('\n');
    const items = { tv: [], movie: [], series: [] };
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF:')) {
            const infoLine = lines[i];
            const streamUrl = lines[i + 1]?.trim();
            const name = infoLine.split(',')[1] || "Sans nom";
            
            // Détection du type (simple pour cet exemple)
            // Dans Smarters, cela se fait par categories group-title
            let type = 'tv';
            if (infoLine.includes('Movies') || infoLine.includes('Vod')) type = 'movie';
            if (infoLine.includes('Series')) type = 'series';

            items[type].push({ name, url: streamUrl });
        }
    }
    return items;
}

function loadM3uContent(type) {
    if (!currentM3uData) return alert("Liste non chargée");
    const listHtml = currentM3uData[type].map(item => `
        <div class="stream-item" onclick="playStream('${item.url}')">${item.name}</div>
    `).join('');
    
    document.getElementById('category-title').innerText = type.toUpperCase();
    document.getElementById('stream-list').innerHTML = listHtml;
    setActiveScreen('player-screen');
}

function playStream(url) {
    const overlay = document.getElementById('video-overlay');
    overlay.classList.add('hidden');

    if (Hls.isSupported()) {
        hls.destroy();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Pour Safari Mobile
        video.src = url;
        video.play();
    }
}
