const ROOM_ID = "global-audio-bridge-ukraine-usa-2026"; 
const MY_GUEST_ID = "guest-" + Math.random().toString(36).substring(2, 9);

let peer = null;
let localStream = null;
let isMuted = false;
let reconnectInterval = null; 
let myNickname = "User";
const connectedPeers = new Set();
const activeAudioElements = [];
const activeDataConnections = new Set(); // Хранение каналов данных чата

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
        statusReconnecting: "Connection lost. Reconnecting...",
        modalText: "Your browser blocked background audio. Click to activate voice stream.",
        modalBtn: "Unmute Audio",
        micNeeded: "Microphone access is required!",
        errPermission: "Error: Microphone permission denied by user.",
        errDevice: "Error: No microphone found on this device.",
        btnCopy: "Copy Logs",
        btnCopied: "Copied!",
        btnMute: "Mute Mic",
        btnUnmute: "Unmute Mic",
        namePrompt: "Enter your nickname to start:",
        namePlaceholder: "Your name...",
        chatPlaceholder: "Type a message...",
        chatSend: "Send",
        btnShowLog: "Show Console Logs",
        btnHideLog: "Hide Console Logs",
        systemLabel: "System",
        joinedChat: "joined the chat."
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
        statusReconnecting: "Зв'язок розірвано. Перепідключення...",
        modalText: "Браузер заблокував звук у фоні. Натисніть для активації голосового потоку.",
        modalBtn: "Увімкнути звук",
        micNeeded: "Потрібен доступ до мікрофона!",
        errPermission: "Помилка: Доступ до мікрофона відхилено користувачем.",
        errDevice: "Помилка: На цьому пристрої не знайдено мікрофон.",
        btnCopy: "Скопіювати логи",
        btnCopied: "Скопійовано!",
        btnMute: "Вимкнути мік.",
        btnUnmute: "Увімкнути мік." ,
        namePrompt: "Введіть ваше ім'я для старту:",
        namePlaceholder: "Ваше ім'я...",
        chatPlaceholder: "Напишіть повідомлення...",
        chatSend: "Надісл.",
        btnShowLog: "Показати консоль логів",
        btnHideLog: "Приховати консоль логів",
        systemLabel: "Система",
        joinedChat: "приєднується до чату."
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
        statusReconnecting: "Связь разорвана. Переподключение...",
        modalText: "Браузер заблокировал звук в фоне. Нажмите для активации голосового потока.",
        modalBtn: "Включить звук",
        micNeeded: "Нужен доступ к микрофону!",
        errPermission: "Ошибка: Доступ к микрофону отклонен пользователем.",
        errDevice: "Ошибка: На этом устройстве не найден микрофон.",
        btnCopy: "Скопировать логи",
        btnCopied: "Скопировано!",
        btnMute: "Выключить мик.",
        btnUnmute: "Включить мик.",
        namePrompt: "Введите ваше имя для старта:",
        namePlaceholder: "Ваше имя...",
        chatPlaceholder: "Напишите сообщение...",
        chatSend: "Отпр.",
        btnShowLog: "Показать консоль логов",
        btnHideLog: "Скрыть консоль логов",
        systemLabel: "Система",
        joinedChat: "присоединяется к чату."
    }
};

let currentLang = 'en';

// Нахождение DOM элементов
const joinBtn = document.getElementById('joinBtn');
const muteBtn = document.getElementById('muteBtn');
const statusText = document.getElementById('statusText');
const logDiv = document.getElementById('log');
const copyLogBtn = document.getElementById('copyLogBtn');
const audioContainer = document.getElementById('remoteAudioContainer');
const overlay = document.getElementById('audioActivationOverlay');
const modalBtn = document.getElementById('audioActivateBtn');
const modalTxt = document.getElementById('txt-modal-alert');

// Элементы нового функционала (Имя, Чат, Логи)
const nameSetupOverlay = document.getElementById('nameSetupOverlay');
const usernameInput = document.getElementById('usernameInput');
const saveNameBtn = document.getElementById('saveNameBtn');
const txtNamePrompt = document.getElementById('txt-name-prompt');

const chatContainer = document.getElementById('chatContainer');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');

const toggleLogBtn = document.getElementById('toggleLogBtn');
const logSection = document.getElementById('logSection');

let logsVisible = false;

function log(msg, type = 'info') {
    let timestamp = new Date().toLocaleTimeString();
    let prefix = `[${timestamp}] `;
    if (type === 'error') prefix += `❌ ERROR: `;
    else if (type === 'success') prefix += `✅ OK: `;
    else prefix += `> `;
    
    logDiv.innerHTML += `<br><span style="color: ${type === 'error' ? '#f38ba8' : type === 'success' ? '#a6e3a1' : '#f5e0dc'}">${prefix}${msg}</span>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

// Переключение языков
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
    txtNamePrompt.innerText = translations[lang].namePrompt;
    usernameInput.placeholder = translations[lang].namePlaceholder;
    chatInput.placeholder = translations[lang].chatPlaceholder;
    sendMsgBtn.innerText = translations[lang].chatSend;
    
    if (logsVisible) {
        toggleLogBtn.innerText = translations[lang].btnHideLog;
    } else {
        toggleLogBtn.innerText = translations[lang].btnShowLog;
    }

    if (copyLogBtn.innerText !== translations.en.btnCopied && copyLogBtn.innerText !== translations.uk.btnCopied && copyLogBtn.innerText !== translations.ru.btnCopied) {
        copyLogBtn.innerText = translations[lang].btnCopy;
    }
    
    if (!joinBtn.disabled) {
        joinBtn.innerText = translations[lang].btnJoin;
    }

    if (isMuted) {
        muteBtn.innerText = translations[lang].btnUnmute;
    } else {
        muteBtn.innerText = translations[lang].btnMute;
    }
    
    if (statusText.innerText.includes("Connection lost") || statusText.innerText.includes("Зв'язок розірвано") || statusText.innerText.includes("Связь разорвана")) {
        statusText.innerText = translations[lang].statusReconnecting;
    } else if (['Click button to connect...', 'Натисніть кнопку для підключення...', 'Нажмите кнопку для подключения...'].includes(statusText.innerText)) {
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

// Сохранение имени при входе
saveNameBtn.addEventListener('click', () => {
    const value = usernameInput.value.trim();
    if (value.length > 0) {
        myNickname = value;
    }
    nameSetupOverlay.style.display = 'none';
    log(`User registered profile identity token: ${myNickname}`, "success");
});

usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveNameBtn.click();
});

// Переключатель скрытия консоли логов
toggleLogBtn.addEventListener('click', () => {
    logsVisible = !logsVisible;
    if (logsVisible) {
        logSection.style.display = 'block';
        toggleLogBtn.innerText = translations[currentLang].btnHideLog;
        logSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        logSection.style.display = 'none';
        toggleLogBtn.innerText = translations[currentLang].btnShowLog;
    }
});

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
        
        muteBtn.style.display = 'block';
        
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

muteBtn.addEventListener('click', () => {
    if (!localStream) return;
    isMuted = !isMuted;
    
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });
    
    if (isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.innerText = translations[currentLang].btnUnmute;
        log("Local microphone hardware MUTED by user.", "error");
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.innerText = translations[currentLang].btnMute;
        log("Local microphone input ACTIVE.", "success");
    }
});

function tryToConnectAsHost() {
    log(`Initializing Peer connection instance as Master Host [ID: ${ROOM_ID}]...`);
    peer = new Peer(ROOM_ID, peerConfig);
    
    peer.on('open', (id) => {
        log(`Room session allocation success. Server ID registered: ${id}`, "success");
        statusText.innerText = translations[currentLang].statusHostWait;
        listenForCalls();
        listenForDataConnections();
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
        
        makeGuestCall();
        listenForCalls();
        listenForDataConnections();
    });

    peer.on('error', (err) => {
        log(`Guest node fatal runtime failure instance: ${err.type} | ${err.message}`, "error");
        if (err.type === 'peer-unavailable') {
            log("Target Master Host is currently offline. Retrying handshake shortly...", "error");
            startReconnectionLoop(null);
        }
    });
}

function makeGuestCall() {
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }

    log(`Dispatching P2P WebRTC connection offer handshake call to Master Room target...`);
    
    if (peer && !peer.destroyed) {
        const call = peer.call(ROOM_ID, localStream);
        if (call) {
            bindCallEvents(call);
        }
        // Инициализация дата-канала для Текстового чата
        log(`Opening discrete data pipeline thread to Master Host...`);
        const dataConn = peer.connect(ROOM_ID);
        if (dataConn) {
            bindDataConnectionEvents(dataConn);
        }
    } else {
        log("Peer instance is dead or destroyed. Initiating full guest node reset...");
        connectAsGuest();
    }
}

function listenForCalls() {
    peer.on('call', (call) => {
        if (connectedPeers.has(call.peer)) {
            log(`Prevented redundant network thread loop duplication from node: ${call.peer}`);
            return;
        }
        log(`Inbound P2P signaling session call packet received from remote node: ${call.peer}`, "success");
        call.answer(localStream);
        bindCallEvents(call);
    });
}

// Прослушивание входящих текстовых каналов (для Хоста)
function listenForDataConnections() {
    peer.on('connection', (dataConn) => {
        log(`Inbound P2P layout data channel synchronized from node: ${dataConn.peer}`, "success");
        bindDataConnectionEvents(dataConn);
    });
}

function bindCallEvents(call) {
    if (call.peerConnection) {
        call.peerConnection.addEventListener('iceconnectionstatechange', () => {
            const state = call.peerConnection.iceConnectionState;
            log(`WebRTC ICE Core Layer Network State Changed: ${state}`);
            
            if (state === 'connected') {
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                    log("Active reconnection timers cleared. Channel stable.", "success");
                }
                log(`Direct P2P socket pipeline verified between routers. Waiting for stream data packets...`, "success");
                chatContainer.style.display = 'block'; // Показываем чат при успешном коннекте
            }
            
            if (state === 'disconnected' || state === 'failed') {
                log("Network disruption detected. Activating background auto-reconnect pipeline...", "error");
                startReconnectionLoop(call);
            }
        });
    }

    call.on('stream', (remoteStream) => {
        log(`Inbound audio media processing framework initialized. Stream detected.`, "success");
        addAudioStream(call.peer, remoteStream);
    });

    call.on('close', () => {
        log("Call instance closed by remote peer. Initiating connection recovery...", "error");
        startReconnectionLoop(call);
    });

    call.on('error', (err) => {
        log(`Call session pipe crushed down mid-execution: ${err.message}`, "error");
        startReconnectionLoop(call);
    });
}

// Логика работы P2P дата-канала чата
function bindDataConnectionEvents(dataConn) {
    dataConn.on('open', () => {
        activeDataConnections.add(dataConn);
        // Отправляем пакет системного интро, чтобы передать наше имя собеседнику
        dataConn.send({
            type: 'system-intro',
            name: myNickname
        });
    });

    dataConn.on('data', (data) => {
        if (!data || typeof data !== 'object') return;

        if (data.type === 'system-intro') {
            appendChatMessage(translations[currentLang].systemLabel, `${data.name} ${translations[currentLang].joinedChat}`, '#f5c2e7', true);
        } else if (data.type === 'text-message') {
            appendChatMessage(data.sender, data.text, '#b4befe', false);
        }
    });

    dataConn.on('close', () => {
        activeDataConnections.delete(dataConn);
        log(`Data pipeline socket closed down from node context: ${dataConn.peer}`, "error");
    });

    dataConn.on('error', (err) => {
        log(`Data channel operation process error: ${err.message}`, "error");
    });
}

// Функция отправки текстового сообщения
function sendTextMessage() {
    const text = chatInput.value.trim();
    if (text.length === 0) return;

    // Вывод своего сообщения на свой экран
    appendChatMessage(myNickname, text, '#a6e3a1', false);
    chatInput.value = '';

    // Передача пакета во все активные соединения WebRTC
    activeDataConnections.forEach(conn => {
        if (conn.open) {
            conn.send({
                type: 'text-message',
                sender: myNickname,
                text: text
            });
        }
    });
}

sendMsgBtn.addEventListener('click', sendTextMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendTextMessage();
});

// Рендеринг строк внутри чата
function appendChatMessage(sender, text, nameColor = '#a6e3a1', isSystem = false) {
    const msgElement = document.createElement('div');
    if (isSystem) {
        msgElement.innerHTML = `<i style="color: #9399b2;">[${translations[currentLang].systemLabel}] ${text}</i>`;
    } else {
        msgElement.innerHTML = `<strong style="color: ${nameColor}">${sender}:</strong> <span style="color: #cdd6f4;">${escapeHTML(text)}</span>`;
    }
    chatMessages.appendChild(msgElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function startReconnectionLoop(currentCall) {
    if (currentCall) {
        currentCall.close();
    }
    
    connectedPeers.delete(ROOM_ID);
    chatContainer.style.display = 'none'; // Скрываем чат при потере связи
    
    const oldAudio = document.getElementById(`audio-${ROOM_ID}`);
    if (oldAudio) oldAudio.remove();

    if (reconnectInterval) return; 

    statusText.innerText = translations[currentLang].statusReconnecting;
    log("Reconnection loop engaged. Retrying every 4 seconds...");
    
    reconnectInterval = setInterval(() => {
        log("Attempting P2P socket handshake recovery...");
        makeGuestCall();
    }, 4000);
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

copyLogBtn.addEventListener('click', () => {
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
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; 
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
