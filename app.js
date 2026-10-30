const ROOM_ID = "global-audio-bridge-ukraine-usa-2026"; 
const MY_GUEST_ID = "guest-" + Math.random().toString(36).substring(2, 9);

// Введите ваш постоянный домен от Ngrok (без https://)
const TUNNEL_HOST = "stapling-herring-squiggle.ngrok-free.dev"; 

let peer = null;
let localStream = null;
const connectedPeers = new Set();

const translations = {
    en: {
        title: "Global Video Chat",
        badge: "Room: World Wide",
        btnJoin: "Join Room",
        statusWait: "Click button to connect...",
        statusMicRequest: "Requesting camera and mic access...",
        statusNetConnect: "Connecting to international network...",
        statusHostWait: "You are Host. Waiting for friends...",
        statusGuestConnect: "Connecting to host...",
        statusConnected: "Connection established!",
        micMuted: "Muted",
        micUnmuted: "🎤 Mute",
        mediaNeeded: "Camera and microphone access is required!",
        errPermission: "Error: Permission denied by user.",
        errDevice: "Error: No camera/microphone found.",
        btnCopy: "Copy Logs",
        btnCopied: "Copied!"
    },
    uk: {
        title: "Глобальний відеочат",
        badge: "Кімната: Світ",
        btnJoin: "Увійти в кімнату",
        statusWait: "Натисніть кнопку для підключення...",
        statusMicRequest: "Запит дозволу на камеру та мікрофон...",
        statusNetConnect: "Підключення до міжнародної мережі...",
        statusHostWait: "Ви Хост. Очікування друзів...",
        statusGuestConnect: "З'єднання з хостом...",
        statusConnected: "Зв'язок встановлено!",
        micMuted: "Вимкнено",
        micUnmuted: "🎤 Вимк. мікрофон",
        mediaNeeded: "Потрібен доступ до камери та мікрофона!",
        errPermission: "Помилка: Доступ відхилено користувачем.",
        errDevice: "Помилка: Не знайдено камеру чи мікрофон.",
        btnCopy: "Скопіювати логи",
        btnCopied: "Скопійовано!"
    },
    ru: {
        title: "Глобальный видеочат",
        badge: "Комната: Весь мир",
        btnJoin: "Войти в комнату",
        statusWait: "Нажмите кнопку для подключения...",
        statusMicRequest: "Запрос разрешения на камеру и микрофон...",
        statusNetConnect: "Подключение к международной сети...",
        statusHostWait: "Вы Хост. Ожидание друзей...",
        statusGuestConnect: "Соединение с хостом...",
        statusConnected: "Связь установлена!",
        micMuted: "Выключен",
        micUnmuted: "🎤 Выключить звук",
        mediaNeeded: "Нужен доступ к камере и микрофону!",
        errPermission: "Ошибка: Доступ отклонен пользователем.",
        errDevice: "Ошибка: Не найдена камера или микрофон.",
        btnCopy: "Скопировать логи",
        btnCopied: "Скопировано!"
    }
};

let currentLang = 'en';

const joinBtn = document.getElementById('joinBtn');
const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('statusText');
const logDiv = document.getElementById('log');
const copyLogBtn = document.getElementById('copyLogBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

function log(msg, type = 'info') {
    let timestamp = new Date().toLocaleTimeString();
    let prefix = `[${timestamp}] `;
    if (type === 'error') prefix += `❌ ERROR: `;
    else if (type === 'success') prefix += `✅ OK: `;
    else prefix += `> `;
    
    logDiv.innerHTML += `<br><span style="color: ${type === 'error' ? '#f38ba8' : type === 'success' ? '#a6e3a1' : '#f5e0dc'}">${prefix}${msg}</span>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function changeLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;

    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-${lang}`);
    if (targetBtn) targetBtn.classList.add('active');

    document.getElementById('txt-title').innerText = translations[lang].title;
    document.getElementById('txt-badge').innerText = translations[lang].badge;
    
    if (!joinBtn.disabled) joinBtn.innerText = translations[lang].btnJoin;
    if (!micBtn.classList.contains('muted')) {
        micBtn.innerText = translations[lang].micUnmuted;
    } else {
        micBtn.innerText = translations[lang].micMuted;
    }
}

function detectDeviceLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const shortLang = browserLang.substring(0, 2).toLowerCase();
    if (shortLang === 'uk' || shortLang === 'ua') changeLanguage('uk');
    else if (shortLang === 'ru') changeLanguage('ru');
    else changeLanguage('en');
}

detectDeviceLanguage();

function getPeerOptions() {
    const baseConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        iceCandidatePoolSize: 10,
        sdpSemantics: 'unified-plan'
    };

    if (TUNNEL_HOST && TUNNEL_HOST.trim() !== "") {
        return {
            host: TUNNEL_HOST.trim(),
            port: 443,
            path: '/myapp',
            secure: true,
            config: baseConfig
        };
    } else {
        return { config: baseConfig };
    }
}

joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    statusText.innerText = translations[currentLang].statusMicRequest;
    log("Requesting camera and microphone...");
    
    try {
        // Адаптивное качество: браузер сам подберет разрешение под возможности устройства и сети
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
            video: { 
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                framerate: { ideal: 30, max: 30 }
            } 
        });
        
        localVideo.srcObject = localStream;
        log("Camera and microphone initialized successfully.", "success");
        
        micBtn.style.display = 'block'; // Показываем кнопку выключения микрофона
        statusText.innerText = translations[currentLang].statusNetConnect;
        
        tryToConnectAsHost();

    } catch (err) {
        log(`${err.name}: ${err.message}`, "error");
        statusText.innerText = translations[currentLang].mediaNeeded;
        joinBtn.disabled = false;
    }
});

// Кнопка отключения/включения микрофона
micBtn.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        if (audioTrack.enabled) {
            micBtn.classList.remove('muted');
            micBtn.innerText = translations[currentLang].micUnmuted;
            log("Microphone unmuted.");
        } else {
            micBtn.classList.add('muted');
            micBtn.innerText = translations[currentLang].micMuted;
            log("Microphone muted.");
        }
    }
});

function tryToConnectAsHost() {
    log(`Initializing Peer as Master Host [ID: ${ROOM_ID}]...`);
    peer = new Peer(ROOM_ID, getPeerOptions());
    
    peer.on('open', (id) => {
        log(`Host session registered: ${id}`, "success");
        statusText.innerText = translations[currentLang].statusHostWait;
        listenForCalls();
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            log("Room ID already taken. Switching to Client routing.");
            connectAsGuest();
        } else {
            log(`Peer error: ${err.message}`, "error");
        }
    });
}

function connectAsGuest() {
    log(`Initializing Peer as Client Guest [ID: ${MY_GUEST_ID}]...`);
    peer = new Peer(MY_GUEST_ID, getPeerOptions());
    
    peer.on('open', (id) => {
        log(`Guest session registered: ${id}`, "success");
        statusText.innerText = translations[currentLang].statusGuestConnect;
        
        log(`Calling Master Room...`);
        const call = peer.call(ROOM_ID, localStream);
        bindCallEvents(call);
        listenForCalls();
    });
}

function listenForCalls() {
    peer.on('call', (call) => {
        if (connectedPeers.has(call.peer)) return;
        log(`Incoming call from: ${call.peer}`, "success");
        call.answer(localStream);
        bindCallEvents(call);
    });
}

function bindCallEvents(call) {
    call.on('stream', (remoteStream) => {
        log(`Remote video/audio stream received.`, "success");
        remoteVideo.srcObject = remoteStream;
        statusText.innerText = translations[currentLang].statusConnected;
        connectedPeers.add(call.peer);
    });

    call.on('error', (err) => {
        log(`Call error: ${err.message}`, "error");
    });
}

copyLogBtn.addEventListener('click', () => {
    const textToCopy = logDiv.innerText || logDiv.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
        copyLogBtn.innerText = translations[currentLang].btnCopied;
        setTimeout(() => copyLogBtn.innerText = translations[currentLang].btnCopy, 2000);
    });
});
