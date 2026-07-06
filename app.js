const ROOM_ID_BASE = "global-mesh-room-2026-bridge"; 
let peer = null;
let localStream = null;
let isMuted = false;
let isCamOff = false; // Состояние камеры
let isHostMode = false; // Запоминаем роль для функции Fix
let currentFacingMode = "user"; 
let myNickname = "User";

// Хранилища для соединений (поддержка мульти-подключений)
const activeCalls = new Map();             // peerId -> MediaConnection
const activeDataConns = new Map();         // peerId -> DataConnection
const peerNicknames = new Map();           // peerId -> string

// Переменные для рисования холста
let canvas, ctx;
let isDrawing = false;
let lastX = 0; let lastY = 0;
let currentStroke = null;
let drawingHistory = []; 
let redoStack = [];

const translations = {
    en: {
        title: "P2P Video & Paint Room",
        badge: "Direct Mesh Bridge",
        statusWait: "Choose your role below to initialize...",
        statusMicRequest: "Requesting 720p HD stream...",
        statusNetConnect: "Registering Node on signaling server...",
        statusConnected: "Connected Live! Peers: ",
        modalText: "Your browser blocked background audio. Click to activate stream.",
        modalBtn: "Unmute Audio",
        micNeeded: "Camera/Microphone access is required!",
        btnCopy: "Copy Logs",
        btnCopied: "Copied!",
        btnMute: "Mute Mic",
        btnUnmute: "Unmute Mic",
        btnCamOff: "Turn Off Cam",
        btnCamOn: "Turn On Cam",
        namePrompt: "Enter nickname & select role:",
        namePlaceholder: "Your name...",
        chatPlaceholder: "Type a message...",
        chatSend: "Send",
        btnShowLog: "Show Console Logs",
        btnHideLog: "Hide Console Logs",
        systemLabel: "System",
        joinedChat: "joined the chat.",
        leftChat: "left the chat.",
        lblMe: "You",
        btnClear: "🗑️ Clear"
    },
    uk: {
        title: "P2P Відео та Арт-Кімната",
        badge: "Прямий Mesh Міст",
        statusWait: "Оберіть роль нижче для ініціалізації...",
        statusMicRequest: "Запит HD потоку 720p...",
        statusNetConnect: "Реєстрація вузла на сервері...",
        statusConnected: "У мережі! Учасники: ",
        modalText: "Браузер заблокував звук. Натисніть для активації потоку.",
        modalBtn: "Увімкнути звук",
        micNeeded: "Потрібен доступ до камери та мікрофона!",
        btnCopy: "Скопіювати логи",
        btnCopied: "Скопійовано!",
        btnMute: "Вимкнути мік.",
        btnUnmute: "Увімкнути мік.",
        btnCamOff: "Вимк. камеру",
        btnCamOn: "Увімк. камеру",
        namePrompt: "Введіть ім'я та оберіть роль:",
        namePlaceholder: "Ваше ім'я...",
        chatPlaceholder: "Напишіть повідомлення...",
        chatSend: "Надісл.",
        btnShowLog: "Показати консоль логів",
        btnHideLog: "Приховати консоль логів",
        systemLabel: "Система",
        joinedChat: "приєднується до чату.",
        leftChat: "покинув чат.",
        lblMe: "Ви",
        btnClear: "🗑️ Очистити"
    },
    ru: {
        title: "P2P Видео и Арт-Комната",
        badge: "Прямой Mesh Мост",
        statusWait: "Выберите роль ниже для инициализации...",
        statusMicRequest: "Запрос HD потока 720p...",
        statusNetConnect: "Регистрация узла на сервере...",
        statusConnected: "В сети! Участники: ",
        modalText: "Браузер заблокировал звук. Нажмите для активации потока.",
        modalBtn: "Включить звук",
        micNeeded: "Нужен доступ к камере и микрофону!",
        btnCopy: "Скопировать логи",
        btnCopied: "Скопировано!",
        btnMute: "Выключить мик.",
        btnUnmute: "Включить мик.",
        btnCamOff: "Выкл. камеру",
        btnCamOn: "Вкл. камеру",
        namePrompt: "Введите имя и выберите роль:",
        namePlaceholder: "Ваше имя...",
        chatPlaceholder: "Напишите сообщение...",
        chatSend: "Отпр.",
        btnShowLog: "Показать консоль логов",
        btnHideLog: "Скрыть консоль логов",
        systemLabel: "Система",
        joinedChat: "присоединяется к чату.",
        leftChat: "покинул чат.",
        lblMe: "Вы",
        btnClear: "🗑️ Очистити"
    }
};

let currentLang = 'en';

const muteBtn = document.getElementById('muteBtn');
const camBtn = document.getElementById('camBtn');
const flipCamBtn = document.getElementById('flipCamBtn');
const fixBtn = document.getElementById('fixBtn');
const statusText = document.getElementById('statusText');
const logDiv = document.getElementById('log');
const copyLogBtn = document.getElementById('copyLogBtn');
const overlay = document.getElementById('audioActivationOverlay');
const modalBtn = document.getElementById('audioActivateBtn');
const modalTxt = document.getElementById('txt-modal-alert');

const nameSetupOverlay = document.getElementById('nameSetupOverlay');
const usernameInput = document.getElementById('usernameInput');
const txtNamePrompt = document.getElementById('txt-name-prompt');

const chatContainer = document.getElementById('chatContainer');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');

const toggleLogBtn = document.getElementById('toggleLogBtn');
const logSection = document.getElementById('logSection');
const videoGrid = document.getElementById('videoGrid');
const paintContainer = document.getElementById('paintContainer');

const brushColorInput = document.getElementById('brushColor');
const brushSizeInput = document.getElementById('brushSize');
const brushOpacityInput = document.getElementById('brushOpacity');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');

let logsVisible = false;

function log(msg, type = 'info') {
    let timestamp = new Date().toLocaleTimeString();
    let prefix = `[${timestamp}] ` + (type === 'error' ? `❌ ERROR: ` : type === 'success' ? `✅ OK: ` : `> `);
    logDiv.innerHTML += `<br><span style="color: ${type === 'error' ? '#f38ba8' : type === 'success' ? '#a6e3a1' : '#f5e0dc'}">${prefix}${msg}</span>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function changeLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${lang}`)?.classList.add('active');

    document.getElementById('txt-title').innerText = translations[lang].title;
    document.getElementById('txt-badge').innerText = translations[lang].badge;
    modalBtn.innerText = translations[lang].modalBtn;
    modalTxt.innerText = translations[lang].modalText;
    txtNamePrompt.innerText = translations[lang].namePrompt;
    usernameInput.placeholder = translations[lang].namePlaceholder;
    chatInput.placeholder = translations[lang].chatPlaceholder;
    sendMsgBtn.innerText = translations[lang].chatSend;
    clearBtn.innerText = translations[lang].btnClear;
    
    muteBtn.innerText = isMuted ? translations[currentLang].btnUnmute : translations[currentLang].btnMute;
    camBtn.innerText = isCamOff ? translations[currentLang].btnCamOn : translations[currentLang].btnCamOff;
    
    document.getElementById('lbl-local') ? document.getElementById('lbl-local').innerText = `${translations[currentLang].lblMe} (${myNickname})` : null;
    toggleLogBtn.innerText = logsVisible ? translations[lang].btnHideLog : translations[lang].btnShowLog;
    if (!copyLogBtn.innerText.includes('!')) copyLogBtn.innerText = translations[lang].btnCopy;
    updateStatusText();
}

function updateStatusText() {
    if (peer && !peer.destroyed && localStream) {
        statusText.innerText = `${translations[currentLang].statusConnected} ${activeCalls.size + 1} node(s) live`;
    }
}

function detectDeviceLanguage() {
    const shortLang = (navigator.language || navigator.userLanguage).substring(0, 2).toLowerCase();
    if (shortLang === 'uk' || shortLang === 'ua') changeLanguage('uk');
    else if (shortLang === 'ru') changeLanguage('ru');
    else changeLanguage('en');
}
detectDeviceLanguage();

function initCanvas() {
    if (canvas) return; // Инициализируем холст только один раз
    log("Initializing shared Canvas graphic buffer...", "info");
    canvas = document.getElementById('paintCanvas');
    ctx = canvas.getContext('2d');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', (e) => {
        const t = e.touches[0]; canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY }));
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
        const t = e.touches[0]; canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY }));
    }, { passive: true });
    canvas.addEventListener('touchend', () => canvas.dispatchEvent(new MouseEvent('mouseup', {})), { passive: true });
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getCanvasCoordinates(e);
    lastX = coords.x; lastY = coords.y;
    currentStroke = {
        id: "stroke-" + Math.random().toString(36).substring(2, 9),
        color: brushColorInput.value,
        size: parseInt(brushSizeInput.value),
        opacity: parseFloat(brushOpacityInput.value),
        points: [{ x: lastX, y: lastY }]
    };
}

function draw(e) {
    if (!isDrawing) return;
    const coords = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.strokeStyle = convertHexToRGBA(currentStroke.color, currentStroke.opacity);
    ctx.lineWidth = currentStroke.size;
    ctx.moveTo(lastX, lastY); ctx.lineTo(coords.x, coords.y); ctx.stroke();
    lastX = coords.x; lastY = coords.y;
    currentStroke.points.push({ x: lastX, y: coords.y });

    broadcastToMesh({
        type: 'paint-live-draw', color: currentStroke.color, size: currentStroke.size, opacity: currentStroke.opacity,
        from: currentStroke.points[currentStroke.points.length - 2], to: { x: lastX, y: coords.y }
    });
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke && currentStroke.points.length > 0) {
        drawingHistory.push(currentStroke); redoStack = [];
        broadcastToMesh({ type: 'paint-commit-stroke', stroke: currentStroke });
    }
    currentStroke = null;
}

function convertHexToRGBA(hex, opacity) {
    return `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${opacity})`;
}

function redrawCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory.forEach(stroke => {
        if (stroke.points.length < 1) return;
        ctx.beginPath(); ctx.strokeStyle = convertHexToRGBA(stroke.color, stroke.opacity); ctx.lineWidth = stroke.size;
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        ctx.stroke();
    });
}

undoBtn.addEventListener('click', () => {
    if (drawingHistory.length === 0) return;
    redoStack.push(drawingHistory.pop()); redrawCanvas();
    broadcastToMesh({ type: 'paint-undo' });
});
redoBtn.addEventListener('click', () => {
    if (redoStack.length === 0) return;
    drawingHistory.push(redoStack.pop()); redrawCanvas();
    broadcastToMesh({ type: 'paint-redo' });
});
clearBtn.addEventListener('click', () => {
    drawingHistory = []; redoStack = []; ctx.clearRect(0, 0, canvas.width, canvas.height);
    broadcastToMesh({ type: 'paint-clear' });
});

// Добавляем кнопки выбора роли прямо в стартовое окно
const btnGroup = document.createElement('div');
btnGroup.style.display = 'flex'; btnGroup.style.gap = '10px'; btnGroup.style.marginTop = '15px';
const hostBtn = document.createElement('button'); hostBtn.className = 'main-btn'; hostBtn.innerText = 'Start as HOST';
const guestBtn = document.createElement('button'); guestBtn.className = 'main-btn'; guestBtn.style.background = '#89b4fa'; guestBtn.innerText = 'Join as GUEST';

btnGroup.appendChild(hostBtn); btnGroup.appendChild(guestBtn);
nameSetupOverlay.querySelector('.name-card').appendChild(btnGroup);

hostBtn.addEventListener('click', () => { isHostMode = true; initializeRoomNode(true); });
guestBtn.addEventListener('click', () => { isHostMode = false; initializeRoomNode(false); });

const peerConfig = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        iceCandidatePoolSize: 10
    }
};

async function initializeRoomNode(isHost) {
    if (usernameInput.value.trim().length > 0) myNickname = usernameInput.value.trim();
    nameSetupOverlay.style.display = 'none';
    log(`User identity locked: "${myNickname}"`, "success");
    initCanvas();

    statusText.innerText = translations[currentLang].statusMicRequest;
    log(`Requesting WebRTC camera and mic streams...`, "info");
    
    try {
        // Закрываем прошлые треки, если они были запущены (актуально для Fix)
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true }, 
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: currentFacingMode } 
        });
        
        // Применяем текущие настройки глушения/выключения видео
        localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
        localStream.getVideoTracks().forEach(track => track.enabled = !isCamOff);

        log("Camera and Mic hardware streams grabbed successfully", "success");
        createVideoContainer('local', localStream, `${translations[currentLang].lblMe} (${myNickname})`, true);
        
        statusText.innerText = translations[currentLang].statusNetConnect;
        
        // Показываем элементы управления
        muteBtn.style.display = 'block';
        camBtn.style.display = 'block';
        flipCamBtn.style.display = 'block';
        fixBtn.style.display = 'block';
        
        chatContainer.style.display = 'block'; 
        paintContainer.style.display = 'block';
        
        const myNodeId = isHost ? `${ROOM_ID_BASE}-host` : `${ROOM_ID_BASE}-guest-${Math.random().toString(36).substring(2, 6)}`;
        log(`Registering P2P identity: [${myNodeId}]`, "info");

        if (peer) { peer.destroy(); } // Чистим старый инстанс при фиксе

        peer = new Peer(myNodeId, peerConfig);

        peer.on('open', () => {
            log(`Ecosystem Node live on signaling platform.`, "success");
            updateStatusText();

            if (!isHost) {
                const hostTargetId = `${ROOM_ID_BASE}-host`;
                log(`Guest mode active. Connecting directly to Host: [${hostTargetId}]`, "info");
                connectToTargetNode(hostTargetId);
            } else {
                log(`Host mode active. Listening for connections from incoming devices...`, "info");
            }
        });

        peer.on('call', (call) => {
            log(`Incoming WebRTC stream request from: ${call.peer}`, "info");
            call.answer(localStream);
            bindCallEvents(call);
        });

        peer.on('connection', (dataConn) => {
            log(`Incoming Data sync pipeline requested from: ${dataConn.peer}`, "info");
            bindDataConnectionEvents(dataConn);
        });

        peer.on('error', (err) => {
            log(`Global node error: ${err.type} - ${err.message}`, "error");
        });

    } catch (err) {
        log(`Media interface crash: ${err.message}`, "error");
        statusText.innerText = translations[currentLang].micNeeded;
    }
}

function connectToTargetNode(targetId) {
    const dataConn = peer.connect(targetId, { reliable: true });
    bindDataConnectionEvents(dataConn);

    const call = peer.call(targetId, localStream);
    bindCallEvents(call);
}

function bindCallEvents(call) {
    activeCalls.set(call.peer, call);

    call.on('stream', (remoteStream) => {
        log(`Video/Audio track received from node: ${call.peer}`, "success");
        const name = peerNicknames.get(call.peer) || (call.peer.includes('-host') ? 'Host' : 'Guest');
        createVideoContainer(call.peer, remoteStream, name, false);
        updateStatusText();
    });

    call.on('close', () => handlePeerDisconnect(call.peer));
    call.on('error', () => handlePeerDisconnect(call.peer));
}

function bindDataConnectionEvents(dataConn) {
    activeDataConns.set(dataConn.peer, dataConn);

    dataConn.on('open', () => {
        log(`Data channel pipe opened with: ${dataConn.peer}`, "success");
        dataConn.send({ type: 'mesh-intro', name: myNickname });
        if (drawingHistory.length > 0) {
            dataConn.send({ type: 'paint-sync', history: drawingHistory });
        }
    });

    dataConn.on('data', (data) => {
        if (!data || typeof data !== 'object') return;

        if (data.type === 'mesh-intro') {
            peerNicknames.set(dataConn.peer, data.name);
            const label = document.getElementById(`lbl-${dataConn.peer}`);
            if (label) label.innerText = data.name;
            appendChatMessage(translations[currentLang].systemLabel, `${data.name} ${translations[currentLang].joinedChat}`, '#f5c2e7', true);
        } else if (data.type === 'text-msg') {
            appendChatMessage(data.sender, data.text, '#b4befe', false);
        } else if (data.type === 'paint-live-draw') {
            ctx.beginPath(); ctx.strokeStyle = convertHexToRGBA(data.color, data.opacity); ctx.lineWidth = data.size;
            ctx.moveTo(data.from.x, data.from.y); ctx.lineTo(data.to.x, data.to.y); ctx.stroke();
        } else if (data.type === 'paint-commit-stroke') {
            drawingHistory.push(data.stroke); redoStack = [];
        } else if (data.type === 'paint-undo') {
            if (drawingHistory.length > 0) { drawingHistory.pop(); redrawCanvas(); }
        } else if (data.type === 'paint-redo') {
            // Упрощенный синк по мешу
        } else if (data.type === 'paint-clear') {
            drawingHistory = []; redoStack = []; ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else if (data.type === 'paint-sync') {
            drawingHistory = data.history; redrawCanvas();
        }
    });

    dataConn.on('close', () => handlePeerDisconnect(dataConn.peer));
    dataConn.on('error', () => handlePeerDisconnect(dataConn.peer));
}

function createVideoContainer(id, stream, displayName, isLocal = false) {
    let box = document.getElementById(`box-${id}`);
    if (!box) {
        box = document.createElement('div'); box.id = `box-${id}`; box.className = `video-box ${isLocal ? 'local-stream' : ''}`;
        const video = document.createElement('video'); video.id = `video-${id}`; video.autoplay = true; video.playsInline = true;
        if (isLocal) video.muted = true;
        const label = document.createElement('div'); label.id = `lbl-${id}`; label.className = 'video-label'; label.innerText = displayName;
        box.appendChild(video); box.appendChild(label); videoGrid.appendChild(box);
    }
    const videoElem = document.getElementById(`video-${id}`);
    if (videoElem && videoElem.srcObject !== stream) {
        videoElem.srcObject = stream;
        videoElem.play().catch(() => { if (!isLocal) overlay.style.display = 'flex'; });
    }
}

function handlePeerDisconnect(peerId) {
    if (activeCalls.has(peerId)) { activeCalls.get(peerId).close(); activeCalls.delete(peerId); }
    if (activeDataConns.has(peerId)) { activeDataConns.get(peerId).close(); activeDataConns.delete(peerId); }
    
    const name = peerNicknames.get(peerId) || (peerId.includes('-host') ? 'Host' : 'Guest');
    if (peerNicknames.has(peerId)) {
        appendChatMessage(translations[currentLang].systemLabel, `${name} ${translations[currentLang].leftChat}`, '#f38ba8', true);
        peerNicknames.delete(peerId);
    }
    document.getElementById(`box-${peerId}`)?.remove();
    updateStatusText();
    log(`Clean-up complete for node: ${peerId}`, "info");
}

function broadcastToMesh(data) {
    activeDataConns.forEach(conn => { if (conn.open) conn.send(data); });
}

function sendTextMessage() {
    const text = chatInput.value.trim(); if (text.length === 0) return;
    appendChatMessage(myNickname, text, '#a6e3a1', false);
    chatInput.value = '';
    broadcastToMesh({ type: 'text-msg', sender: myNickname, text: text });
}

sendMsgBtn.addEventListener('click', sendTextMessage);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendTextMessage(); });

function appendChatMessage(sender, text, nameColor = '#a6e3a1', isSystem = false) {
    const msgElement = document.createElement('div');
    if (isSystem) {
        msgElement.innerHTML = `<i style="color: #9399b2;">[${translations[currentLang].systemLabel}] ${text}</i>`;
    } else {
        msgElement.innerHTML = `<strong style="color: ${nameColor}">${sender}:</strong> <span style="color: #cdd6f4;">${escapeHTML(text)}</span>`;
    }
    chatMessages.appendChild(msgElement); chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Кнопка микрофона
muteBtn.addEventListener('click', () => {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
    muteBtn.classList.toggle('muted', isMuted);
    muteBtn.innerText = isMuted ? translations[currentLang].btnUnmute : translations[currentLang].btnMute;
    log(`Microphone state shifted. Muted: ${isMuted}`, "info");
});

// Кнопка включения/выключения камеры
camBtn.addEventListener('click', () => {
    if (!localStream) return;
    isCamOff = !isCamOff;
    localStream.getVideoTracks().forEach(track => track.enabled = !isCamOff);
    camBtn.classList.toggle('muted', isCamOff);
    camBtn.innerText = isCamOff ? translations[currentLang].btnCamOn : translations[currentLang].btnCamOff;
    log(`Camera state shifted. Disabled: ${isCamOff}`, "info");
});

// Кнопка переключения селфи/основная камера
flipCamBtn.addEventListener('click', async () => {
    if (!localStream) return;
    currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
    try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: currentFacingMode }
        });
        const newTrack = tempStream.getVideoTracks()[0];
        const oldTrack = localStream.getVideoTracks()[0];
        localStream.removeTrack(oldTrack); oldTrack.stop(); localStream.addTrack(newTrack);
        
        // Сохраняем состояние активности камеры
        newTrack.enabled = !isCamOff;

        const localBox = document.getElementById('box-local');
        const localVid = document.getElementById('video-local');
        if (currentFacingMode === "environment") {
            localBox.style.transform = 'none'; localVid.style.transform = 'none';
        } else {
            localVid.style.transform = 'scaleX(-1)';
        }
        localVid.srcObject = localStream;

        activeCalls.forEach(call => {
            if (call.peerConnection) {
                const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                sender?.replaceTrack(newTrack);
            }
        });
        log(`Camera successfully flipped to: ${currentFacingMode}`, "success");
    } catch (err) { log(`Hot-swap camera crashed: ${err.message}`, "error"); }
});

// КНОПКА FIX CONNECTION: Оживление комнаты
fixBtn.addEventListener('click', () => {
    log("Fix Connection triggered. Re-initializing WebRTC stack...", "info");
    
    // Очищаем старую сетку видео участников (кроме локального, он пересоздастся)
    videoGrid.innerHTML = '';
    activeCalls.clear();
    activeDataConns.clear();
    peerNicknames.clear();

    // Запускаем переподключение с сохранением текущей роли
    initializeRoomNode(isHostMode);
});

modalBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    videoGrid.querySelectorAll('video').forEach(v => v.play().catch(() => {}));
});

toggleLogBtn.addEventListener('click', () => {
    logsVisible = !logsVisible;
    logSection.style.display = logsVisible ? 'block' : 'none';
    toggleLogBtn.innerText = logsVisible ? translations[lang].btnHideLog : translations[lang].btnShowLog;
    if (logsVisible) logSection.scrollIntoView({ behavior: 'smooth' });
});

copyLogBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(logDiv.innerText || logDiv.textContent).then(() => {
        copyLogBtn.innerText = translations[currentLang].btnCopied;
        setTimeout(() => copyLogBtn.innerText = translations[currentLang].btnCopy, 2000);
    });
});
