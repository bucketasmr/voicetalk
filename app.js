const ROOM_ID = "global-audio-bridge-ukraine-usa-2026"; 
const MY_GUEST_ID = "guest-" + Math.random().toString(36).substring(2, 9);

let peer = null;
let localStream = null;
let isMuted = false;
let reconnectInterval = null; 
let myNickname = "User";
const connectedPeers = new Set();
const activeAudioElements = [];
const activeDataConnections = new Set(); 

// Переменные для рисования холста
let canvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentStroke = []; // Хранит текущую рисуемую линию

// База данных истории для Undo/Redo
let drawingHistory = []; 
let redoStack = [];

const translations = {
    en: {
        title: "Global Audio & Paint Chat",
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
        title: "Глобальний аудіо та малювальний чат",
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
        title: "Глобальный аудио и рисовальный чат",
        badge: "Комната: Весь мир",
        btnJoin: "Войти в комнату",
        statusWait: "Нажмите кнопку для подключения...",
        statusMicRequest: "Запрос разрешения на микрофон...",
        statusNetConnect: "Подключение к международной сети...",
        statusHostWait: "Вы Хост. Ование друзей...",
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

// Поиск DOM элементов
const joinBtn = document.getElementById('joinBtn');
const muteBtn = document.getElementById('muteBtn');
const statusText = document.getElementById('statusText');
const logDiv = document.getElementById('log');
const copyLogBtn = document.getElementById('copyLogBtn');
const audioContainer = document.getElementById('remoteAudioContainer');
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

// Холст элементы
const paintContainer = document.getElementById('paintContainer');
const brushColorInput = document.getElementById('brushColor');
const brushSizeInput = document.getElementById('brushSize');
const brushOpacityInput = document.getElementById('brushOpacity');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

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
    
    if (!joinBtn.disabled) joinBtn.innerText = translations[lang].btnJoin;
    if (isMuted) muteBtn.innerText = translations[lang].btnUnmute;
    else muteBtn.innerText = translations[lang].btnMute;
}

function detectDeviceLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const shortLang = browserLang.substring(0, 2).toLowerCase();
    if (shortLang === 'uk' || shortLang === 'ua') changeLanguage('uk');
    else if (shortLang === 'ru') changeLanguage('ru');
    else changeLanguage('en');
}

detectDeviceLanguage();

// Конфигурация холста
function initCanvas() {
    canvas = document.getElementById('paintCanvas');
    ctx = canvas.getContext('2d');
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Слушатели мыши
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Слушатели тач-скрина (смартфоны)
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    }, { passive: true });
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    // Рассчитываем точные координаты с учетом масштабирования CSS
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getCanvasCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;

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
    const x = coords.x;
    const y = coords.y;

    // Отрисовка на своем экране мгновенно
    ctx.beginPath();
    ctx.strokeStyle = convertHexToRGBA(currentStroke.color, currentStroke.opacity);
    ctx.lineWidth = currentStroke.size;
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
    currentStroke.points.push({ x, y });

    // Отправка координат в реальном времени другим
    broadcastPaintData({
        type: 'paint-live-draw',
        color: currentStroke.color,
        size: currentStroke.size,
        opacity: currentStroke.opacity,
        from: currentStroke.points[currentStroke.points.length - 2],
        to: { x, y }
    });
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    
    if (currentStroke && currentStroke.points.length > 0) {
        drawingHistory.push(currentStroke);
        redoStack = []; // Очищаем стек вперед при новом рисовании

        broadcastPaintData({
            type: 'paint-commit-stroke',
            stroke: currentStroke
        });
    }
    currentStroke = null;
}

function convertHexToRGBA(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Перерисовка всего холста на основе локальной истории
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawingHistory.forEach(stroke => {
        if (stroke.points.length < 1) return;
        ctx.beginPath();
        ctx.strokeStyle = convertHexToRGBA(stroke.color, stroke.opacity);
        ctx.lineWidth = stroke.size;
        
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
    });
}

// Логика кнопок Undo / Redo
undoBtn.addEventListener('click', () => {
    if (drawingHistory.length === 0) return;
    const popped = drawingHistory.pop();
    redoStack.push(popped);
    redrawCanvas();

    broadcastPaintData({ type: 'paint-undo' });
});

redoBtn.addEventListener('click', () => {
    if (redoStack.length === 0) return;
    const popped = redoStack.pop();
    drawingHistory.push(popped);
    redrawCanvas();

    broadcastPaintData({ type: 'paint-redo', stroke: popped });
});

function broadcastPaintData(data) {
    activeDataConnections.forEach(conn => {
        if (conn.open) {
            conn.send(data);
        }
    });
}

// Работа со входом в профиль
saveNameBtn.addEventListener('click', () => {
    const value = usernameInput.value.trim();
    if (value.length > 0) myNickname = value;
    nameSetupOverlay.style.display = 'none';
    log(`User profile identity: ${myNickname}`, "success");
    initCanvas(); // Инициализация холста после закрытия оверлея
});

usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveNameBtn.click();
});

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
            }
        ],
        iceCandidatePoolSize: 10,
        sdpSemantics: 'unified-plan'
    }
};

joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    statusText.innerText = translations[currentLang].statusMicRequest;
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
            video: false 
        });
        statusText.innerText = translations[currentLang].statusNetConnect;
        muteBtn.style.display = 'block';
        tryToConnectAsHost();
    } catch (err) {
        log(`${err.name}: ${err.message}`, "error");
        joinBtn.disabled = false;
    }
});

muteBtn.addEventListener('click', () => {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
    
    if (isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.innerText = translations[currentLang].btnUnmute;
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.innerText = translations[currentLang].btnMute;
    }
});

function tryToConnectAsHost() {
    peer = new Peer(ROOM_ID, peerConfig);
    peer.on('open', (id) => {
        statusText.innerText = translations[currentLang].statusHostWait;
        listenForCalls();
        listenForDataConnections();
    });
    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') connectAsGuest();
    });
}

function connectAsGuest() {
    peer = new Peer(MY_GUEST_ID, peerConfig);
    peer.on('open', (id) => {
        statusText.innerText = translations[currentLang].statusGuestConnect;
        makeGuestCall();
        listenForCalls();
        listenForDataConnections();
    });
}

function makeGuestCall() {
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }
    if (peer && !peer.destroyed) {
        const call = peer.call(ROOM_ID, localStream);
        if (call) bindCallEvents(call);
        
        const dataConn = peer.connect(ROOM_ID);
        if (dataConn) bindDataConnectionEvents(dataConn);
    } else {
        connectAsGuest();
    }
}

function listenForCalls() {
    peer.on('call', (call) => {
        if (connectedPeers.has(call.peer)) return;
        call.answer(localStream);
        bindCallEvents(call);
    });
}

function listenForDataConnections() {
    peer.on('connection', (dataConn) => {
        bindDataConnectionEvents(dataConn);
    });
}

function bindCallEvents(call) {
    if (call.peerConnection) {
        call.peerConnection.addEventListener('iceconnectionstatechange', () => {
            const state = call.peerConnection.iceConnectionState;
            if (state === 'connected') {
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
                chatContainer.style.display = 'block';
                paintContainer.style.display = 'block'; // Разворачиваем холст
                
                // Передаем текущую картину новому пользователю, если мы Хост и уже что-то нарисовали
                if (drawingHistory.length > 0) {
                    broadcastPaintData({
                        type: 'paint-sync-canvas',
                        history: drawingHistory
                    });
                }
            }
            if (state === 'disconnected' || state === 'failed') startReconnectionLoop(call);
        });
    }
    call.on('stream', (remoteStream) => addAudioStream(call.peer, remoteStream));
    call.on('close', () => startReconnectionLoop(call));
}

function bindDataConnectionEvents(dataConn) {
    dataConn.on('open', () => {
        activeDataConnections.add(dataConn);
        dataConn.send({ type: 'system-intro', name: myNickname });
    });

    dataConn.on('data', (data) => {
        if (!data || typeof data !== 'object') return;

        // Обработка текстовых данных чата
        if (data.type === 'system-intro') {
            appendChatMessage(translations[currentLang].systemLabel, `${data.name} ${translations[currentLang].joinedChat}`, '#f5c2e7', true);
        } else if (data.type === 'text-message') {
            appendChatMessage(data.sender, data.text, '#b4befe', false);
        }
        
        // Обработка сетевых пакетов рисования
        else if (data.type === 'paint-live-draw') {
            ctx.beginPath();
            ctx.strokeStyle = convertHexToRGBA(data.color, data.opacity);
            ctx.lineWidth = data.size;
            ctx.moveTo(data.from.x, data.from.y);
            ctx.lineTo(data.to.x, data.to.y);
            ctx.stroke();
        } else if (data.type === 'paint-commit-stroke') {
            drawingHistory.push(data.stroke);
            redoStack = []; 
        } else if (data.type === 'paint-undo') {
            if (drawingHistory.length > 0) {
                redoStack.push(drawingHistory.pop());
                redrawCanvas();
            }
        } else if (data.type === 'paint-redo') {
            drawingHistory.push(data.stroke);
            redrawCanvas();
        } else if (data.type === 'paint-sync-canvas') {
            drawingHistory = data.history;
            redrawCanvas();
        }
    });

    dataConn.on('close', () => activeDataConnections.delete(dataConn));
}

function sendTextMessage() {
    const text = chatInput.value.trim();
    if (text.length === 0) return;

    appendChatMessage(myNickname, text, '#a6e3a1', false);
    chatInput.value = '';

    activeDataConnections.forEach(conn => {
        if (conn.open) {
            conn.send({ type: 'text-message', sender: myNickname, text: text });
        }
    });
}

sendMsgBtn.addEventListener('click', sendTextMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendTextMessage();
});

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
    if (currentCall) currentCall.close();
    connectedPeers.delete(ROOM_ID);
    chatContainer.style.display = 'none';
    paintContainer.style.display = 'none'; // Прячем холст при обрыве связи
    
    const oldAudio = document.getElementById(`audio-${ROOM_ID}`);
    if (oldAudio) oldAudio.remove();
    if (reconnectInterval) return; 

    statusText.innerText = translations[currentLang].statusReconnecting;
    reconnectInterval = setInterval(() => {
        makeGuestCall();
    }, 4000);
}

function addAudioStream(peerId, stream) {
    if (connectedPeers.has(peerId)) return;
    connectedPeers.add(peerId);

    const audio = document.createElement('audio');
    audio.id = `audio-${peerId}`;
    audio.srcObject = stream;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('autoplay', 'true');
    audio.autoplay = true;
    
    audioContainer.appendChild(audio);
    activeAudioElements.push(audio);
    
    audio.play()
        .then(() => statusText.innerText = translations[currentLang].statusConnected)
        .catch(e => overlay.style.display = 'flex');
}

modalBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    activeAudioElements.forEach(audio => {
        audio.play()
            .then(() => statusText.innerText = translations[currentLang].statusConnected)
            .catch(err => console.log(err));
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
        console.error(err);
    }
    document.body.removeChild(textArea);
}

function showCopiedFeedback() {
    copyLogBtn.innerText = translations[currentLang].btnCopied;
    copyLogBtn.style.borderColor = '#a6e3a1';
    copyLogBtn.style.color = '#a6e3a1';
    setTimeout(() => {
        copyLogBtn.innerText = translations[currentLang].btnCopy;
        copyLogBtn.style.borderColor = '#45475a';
        copyLogBtn.style.color = '#f5e0dc';
    }, 2000);
}
