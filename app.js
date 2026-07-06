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
        modalText: "Your browser blocked background audio. Click to activate voice stream.\n",
        modalBtn: "Unmute Audio",
        micMuted: "Mic Muted",
        micUnmuted: "Mute Mic",
        camOff: "Turn On Cam",
        camOn: "Turn Off Cam",
        logHidden: "Show Console Logs",
        logShown: "Hide Console Logs",
        logCopied: "Logs Copied!",
        logCopyErr: "Failed to copy",
        placeholderChat: "Type a message..."
    },
    ua: {
        title: "Глобальний Відео та Малювальний Чат",
        badge: "Кімната: World Wide Grid",
        btnJoin: "Увійти в кімнату",
        statusWait: "Натисніть кнопку для підключення...",
        statusMicRequest: "Запит HD потоку камери 720p...",
        statusNetConnect: "Підключення до міжнародної мережі...",
        statusConnected: "Успішно підключено до групи!",
        modalText: "Браузер заблокував фоновий звук. Натисніть кнопку, щоб активувати аудіо потік.",
        modalBtn: "Увімкнути Звук",
        micMuted: "Мікрофон Вимкнено",
        micUnmuted: "Вимкнути Мікроф.",
        camOff: "Увімкнути Кам.",
        camOn: "Вимкнути Камеру",
        logHidden: "Показати консоль логів",
        logShown: "Приховати консоль логів",
        logCopied: "Логи Скопійовано!",
        logCopyErr: "Помилка копіювання",
        placeholderChat: "Напишіть повідомлення..."
    },
    ru: {
        title: "Глобальный Видео и Рисовальный Чат",
        badge: "Комната: World Wide Grid",
        btnJoin: "Войти в комнату",
        statusWait: "Нажмите кнопку для подключения...",
        statusMicRequest: "Запрос HD потока камеры 720p...",
        statusNetConnect: "Подключение к международной сети...",
        statusConnected: "Успешно подключено к группе!",
        modalText: "Браузер заблокировал фоновый звук. Нажмите кнопку, чтобы активировать аудиопоток.",
        modalBtn: "Включить Звук",
        micMuted: "Микрофон Выкл.",
        micUnmuted: "Выключить Микр.",
        camOff: "Включить Кам.",
        camOn: "Выключить Камеру",
        logHidden: "Показать консоль логов",
        logShown: "Скрыть консоль логов",
        logCopied: "Логи Скопированы!",
        logCopyErr: "Ошибка копирования",
        placeholderChat: "Напишите сообщение..."
    }
};

let currentLang = 'en';

// Элементы DOM страницы
let mainTitle, roomBadge, nicknameInput, joinBtn, muteBtn, camBtn, switchCamBtn, statusText, videoGrid;
let chatContainer, chatMessages, chatInput, sendMsgBtn;
let paintContainer, brushColor, brushSize, brushOpacity, undoBtn, redoBtn, clearBtn;
let toggleLogBtn, logSection, logDiv, copyLogBtn;
let audioOverlay, modalText, audioOverlayBtn;
let hostPanel, hostUserList, refreshUsersBtn;

// Функция защищенного логирования на экран интерфейса
function log(message, type = "info") {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    console.log(`[${timeStr}] [${type.toUpperCase()}] ${message}`);
    
    if (logDiv) {
        const line = document.createElement('div');
        line.className = `log-line log-${type}`;
        line.innerText = `[${timeStr}] [${type.toUpperCase()}] ${message}`;
        logDiv.appendChild(line);
        logDiv.scrollTop = logDiv.scrollHeight;
    }
}

// Генератор уникальных строк для верификации контента
function generateUniqueId(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let res = '';
    for(let i=0; i<length; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
}

// Динамическое переключение языкового контента локально
function selectLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;

    document.getElementById('langEn').classList.toggle('active', lang === 'en');
    document.getElementById('langUa').classList.toggle('active', lang === 'ua');
    document.getElementById('langRu').classList.toggle('active', lang === 'ru');

    if (mainTitle) mainTitle.innerText = translations[currentLang].title;
    if (roomBadge) roomBadge.innerText = translations[currentLang].badge;
    if (joinBtn) joinBtn.innerText = translations[currentLang].btnJoin;
    
    if (statusText && !peer) {
        statusText.innerText = translations[currentLang].statusWait;
    } else if (statusText && peer && peer.open) {
        statusText.innerText = translations[currentLang].statusConnected;
    }

    if (muteBtn) muteBtn.innerText = isMuted ? translations[currentLang].micMuted : translations[currentLang].micUnmuted;
    if (camBtn) camBtn.innerText = isCamOff ? translations[currentLang].camOff : translations[currentLang].camOn;
    if (toggleLogBtn) {
        if (logSection && logSection.style.display === 'block') {
            toggleLogBtn.innerText = translations[currentLang].logShown;
        } else {
            toggleLogBtn.innerText = translations[currentLang].logHidden;
        }
    }
    if (modalText) modalText.innerText = translations[currentLang].modalText;
    if (audioOverlayBtn) audioOverlayBtn.innerText = translations[currentLang].modalBtn;
    if (chatInput) chatInput.setAttribute('placeholder', translations[currentLang].placeholderChat);
}

// Запрос доступа к камере и микрофону (720p HD)
async function acquireLocalUserMedia() {
    if (statusText) statusText.innerText = translations[currentLang].statusMicRequest;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: currentFacingMode
            }
        });
        log("Доступ к камере (user) и микрофону успешно получен.");
        return true;
    } catch (err) {
        log(`Ошибка доступа к камере высокого разрешения: ${err.message}. Пробуем аудио-онли режим...`, "warn");
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            log("Доступ к аудио-треку успешно получен (видео заблокировано).");
            isCamOff = true;
            if (camBtn) camBtn.classList.add('active-state');
            return true;
        } catch (audioErr) {
            log(`Критический отказ медиасистемы: ${audioErr.message}`, "error");
            alert("Пожалуйста, предоставьте доступ к камере или микрофону для работы приложения.");
            if (statusText) statusText.innerText = "Media access denied.";
            return false;
        }
    }
}

// Определение свободного слота в глобальной Mesh комнате
async function allocateRoomSlot() {
    if (statusText) statusText.innerText = translations[currentLang].statusNetConnect;
    
    for (let slot = 1; slot <= MAX_SLOTS; slot++) {
        const checkId = `${ROOM_BASE_PREFIX}${slot}`;
        log(`Проверяем доступность слота #${slot}...`);
        
        const isOccupied = await verifySlotOccupancy(checkId);
        if (!isOccupied) {
            mySlotIndex = slot;
            FULL_PEER_ID = checkId;
            log(`Выделен свободный слот комнаты: #${mySlotIndex} (ID: ${FULL_PEER_ID})`);
            return true;
        }
    }
    
    log("Все слоты сети Mesh переполнены (10/10). Попробуйте позже.", "error");
    alert("Все места в комнате заняты. Лимит сети WebRTC Mesh: 10 человек.");
    if (statusText) statusText.innerText = "Room is full.";
    return false;
}

// Функция быстрой проверки занятости PeerID
function verifySlotOccupancy(targetPeerId) {
    return new Promise((resolve) => {
        const testPeer = new Peer(generateUniqueId(12), { debug: 0 });
        let resolved = false;

        testPeer.on('open', () => {
            const conn = testPeer.connect(targetPeerId, { reliable: false });
            
            conn.on('open', () => {
                if(!resolved) { resolved = true; resolve(true); testPeer.destroy(); }
            });
            
            setTimeout(() => {
                if(!resolved) { resolved = true; resolve(false); testPeer.destroy(); }
            }, 1200);
        });

        testPeer.on('error', () => {
            if(!resolved) { resolved = true; resolve(false); testPeer.destroy(); }
        });
    });
}

// Инициализация WebRTC Mesh сети
function initializeMeshConference() {
    peer = new Peer(FULL_PEER_ID, { 
        debug: 1,
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    peer.on('open', (id) => {
        log(`Успешная регистрация на сигнальном сервере. Мой Peer ID: ${id}`);
        if (statusText) statusText.innerText = translations[currentLang].statusConnected;
        if (joinBtn) joinBtn.style.display = 'none';
        if (nicknameInput) nicknameInput.setAttribute('disabled', 'true');
        if (muteBtn) muteBtn.style.display = 'inline-block';
        if (camBtn) camBtn.style.display = 'inline-block';
        if (switchCamBtn) switchCamBtn.style.display = 'inline-block'; 
        if (chatContainer) chatContainer.style.display = 'flex';
        if (paintContainer) paintContainer.style.display = 'block';
        setupCanvas();

        // Показываем панель управления, если мы Слот #1
        if (mySlotIndex === 1 && hostPanel) {
            renderHostPanel();
        }

        // Создаем свое видео окно на экране
        createVideoWindow(FULL_PEER_ID, localStream, `${myNickname} (Я)`, true);

        establishMeshLinks();
    });

    peer.on('call', (call) => {
        log(`Получен входящий медиазвонок от: ${call.peer}`);
        call.answer(localStream);
        
        call.on('stream', (remoteStream) => {
            log(`Получен удаленный медиапоток от ${call.peer}`);
            const currentLabel = connectedPeersRegistry[call.peer]?.nickname || `User #${call.peer.replace(ROOM_BASE_PREFIX, "")}`;
            createVideoWindow(call.peer, remoteStream, currentLabel);
            trackVoiceVolume(remoteStream, call.peer);
            
            if (!connectedPeersRegistry[call.peer]) {
                connectedPeersRegistry[call.peer] = {};
            }
            connectedPeersRegistry[call.peer].call = call;
            
            // Защита от зависания кадра (onended срабатывает при закрытии вкладки / обрыве сети)
            remoteStream.getVideoTracks().forEach(track => {
                track.onended = () => {
                    log(`Аварийное завершение трека видео для ${call.peer}. Удаляю окно.`);
                    removeVideoWindow(call.peer);
                };
            });

            renderHostPanel();
        });

        call.on('close', () => {
            log(`Медиа-канал закрыт от ${call.peer}`);
            removeVideoWindow(call.peer);
        });
        
        call.on('error', (err) => {
            log(`Ошибка медиазвонка с ${call.peer}: ${err.message}`, "error");
            removeVideoWindow(call.peer);
        });
    });

    peer.on('connection', (conn) => {
        log(`Установлен входящий канал данных с: ${conn.peer}`);
        setupDataChannelListeners(conn);
    });

    peer.on('error', (err) => {
        log(`Критическая ошибка PeerJS: ${err.type}`, "error");
    });
}

// Автоматическое связывание узлов децентрализованной Mesh сети
function establishMeshLinks() {
    for (let slot = 1; slot <= MAX_SLOTS; slot++) {
        if (slot === mySlotIndex) continue;
        const targetPeerId = `${ROOM_BASE_PREFIX}${slot}`;
        
        log(`Пробуем связаться со слотом #${slot}...`);
        
        // Создаем Data Channel для текстового чата и рисунков
        const conn = peer.connect(targetPeerId, { metadata: { nickname: myNickname, hash: MY_UNIQUE_HASH } });
        setupDataChannelListeners(conn);

        // Звоним медиа-потоком
        const call = peer.call(targetPeerId, localStream);
        if (call) {
            if (!connectedPeersRegistry[targetPeerId]) {
                connectedPeersRegistry[targetPeerId] = {};
            }
            connectedPeersRegistry[targetPeerId].call = call;

            call.on('stream', (remoteStream) => {
                log(`Получен удаленный медиапоток от ${call.peer}`);
                const currentLabel = connectedPeersRegistry[call.peer]?.nickname || `User #${call.peer.replace(ROOM_BASE_PREFIX, "")}`;
                createVideoWindow(call.peer, remoteStream, currentLabel);
                trackVoiceVolume(remoteStream, call.peer);
                
                remoteStream.getVideoTracks().forEach(track => {
                    track.onended = () => {
                        log(`Аварийное завершение трека видео для ${call.peer}. Удаляю окно.`);
                        removeVideoWindow(call.peer);
                    };
                });

                renderHostPanel();
            });

            call.on('close', () => {
                log(`Медиа-канал закрыт от ${call.peer}`);
                removeVideoWindow(call.peer);
            });
            
            call.on('error', (err) => {
                log(`Ошибка исходящего вызова к ${call.peer}: ${err.message}`, "error");
                removeVideoWindow(call.peer);
            });
        }
    }
}

// Настройка прослушивания Data Channel событий
function setupDataChannelListeners(conn) {
    if (!connectedPeersRegistry[conn.peer]) {
        connectedPeersRegistry[conn.peer] = {};
    }
    connectedPeersRegistry[conn.peer].dataChannel = conn;

    conn.on('open', () => {
        log(`Канал обмена данными активен с: ${conn.peer}`);
        // Отправляем свой никнейм сразу после открытия канала
        conn.send({ type: "handshake-profile", nickname: myNickname });
        renderHostPanel();
    });

    conn.on('data', (data) => {
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
            case "handshake-profile":
                if (connectedPeersRegistry[conn.peer]) {
                    connectedPeersRegistry[conn.peer].nickname = data.nickname;
                }
                updateVideoLabel(conn.peer, data.nickname);
                renderHostPanel();
                break;

            case "chat-msg":
                displayIncomingMessage(data.sender, data.text);
                break;

            case "canvas-stroke":
                renderRemoteStroke(data.stroke, data.color, data.size, data.opacity);
                break;

            case "canvas-clear":
                clearCanvasLocally();
                break;

            case "kick-signal":
                log("Вы были исключены администратором комнаты", "error");
                alert("Вы были исключены администратором из этой комнаты.");
                if (peer) peer.destroy();
                location.reload();
                break;
        }
    });

    conn.on('close', () => {
        log(`Канал данных закрыт со стороны: ${conn.peer}`);
        removeVideoWindow(conn.peer);
    });

    conn.on('error', (err) => {
        log(`Ошибка канала данных с ${conn.peer}: ${err.message}`, "error");
        removeVideoWindow(conn.peer);
    });
}

// Динамическое добавление HTML окон под видео на страницу
function createVideoWindow(peerId, stream, labelText, isLocal = false) {
    const wrapperId = `wrap-${peerId}`;
    let wrapper = document.getElementById(wrapperId);

    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.className = `video-wrapper ${isLocal ? 'my-video' : ''}`;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        if (isLocal) video.muted = true; // Защита от фидбека

        const label = document.createElement('div');
        label.className = 'video-label';
        label.id = `label-${peerId}`;
        label.innerText = labelText;

        wrapper.appendChild(video);
        wrapper.appendChild(label);
        if (videoGrid) videoGrid.appendChild(wrapper);

        // Попытка запустить проигрывание
        video.play().catch(err => {
            log(`Браузер отложил запуск видео-элемента: ${err.message}`, "warn");
            if (!isLocal && audioOverlay) {
                audioOverlay.style.display = 'flex';
            }
        });
    } else {
        const video = wrapper.querySelector('video');
        if (video && video.srcObject !== stream) {
            video.srcObject = stream;
        }
    }
}

// Обновление имени пользователя на видео
function updateVideoLabel(peerId, nickname) {
    const label = document.getElementById(`label-${peerId}`);
    if (label) {
        const slotNum = peerId.replace(ROOM_BASE_PREFIX, "");
        label.innerText = peerId === FULL_PEER_ID ? `${nickname} (Я)` : `${nickname} (Slot #${slotNum})`;
    }
}

// Полное удаление окна пользователя из DOM
function removeVideoWindow(peerId) {
    const wrapper = document.getElementById(`wrap-${peerId}`);
    if (wrapper) {
        const video = wrapper.querySelector('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        wrapper.remove();
        log(`Окно медиапотока успешно удалено: ${peerId}`);
    }

    if (connectedPeersRegistry[peerId]) {
        delete connectedPeersRegistry[peerId];
    }

    renderHostPanel();
}

// Смена камеры «на лету» во всей Mesh сети
async function switchFacingMode() {
    if (!localStream) return;
    
    currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
    log(`Переключение камеры на режим: ${currentFacingMode}`);
    
    try {
        localStream.getVideoTracks().forEach(track => track.stop());
        
        const newVideoMedia = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        const newVideoTrack = newVideoMedia.getVideoTracks()[0];
        
        const oldVideoTrack = localStream.getVideoTracks()[0];
        if (oldVideoTrack) localStream.removeTrack(oldVideoTrack);
        localStream.addTrack(newVideoTrack);
        
        // Обновляем плеер у себя на экране
        const myWrapper = document.getElementById(`wrap-${FULL_PEER_ID}`);
        if (myWrapper) {
            const videoEl = myWrapper.querySelector('video');
            if (videoEl) videoEl.srcObject = localStream;
        }
        
        // Подменяем трек у всех подключенных пиров в Mesh
        Object.keys(connectedPeersRegistry).forEach(peerId => {
            const peerConnection = connectedPeersRegistry[peerId].call?.peerConnection;
            if (peerConnection) {
                const senders = peerConnection.getSenders();
                const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(newVideoTrack);
                }
            }
        });
        
        log("Камера успешно обновлена во всей Mesh сети.");
    } catch (err) {
        log(`Не удалось сменить камеру: ${err.message}`, "error");
        currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
    }
}

// Отрисовка интерактивной панели администратора (для Слот #1)
function renderHostPanel() {
    if (mySlotIndex !== 1 || !hostPanel || !hostUserList) return;
    
    hostPanel.style.display = "block";
    hostUserList.innerHTML = "";
    
    const activePeers = Object.keys(connectedPeersRegistry);
    
    if (activePeers.length === 0) {
        hostUserList.innerHTML = `<div style="color: #6c7086; font-style: italic; font-size: 14px;">В комнате пока нет других участников...</div>`;
        return;
    }
    
    activePeers.forEach(peerId => {
        const info = connectedPeersRegistry[peerId];
        const isDataActive = info.dataChannel && info.dataChannel.open;
        
        const userRow = document.createElement('div');
        userRow.className = 'host-user-row';
        
        const slotNum = peerId.replace(ROOM_BASE_PREFIX, "");
        const displayName = info.nickname ? `${info.nickname} (Slot #${slotNum})` : `Участник #${slotNum}`;
        
        const statusBadge = isDataActive 
            ? `<span style="color: #a6e3a1; font-size: 13px; font-weight: bold; margin-left: 10px;">● В сети</span>` 
            : `<span style="color: #f38ba8; font-size: 13px; font-weight: bold; margin-left: 10px;">⚠️ Завис (Фантом)</span>`;
            
        userRow.innerHTML = `
            <div style="font-size: 14px;">
                <strong style="color: #cdd6f4;">${displayName}</strong>
                ${statusBadge}
            </div>
            <button class="host-kick-btn" data-peer="${peerId}">Кикнуть</button>
        `;
        
        userRow.querySelector('.host-kick-btn').addEventListener('click', (e) => {
            const targetPeer = e.target.getAttribute('data-peer');
            kickUser(targetPeer);
        });
        
        hostUserList.appendChild(userRow);
    });
}

// Ручная очистка фантомных участников по кнопке
function cleanGhostUsers() {
    log("Запуск проверки и очистки вышедших из вкладки пользователей...");
    let cleanedCount = 0;
    
    Object.keys(connectedPeersRegistry).forEach(peerId => {
        const info = connectedPeersRegistry[peerId];
        // Если Data Channel отсутствует или закрыт - вкладка была закрыта без сигнала close
        if (!info.dataChannel || !info.dataChannel.open) {
            log(`Принудительное удаление зависшей сессии: ${peerId}`);
            removeVideoWindow(peerId);
            cleanedCount++;
        }
    });
    
    renderHostPanel();
    log(`Проверка завершена. Вычищено фантомов: ${cleanedCount}`);
}

// Принудительный кик пользователя
function kickUser(peerId) {
    const info = connectedPeersRegistry[peerId];
    if (info && info.dataChannel && info.dataChannel.open) {
        log(`Отправка сигнала кика к: ${peerId}`, "warn");
        info.dataChannel.send({ type: "kick-signal" });
    }
    removeVideoWindow(peerId);
    renderHostPanel();
}

// Система отслеживания активности голоса (Подсветка говорящего)
function trackVoiceVolume(stream, peerId) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) return;

        const source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let activeCount = 0;

        function checkVolume() {
            if (!document.getElementById(`wrap-${peerId}`)) {
                source.disconnect();
                analyser.disconnect();
                return;
            }

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;

            const wrapper = document.getElementById(`wrap-${peerId}`);
            if (wrapper) {
                if (average > 15) { // Порог чувствительности
                    activeCount = 8; 
                    wrapper.classList.add('speaking');
                } else {
                    if (activeCount > 0) {
                        activeCount--;
                    } else {
                        wrapper.classList.remove('speaking');
                    }
                }
            }
            setTimeout(checkVolume, 100);
        }

        checkVolume();
    } catch (e) {
        console.log("AudioContext отслеживание громкости не поддерживается или заблокировано:", e);
    }
}

// Отправка сообщений в чат
function sendChatMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    displayIncomingMessage(`${myNickname} (Я)`, text);
    chatInput.value = "";

    Object.keys(connectedPeersRegistry).forEach(peerId => {
        const conn = connectedPeersRegistry[peerId].dataChannel;
        if (conn && conn.open) {
            conn.send({
                type: "chat-msg",
                sender: myNickname,
                text: text
            });
        }
    });
}

function displayIncomingMessage(sender, text) {
    if (!chatMessages) return;
    const item = document.createElement('div');
    item.className = 'chat-msg-item';
    item.innerHTML = `<strong style="color: #cba6f7;">${sender}:</strong> <span style="color: #cdd6f4;"></span>`;
    item.querySelector('span').innerText = text; // Защита от XSS
    chatMessages.appendChild(item);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Инициализация Canvas рисования
function setupCanvas() {
    canvas = document.getElementById('paintCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // Настройка размеров
    const rect = canvas.getBoundingClientRect();
    canvas.width = 500;
    canvas.height = 320;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    canvas.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    }, { passive: true });
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getCanvasCoords(e);
    lastX = coords.x;
    lastY = coords.y;
    currentStroke = [{ x: lastX, y: lastY }];
}

function draw(e) {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    
    const color = brushColor ? brushColor.value : "#cba6f7";
    const size = brushSize ? brushSize.value : 5;
    const opacity = brushOpacity ? brushOpacity.value : 1.0;

    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.globalAlpha = opacity;
    ctx.stroke();

    currentStroke.push({ x: coords.x, y: coords.y });
    
    lastX = coords.x;
    lastY = coords.y;
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    
    if (currentStroke.length > 0) {
        const color = brushColor ? brushColor.value : "#cba6f7";
        const size = brushSize ? brushSize.value : 5;
        const opacity = brushOpacity ? brushOpacity.value : 1.0;

        drawingHistory.push({ stroke: currentStroke, color, size, opacity });
        redoStack = []; // Сбрасываем редю стек

        // Вещаем по сети
        Object.keys(connectedPeersRegistry).forEach(peerId => {
            const conn = connectedPeersRegistry[peerId].dataChannel;
            if (conn && conn.open) {
                conn.send({
                    type: "canvas-stroke",
                    stroke: currentStroke,
                    color,
                    size,
                    opacity
                });
            }
        });
    }
    currentStroke = [];
}

function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    // Рассчитываем реальные внутренние пиксели
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
}

function renderRemoteStroke(stroke, color, size, opacity) {
    if (!ctx || stroke.length < 1) return;
    ctx.save();
    ctx.beginPath();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.globalAlpha = opacity;
    
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
    ctx.restore();
    
    drawingHistory.push({ stroke, color, size, opacity });
}

function clearCanvasLocally() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory = [];
    redoStack = [];
}

function sendClearCanvas() {
    clearCanvasLocally();
    Object.keys(connectedPeersRegistry).forEach(peerId => {
        const conn = connectedPeersRegistry[peerId].dataChannel;
        if (conn && conn.open) {
            conn.send({ type: "canvas-clear" });
        }
    });
}

function undoLocalCanvas() {
    if (drawingHistory.length === 0) return;
    const popped = drawingHistory.pop();
    redoStack.push(popped);
    redrawEntireCanvas();
    // В децентрализованной схеме для синхронизации полной очистки
    // отправляем команду очистки и шлем оставшуюся историю
    syncCanvasToAll();
}

function redoLocalCanvas() {
    if (redoStack.length === 0) return;
    const popped = redoStack.pop();
    drawingHistory.push(popped);
    redrawEntireCanvas();
    syncCanvasToAll();
}

function redrawEntireCanvas() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawingHistory.forEach(item => {
        ctx.save();
        ctx.beginPath();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.size;
        ctx.globalAlpha = item.opacity;
        
        ctx.moveTo(item.stroke[0].x, item.stroke[0].y);
        for (let i = 1; i < item.stroke.length; i++) {
            ctx.lineTo(item.stroke[i].x, item.stroke[i].y);
        }
        ctx.stroke();
        ctx.restore();
    });
}

function syncCanvasToAll() {
    Object.keys(connectedPeersRegistry).forEach(peerId => {
        const conn = connectedPeersRegistry[peerId].dataChannel;
        if (conn && conn.open) {
            conn.send({ type: "canvas-clear" });
            drawingHistory.forEach(item => {
                conn.send({
                    type: "canvas-stroke",
                    stroke: item.stroke,
                    color: item.color,
                    size: item.size,
                    opacity: item.opacity
                });
            });
        }
    });
}

// Скопировать логи в буфер
function showCopiedFeedback() {
    if (copyLogBtn) copyLogBtn.innerText = translations[currentLang].logCopied;
    setTimeout(() => { if (copyLogBtn) copyLogBtn.innerText = "Copy Logs"; }, 2000);
}

function executeFallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus(); textArea.select();
    try {
        document.execCommand('copy');
        showCopiedFeedback();
    } catch (err) {
        if (copyLogBtn) copyLogBtn.innerText = translations[currentLang].logCopyErr;
    }
    document.body.removeChild(textArea);
}

// Регистрация основных интерактивных событий DOM структуры
window.addEventListener('DOMContentLoaded', () => {
    MY_UNIQUE_HASH = generateUniqueId(16);

    mainTitle = document.getElementById('mainTitle');
    roomBadge = document.getElementById('roomBadge');
    nicknameInput = document.getElementById('nicknameInput');
    joinBtn = document.getElementById('joinBtn');
    muteBtn = document.getElementById('muteBtn');
    camBtn = document.getElementById('camBtn');
    switchCamBtn = document.getElementById('switchCamBtn');
    statusText = document.getElementById('statusText');
    videoGrid = document.getElementById('videoGrid');

    chatContainer = document.getElementById('chatContainer');
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendMsgBtn = document.getElementById('sendMsgBtn');

    paintContainer = document.getElementById('paintContainer');
    brushColor = document.getElementById('brushColor');
    brushSize = document.getElementById('brushSize');
    brushOpacity = document.getElementById('brushOpacity');
    undoBtn = document.getElementById('undoBtn');
    redoBtn = document.getElementById('redoBtn');
    clearBtn = document.getElementById('clearBtn');

    toggleLogBtn = document.getElementById('toggleLogBtn');
    logSection = document.getElementById('logSection');
    logDiv = document.getElementById('logDiv');
    copyLogBtn = document.getElementById('copyLogBtn');

    audioOverlay = document.getElementById('audioOverlay');
    modalText = document.getElementById('modalText');
    audioOverlayBtn = document.getElementById('audioOverlayBtn');

    hostPanel = document.getElementById('hostPanel');
    hostUserList = document.getElementById('hostUserList');
    refreshUsersBtn = document.getElementById('refreshUsersBtn');

    // Кнопки языков
    document.getElementById('langEn').addEventListener('click', () => selectLanguage('en'));
    document.getElementById('langUa').addEventListener('click', () => selectLanguage('ua'));
    document.getElementById('langRu').addEventListener('click', () => selectLanguage('ru'));

    // Вход в комнату
    joinBtn.addEventListener('click', async () => {
        const val = nicknameInput.value.trim();
        if (val) myNickname = val;

        joinBtn.setAttribute('disabled', 'true');
        const mediaOk = await acquireLocalUserMedia();
        if (!mediaOk) {
            joinBtn.removeAttribute('disabled');
            return;
        }

        const slotOk = await allocateRoomSlot();
        if (!slotOk) {
            joinBtn.removeAttribute('disabled');
            return;
        }

        initializeMeshConference();
    });

    // Мут микрофона
    muteBtn.addEventListener('click', () => {
        if (!localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            isMuted = !isMuted;
            audioTrack.enabled = !isMuted;
            log(isMuted ? "Микрофон отключен." : "Микрофон успешно включен.");
            muteBtn.innerText = isMuted ? translations[currentLang].micMuted : translations[currentLang].micUnmuted;
            muteBtn.classList.toggle('active-state', isMuted);
        }
    });

    // Выключение камеры
    camBtn.addEventListener('click', () => {
        if (!localStream) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            isCamOff = !isCamOff;
            videoTrack.enabled = !isCamOff;
            log(isCamOff ? "Видеопоток камеры остановлен." : "Видеопоток камеры запущен.");
            camBtn.innerText = isCamOff ? translations[currentLang].camOff : translations[currentLang].camOn;
            camBtn.classList.toggle('active-state', isCamOff);
        }
    });

    // Смена камеры фронтальная / основная
    switchCamBtn.addEventListener('click', switchFacingMode);

    // Панель админа: ручное обновление
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', cleanGhostUsers);
    }

    // Чат события
    sendMsgBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Рисование события управления
    clearBtn.addEventListener('click', sendClearCanvas);
    undoBtn.addEventListener('click', undoLocalCanvas);
    redoBtn.addEventListener('click', redoLocalCanvas);

    // Оверлей разблокировки аудио политик браузера
    if (audioOverlayBtn) {
        audioOverlayBtn.addEventListener('click', () => {
            if (audioOverlay) audioOverlay.style.display = 'none';
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            document.querySelectorAll('video').forEach(video => {
                video.play().catch(err => console.log("Ручной запуск видео не удался:", err));
            });
        });
    }

    // Открытие консоли логов
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

    // Инициализируем базовый язык интерфейса по умолчанию
    selectLanguage('en');

    // Фоновая попытка прогрева камеры при старте (необязательно)
    navigator.mediaDevices.enumerateDevices()
        .then(devices => log(`Доступно медиа-устройств ввода: ${devices.length}`))
        .catch(e => console.log("Фоновое перечисление не удалось:", e));
});
