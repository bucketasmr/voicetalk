const ROOM_ID = "global-audio-bridge-ukraine-usa-2026"; 
let MY_GUEST_ID = "guest-" + Math.random().toString(36).substring(2, 9);

let peer = null;
let localStream = null;
let isMuted = false;
let isCamFullyOff = false; // Отслеживание полного отключения камеры
let currentFacingMode = "user"; 
let reconnectInterval = null; 
let myNickname = "User";
let isHostMode = false; // Флаг определения роли
let isReconnecting = false; // Добавьте этот флаг

const connectedPeers = new Set();
const activeDataConnections = new Set(); 

// Переменные для рисования холста
let canvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentStroke = [];

// База данных истории для Undo/Redo
let drawingHistory = []; \r\nlet redoStack = [];

const translations = {
    en: {
        title: "Global Video & Paint Chat",
        badge: \"Room: World Wide",
        btnJoin: "Join Room",
        statusWait: "Click button to connect...",
        statusMicRequest: "Requesting 720p HD stream...",
        statusNetConnect: "Connecting to international network...",
        statusHostWait: "You are Host. Waiting for friends...",
        statusGuestConnect: "Connecting to host...",
        statusActive: "Secure pipeline active with peer",
        btnMute: "Mute Audio",
        btnUnmute: "Unmute Audio",
        btnCamOff: "Kill Camera",
        btnCamOn: "Revive Camera",
        btnFlip: "Flip Optics",
        btnCopied: "✓ Link Copied",
        btnCopy: "🔗 Copy Direct Room Link",
        btnRestartAll: "🔄 Restart For All",
        placeholderChat: "Type a message...",
        btnSend: "Send",
        btnClear: "🗑️ Clear",
        placeholderNick: "Enter nickname...",
        btnSaveNick: "Save Nick",
        labelLogs: "Show Console Logs",
        labelHideLogs: "Hide Console Logs",
        btnClearLogs: "🧹 Clear Terminal"
    },
    ru: {
        title: "Глобальный Видео и Рисовальный Чат",
        badge: "Комната: Весь Мир",
        btnJoin: "Войти в комнату",
        statusWait: "Нажмите кнопку для подключения...",
        statusMicRequest: "Запрос HD-потока 720p...",
        statusNetConnect: "Подключение к международной сети...",
        statusHostWait: "Вы Хост. Ожидание друзей...",
        statusGuestConnect: "Подключение к хосту...",
        statusActive: "Безопасный канал активен с участником",
        btnMute: "Выкл. Звук",
        btnUnmute: "Вкл. Звук",
        btnCamOff: "Убить Камеру",
        btnCamOn: "Включить Камеру",
        btnFlip: "Сменить Камеру",
        btnCopied: "✓ Ссылка скопирована",
        btnCopy: "🔗 Скопировать ссылку на комнату",
        btnRestartAll: "🔄 Restart For All",
        placeholderChat: "Введите сообщение...",
        btnSend: "Отправить",
        btnClear: "🗑️ Очистить",
        placeholderNick: "Ваш ник...",
        btnSaveNick: "Сохранить",
        labelLogs: "Показать консоль логов",
        labelHideLogs: "Скрыть консоль логов",
        btnClearLogs: "🧹 Очистить терминал"
    }
};

let currentLang = 'ru';

// Конфигурация STUN/TURN серверов для обхода сложных NAT/брандмауэров
const peerConfig = {
    host: 'peerjs.com',
    port: 443,
    secure: true,
    pingInterval: 5000,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ]
    }
};

// Ссылки на DOM-элементы интерфейса
let joinBtn, muteBtn, toggleCamBtn, flipCamBtn, copyLinkBtn, statusText, localVideo, chatContainer, paintContainer, logSection, logContainer, toggleLogBtn, clearLogsBtn;

function log(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    let prefix = "> ";
    if (type === "success") prefix = "✅ OK: ";
    if (type === "error") prefix = "❌ ERROR: ";
    
    console.log(`[${timestamp}] ${prefix}${message}`);
    
    if (logContainer) {
        const logEntry = document.createElement("div");
        logEntry.className = `log-entry ${type}`;
        logEntry.innerText = `[${timestamp}] ${prefix}${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

function switchLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });

    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.placeholder = translations[currentLang].placeholderChat;
    const nicknameInput = document.getElementById('nicknameInput');
    if (nicknameInput) nicknameInput.placeholder = translations[currentLang].placeholderNick;

    updateStatusText();

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(lang));
    });
}

function updateStatusText() {
    if (!statusText) return;
    if (isHostMode && connectedPeers.size === 0) {
        statusText.innerText = translations[currentLang].statusHostWait;
    } else if (connectedPeers.size > 0) {
        statusText.innerText = `${translations[currentLang].statusActive} (${connectedPeers.size})`;
    }
}

// Запуск захвата медиа-интерфейсов пользователя
async function initMedia(facingMode = "user") {
    log(translations[currentLang].statusMicRequest, "info");
    if (statusText) statusText.innerText = translations[currentLang].statusMicRequest;
    
    try {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            }
        });
        
        log("Camera and Mic hardware streams grabbed successfully", "success");
        if (localVideo) {
            localVideo.srcObject = localStream;
        }
        
        // Восстанавливаем состояние Mute, если оно было изменено ранее
        localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
        localStream.getVideoTracks().forEach(track => track.enabled = !isCamFullyOff);
        
        return true;
    } catch (err) {
        log(`Hardware media allocation failed: ${err.message}`, "error");
        alert(`Ошибка доступа к камере/микрофону: ${err.message}`);
        if (statusText) statusText.innerText = translations[currentLang].statusWait;
        return false;
    }
}

// Регистрация кастомной логики рисования и привязка к Canvas
function initCanvasEngine() {
    log("Initializing Canvas element...", "info");
    canvas = document.getElementById("paintCanvas");
    if (!canvas) {
        log("Critical canvas reference loss.", "error");
        return;
    }
    ctx = canvas.getContext("2d");
    log("Canvas drawing system successfully attached", "success");

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDraw = (e) => {
        isDrawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
        currentStroke = [];
        redoStack = []; // Очищаем стек Redo при новом действии
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);

        const color = document.getElementById("brushColor").value;
        const size = document.getElementById("brushSize").value;
        const opacity = document.getElementById("brushOpacity").value;

        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.globalAlpha = opacity;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        currentStroke.push({ x1: lastX, y1: lastY, x2: pos.x, y2: pos.y, color, size, opacity });

        lastX = pos.x;
        lastY = pos.y;
    };

    const stopDraw = () => {
        if (!isDrawing) return;
        isDrawing = false;
        if (currentStroke.length > 0) {
            drawingHistory.push(currentStroke);
            broadcastPaintStroke(currentStroke);
        }
    };

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);

    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDraw);

    // Слушатели для панели управления рисованием
    document.getElementById("undoBtn").addEventListener("click", executeUndo);
    document.getElementById("redoBtn").addEventListener("click", executeRedo);
    document.getElementById("clearBtn").addEventListener("click", () => executeClear(true));
}

function redrawCanvasFromHistory() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory.forEach(stroke => {
        stroke.forEach(line => {
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.size;
            ctx.globalAlpha = line.opacity;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
        });
    });
    ctx.globalAlpha = 1.0; // Сброс прозрачности
}

function executeUndo() {
    if (drawingHistory.length === 0) return;
    const item = drawingHistory.pop();
    redoStack.push(item);
    redrawCanvasFromHistory();
    broadcastCanvasStateSync();
}

function executeRedo() {
    if (redoStack.length === 0) return;
    const item = redoStack.pop();
    drawingHistory.push(item);
    redrawCanvasFromHistory();
    broadcastCanvasStateSync();
}

function executeClear(shouldBroadcast = true) {
    drawingHistory = [];
    redoStack = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    log("Canvas fully flushed via local instruction request", "info");
    if (shouldBroadcast) {
        broadcastDataPacket({ type: "canvas-clear" });
    }
}

// Точка входа в сетевое соединение комнат
async function startGlobalMeshPipeline() {
    if (joinBtn) joinBtn.style.display = "none";
    
    const mediaReady = await initMedia(currentFacingMode);
    if (!mediaReady) {
        if (joinBtn) joinBtn.style.display = "inline-block";
        return;
    }

    initCanvasEngine();
    tryToConnectAsHost();
}

function tryToConnectAsHost() {
    log(`Attempting to bind global target node: "${ROOM_ID}"`, "info");
    
    if (peer) {
        try {
            peer.off('open');
            peer.off('error');
            peer.off('call');
            peer.off('connection');
            peer.off('disconnected');
            if (!peer.destroyed) peer.destroy();
        } catch(e) { console.error(e); }
        peer = null;
    }

    peer = new Peer(ROOM_ID, peerConfig);
    
    peer.on('open', (id) => {
        isHostMode = true;
        isReconnecting = false;
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        log(`Successfully configured server. Node registered as Host with Room ID: ${id}`, "success");
        statusText.innerText = translations[currentLang].statusHostWait;
        
        if (chatContainer) chatContainer.style.display = 'block';
        if (paintContainer) paintContainer.style.display = 'block';
        
        const restartBtn = document.getElementById('globalRestartBtn');
        if (restartBtn) restartBtn.style.display = 'inline-block';
        
        peer.on('call', call => {
            log(`Incoming call notification from remote Peer ID: ${call.peer}`, "info");
            call.answer(localStream);
            log(`Call answered. Local stream attached to back-end pipeline`, "success");

            bindCallEvents(call);

            call.on('stream', remoteStream => {
                addMediaStream(call.peer, remoteStream);
            });
        });

        peer.on('connection', (dataConn) => {
            log(`Incoming Data connection request from node: ${dataConn.peer}`, "info");
            bindDataConnectionEvents(dataConn);
        });
    });
    
    peer.on('disconnected', () => {
        log("Core PeerJS signaling link disconnected from routing server.", "error");
        if (isHostMode && !isReconnecting) {
            isReconnecting = true;
            log("Host signaling severed. Arming 15s reconnection loop...", "error");
            startReconnectionLoop(null);
        }
    });
    
    peer.on('error', (err) => {
        log(`Host registration intercept: code "${err.type}"`, "info");
        
        if (err.type === 'unavailable-id') {
            log(`Room ID busy. Re-routing as Guest client to match active Host...`, "info");
            connectAsGuest();
        } 
        else if (err.type === 'network' || err.type === 'disconnect' || err.type === 'server-error') {
            log(`PeerJS network driver issue: ${err.message}`, "error");
            if (isHostMode && !isReconnecting) {
                isReconnecting = true;
                log(`Host server link dropped. Arming 15s recovery protocol...`, "error");
                startReconnectionLoop(null);
            }
        } else {
            log(`PeerJS generic layer error: ${err.message}`, "error");
        }
    });
}

function connectAsGuest() {
    isHostMode = false;

    if (!peer || peer.destroyed) {
        log(`Spawning clean Peer instance for Guest identity...`, "info");
        peer = new Peer(MY_GUEST_ID, peerConfig);
        
        peer.on('open', (id) => {
            log(`Guest handshake link operational. Local Peer ID: ${id}`, "success");
            connectAsGuest();
        });
        
        peer.on('error', (err) => {
            log(`Guest network layer failure: ${err.type} - ${err.message}`, "error");
        });
        return;
    }

    log(`Dialing global Room Host at endpoint: [${ROOM_ID}]`, "info");
    if (statusText) statusText.innerText = translations[currentLang].statusGuestConnect;

    if (chatContainer) chatContainer.style.display = 'block';
    if (paintContainer) paintContainer.style.display = 'block';

    const call = peer.call(ROOM_ID, localStream);
    if (call) {
        log("Call route requested. Awaiting WebRTC Media Stream negotiation...", "info");
        bindCallEvents(call);
    } else {
        log("Critical: Multi-mesh WebRTC call routing failed initialization.", "error");
    }

    const dataConn = peer.connect(ROOM_ID);
    if (dataConn) {
        log("Data channel requested. Spawning bidirectional synchronization bridge...", "info");
        bindDataConnectionEvents(dataConn);
    } else {
        log("Critical: High-speed signaling data link allocation failed.", "error");
    }
}

function bindCallEvents(call) {
    call.on('stream', remoteStream => {
        log(`Remote MediaStream track packets detected. Injecting video node...`, "success");
        addMediaStream(call.peer, remoteStream);
    });

    call.on('close', () => {
        log(`Stream call connection closed via signaling track event`, "info");
        removeMediaStream(call.peer);
        handlePeerDisconnect();
    });

    call.on('error', (err) => {
        log(`Call level exception occurred: ${err.message}`, "error");
        handlePeerDisconnect();
    });
}

function bindDataConnectionEvents(dataConn) {
    activeDataConnections.add(dataConn);

    dataConn.on('open', () => {
        log(`Data channel layer verified open with peer: ${dataConn.peer}`, "success");
        // Отправляем текущий никнейм сразу после открытия канала
        dataConn.send({ type: "identity", nickname: myNickname });
        
        // Хост отправляет полную историю рисунка новому гостю
        if (isHostMode && drawingHistory.length > 0) {
            log(`Host forwarding full canvas history map (${drawingHistory.length} layers) to guest node...`, "info");
            dataConn.send({ type: "canvas-full-sync", history: drawingHistory });
        }
    });

    dataConn.on('data', (data) => {
        if (typeof data !== 'object' || data === null) return;

        // Обработка принудительной перезагрузки по сети
        if (data.type === "remote-force-reload") {
            log("Received high-priority remote control signal: Force Reloading Node Cache...", "error");
            if (peer) peer.destroy();
            location.reload();
            return;
        }

        if (data.type === "identity") {
            log(`Peer introduced identity: "${data.nickname}"`, "info");
            const nameEl = document.getElementById(`nick-${dataConn.peer}`);
            if (nameEl) nameEl.innerText = data.nickname;
        }
        else if (data.type === "chat") {
            appendChatMessage(data.sender, data.text);
        }
        else if (data.type === "canvas-stroke") {
            if (!isHostMode) { // Гости получают штрихи от хоста или других участников
                drawingHistory.push(data.stroke);
                redrawCanvasFromHistory();
            }
        }
        else if (data.type === "canvas-full-sync") {
            log(`Acquired global canvas matrix from host architecture. Syncing active frames...`, "success");
            drawingHistory = data.history;
            redrawCanvasFromHistory();
        }
        else if (data.type === "canvas-clear") {
            executeClear(false);
        }
    });

    dataConn.on('close', () => {
        log(`Data channel closed for peer: ${dataConn.peer}`, "info");
        activeDataConnections.delete(dataConn);
    });

    dataConn.on('error', (err) => {
        log(`Data layer runtime error: ${err.message}`, "error");
    });
}

function handlePeerDisconnect() {
    if (!isHostMode) {
        log("Host lost. Guest mode auto-reconnection sequence armed.", "error");
        startReconnectionLoop(null);
    }
}

function startReconnectionLoop(call) {
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }

    log("Re-indexing master loop. Reconnection daemon spawned (interval 15s)...", "info");

    reconnectInterval = setInterval(() => {
        log("Reconnection timer pulse. Pinging host room node...", "info");

        if (peer) {
            try { 
                peer.off('open');
                peer.off('error');
                peer.off('call');
                peer.off('connection');
                peer.off('disconnected');
                peer.destroy(); 
            } catch (e) { console.error(e); }
            peer = null;
        }

        if (isHostMode) {
            tryToConnectAsHost();
        } else {
            MY_GUEST_ID = "guest-" + Math.random().toString(36).substring(2, 9);
            log(`Regenerating temporary guest identity for bypass: ${MY_GUEST_ID}`, "info");
            connectAsGuest();
        }
    }, 15000);
}

function addMediaStream(peerId, stream) {
    if (connectedPeers.has(peerId)) return;
    connectedPeers.add(peerId);
    updateStatusText();

    const container = document.getElementById("remoteMediaContainer");
    if (!container) return;

    const wrapper = document.createElement("div");
    wrapper.id = `wrapper-${peerId}`;
    wrapper.className = "video-wrapper remote-stream-node";

    const video = document.createElement("video");
    video.id = `video-${peerId}`;
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;

    const badge = document.createElement("div");
    badge.id = `nick-${peerId}`;
    badge.className = "video-badge";
    badge.innerText = "Connecting...";

    wrapper.appendChild(video);
    wrapper.appendChild(badge);
    container.appendChild(wrapper);
    
    // Запрашиваем никнейм у пира, если канал уже открыт
    activeDataConnections.forEach(conn => {
        if (conn.peer === peerId && conn.open) {
            conn.send({ type: "identity", nickname: myNickname });
        }
    });
}

function removeMediaStream(peerId) {
    if (!connectedPeers.has(peerId)) return;
    connectedPeers.delete(peerId);
    updateStatusText();

    const wrapper = document.getElementById(`wrapper-${peerId}`);
    if (wrapper) {
        wrapper.remove();
        log(`Removed video node for disconnected peer: ${peerId}`, "info");
    }
}

// Рассылка широковещательных пакетов данных
function broadcastDataPacket(packet) {
    activeDataConnections.forEach(conn => {
        if (conn.open) {
            try {
                conn.send(packet);
            } catch (err) {
                console.error("Broadcast packet drop exception:", err);
            }
        }
    });
}

function broadcastPaintStroke(stroke) {
    broadcastDataPacket({ type: "canvas-stroke", stroke: stroke });
}

function broadcastCanvasStateSync() {
    broadcastDataPacket({ type: "canvas-full-sync", history: drawingHistory });
}

function sendLocalChatMessage() {
    const input = document.getElementById("chatInput");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    appendChatMessage(translations[currentLang] === translations.ru ? "Вы" : "You", text);
    broadcastDataPacket({ type: "chat", sender: myNickname, text: text });
    input.value = "";
}

function appendChatMessage(sender, text) {
    const messagesDiv = document.getElementById("chatMessages");
    if (!messagesDiv) return;

    const msgEl = document.createElement("div");
    msgEl.className = "chat-message";
    
    const senderEl = document.createElement("span");
    senderEl.className = "sender";
    senderEl.innerText = `${sender}: `;
    
    const textEl = document.createElement("span");
    textEl.className = "text";
    textEl.innerText = text;

    msgEl.appendChild(senderEl);
    msgEl.appendChild(textEl);
    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Первоначальная сборка интерфейса и привязка триггеров управления
window.addEventListener('DOMContentLoaded', () => {
    joinBtn = document.getElementById('joinBtn');
    muteBtn = document.getElementById('muteBtn');
    toggleCamBtn = document.getElementById('toggleCamBtn');
    flipCamBtn = document.getElementById('flipCamBtn');
    copyLinkBtn = document.getElementById('copyLinkBtn');
    statusText = document.getElementById('statusText');
    localVideo = document.getElementById('localVideo');
    chatContainer = document.getElementById('chatContainer');
    paintContainer = document.getElementById('paintContainer');
    logSection = document.getElementById('logSection');
    logContainer = document.getElementById('logContainer');
    toggleLogBtn = document.getElementById('toggleLogBtn');
    clearLogsBtn = document.getElementById('clearLogsBtn');

    if (joinBtn) joinBtn.addEventListener('click', startGlobalMeshPipeline);
    
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            if (localStream) {
                localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
            }
            log(`Microphone track toggled. Muted state: ${isMuted}`, "info");
            muteBtn.innerText = isMuted ? translations[currentLang].btnUnmute : translations[currentLang].btnMute;
            muteBtn.classList.toggle("active", isMuted);
        });
    }

    if (toggleCamBtn) {
        toggleCamBtn.addEventListener('click', () => {
            isCamFullyOff = !isCamFullyOff;
            if (localStream) {
                localStream.getVideoTracks().forEach(track => track.enabled = !isCamFullyOff);
            }
            log(`Video hardware channel toggled. Disabled state: ${isCamFullyOff}`, "info");
            toggleCamBtn.innerText = isCamFullyOff ? translations[currentLang].btnCamOn : translations[currentLang].btnCamOff;
            toggleCamBtn.classList.toggle("active", isCamFullyOff);
        });
    }

    if (flipCamBtn) {
        flipCamBtn.addEventListener('click', async () => {
            currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
            log(`Optical sensor transformation requested: -> ${currentFacingMode}`, "info");
            if (localStream) {
                await initMedia(currentFacingMode);
            }
        });
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const roomUrl = `${window.location.origin}${window.location.pathname}?room=${ROOM_ID}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(roomUrl).then(() => {
                    showCopiedFeedback();
                }).catch(err => {
                    console.error("Clipboard API failure:", err);
                    fallbackCopyText(roomUrl);
                });
            } else {
                fallbackCopyText(roomUrl);
            }
        });
    }

    // Логика сохранения локального никнейма
    const saveNickBtn = document.getElementById("saveNickBtn");
    if (saveNickBtn) {
        saveNickBtn.addEventListener("click", () => {
            const nickInput = document.getElementById("nicknameInput");
            if (!nickInput) return;
            const newNick = nickInput.value.trim();
            if (newNick) {
                myNickname = newNick;
                log(`Local system user identity re-locked: "${myNickname}"`, "success");
                broadcastDataPacket({ type: "identity", nickname: myNickname });
                
                saveNickBtn.innerText = "✓";
                saveNickBtn.style.borderColor = '#a6e3a1';
                saveNickBtn.style.color = '#a6e3a1';
                setTimeout(() => {
                    saveNickBtn.innerText = translations[currentLang].btnSaveNick;
                    saveNickBtn.style.borderColor = '';
                    saveNickBtn.style.color = '';
                }, 1500);
            }
        });
    }

    // Слушатели для текстового чата
    const sendMsgBtn = document.getElementById("sendMsgBtn");
    if (sendMsgBtn) sendMsgBtn.addEventListener("click", sendLocalChatMessage);

    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === 'Enter') sendLocalChatMessage();
        });
    }

    // Системный терминал логов
    if (toggleLogBtn) {
        toggleLogBtn.addEventListener('click', () => {
            if (logSection.style.display === 'none' || !logSection.style.display) {
                logSection.style.display = 'block';
                toggleLogBtn.innerText = translations[currentLang].labelHideLogs;
            } else {
                logSection.style.display = 'none';
                toggleLogBtn.innerText = translations[currentLang].labelLogs;
            }
        });
    }

    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            if (logContainer) logContainer.innerHTML = '';
        });
    }

    const restartBtn = document.getElementById('globalRestartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            log("Global hard reset requested. Signaling remote nodes to flash cache...", "info");

            activeDataConnections.forEach(conn => {
                if (conn.open) {
                    try {
                        conn.send({ type: "remote-force-reload" });
                    } catch(e) {
                        console.error("Не удалось отправить сигнал рестарта пиру:", e);
                    }
                }
            });

            setTimeout(() => {
                if (peer) peer.destroy();
                location.reload();
            }, 800);
        });
    }

    switchLanguage('ru');
    log("System ready.", "success");
});

// ========================================================

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
        console.error(err);
    }
    document.body.removeChild(textArea);
}

function showCopiedFeedback() {
    if (!copyLinkBtn) return;
    copyLinkBtn.innerText = translations[currentLang].btnCopied;
    copyLinkBtn.style.borderColor = '#a6e3a1';
    copyLinkBtn.style.color = '#a6e3a1';
    setTimeout(() => {
        copyLinkBtn.innerText = translations[currentLang].btnCopy;
        copyLinkBtn.style.borderColor = '';
        copyLinkBtn.style.color = '';
    }, 2000);
}
