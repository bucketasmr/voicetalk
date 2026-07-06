const ROOM_BASE = "global-mesh-room-2026"; // Название комнаты
let peer = null;
let localStream = null;
let isMuted = false;
let currentFacingMode = "user"; 
let myNickname = "User";
let myAssignedSlot = null;

// Хранилища для контроля активных пиров до 6 человек
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
        title: "Multi-User Video & Paint Room",
        badge: "Room max: 6 members",
        btnJoin: "Join Room",
        statusWait: "Click button to connect...",
        statusMicRequest: "Requesting 720p HD stream...",
        statusNetConnect: "Searching for free slot in room...",
        statusConnected: "Connected! Slot ",
        modalText: "Your browser blocked background audio. Click to activate stream.",
        modalBtn: "Unmute Audio",
        micNeeded: "Camera/Microphone access is required!",
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
        joinedChat: "joined the chat.",
        leftChat: "left the chat.",
        lblMe: "You",
        btnClear: "🗑️ Clear"
    },
    uk: {
        title: "Груповий відео та арт-чат (до 6 чол)",
        badge: "Кімната: максимум 6 осіб",
        btnJoin: "Увійти в кімнату",
        statusWait: "Натисніть кнопку для підключення...",
        statusMicRequest: "Запит HD потоку 720p...",
        statusNetConnect: "Пошук вільного слоту в кімнаті...",
        statusConnected: "Підключено! Слот ",
        modalText: "Браузер заблокував звук у фоні. Натисніть для активації потоку.",
        modalBtn: "Увімкнути звук",
        micNeeded: "Потрібен доступ до камери та мікрофона!",
        btnCopy: "Скопіювати логи",
        btnCopied: "Скопійовано!",
        btnMute: "Вимкнути мік.",
        btnUnmute: "Увімкнути мік." ,
        namePrompt: "Введіть ваше ім'я для старту:",
        namePlaceholder: "Ваше ім'я...",
        chatPlaceholder: "Напишіть повідомлення...",
        chatSend: "Надісл.",
        btnShowLog: "Показити консоль логів",
        btnHideLog: "Приховати консоль логів",
        systemLabel: "Система",
        joinedChat: "приєднується до чату.",
        leftChat: "покинув чат.",
        lblMe: "Ви",
        btnClear: "🗑️ Очистити"
    },
    ru: {
        title: "Групповой видео и арт-чат (до 6 чел)",
        badge: "Комната: максимум 6 человек",
        btnJoin: "Войти в комнату",
        statusWait: "Нажмите кнопку для подключения...",
        statusMicRequest: "Запрос HD потока 720p...",
        statusNetConnect: "Поиск свободного слота в комнате...",
        statusConnected: "Подключено! Слот ",
        modalText: "Браузер заблокировал звук в фоне. Нажмите для активации потоку.",
        modalBtn: "Включить звук",
        micNeeded: "Нужен доступ к камере и микрофону!",
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
        joinedChat: "присоединяется к чату.",
        leftChat: "покинул чат.",
        lblMe: "Вы",
        btnClear: "🗑️ Очистить"
    }
};

let currentLang = 'en';

const joinBtn = document.getElementById('joinBtn');
const muteBtn = document.getElementById('muteBtn');
const flipCamBtn = document.getElementById('flipCamBtn');
const statusText = document.getElementById('statusText');
const logDiv = document.getElementById('log');
const copyLogBtn = document.getElementById('copyLogBtn');
const overlay = document.getElementById('audioActivationOverlay');
const modalBtn = document.getElementById('audioActivateBtn');
const modalTxt = document.getElementById('txt-modal-alert');

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
    
    document.getElementById('lbl-local') ? document.getElementById('lbl-local').innerText = `${translations[currentLang].lblMe} (${myNickname})` : null;
    toggleLogBtn.innerText = logsVisible ? translations[lang].btnHideLog : translations[lang].btnShowLog;
    if (!copyLogBtn.innerText.includes('!')) copyLogBtn.innerText = translations[lang].btnCopy;
    if (!joinBtn.disabled) joinBtn.innerText = translations[lang].btnJoin;
    updateStatusText();
}

function updateStatusText() {
    if (peer && !peer.destroyed && localStream) {
        statusText.innerText = `${translations[currentLang].statusConnected}#${myAssignedSlot} (Total: ${activeCalls.size + 1}/6)`;
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

saveNameBtn.addEventListener('click', () => {
    if (usernameInput.value.trim().length > 0) myNickname = usernameInput.value.trim();
    nameSetupOverlay.style.display = 'none';
    log(`User identity locked: "${myNickname}"`, "success");
    initCanvas();
});

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

joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    statusText.innerText = translations[currentLang].statusMicRequest;
    log(`Requesting WebRTC camera and mic streams...`, "info");
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true }, 
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: currentFacingMode } 
        });
        
        log("Camera and Mic hardware streams grabbed successfully", "success");
        createVideoContainer('local', localStream, `${translations[currentLang].lblMe} (${myNickname})`, true);
        
        statusText.innerText = translations[currentLang].statusNetConnect;
        muteBtn.style.display = 'block'; flipCamBtn.style.display = 'block';
        chatContainer.style.display = 'block'; paintContainer.style.display = 'block';
        
        tryFindFreeSlotAndConnect(1);
    } catch (err) {
        log(`Media interface crash: ${err.message}`, "error");
        statusText.innerText = translations[currentLang].micNeeded;
        joinBtn.disabled = false;
    }
});

// Безопасный перебор слотов от 1 до 6 без использования listAllPeers
function tryFindFreeSlotAndConnect(slotNum) {
    if (slotNum > 6) {
        log("Room capacity full! Maximum 6 active slots reached.", "error");
        statusText.innerText = "Room Full (Max 6)";
        return;
    }

    const testTargetId = `${ROOM_BASE}-slot-${slotNum}`;
    log(`Checking occupancy state for room slot #${slotNum}...`, "info");

    let tempPeer = new Peer(testTargetId, peerConfig);

    tempPeer.on('open', () => {
        // Слот оказался СВОБОДЕН! Мы успешно заняли его.
        log(`Slot #${slotNum} is free! Node bound to identity: [${testTargetId}]`, "success");
        peer = tempPeer;
        myAssignedSlot = slotNum;
        updateStatusText();

        // Настраиваем логику для нашего постоянного пира
        setupPeerListeners();

        // Опрашиваем и звоним во все ОСТАЛЬНЫЕ слоты (которые могут быть заняты другими)
        for (let s = 1; s <= 6; s++) {
            if (s !== myAssignedSlot) {
                probeAndConnectToActiveSlot(s);
            }
        }
    });

    tempPeer.on('error', (err) => {
        tempPeer.destroy();
        // Ошибка 'unavailable-id' означает, что слот уже занят кем-то другим
        if (err.type === 'unavailable-id') {
            log(`Slot #${slotNum} is occupied. Checking next slot...`, "info");
            tryFindFreeSlotAndConnect(slotNum + 1);
        } else {
            log(`Unexpected driver interrupt checking slot: ${err.message}`, "error");
        }
    });
}

function setupPeerListeners() {
    peer.on('call', (call) => {
        log(`Incoming call request from remote slot: ${call.peer}`, "info");
        call.answer(localStream);
        bindCallEvents(call);
    });

    peer.on('connection', (dataConn) => {
        log(`Incoming data channel synchronized from slot: ${dataConn.peer}`, "info");
        bindDataConnectionEvents(dataConn);
    });

    peer.on('error', (err) => {
        log(`Global node error: ${err.type} - ${err.message}`, "error");
    });
}

// Пытаемся подключиться к другому слоту данных. Если он активен — связываемся
function probeAndConnectToActiveSlot(targetSlotNum) {
    const targetPeerId = `${ROOM_BASE}-slot-${targetSlotNum}`;
    
    // Подключаем канал обмена сообщениями и рисования
    const dataConn = peer.connect(targetPeerId, { reliable: true });
    bindDataConnectionEvents(dataConn);

    // Инициируем медиа-звонок
    const call = peer.call(targetPeerId, localStream);
    bindCallEvents(call);
}

function bindCallEvents(call) {
    activeCalls.set(call.peer, call);

    call.on('stream', (remoteStream) => {
        log(`Video/Audio track received from slot: ${call.peer}`, "success");
        const name = peerNicknames.get(call.peer) || `Slot ${call.peer.split('-').pop()}`;
        createVideoContainer(call.peer, remoteStream, name, false);
        updateStatusText();
    });

    call.on('close', () => handlePeerDisconnect(call.peer));
    call.on('error', () => handlePeerDisconnect(call.peer));
}

function bindDataConnectionEvents(dataConn) {
    activeDataConns.set(dataConn.peer, dataConn);

    dataConn.on('open', () => {
        log(`Data channel pipe opened with slot: ${dataConn.peer}`, "success");
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
            if (drawingHistory.length > 0) { redoStack.push(drawingHistory.pop()); redrawCanvas(); }
        } else if (data.type === 'paint-redo') {
            if (redoStack.length > 0) { drawingHistory.push(redoStack.pop()); redrawCanvas(); }
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
    
    const name = peerNicknames.get(peerId) || `Slot ${peerId.split('-').pop()}`;
    if (peerNicknames.has(peerId)) {
        appendChatMessage(translations[currentLang].systemLabel, `${name} ${translations[currentLang].leftChat}`, '#f38ba8', true);
        peerNicknames.delete(peerId);
    }
    document.getElementById(`box-${peerId}`)?.remove();
    updateStatusText();
    log(`Ecosystem clean-up complete for node: ${peerId}`, "info");
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

muteBtn.addEventListener('click', () => {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
    muteBtn.classList.toggle('muted', isMuted);
    muteBtn.innerText = isMuted ? translations[currentLang].btnUnmute : translations[currentLang].btnMute;
});

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
    } catch (err) { log(`Hot-swap camera crashed: ${err.message}`, "error"); }
});

modalBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    videoGrid.querySelectorAll('video').forEach(v => v.play().catch(() => {}));
});

toggleLogBtn.addEventListener('click', () => {
    logsVisible = !logsVisible;
    logSection.style.display = logsVisible ? 'block' : 'none';
    toggleLogBtn.innerText = logsVisible ? translations[currentLang].btnHideLog : translations[currentLang].btnShowLog;
    if (logsVisible) logSection.scrollIntoView({ behavior: 'smooth' });
});

copyLogBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(logDiv.innerText || logDiv.textContent).then(() => {
        copyLogBtn.innerText = translations[currentLang].btnCopied;
        setTimeout(() => copyLogBtn.innerText = translations[currentLang].btnCopy, 2000);
    });
});
