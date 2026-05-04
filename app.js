const video = document.getElementById('video');
let hls = new Hls();
let currentM3uData = { tv: [], movie: [], series: [] };

// 1. Fonction de Parsing Améliorée (Compatible Smarters)
function parseM3U(content) {
    const lines = content.split('\n');
    const data = { tv: [], movie: [], series: [] };
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF:')) {
            const infoLine = lines[i];
            const streamUrl = lines[i + 1]?.trim();
            
            if (!streamUrl || streamUrl.startsWith('#')) continue;

            // Extraction du nom (après la dernière virgule)
            const name = infoLine.split(',').pop().trim();
            
            // Extraction de la catégorie (group-title)
            const groupMatch = infoLine.match(/group-title="(.*?)"/i);
            const category = groupMatch ? groupMatch[1].toUpperCase() : "GÉNÉRAL";

            const item = { name, url: streamUrl, category };

            // Tri intelligent basé sur le group-title ou l'URL
            if (category.includes('MOVIE') || category.includes('VOD') || streamUrl.includes('.mkv') || streamUrl.includes('.mp4')) {
                data.movie.push(item);
            } else if (category.includes('SERIE')) {
                data.series.push(item);
            } else {
                data.tv.push(item);
            }
        }
    }
    return data;
}

// 2. Chargement et Affichage des catégories
async function loginProfile(i) {
    const profiles = JSON.parse(localStorage.getItem('kpro_profiles'));
    const profile = profiles[i];
    document.getElementById('active-profile-name').innerText = profile.name;
    
    setActiveScreen('main-screen');

    try {
        const response = await fetch(profile.url);
        const text = await response.text();
        currentM3uData = parseM3U(text);
        console.log("Données chargées :", currentM3uData);
    } catch (err) {
        alert("Erreur réseau ou CORS. Vérifiez que le lien est direct et accessible.");
    }
}

// 3. Lecture du flux (Correction majeure)
function playStream(url, name) {
    console.log("Tentative de lecture :", url);
    const overlay = document.getElementById('video-overlay');
    overlay.classList.add('hidden');

    if (Hls.isSupported()) {
        hls.destroy(); // On nettoie l'ancienne instance
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log("Lancement auto bloqué :", e));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.error("Erreur HLS fatale :", data);
                overlay.classList.remove('hidden');
            }
        });
    } 
    // Support natif (Safari / iPhone)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play();
    }
}

// 4. Affichage de la liste avec sous-catégories
function loadM3uContent(type) {
    const list = currentM3uData[type];
    if (!list || list.length === 0) {
        document.getElementById('stream-list').innerHTML = "<p style='padding:20px'>Aucun contenu trouvé.</p>";
        return;
    }

    // On regroupe par catégorie pour l'affichage
    let html = '';
    let lastCat = '';

    list.forEach(item => {
        if (item.category !== lastCat) {
            lastCat = item.category;
            html += `<div style="background:#222; color:#00e676; padding:5px 15px; font-size:0.7rem; font-weight:bold;">${lastCat}</div>`;
        }
        html += `<div class="stream-item" onclick="playStream('${item.url}', '${item.name.replace(/'/g, "\\'")}')">${item.name}</div>`;
    });
    
    document.getElementById('category-title').innerText = type.toUpperCase();
    document.getElementById('stream-list').innerHTML = html;
    setActiveScreen('player-screen');
}
