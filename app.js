// Уникальный ID комнаты (фиксированный для всех гостей и стримера)
const STREAM_ROOM_ID = "asmr-global-live-stream-2026-room";
let peer = null;
let localStream = null;
let myNickname = "Гость";
let isStreamer = false;

const welcomeOverlay = document.getElementById('welcomeOverlay');
const usernameInput = document.getElementById('usernameInput');
const startListenBtn = document.getElementById('startListenBtn');
const statusText = document.getElementById('statusText');
const controlsHost = document.getElementById('controlsHost');
const broadcastBtn = document.getElementById('broadcastBtn');
const remoteVideo = document.getElementById('remoteVideo');
const remoteAudio = document.getElementById('remoteAudio');
const videoBox = document.getElementById('videoBox');
const reactionsPanel = document.getElementById('reactionsPanel');

// Настройки PeerJS с качественными публичными STUN/TURN серверами
const peerConfig = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' }
        ]
    }
};

// Проверка: если в URL добавить ?host=1, то открывается панель стримера
if (window.location.search.includes('host=1')) {
    isStreamer = true;
    if (welcomeOverlay) welcomeOverlay.style.display = 'none';
    if (controlsHost) controlsHost.style.display = 'block';
    statusText.innerText = "Панель стримера. Нажмите кнопку запуска.";
}

// Кнопка входа для гостей
if (startListenBtn) {
    startListenBtn.addEventListener('click', () => {
        const nameVal = usernameInput.value.trim();
        if (nameVal.length > 0) myNickname = nameVal;
        welcomeOverlay.style.display = 'none';
        statusText.innerText = "Подключение к эфиру...";
        initGuestClient();
    });
}

// Запуск трансляции для Стримера (Windows 11 / iOS с высоким качеством звука)
if (broadcastBtn) {
    broadcastBtn.addEventListener('click', async () => {
        broadcastBtn.disabled = true;
        statusText.innerText = "Захват студийного аудио и видео...";
        try {
            // Максимальные настройки для качественного АСМР звука: стерео/моно без агрессивного сжатия
            localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: false, 
                    noiseSuppression: false, 
                    autoGainControl: false,
                    channelCount: { ideal: 2 } // Стерео звук для АСМР
                }, 
                video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
            });

            peer = new Peer(STREAM_ROOM_ID, peerConfig);

            peer.on('open', (id) => {
                statusText.innerText = "Эфир запущен! Ожидание зрителей...";
                if (reactionsPanel) reactionsPanel.style.display = 'flex';
                
                // Показываем локальное превью стримеру
                videoBox.style.display = 'block';
                remoteVideo.srcObject = localStream;
                remoteVideo.muted = true; // Себе звук выключаем во избежание эха
            });

            // Когда зритель подключается и запрашивает поток — стример отдает свой localStream
            peer.on('call', (call) => {
                console.log("Зритель подключился к эфиру:", call.peer);
                call.answer(localStream);
            });

            // Обработка дата-каналов от зрителей (для эмоций)
            peer.on('connection', (conn) => {
                conn.on('data', (data) => {
                    if (data && data.type === 'reaction') {
                        // Показываем эмоцию у стримера и транслируем всем остальным
                        showFloatingEmoji(data.emoji);
                        broadcastToEveryone(data);
                    }
                });
            });

        } catch (err) {
            statusText.innerText = "Ошибка доступа к микрофону/камере: " + err.message;
            broadcastBtn.disabled = false;
        }
    });
}

// Логика подключения Зрителя
let viewerDataConn = null;
const connectedPeersMap = new Set();

function initGuestClient() {
    // Генерируем случайный ID для зрителя
    const guestId = "viewer-" + Math.random().toString(36).substring(2, 9);
    peer = new Peer(guestId, peerConfig);

    peer.on('open', (id) => {
        statusText.innerText = "Связь с сервером установлена. Запрос эфира...";
        
        // Звоним хосту (стримеру) за получением медиапотока
        const call = peer.call(STREAM_ROOM_ID, null);
        
        if (call) {
            call.on('stream', (remoteStream) => {
                statusText.innerText = "Прямой эфир идет! 🎧";
                videoBox.style.display = 'block';
                remoteVideo.srcObject = remoteStream;
                remoteAudio.srcObject = remoteStream; // Поток выводится на динамики/наушники гостя
                if (reactionsPanel) reactionsPanel.style.display = 'flex';
            });
            
            call.on('close', () => {
                statusText.innerText = "Стример завершил трансляцию.";
            });
        }

        // Подключаем дата-канал для отправки и получения эмоций
        viewerDataConn = peer.connect(STREAM_ROOM_ID);
        if (viewerDataConn) {
            viewerDataConn.on('open', () => {
                console.log("Дата-канал со стримером открыт");
            });
            viewerDataConn.on('data', (data) => {
                if (data && data.type === 'reaction') {
                    showFloatingEmoji(data.emoji);
                }
            });
        }
    });

    peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') {
            statusText.innerText = "Стример сейчас не в сети. Ожидание запуска...";
            setTimeout(initGuestClient, 5000); // Автопереподключение каждые 5 сек
        } else {
            statusText.innerText = "Ошибка сети: " + err.message;
        }
    });
}

// Функция отправки эмоций
function sendReaction(emoji) {
    showFloatingEmoji(emoji);
    
    if (isStreamer) {
        // Если нажал стример — рассылаем всем через дата-каналы (если бы были соединены, но тут проще)
        broadcastToEveryone({ type: 'reaction', emoji: emoji });
    } else {
        // Гость отправляет стримеру
        if (viewerDataConn && viewerDataConn.open) {
            viewerDataConn.send({ type: 'reaction', emoji: emoji });
        }
    }
}

// Красивая анимация всплывающих эмоций на экране
function showFloatingEmoji(emoji) {
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.innerText = emoji;
    
    // Случайная позиция по горизонтали
    const randomX = Math.random() * (window.innerWidth - 80);
    el.style.left = randomX + 'px';
    
    document.body.appendChild(el);
    setTimeout(() => {
        el.remove();
    }, 3000);
}

// Рассылка от стримера (если потребуется расширить)
function broadcastToEveryone(data) {
    if (peer && peer.connections) {
        Object.keys(peer.connections).forEach(peerId => {
            peer.connections[peerId].forEach(conn => {
                if (conn.open) conn.send(data);
            });
        });
    }
}
