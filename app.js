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
let currentFacingMode = "user"; // "user" - фронтальная, "environment" - основная
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
        micMute: "Mute Mic",
        micUnmute: "Unmute Mic",
        camOff: "Cam Off",
        camOn: "Cam On",
        switchCam: "Switch Camera",
        logHidden: "Show Console Logs",
        logShown: "Hide Console Logs",
        modPanel: "Moderator Control Panel",
        kickLabel: "KICK",
        systemLabel: "SYSTEM"
    },
    ru: {
        title: "Глобальный Видео и Арт Чат",
        badge: "Комната: World Wide Grid",
        btnJoin: "Войти в комнату",
        statusWait: "Нажмите кнопку для подключения...",
        statusMicRequest: "Запрос HD стрима 720p...",
        statusNetConnect: "Подключение к международной сети...",
        statusConnected: "Успешно подключено к комнате!",
        modalText: "Браузер заблокировал фоновый звук. Нажмите кнопку для активации голосового потока.",
        modalBtn: "Включить звук",
        micMute: "Выкл. Микро",
        micUnmute: "Вкл. Микро",
        camOff: "Выкл. Камеру",
        camOn: "Вкл. Камеру",
        switchCam: "Сменить Камеру",
        logHidden: "Показать Консоль Логов",
        logShown: "Скрыть Консоль Логов",
        modPanel: "Панель Управления Модератора",
        kickLabel: "КИКНУТЬ",
        systemLabel: "СИСТЕМА"
    },
    ua: {
        title: "Глобальний Відео та Арт Чат",
        badge: "Кімната: World Wide Grid",
        btnJoin: "Увійти в кімнату",
        statusWait: "Натисніть кнопку для підключення...",
        statusMicRequest: "Запит HD стріму 720p...",
        statusNetConnect: "Підключення до міжнародної мережі...",
        statusConnected: "Успішно підключено до кімнати!",
        modalText: "Браузер заблокував фоновий звук. Натисніть кнопку для активації голосового потоку.",
        modalBtn: "Увімкнути звук",
        micMute: "Вимк. Мікро",
        micUnmute: "Увімк. Мікро",
        camOff: "Вимк. Камеру",
        camOn: "Увімк. Камеру",
        switchCam: "Змінити Камеру",
        logHidden: "Показати Консоль Логів",
        logShown: "Приховати Консоль Логів",
        modPanel: "Панель Управління Модератора",
        kickLabel: "КІКНУТИ",
        systemLabel: "СИСТЕМА"
    }
};
let currentLang = 'en';

// Элементы интерфейса
const joinBtn = document.getElementById('joinBtn');
const nicknameInput = document.getElementById('nicknameInput');
const statusDiv = document.getElementById('statusDiv');
const mediaControls = document.getElementById('mediaControls');
const muteMicBtn = document.getElementById('muteMicBtn');
const toggleCamBtn = document.getElementById('toggleCamBtn');
const switchCamBtn = document.getElementById('switchCamBtn');
const videoGridWrapper = document.getElementById('videoGridWrapper');
const videoGrid = document.getElementById('videoGrid');
const splitLayout = document.getElementById('splitLayout');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const hostPanel = document.getElementById('hostPanel');
const hostUsersList = document.getElementById('hostUsersList');
const toggleLogBtn = document.getElementById('toggleLogBtn');
const logSection = document.getElementById('logSection');
const logDiv = document.getElementById('logDiv');
const copyLogBtn = document.getElementById('copyLogBtn');
const overlay = document.getElementById('audioOverlay');
const overlayBtn = document.getElementById('audioOverlayBtn');

// Функция логирования на экран
function log(msg, level = "info") {
    console.log(`[${level.toUpperCase()}] ${msg}`);
    if (!logDiv) return;
    const timeStr = new Date().toLocaleTimeString();
    let color = "#a6e3a1"; 
    if (level === "error") color = "#f38ba8";
    if (level === "warn") color = "#fab387";
    
    logDiv.innerHTML += `<div style="color: ${color}">[${timeStr}] ${msg}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

// Переключение языков
function selectLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    
    document.getElementById('mainTitle').innerText = translations[lang].title;
    document.getElementById('roomBadge').innerText = translations[lang].badge;
    if (joinBtn && !joinBtn.disabled) joinBtn.innerText = translations[lang].btnJoin;
    if (statusDiv && peer === null) statusDiv.innerText = translations[lang].statusWait;
    
    document.getElementById('micText').innerText = isMuted ? translations[lang].micUnmute : translations[lang].micMute;
    document.getElementById('camText').innerText = isCamOff ? translations[lang].camOn : translations[lang].camOff;
    document.getElementById('switchCamText').innerText = translations[lang].switchCam;
    document.getElementById('hostPanelTitle').innerText = translations[lang].modPanel;
    document.getElementById('modalText').innerText = translations[lang].modalText;
    document.getElementById('audioOverlayBtn').innerText = translations[lang].modalBtn;
    
    if (logSection && logSection.style.display === 'block') {
        toggleLogBtn.innerText = translations[lang].logShown;
    } else {
        toggleLogBtn.innerText = translations[lang].logHidden;
    }
    
    document.querySelectorAll('.kick-btn').forEach(b => b.innerText = translations[lang].kickLabel);
    document.querySelectorAll('.host-kick-inline-btn').forEach(b => b.innerText = translations[lang].kickLabel);
    
    document.getElementById('langEn').classList.toggle('active', lang === 'en');
    document.getElementById('langRu').classList.toggle('active', lang === 'ru');
    document.getElementById('langUa').classList.toggle('active', lang === 'ua');
}

document.getElementById('langEn').addEventListener('click', () => selectLanguage('en'));
document.getElementById('langRu').addEventListener('click', () => selectLanguage('ru'));
document.getElementById('langUa').addEventListener('click', () => selectLanguage('ua'));

// Генерация короткого уникального хэша для проверки коллизий
function generateSimpleHash() {
    return Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
}

// Старт сессии
if (joinBtn) {
    joinBtn.addEventListener('click', async () => {
        myNickname = nicknameInput.value.trim() || "User";
        nicknameInput.disabled = true;
        joinBtn.disabled = true;
        joinBtn.innerText = "...";
        
        MY_UNIQUE_HASH = generateSimpleHash();
        statusDiv.innerText = translations[currentLang].statusMicRequest;
        
        try {
            // Пробуем захватить видеопоток 720p со звуком
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: currentFacingMode }
            });
            log("Медиа-поток захвачен успешно (720p).");
        } catch (err) {
            log("Запрос видео 720p отклонен или недоступен. Пробуем только аудио...", "warn");
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                log("Захвачен только аудио-поток.");
            } catch (err2) {
                log("Доступ к аудио/видео полностью отсутствует. Подключение как слушатель/зритель.", "error");
                localStream = new MediaStream();
            }
        }

        // Проверяем наличие видео-треков в локальном потоке для отображения кнопки смены камеры
        if (localStream.getVideoTracks().length > 0) {
            if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
                switchCamBtn.style.display = "flex";
            }
        }

        // Рендерим наше собственное локальное окно видео
        addVideoWindow("LOCAL_ME", myNickname, true);
        const localVid = document.getElementById("video_LOCAL_ME");
        if (localVid && localStream.id) {
            localVid.srcObject = localStream;
            localVid.muted = true; 
            localVid.play().catch(() => {});
        }

        statusDiv.innerText = translations[currentLang].statusNetConnect;
        tryFindFreeSlotAndConnect();
    });
}

// Рекурсивный перебор слотов PeerJS в режиме Mesh (поиск свободного индекса от 1 до 10)
function tryFindFreeSlotAndConnect() {
    if (mySlotIndex > MAX_SLOTS) {
        log("Все доступные слоты комнаты (1-10) заняты. Не удалось подключиться.", "error");
        statusDiv.innerText = "Room is full (Max 10 users).";
        joinBtn.disabled = false;
        nicknameInput.disabled = false;
        return;
    }

    FULL_PEER_ID = `${ROOM_BASE_PREFIX}${mySlotIndex}`;
    log(`Проверка доступности слота #${mySlotIndex} (${FULL_PEER_ID})...`);

    peer = new Peer(FULL_PEER_ID, {
        debug: 1,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        }
    });

    peer.on('open', (id) => {
        log(`Успешно заняли Слот #${mySlotIndex}! Мой ID: ${id}`);
        statusDiv.innerText = translations[currentLang].statusConnected;
        statusDiv.style.color = "#a6e3a1";
        
        // Показываем интерфейс
        mediaControls.style.display = "flex";
        videoGridWrapper.style.display = "block";
        splitLayout.style.display = "grid";
        
        initPaintCanvas();
        setupPeerSystemListeners();
        establishMeshLinks();
        renderHostPanel();
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            // Слот занят, уничтожаем текущий инстанс и пробуем следующий индекс
            peer.destroy();
            mySlotIndex++;
            tryFindFreeSlotAndConnect();
        } else {
            log(`Критическая ошибка PeerJS: ${err.type} - ${err.message}`, "error");
            statusDiv.innerText = `Connection error: ${err.type}`;
        }
    });
}

// Настройка системных обработчиков вызовов и входящих коннектов
function setupPeerSystemListeners() {
    if (!peer) return;

    // Срабатывает, когда кто-то звонит нам (передача медиа)
    peer.on('call', (call) => {
        log(`Получен входящий медиа-вызов от: ${call.peer}`);
        call.answer(localStream);
        
        call.on('stream', (remoteStream) => {
            log(`Получен стабильный медиа-поток от вызова: ${call.peer}`);
            addVideoWindow(call.peer, "User", false);
            const vid = document.getElementById(`video_${call.peer}`);
            if (vid) {
                vid.srcObject = remoteStream;
                vid.play().catch(() => {
                    if (overlay) overlay.style.display = "flex";
                });
            }
            trackVoiceVolume(remoteStream, call.peer);
        });
        
        if (connectedPeersRegistry[call.peer]) {
            connectedPeersRegistry[call.peer].mediaCall = call;
        } else {
            connectedPeersRegistry[call.peer] = { mediaCall: call, dataChannel: null, nickname: "User", hash: "" };
        }
    });

    // Срабатывает, когда к нам открывают текстовый DataChannel
    peer.on('connection', (conn) => {
        log(`Входящее текстовое P2P соединение от: ${conn.peer}`);
        setupDataChannelListeners(conn);
        
        if (connectedPeersRegistry[conn.peer]) {
            connectedPeersRegistry[conn.peer].dataChannel = conn;
        } else {
            connectedPeersRegistry[conn.peer] = { mediaCall: null, dataChannel: conn, nickname: "User", hash: "" };
        }
    });
}

// Автоматическая прозвонка всех остальных 9 слотов сети для построения Full Mesh
function establishMeshLinks() {
    for (let i = 1; i <= MAX_SLOTS; i++) {
        if (i === mySlotIndex) continue; // Себя не набираем
        
        const targetPeerId = `${ROOM_BASE_PREFIX}${i}`;
        log(`Mesh-сканирование: инициируем связь со слотом #${i}...`);
        
        // 1. Открываем текстовый дата-канал
        const conn = peer.connect(targetPeerId, { reliable: true });
        setupDataChannelListeners(conn);
        
        // 2. Звоним потоком аудио-видео
        const call = peer.call(targetPeerId, localStream);
        if (call) {
            call.on('stream', (remoteStream) => {
                log(`Получен встречный медиа-поток от слота: ${targetPeerId}`);
                addVideoWindow(targetPeerId, "User", false);
                const vid = document.getElementById(`video_${targetPeerId}`);
                if (vid) {
                    vid.srcObject = remoteStream;
                    vid.play().catch(() => {
                        if (overlay) overlay.style.display = "flex";
                    });
                }
                trackVoiceVolume(remoteStream, targetPeerId);
            });
        }
        
        // Регистрируем пира локально
        if (connectedPeersRegistry[targetPeerId]) {
            connectedPeersRegistry[targetPeerId].dataChannel = conn;
            if (call) connectedPeersRegistry[targetPeerId].mediaCall = call;
        } else {
            connectedPeersRegistry[targetPeerId] = { mediaCall: call, dataChannel: conn, nickname: "User", hash: "" };
        }
    }
}

// Обработка входящих данных в P2P каналах связи
function setupDataChannelListeners(conn) {
    conn.on('open', () => {
        log(`P2P DataChannel открыт со слотом: ${conn.peer}`);
        // Сразу высылаем свой профиль (никнейм и уникальный хэш от коллизий)
        conn.send({ type: "handshake-profile", nickname: myNickname, hash: MY_UNIQUE_HASH });
        
        // Синхронизируем наш текущий рисунок новому участнику
        if (drawingHistory.length > 0) {
            conn.send({ type: "canvas-bulk-sync", history: drawingHistory });
        }
    });

    conn.on('data', (data) => {
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
            case "handshake-profile":
                if (connectedPeersRegistry[conn.peer]) {
                    connectedPeersRegistry[conn.peer].nickname = data.nickname;
                    connectedPeersRegistry[conn.peer].hash = data.hash || "";
                }
                updateVideoLabel(conn.peer, data.nickname);
                renderHostPanel();
                break;
                
            case "chat-msg":
                appendChatMessage(data.nickname, data.text);
                break;
                
            case "canvas-stroke":
                if (Array.isArray(data.stroke)) {
                    drawRemoteStroke(data.stroke, data.color, data.size, data.opacity);
                }
                break;
                
            case "canvas-bulk-sync":
                if (Array.isArray(data.history)) {
                    drawingHistory = data.history;
                    redrawCanvasFromHistory();
                }
                break;
                
            case "canvas-clear":
                drawingHistory = [];
                redoStack = [];
                if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
                log("Холст полностью очищен удаленным участником.");
                break;

            case "kick-signal":
                log("Вы были исключены из этой комнаты.", "error");
                alert("Вы были исключены модератором сессии.");
                if (peer) peer.destroy();
                location.reload();
                break;

            // ⚠️ СИГНАЛ ЯДЕРНОГО СБРОСА КОМНАТЫ
            case "emergency-nuke":
                if (data.auth === "Ym9yb2R1aGE=") { 
                    log("🚨 Внимание: Администратор инициировал экстренный перезапуск комнаты!", "error");
                    if (peer) peer.destroy();
                    setTimeout(() => {
                        location.reload();
                    }, 500);
                }
                break;
        }
    });

    conn.on('close', () => {
        log(`P2P канал связи закрыт пиром: ${conn.peer}`, "warn");
        removeVideoWindow(conn.peer);
        renderHostPanel();
    });
}

// Отрисовка динамических окон для участников группы
function addVideoWindow(peerId, nickname, isLocal = false) {
    const safeId = `container_${peerId}`;
    if (document.getElementById(safeId)) return; // Уже отрисован

    const box = document.createElement('div');
    box.id = safeId;
    box.className = "video-container";

    const vLabel = document.createElement('div');
    vLabel.id = `label_${peerId}`;
    vLabel.className = "video-label";
    
    if (peerId === `${ROOM_BASE_PREFIX}1`) {
        vLabel.innerHTML = `<span class="host-badge">[HOST]</span> ${nickname}`;
    } else {
        vLabel.innerText = nickname;
    }
    box.appendChild(vLabel);

    // Кнопка быстрого кика на самом окне (доступна только Слоту #1 для не-локальных пиров)
    if (mySlotIndex === 1 && !isLocal) {
        const kBtn = document.createElement('button');
        kBtn.className = "kick-btn";
        kBtn.innerText = translations[currentLang].kickLabel;
        kBtn.style.display = "block";
        kBtn.onclick = () => kickUser(peerId);
        box.appendChild(kBtn);
    }

    const videoEl = document.createElement('video');
    videoEl.id = `video_${peerId}`;
    videoEl.playsInline = true;
    videoEl.autoplay = true;
    if (isLocal) {
        videoEl.muted = true;
    }
    box.appendChild(videoEl);

    if (videoGrid) videoGrid.appendChild(box);
}

function removeVideoWindow(peerId) {
    const box = document.getElementById(`container_${peerId}`);
    if (box) box.remove();
    if (connectedPeersRegistry[peerId]) {
        delete connectedPeersRegistry[peerId];
    }
}

function updateVideoLabel(peerId, name) {
    const lbl = document.getElementById(`label_${peerId}`);
    if (lbl) {
        if (peerId === `${ROOM_BASE_PREFIX}1`) {
            lbl.innerHTML = `<span class="host-badge">[HOST]</span> ${name}`;
        } else {
            lbl.innerText = name;
        }
    }
}

// Исключение пользователя (Доступно только Слоту #1)
function kickUser(peerId) {
    const info = connectedPeersRegistry[peerId];
    if (info && info.dataChannel && info.dataChannel.open) {
        log(`Отправка сигнала кика к: ${peerId}`, "warn");
        info.dataChannel.send({ type: "kick-signal" });
    }
    removeVideoWindow(peerId);
    renderHostPanel();
}

// Генерация списка управления для Модератора (Слот #1)
function renderHostPanel() {
    if (!hostPanel || !hostUsersList) return;

    if (mySlotIndex !== 1) {
        hostPanel.style.display = "none";
        return;
    }

    hostPanel.style.display = "block";
    hostUsersList.innerHTML = "";

    let hasUsers = false;
    Object.keys(connectedPeersRegistry).forEach(pId => {
        const pData = connectedPeersRegistry[pId];
        if (!pData || (!pData.dataChannel && !pData.mediaCall)) return;

        hasUsers = true;
        const row = document.createElement('div');
        row.className = "host-user-row";
        row.innerHTML = `
            <span style="font-size:14px; color:#cdd6f4;">
                <b style="color:#fab387;">[${pId.replace(ROOM_BASE_PREFIX, "Slot #")}]</b> ${pData.nickname}
            </span>
            <button class="host-kick-inline-btn">${translations[currentLang].kickLabel}</button>
        `;
        row.querySelector('.host-kick-inline-btn').onclick = () => kickUser(pId);
        hostUsersList.appendChild(row);
    });

    if (!hasUsers) {
        hostUsersList.innerHTML = `<div style="font-size:13px; color:#6c7086;">No other active connection links found in registry.</div>`;
    }
}

// Отслеживание уровня громкости голоса для рамки "говорящего"
function trackVoiceVolume(stream, peerId) {
    if (!stream || stream.getAudioTracks().length === 0) return;
    
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Если аудиоконтекст заблокирован политикой браузера
        if (audioCtx.state === 'suspended') {
            if (overlay) overlay.style.display = "flex";
        }
        
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const container = document.getElementById(`container_${peerId}`);
        
        function checkVol() {
            if (!document.getElementById(`container_${peerId}`)) return; // Пир отключился
            
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            let average = sum / bufferLength;
            
            if (average > 30) { // Порог фиксации голоса
                if (container) container.classList.add('speaking');
            } else {
                if (container) container.classList.remove('speaking');
            }
            setTimeout(checkVol, 200);
        }
        checkVol();
        
    } catch (e) {
        console.log("Volume tracking error:", e);
    }
}

// Логика текстового чата
if (sendMsgBtn && chatInput) {
    function submitMsg() {
        const txt = chatInput.value.trim();
        if (!txt) return;
        chatInput.value = "";
        
        // 1. Отображаем у себя
        appendChatMessage(myNickname, txt);
        
        // 2. Рассылаем всем по дата-каналам
        Object.keys(connectedPeersRegistry).forEach(pId => {
            const registryItem = connectedPeersRegistry[pId];
            if (registryItem && registryItem.dataChannel && registryItem.dataChannel.open) {
                registryItem.dataChannel.send({ type: "chat-msg", nickname: myNickname, text: txt });
            }
        });
    }
    
    sendMsgBtn.addEventListener('click', submitMsg);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitMsg();
    });
}

function appendChatMessage(sender, text) {
    if (!chatMessages) return;
    const item = document.createElement('div');
    item.className = "chat-msg-item";
    item.innerHTML = `<span class="chat-msg-user">${sender}:</span> <span style="color: #cdd6f4;"></span>`;
    item.querySelector('span:last-child').innerText = text; // Защита от XSS
    chatMessages.appendChild(item);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Управление медиа-треками (Mute микрофона и выключение камеры)
if (muteMicBtn) {
    muteMicBtn.addEventListener('click', () => {
        if (!localStream) return;
        isMuted = !isMuted;
        localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
        
        muteMicBtn.classList.toggle('active-off', isMuted);
        document.getElementById('micIcon').innerText = isMuted ? "🔇" : "🎤";
        document.getElementById('micText').innerText = isMuted ? translations[currentLang].micUnmute : translations[currentLang].micMute;
        log(`Мой микрофон: ${isMuted ? "ВЫКЛЮЧЕН" : "ВКЛЮЧЕН"}`);
    });
}

if (toggleCamBtn) {
    toggleCamBtn.addEventListener('click', () => {
        if (!localStream) return;
        isCamOff = !isCamOff;
        localStream.getVideoTracks().forEach(track => track.enabled = !isCamOff);
        
        toggleCamBtn.classList.toggle('active-off', isCamOff);
        document.getElementById('camIcon').innerText = isCamOff ? "❌" : "📷";
        document.getElementById('camText').innerText = isCamOff ? translations[currentLang].camOn : translations[currentLang].camOff;
        log(`Моя камера: ${isCamOff ? "ОСТАНОВЛЕНА" : "ЗАПУЩЕНА"}`);
    });
}

if (switchCamBtn) {
    switchCamBtn.addEventListener('click', async () => {
        if (!localStream || isCamOff) return;
        currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
        log(`Переключение камеры на режим: ${currentFacingMode}`);
        
        try {
            const oldTracks = localStream.getVideoTracks();
            oldTracks.forEach(t => { t.stop(); localStream.removeTrack(t); });
            
            const tmpStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: currentFacingMode }
            });
            
            const newTrack = tmpStream.getVideoTracks()[0];
            localStream.addTrack(newTrack);
            
            // Обновляем видео в нашем локальном элементе
            const myVid = document.getElementById("video_LOCAL_ME");
            if (myVid) myVid.srcObject = localStream;
            
            // Подменяем трек во всех активных WebRTC вызовах участников сети
            Object.keys(connectedPeersRegistry).forEach(pId => {
                const callObj = connectedPeersRegistry[pId].mediaCall;
                if (callObj && callObj.peerConnection) {
                    const senders = callObj.peerConnection.getSenders();
                    const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                    if (videoSender) {
                        videoSender.replaceTrack(newTrack);
                    }
                }
            });
            log("Камера успешно изменена во всех Mesh-соединениях.");
        } catch (e) {
            log(`Не удалось переключить камеру: ${e.message}`, "error");
        }
    });
}

// Модуль Интерактивного Холста (Whiteboard)
function initPaintCanvas() {
    canvas = document.getElementById('paintCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    // Поддержка Retina дисплеев и адаптивного ресайза
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e) {
        const r = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
        }
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function startDraw(e) {
        isDrawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
        currentStroke = [{ x: lastX, y: lastY }];
    }

    function moveDraw(e) {
        if (!isDrawing) return;
        const pos = getPos(e);
        
        const bColor = document.getElementById('brushColor').value;
        const bSize = document.getElementById('brushSize').value;
        const bOpacity = document.getElementById('brushOpacity').value;

        ctx.strokeStyle = bColor;
        ctx.lineWidth = bSize;
        ctx.globalAlpha = bOpacity;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        lastX = pos.x;
        lastY = pos.y;
        currentStroke.push({ x: lastX, y: lastY });
    }

    function stopDraw() {
        if (!isDrawing) return;
        isDrawing = false;
        
        if (currentStroke.length > 0) {
            const strokeData = {
                stroke: currentStroke,
                color: document.getElementById('brushColor').value,
                size: document.getElementById('brushSize').value,
                opacity: document.getElementById('brushOpacity').value
            };
            
            drawingHistory.push(strokeData);
            redoStack = []; // Сбрасываем стек возврата
            
            // Рассылаем штрих всем
            Object.keys(connectedPeersRegistry).forEach(pId => {
                const pInfo = connectedPeersRegistry[pId];
                if (pInfo && pInfo.dataChannel && pInfo.dataChannel.open) {
                    pInfo.dataChannel.send({
                        type: "canvas-stroke",
                        stroke: strokeData.stroke,
                        color: strokeData.color,
                        size: strokeData.size,
                        opacity: strokeData.opacity
                    });
                }
            });
        }
    }

    // Слушатели мыши
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', stopDraw);

    // Слушатели тачскрина
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', moveDraw);
    window.addEventListener('touchend', stopDraw);
}

function drawRemoteStroke(points, color, size, opacity) {
    if (!ctx || !points || points.length < 1) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.globalAlpha = opacity;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    
    // Сохраняем в локальную историю
    drawingHistory.push({ stroke: points, color: color, size: size, opacity: opacity });
}

function redrawCanvasFromHistory() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawingHistory.forEach(item => {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.size;
        ctx.globalAlpha = item.opacity;
        ctx.beginPath();
        ctx.moveTo(item.stroke[0].x, item.stroke[0].y);
        for (let i = 1; i < item.stroke.length; i++) {
            ctx.lineTo(item.stroke[i].x, item.stroke[i].y);
        }
        ctx.stroke();
    });
}

// Кнопки очистки холста и истории
const clearBtn = document.getElementById('clearBtn');
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        drawingHistory = [];
        redoStack = [];
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Отправляем сигнал очистки всем
        Object.keys(connectedPeersRegistry).forEach(pId => {
            const pInfo = connectedPeersRegistry[pId];
            if (pInfo && pInfo.dataChannel && pInfo.dataChannel.open) {
                pInfo.dataChannel.send({ type: "canvas-clear" });
            }
        });
        log("Вы полностью очистили интерактивный холст комнаты.");
    });
}

const undoBtn = document.getElementById('undoBtn');
if (undoBtn) {
    undoBtn.addEventListener('click', () => {
        if (drawingHistory.length === 0) return;
        const popped = drawingHistory.pop();
        redoStack.push(popped);
        redrawCanvasFromHistory();
        
        // Синхронизируем полную историю заново для Mesh-сети
        Object.keys(connectedPeersRegistry).forEach(pId => {
            const pInfo = connectedPeersRegistry[pId];
            if (pInfo && pInfo.dataChannel && pInfo.dataChannel.open) {
                pInfo.dataChannel.send({ type: "canvas-bulk-sync", history: drawingHistory });
            }
        });
    });
}

const redoBtn = document.getElementById('redoBtn');
if (redoBtn) {
    redoBtn.addEventListener('click', () => {
        if (redoStack.length === 0) return;
        const item = redoStack.pop();
        drawingHistory.push(item);
        redrawCanvasFromHistory();
        
        Object.keys(connectedPeersRegistry).forEach(pId => {
            const pInfo = connectedPeersRegistry[pId];
            if (pInfo && pInfo.dataChannel && pInfo.dataChannel.open) {
                pInfo.dataChannel.send({ type: "canvas-bulk-sync", history: drawingHistory });
            }
        });
    });
}

// Взаимодействие с оверлеем блокировки звука браузером
if (overlayBtn) {
    overlayBtn.addEventListener('click', () => {
        if (overlay) overlay.style.display = 'none';
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        document.querySelectorAll('video').forEach(video => {
            video.play().catch(err => console.log("Ручной запуск видео не удался:", err));
        });
    });
}

// Открытие консоли логов
if (toggleLogBtn) {
    toggleLogBtn.addEventListener('click', () => {
        if (!logSection) return;
        if (logSection.style.display === 'block') {
            logSection.style.display = 'none';
            toggleLogBtn.innerText = translations[currentLang].logHidden;
        } else {
            logSection.style.display = 'block';
            toggleLogBtn.innerText = translations[currentLang].logShown;
        }
    });
}

if (copyLogBtn) {
    copyLogBtn.addEventListener('click', () => {
        if (!logDiv) return;
        const textToCopy = logDiv.innerText || logDiv.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => showCopiedFeedback())
                .catch(() => executeFallbackCopy(textToCopy));
        } else {
            executeFallbackCopy(textToCopy);
        }
    });
}

function showCopiedFeedback() {
    const oldTxt = copyLogBtn.innerText;
    copyLogBtn.innerText = "COPIED! ✔";
    setTimeout(() => { copyLogBtn.innerText = oldTxt; }, 1500);
}

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
        console.error('Fallback copy strategy failed', err);
    }
    document.body.removeChild(textArea);
}

// ЭКСТРЕННЫЙ РЕСТАРТ КОМНАТЫ ПО ПАРОЛЮ
const emergencyRestartBtn = document.getElementById('emergencyRestartBtn');
if (emergencyRestartBtn) {
    emergencyRestartBtn.addEventListener('click', () => {
        const password = prompt("Введите мастер-пароль для сброса всей комнаты:");
        if (!password) return;

        // Переводим пароль в Base64 для безопасного внутреннего сравнения
        const encodedPassword = btoa(password);

        if (encodedPassword === "Ym9yb2R1aGE=") { // Хэш слова "boroduha"
            log("Мастер-пароль подтвержден. Отправка сигнала уничтожения всем пирам...", "warn");

            // 1. Отправляем сигнал уничтожения всем подключенным пирам
            Object.keys(connectedPeersRegistry).forEach(peerId => {
                const info = connectedPeersRegistry[peerId];
                if (info && info.dataChannel && info.dataChannel.open) {
                    try {
                        info.dataChannel.send({ 
                            type: "emergency-nuke",
                            auth: encodedPassword
                        });
                    } catch(e) {
                        console.error("Не удалось отправить nuke к " + peerId, e);
                    }
                }
            });

            // 2. Уничтожаем сессию и перезагружаем страницу хоста
            log("Комната сброшена. Перезагрузка...", "error");
            setTimeout(() => {
                if (peer) peer.destroy();
                location.reload();
            }, 800);

        } else {
            alert("Неверный мастер-пароль! Доступ заблокирован.");
            log("❌ Попытка несанкционированного сброса комнаты не удалась.", "error");
        }
    });
}

// Инициализируем базовый язык интерфейса по умолчанию
selectLanguage('en');

// Фоновая попытка прогрева медиа-устройств ввода
navigator.mediaDevices.enumerateDevices()
    .then(devices => log(`Доступно медиа-устройств ввода: ${devices.length}`))
    .catch(e => console.log("Enumerate devices fallback:", e));
