// Базовая сигнальная комната в облаке PeerJS
const ROOM_BASE_PREFIX = "global-mesh-video-room-2026-";
const MAX_SLOTS = 10; 

let mySlotIndex = 1;
let FULL_PEER_ID = "";
let MY_UNIQUE_HASH = "";

let peer = null;
let localStream = null;
let isMuted = false;
let isCamOff = false; // Состояние камеры
let currentFacingMode = "user"; 
let myNickname = "User";

const connectedPeersRegistry = {};

// Переменные интерактивного холста
let canvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentStroke = [];
let drawingHistory = []; 
let redoStack = [];

// Аудио-контекст для отслеживания громкости голоса участников
let audioCtx = null;

const translations = {
    en: {
        title: "Global Video & Paint Chat",
        badge: "Room: World Wide Grid",
        btnJoin: "Join Room",
        statusWait: "Click button to connect...",
        statusMicRequest: "Requesting 720p HD stream...",
        statusNetConnect: "Connecting to international network...",
        statusConnected: "Connected to group room!",
        modalText: "Your browser blocked background audio. Click to activate voice stream.",
        modalBtn: "Unmute Audio",
        micNeeded: "Camera and Microphone access are required!",
        errPermission: "Error: Media access denied by user.",
        errDevice: "Error: Capture device mismatch.",
        btnCopy: "Copy Logs",
        btnCopied: "Copied!",
        btnMute: "Mute Mic",
        btnUnmute: "Unmute Mic",
        btnCamStop: "Stop Cam",
        btnCamStart: "Start Cam",
        chatPlaceholder: "Type a message...",
        logShown: "Hide Console Logs",
        logHidden: "Show Console Logs"
    },
    uk: {
        title: "Глобальний Відео та Малювальний Чат",
        badge: "Кімната: World Wide Grid",
        btnJoin: "Увійти в кімнату",
        statusWait: "Натисніть кнопку для підключення...",
        statusMicRequest: "Запит HD-потоку 720p...",
        statusNetConnect: "Підключення до міжнародної мережі...",
        statusConnected: "Підключено до групової кімнати!",
        modalText: "Браузер заблокував фоновий звук. Натисніть, щоб активувати потік.",
        modalBtn: "Увімкнути звук",
        micNeeded: "Доступ до камери та мікрофона обов'язковий!",
        errPermission: "Помилка: користувач відхилив доступ до медіа.",
        errDevice: "Помилка: пристрої захоплення не знайдені.",
        btnCopy: "Копіювати логи",
        btnCopied: "Скопійовано!",
        btnMute: "Вимкнути мік",
        btnUnmute: "Увімкнути мік",
        btnCamStop: "Вимк Камеру",
        btnCamStart: "Увімк Камеру",
        chatPlaceholder: "Введіть повідомлення...",
        logShown: "Приховати логи консолі",
        logHidden: "Показати логи консолі"
    },
    ru: {
        title: "Глобальный Видео & Рисовальный Чат",
        badge: "Комната: World Wide Grid",
        btnJoin: "Войти в комнату",
        statusWait: "Нажмите кнопку для подключения...",
        statusMicRequest: "Запрос HD-потоку 720p...",
        statusNetConnect: "Подключение к международной сети...",
        statusConnected: "Подключено к групповой комнате!",
        modalText: "Браузер заблокировал фоновый звук. Нажмите, чтобы активировать поток.",
        modalBtn: "Включить звук",
        micNeeded: "Доступ к камере и микрофону обязателен!",
        errPermission: "Ошибка: доступ к медиа отклонен пользователем.",
        errDevice: "Ошибка: устройства захвата не обнаружены.",
        btnCopy: "Копировать логи",
        btnCopied: "Скопировано!",
        btnMute: "Выкл Мик",
        btnUnmute: "Вкл Мик",
        btnCamStop: "Выкл Камеру",
        btnCamStart: "Вкл Камеру",
        chatPlaceholder: "Введите сообщение...",
        logShown: "Скрыть логи консоли",
        logHidden: "Показать логи консоли"
    }
};

let currentLang = 'en';

// DOM Элементы
const joinBtn = document.getElementById('joinBtn');
const muteBtn = document.getElementById('muteBtn');
const camBtn = document.getElementById('camBtn');
const statusText = document.getElementById('statusText');
const videoGrid = document.getElementById('videoGrid');
const chatContainer = document.getElementById('chatContainer');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const paintContainer = document.getElementById('paintContainer');
const toggleLogBtn = document.getElementById('toggleLogBtn');
const logSection = document.getElementById('logSection');
const logDiv = document.getElementById('logDiv');
const copyLogBtn = document.getElementById('copyLogBtn');
const overlay = document.getElementById('audioActivationOverlay');
const audioActivateBtn = document.getElementById('audioActivateBtn');

function log(msg, type = "info") {
    const t = new Date().toLocaleTimeString();
    const colorMap = { info: "#a6e3a1", warn: "#f9e2af", error: "#f38ba8" };
    const color = colorMap[type] || "#cdd6f4";
    logDiv.innerHTML += `<div style="color: ${color}">[${t}] [${type.toUpperCase()}] ${msg}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
    console.log(`[${type.toUpperCase()}] ${msg}`);
}

function selectLanguage(lang) {
    currentLang = lang;
    document.getElementById('txt-title').innerText = translations[lang].title;
    document.getElementById('txt-badge').innerText = translations[lang].badge;
    joinBtn.innerText = translations[lang].btnJoin;
    
    if (muteBtn.style.display !== 'none') {
        muteBtn.innerText = isMuted ? translations[lang].btnUnmute : translations[lang].btnMute;
    }
    if (camBtn.style.display !== 'none') {
        camBtn.innerText = isCamOff ? translations[lang].btnCamStart : translations[lang].btnCamStop;
    }
    
    chatInput.placeholder = translations[lang].chatPlaceholder;
    sendMsgBtn.innerText = currentLang === 'en' ? 'Send' : (currentLang === 'uk' ? 'Надіслати' : 'Отправить');
    toggleLogBtn.innerText = logSection.style.display === 'block' ? translations[lang].logShown : translations[lang].logHidden;
    copyLogBtn.innerText = translations[lang].btnCopy;
    document.getElementById('txt-modal-alert').innerText = translations[lang].modalText;
    audioActivateBtn.innerText = translations[lang].modalBtn;

    if (peer === null) {
        statusText.innerText = translations[lang].statusWait;
    } else if (peer.disconnected || peer.destroyed) {
        statusText.innerText = translations[lang].statusWait;
    } else {
        statusText.innerText = translations[lang].statusConnected;
    }
}

document.getElementById('btn-en').addEventListener('click', () => selectLanguage('en'));
document.getElementById('btn-uk').addEventListener('click', () => selectLanguage('uk'));
document.getElementById('btn-ru').addEventListener('click', () => selectLanguage('ru'));

// Инициализация Canvas
function setupCanvas() {
    canvas = document.getElementById('paintCanvas');
    ctx = canvas.getContext('2d');
    
    function getEventPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function startDraw(e) {
        isDrawing = true;
        const pos = getEventPos(e);
        lastX = pos.x;
        lastY = pos.y;
        currentStroke = [{ x: lastX, y: lastY }];
        redoStack = [];
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getEventPos(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        
        const color = document.getElementById('brushColor').value;
        const size = document.getElementById('brushSize').value;
        const opacity = document.getElementById('brushOpacity').value;
        
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        lastX = pos.x;
        lastY = pos.y;
        currentStroke.push({ x: lastX, y: lastY });
    }

    function stopDraw() {
        if (!isDrawing) return;
        isDrawing = false;
        
        const strokeData = {
            color: document.getElementById('brushColor').value,
            size: document.getElementById('brushSize').value,
            opacity: document.getElementById('brushOpacity').value,
            points: currentStroke
        };
        
        drawingHistory.push(strokeData);
        broadcastData({ type: "paint-stroke", stroke: strokeData });
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);

    document.getElementById('undoBtn').addEventListener('click', () => handleUndo(true));
    document.getElementById('redoBtn').addEventListener('click', () => handleRedo(true));
    document.getElementById('clearBtn').addEventListener('click', () => handleClear(true));
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory.forEach(stroke => {
        if (stroke.points.length < 1) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for(let i=1; i<stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
    });
    ctx.globalAlpha = 1.0; 
}

function handleUndo(isLocal = false) {
    if (drawingHistory.length > 0) {
        const removed = drawingHistory.pop();
        redoStack.push(removed);
        redrawCanvas();
        if (isLocal) broadcastData({ type: "paint-undo" });
    }
}

function handleRedo(isLocal = false) {
    if (redoStack.length > 0) {
        const restored = redoStack.pop();
        drawingHistory.push(restored);
        redrawCanvas();
        if (isLocal) broadcastData({ type: "paint-redo" });
    }
}

function handleClear(isLocal = false) {
    drawingHistory = [];
    redoStack = [];
    redrawCanvas();
    if (isLocal) broadcastData({ type: "paint-clear" });
}

// Запрос медиа-ресурсов (Камера + Микрофон)
async function requestMediaStream() {
    statusText.innerText = translations[currentLang].statusMicRequest;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: currentFacingMode }
        });
        log("Доступ к камере и микрофону успешно получен.");
        joinBtn.removeAttribute('disabled');
        statusText.innerText = translations[currentLang].statusWait;
        
        createVideoWindow("local-me", localStream, `${myNickname} (${currentLang === 'en' ? 'Me' : 'Я'})`, true);
        trackVoiceVolume(localStream, "local-me");

    } catch (err) {
        log(`${translations[currentLang].micNeeded} (${err.name})`, "error");
        statusText.innerText = translations[currentLang].errPermission;
    }
}

// Надежный поиск свободного слота в комнате
async function discoverAvailableRoomSlot() {
    statusText.innerText = translations[currentLang].statusNetConnect;
    
    const slotsToTest = Array.from({length: MAX_SLOTS}, (_, i) => i + 1);
    slotsToTest.sort(() => Math.random() - 0.5); // Рандомизация порядка проверки слотов

    for (let slot of slotsToTest) {
        const checkId = ROOM_BASE_PREFIX + slot;
        log(`Проверяем доступность слота #${slot}...`);
        const available = await verifyPeerIdAvailability(checkId);
        
        if (available) {
            mySlotIndex = slot;
            MY_UNIQUE_HASH = Math.random().toString(36).substring(2, 9);
            FULL_PEER_ID = checkId; 
            log(`Выделен свободный слот комнаты: #${mySlotIndex} (ID: ${FULL_PEER_ID})`);
            return;
        }
        await new Promise(r => setTimeout(r, 250)); // Пауза для снижения нагрузки на сигнальный сервер
    }
    
    mySlotIndex = Math.floor(Math.random() * 90) + 10;
    FULL_PEER_ID = ROOM_BASE_PREFIX + "overflow-" + mySlotIndex;
    log(`Все основные слоты заняты. Вход под слотом #${mySlotIndex}`, "warn");
}

function verifyPeerIdAvailability(targetId) {
    return new Promise((resolve) => {
        const probeHash = Math.random().toString(36).substring(2, 6);
        const testPeer = new Peer(`${targetId}-probe-${probeHash}`, { 
            debug: 1,
            config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
        });
        
        let resolved = false;

        testPeer.on('open', () => {
            if (!resolved) {
                resolved = true;
                testPeer.destroy();
                resolve(true); 
            }
        });

        testPeer.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                testPeer.destroy();
                resolve(false); 
            }
        });

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                testPeer.destroy();
                resolve(true); 
            }
        }, 1500);
    });
}

// Инициализация WebRTC Mesh сети
function initializeMeshConference() {
    peer = new Peer(FULL_PEER_ID, { debug: 1 });

    peer.on('open', (id) => {
        log(`Успешная регистрация на сигнальном сервере. Мой Peer ID: ${id}`);
        statusText.innerText = translations[currentLang].statusConnected;
        joinBtn.style.display = 'none';
        muteBtn.style.display = 'inline-block';
        camBtn.style.display = 'inline-block';
        chatContainer.style.display = 'flex';
        paintContainer.style.display = 'block';
        setupCanvas();

        establishMeshLinks();
    });

    peer.on('call', (call) => {
        log(`Получен входящий медиазвонок от: ${call.peer}`);
        call.answer(localStream);
        
        call.on('stream', (remoteStream) => {
            log(`Получен удаленный медиапоток от ${call.peer}`);
            createVideoWindow(call.peer, remoteStream, `User #${call.peer.replace(ROOM_BASE_PREFIX, "")}`);
            trackVoiceVolume(remoteStream, call.peer);
            
            if (!connectedPeersRegistry[call.peer]) {
                connectedPeersRegistry[call.peer] = {};
            }
            connectedPeersRegistry[call.peer].call = call;
        });

        call.on('close', () => removeVideoWindow(call.peer));
        call.on('error', () => removeVideoWindow(call.peer));
    });

    peer.on('connection', (conn) => {
        log(`Установлен входящий канал данных с: ${conn.peer}`);
        setupDataChannelListeners(conn);
    });

    peer.on('error', (err) => {
        log(`Критическая ошибка PeerJS: ${err.type}`, "error");
    });
}

function establishMeshLinks() {
    for (let slot = 1; slot <= MAX_SLOTS; slot++) {
        const targetPeerId = ROOM_BASE_PREFIX + slot;
        if (targetPeerId === FULL_PEER_ID) continue; 

        log(`Пробуем связаться со слотом #${slot}...`);
        
        const conn = peer.connect(targetPeerId, { reliable: true });
        setupDataChannelListeners(conn);

        const call = peer.call(targetPeerId, localStream);
        if (call) {
            if (!connectedPeersRegistry[targetPeerId]) {
                connectedPeersRegistry[targetPeerId] = {};
            }
            connectedPeersRegistry[targetPeerId].call = call;

            call.on('stream', (remoteStream) => {
                log(`Получен ответный медиапоток от ${targetPeerId}`);
                createVideoWindow(targetPeerId, remoteStream, `User #${slot}`);
                trackVoiceVolume(remoteStream, targetPeerId);
            });

            call.on('close', () => removeVideoWindow(targetPeerId));
            call.on('error', () => removeVideoWindow(targetPeerId));
        }
    }
}

function setupDataChannelListeners(conn) {
    if (!connectedPeersRegistry[conn.peer]) {
        connectedPeersRegistry[conn.peer] = {};
    }
    connectedPeersRegistry[conn.peer].dataChannel = conn;

    conn.on('open', () => {
        log(`Канал обмена данными активен с: ${conn.peer}`);
        conn.send({ type: "mic-status", peerId: FULL_PEER_ID, muted: isMuted });
    });

    conn.on('data', (data) => {
        if (data.type === "chat") {
            appendChatMessage(data.sender, data.text);
        } else if (data.type === "paint-stroke") {
            drawingHistory.push(data.stroke);
            redrawCanvas();
        } else if (data.type === "paint-undo") {
            handleUndo(false);
        } else if (data.type === "paint-redo") {
            handleRedo(false);
        } else if (data.type === "paint-clear") {
            handleClear(false);
        } else if (data.type === "mic-status") {
            updateRemoteMicIcon(data.peerId, data.muted);
        }
    });

    conn.on('close', () => {
        log(`Канал данных закрыт участником: ${conn.peer}`);
        if (connectedPeersRegistry[conn.peer]) {
            delete connectedPeersRegistry[conn.peer].dataChannel;
        }
    });
}

function broadcastData(payload) {
    Object.keys(connectedPeersRegistry).forEach(peerId => {
        const conn = connectedPeersRegistry[peerId].dataChannel;
        if (conn && conn.open) {
            conn.send(payload);
        }
    });
}

// Детекция голоса (анализатор Web Audio API)
function trackVoiceVolume(stream, peerId) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function checkVolume() {
            const wrapper = document.getElementById(`wrap-${peerId}`);
            if (!wrapper) return; 

            analyser.getByteFrequencyData(dataArray);
            
            let total = 0;
            for (let i = 0; i < bufferLength; i++) {
                total += dataArray[i];
            }
            const average = total / bufferLength;

            if (average > 20) {
                wrapper.classList.add('speaking');
            } else {
                wrapper.classList.remove('speaking');
            }

            requestAnimationFrame(checkVolume);
        }

        checkVolume();
    } catch (e) {
        console.error("Audio Analyser Error:", e);
    }
}

// Создание контейнеров для видео
function createVideoWindow(peerId, stream, defaultLabel, isLocal = false) {
    if (document.getElementById(`wrap-${peerId}`)) return;

    const wrapper = document.createElement('div');
    wrapper.id = `wrap-${peerId}`;
    wrapper.className = 'video-wrapper';
    if (isLocal) wrapper.classList.add('my-video');

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    if (isLocal) video.muted = true; 

    const label = document.createElement('div');
    label.className = 'video-label';
    label.innerText = defaultLabel;

    const micIcon = document.createElement('div');
    micIcon.id = `micicon-${peerId}`;
    micIcon.className = 'mic-status-icon';
    micIcon.innerText = "🎙️❌";

    wrapper.appendChild(video);
    wrapper.appendChild(label);
    wrapper.appendChild(micIcon);
    videoGrid.appendChild(wrapper);

    video.play().catch(err => {
        log("Браузер приостановил автоплей видео.", "warn");
        overlay.style.display = 'flex';
    });
}

function removeVideoWindow(peerId) {
    const wrapper = document.getElementById(`wrap-${peerId}`);
    if (wrapper) {
        wrapper.remove();
        log(`Окно медиапотока удалено: ${peerId}`);
    }
    if (connectedPeersRegistry[peerId]) {
        delete connectedPeersRegistry[peerId];
    }
}

function updateRemoteMicIcon(peerId, isRemoteMuted) {
    const micIcon = document.getElementById(`micicon-${peerId}`);
    if (micIcon) {
        micIcon.style.display = isRemoteMuted ? 'flex' : 'none';
    }
}

// Текстовый чат
function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const myDisplaySender = `Slot #${mySlotIndex}`;
    appendChatMessage(myDisplaySender, text);
    broadcastData({ type: "chat", sender: myDisplaySender, text: text });
    
    chatInput.value = "";
}

function appendChatMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg';
    msgDiv.innerHTML = `<span class="sender" style="color:#cba6f7">${sender}:</span><span>${text}</span>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendMsgBtn.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendMessage();
});

// Кнопка переключения микрофона
muteBtn.addEventListener('click', () => {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;
    
    muteBtn.innerText = isMuted ? translations[currentLang].btnUnmute : translations[currentLang].btnMute;
    if (isMuted) {
        muteBtn.classList.add('muted');
    } else {
        muteBtn.classList.remove('muted');
    }

    updateRemoteMicIcon("local-me", isMuted);
    broadcastData({ type: "mic-status", peerId: FULL_PEER_ID, muted: isMuted });
    log(isMuted ? "Микрофон отключен." : "Микрофон включен.");
});

// Кнопка переключения камеры
camBtn.addEventListener('click', () => {
    if (!localStream) return;
    isCamOff = !isCamOff;
    localStream.getVideoTracks()[0].enabled = !isCamOff;

    camBtn.innerText = isCamOff ? translations[currentLang].btnCamStart : translations[currentLang].btnCamStop;
    if (isCamOff) {
        camBtn.classList.add('off');
        log("Камера отключена.");
    } else {
        camBtn.classList.remove('off');
        log("Камера включена.");
    }
});

// Вход в комнату
joinBtn.addEventListener('click', async () => {
    joinBtn.setAttribute('disabled', 'true');
    await discoverAvailableRoomSlot();
    initializeMeshConference();
});

// Оверлей звука
audioActivateBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    document.querySelectorAll('video').forEach(video => {
        video.play().catch(err => console.log("Ручной запуск видео не удался:", err));
    });
});

// Открытие логов
toggleLogBtn.addEventListener('click', () => {
    if (logSection.style.display === 'block') {
        logSection.style.display = 'none';
        toggleLogBtn.innerText = translations[currentLang].logHidden;
    } else {
        logSection.style.display = 'block';
        toggleLogBtn.innerText = translations[currentLang].logShown;
    }
});

copyLogBtn.addEventListener('click', () => {
    const textToCopy = logDiv.innerText || logDiv.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => showCopiedFeedback())
            .catch(() => executeFallbackCopy(textToCopy));
    } else {
        executeFallbackCopy(textToCopy);
    }
});

function executeFallbackCopy(text) {
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
        console.error("Ошибка копирования логов", err);
    }
    document.body.removeChild(textArea);
}

function showCopiedFeedback() {
    const originalText = copyLogBtn.innerText;
    copyLogBtn.innerText = translations[currentLang].btnCopied;
    copyLogBtn.style.borderColor = '#a6e3a1';
    copyLogBtn.style.color = '#a6e3a1';
    setTimeout(() => {
        copyLogBtn.innerText = originalText;
        copyLogBtn.style.borderColor = '#45475a';
        copyLogBtn.style.color = '#cdd6f4';
    }, 1500);
}

// Запуск приложения
requestMediaStream();
selectLanguage('en');
