const ROOM_ID = "global-audio-bridge-ukraine-usa-2026"; 
const MY_GUEST_ID = "guest-" + Math.random().toString(36).substring(2, 9);

let peer = null;
let localStream = null;
const connectedPeers = new Set();
const activeAudioElements = [];

const translations = {
    en: {
        title: "Global Audio Chat",
        badge: "Room: World Wide",
        btnJoin: "Join Room",
        statusWait: "Click button to connect...",
        statusMicRequest: "Requesting microphone access...",
        statusNetConnect: "Connecting to international network...",
        statusHostWait: "You are Host. Waiting for friends...",
        statusGuestConnect: "Connecting to host...",
        statusConnected: "Connection established!",
        modalText: "Your browser blocked background audio. Click to activate voice stream.",
        modalBtn: "Unmute Audio",
        micNeeded: "Microphone access is required!",
        errPermission: "Error: Microphone permission denied by user.",
        errDevice: "Error: No microphone found on this device.",
        btnCopy: "Copy Logs",
        btnCopied: "Copied!"
    },
    uk: {
        title: "Глобальний аудіочат",
        badge: "Кімната: Світ",
        btnJoin: "Увійти в кімнату",
        statusWait: "Натисніть кнопку для підключення...",
        statusMicRequest: "Запит дозволу на мікрофон...",
        statusNetConnect: "Підключення до міжнародної мережі...",
        statusHostWait: "Ви Хост. Очікування друзів...",
        statusGuestConnect: "З'єднання з хостом...",
        statusConnected: "Зв'язок встановлено!",
        modalText: "Браузер заблокував звук у фоні. Натисніть для активації голосового потоку.",
        modalBtn: "Увімкнути звук",
        micNeeded: "Потрібен доступ до мікрофона!",
        errPermission: "Помилка: Доступ до мікрофона відхилено користувачем.",
        errDevice: "Помилка: На цьому пристрої не знайдено мікрофон.",
        btnCopy: "Скопіювати логи",
        btnCopied: "Скопійовано!"
    },
    ru: {
        title: "Глобальный аудиочат",
        badge: "Комната: Весь мир",
        btnJoin: "Войти в комнату",
        statusWait: "Нажмите кнопку для подключения...",
        statusMicRequest: "Запрос разрешения на микрофон...",
        statusNetConnect: "Подключение к международной сети...",
        statusHostWait: "Вы Хост. Ожидание друзей...",
        statusGuestConnect: "Соединение с хостом...",
        statusConnected: "Связь установлена!",
        modalText: "Браузер заблокировал звук в фоне. Нажмите для активации голосового потоку.",
        modalBtn: "Включить звук",
        micNeeded: "Нужен доступ к микрофону!",
        errPermission: "Ошибка: Доступ к микрофону отклонен пользователем.",
        errDevice: "Ошибка: На этом устройстве не найден микрофон.",
        btnCopy: "Скопировать логи",
        btnCopied: "Скопировано!"
    }
};

let currentLang = 'en';

const joinBtn = document.getElementById('joinBtn');
const statusText = document.getElementById('statusText');
const logDiv = document.getElementById('log');
const copyLogBtn = document.getElementById('copyLogBtn');
const audioContainer = document.getElementById('remoteAudioContainer');
const overlay = document.getElementById('audioActivationOverlay');
const modalBtn = document.getElementById('audioActivateBtn');
const modalTxt = document.getElementById('txt-modal-alert');

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
    modalBtn.innerText = translations[lang].modalBtn;
    modalTxt.innerText = translations[lang].modalText;
    
    if (copyLogBtn.innerText !== translations.en.btnCopied && copyLogBtn.innerText !== translations.uk.btnCopied && copyLogBtn.innerText !== translations.ru.btnCopied) {
        copyLogBtn.innerText = translations[lang].btnCopy;
    }
    
    if (!joinBtn.disabled) {
        joinBtn.innerText = translations[lang].btnJoin;
    }
    
    if (['Click button to connect...', 'Натисніть кнопку для підключення...', 'Нажмите кнопку для подключения...'].includes(statusText.innerText)) {
        statusText.innerText = translations[lang].statusWait;
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

const peerConfig = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
            { urls: 'stun:iphone-ice.apple.com:3478' }, 
            {
                urls: 'turn:openwebrtc.blockcv.com:3478?transport=udp',
                username: 'openwebrtc',
                credential: 'openwebrtcpassword'
            },
            {
                urls: 'turn:turn.matrix.org:3478?transport=udp',
                username: 'guest',
                credential: 'somepassword'
            }
        ],
        iceCandidatePoolSize: 10,
        sdpSemantics: 'unified-plan'
    }
};

joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    statusText.innerText = translations[currentLang].statusMicRequest;
    log("Requesting local media hardware...");
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
            video: false 
        });
        log("Local microphone initialized successfully.", "success");
        statusText.innerText = translations[currentLang].statusNetConnect;
        
        tryToConnectAsHost();

    } catch (err) {
        log(`${err.name}: ${err.message}`, "error");
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            statusText.innerText = translations[currentLang].errPermission;
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            statusText.innerText = translations[currentLang].errDevice;
        } else {
            statusText.innerText = translations[currentLang].micNeeded;
        }
        joinBtn.disabled = false;
    }
});

function tryToConnectAsHost() {
    log(`Initializing Peer connection instance as Master Host [ID: ${ROOM_ID}]...`);
    peer = new Peer(ROOM_ID, peerConfig);
    
    peer.on('open', (id) => {
        log(`Room session allocation success. Server ID registered: ${id}`, "success");
        statusText.innerText = translations[currentLang].statusHostWait;
        listenForCalls();
    });

    peer.on('error', (err) => {
        log(`PeerJS Event Error triggered. Type code: ${err.type}`, "error");
        if (err.type === 'unavailable-id') {
            log("Room ID token is already allocated by another peer instance. Switching to Client routing.");
            connectAsGuest();
        } else {
            log(`Critical Peer internal infrastructure fault: ${err.message}`, "error");
        }
    });
}

function connectAsGuest() {
    log(`Initializing Peer connection instance as Client Guest [ID: ${MY_GUEST_ID}]...`);
    peer = new Peer(MY_GUEST_ID, peerConfig);
    
    peer.on('open', (id) => {
        log(`Client session allocation success. Assigned unique network ID: ${id}`, "success");
        statusText.innerText = translations[currentLang].statusGuestConnect;
        
        log(`Dispatching P2P WebRTC connection offer handshake call to Master Room target...`);
        const call = peer.call(ROOM_ID, localStream);
        
        bindCallEvents(call);
        listenForCalls();
    });

    peer.on('error', (err) => {
        log(`Guest node fatal runtime failure instance: ${err.type} | ${err.message}`, "error");
    });
}

function listenForCalls() {
    peer.on('call', (call) => {
        if (connectedPeers.has(call.peer)) {
            log(`Prevented redundant network thread loop duplication from node: ${call.peer}`);
            return;
        }
        log(`Inbound P2P signaling session call packet received from remote node: ${call.peer}`, "success");
        log(`Answering WebRTC handshake. Mounting local audio data stream pipe context.`);
        
        call.answer(localStream);
        bindCallEvents(call);
    });
}

function bindCallEvents(call) {
    if (call.peerConnection) {
        call.peerConnection.addEventListener('iceconnectionstatechange', () => {
            log(`WebRTC ICE Core Layer Network State Changed: ${call.peerConnection.iceConnectionState}`);
            if (call.peerConnection.iceConnectionState === 'connected') {
                log(`Direct P2P socket pipeline verified between routers. Waiting for stream data packets...`, "success");
            }
        });
    }

    call.on('stream', (remoteStream) => {
        log(`Inbound audio media processing framework initialized. Stream detected.`, "success");
        addAudioStream(call.peer, remoteStream);
    });

    call.on('error', (err) => {
        log(`Call session pipe crushed down mid-execution: ${err.message}`, "error");
    });
}

function addAudioStream(peerId, stream) {
    if (connectedPeers.has(peerId)) return;
    connectedPeers.add(peerId);

    log(`Assembling DOM layer hardware wrappers for audio node renderer...`);
    const audio = document.createElement('audio');
    audio.id = `audio-${peerId}`;
    audio.srcObject = stream;
    
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('autoplay', 'true');
    audio.autoplay = true;
    
    audioContainer.appendChild(audio);
    activeAudioElements.push(audio);
    
    audio.play()
        .then(() => {
            log(`Remote sound track codec unpacked and processing pipeline output is active.`, "success");
            statusText.innerText = translations[currentLang].statusConnected;
        })
        .catch(e => {
            log(`Autoplay policy violation. Audio track renderer stalled. Raising manual override overlay UI window.`, "error");
            overlay.style.display = 'flex';
        });
}

modalBtn.addEventListener('click', () => {
    log("User interaction acknowledged. Executing forced playback pipeline refresh...");
    overlay.style.display = 'none';
    
    activeAudioElements.forEach(audio => {
        audio.play()
            .then(() => {
                log("Forced hardware playback execution resolved successfully.", "success");
                statusText.innerText = translations[currentLang].statusConnected;
            })
            .catch(err => log(`Forced execution fallback crashed: ${err.message}`, "error"));
    });
});

// ЛОГИКА РАБОТЫ КНОПКИ КОПИРОВАНИЯ ЛОГОВ (С ФИКСОМ ДЛЯ iOS)
copyLogBtn.addEventListener('click', () => {
    // Получаем чистый текст логов (убираем HTML теги <br> и <span>)
    const textToCopy = logDiv.innerText || logDiv.textContent;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => showCopiedFeedback())
            .catch(err => fallbackCopyText(textToCopy));
    } else {
        fallbackCopyText(textToCopy);
    }
});

function fallbackCopyText(text) {
    // Вспомогательный метод для старых версий iOS/Safari, если основной Clipboard API заблокирован
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; // Избегаем скролла страницы вниз
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopiedFeedback();
    } catch (err) {
        console.error('Fallback copy method failed', err);
    }
    document.body.removeChild(textArea);
}

function showCopiedFeedback() {
    const originalText = copyLogBtn.innerText;
    copyLogBtn.innerText = translations[currentLang].btnCopied;
    copyLogBtn.style.borderColor = '#a6e3a1';
    copyLogBtn.style.color = '#a6e3a1';
    
    setTimeout(() => {
        copyLogBtn.innerText = translations[currentLang].btnCopy;
        copyLogBtn.style.borderColor = '#45475a';
        copyLogBtn.style.color = '#f5e0dc';
    }, 2000);
}
