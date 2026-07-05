// Фиксированный ID для вашей комнаты. Можете изменить на свой секретный.
const ROOM_ID = "global-audio-bridge-ukraine-usa-2026"; 
const MY_GUEST_ID = "guest-" + Math.random().toString(36).substring(2, 9);

let peer = null;
let localStream = null;
const connectedPeers = new Set();

const joinBtn = document.getElementById('joinBtn');
const statusText = document.getElementById('statusText');
const logDiv = document.getElementById('log');
const audioContainer = document.getElementById('remoteAudioContainer');

// Конфигурация серверов для пробития NAT между Украиной и США
const peerConfig = {
    config: {
        iceServers: [
            // Публичные STUN-сервера Google
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            // Бесплатный TURN-сервер (ретранслятор на случай строгих NAT)
            {
                urls: 'turn:all-in-one-turnserver.ddns.net:3478?transport=udp',
                username: 'guest',
                credential: 'somepassword'
            }
        ],
        sdpSemantics: 'unified-plan'
    }
};

function log(msg) {
    logDiv.innerHTML += `<br>> ${msg}`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    statusText.innerText = "Запрос микрофона...";
    
    try {
        // Запрашиваем микрофон с явными настройками (отключаем эхо и шум)
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }, 
            video: false 
        });
        log("Микрофон подключен.");
        statusText.innerText = "Подключение к международной сети...";
        
        tryToConnectAsHost();

    } catch (err) {
        log(`Ошибка: ${err.message}`);
        statusText.innerText = "Нужен доступ к микрофону!";
        joinBtn.disabled = false;
    }
});

function tryToConnectAsHost() {
    // Передаем peerConfig вторым аргументом
    peer = new Peer(ROOM_ID, peerConfig);
    
    peer.on('open', (id) => {
        log(`Вы создали комнату (Хост). Ожидаем друга из США...`);
        statusText.innerText = "Ожидание подключения друга...";
        listenForCalls();
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            log("Комната уже создана. Подключаемся как гость...");
            connectAsGuest();
        } else {
            log(`Ошибка сети: ${err.type}`);
        }
    });
}

function connectAsGuest() {
    peer = new Peer(MY_GUEST_ID, peerConfig);
    
    peer.on('open', (id) => {
        log(`Вы вошли как гость. Вызываем хоста...`);
        statusText.innerText = "Соединение через океан...";
        
        const call = peer.call(ROOM_ID, localStream);
        
        call.on('stream', (remoteStream) => {
            addAudioStream(ROOM_ID, remoteStream);
        });
        
        listenForCalls();
    });
}

function listenForCalls() {
    peer.on('call', (call) => {
        if (connectedPeers.has(call.peer)) return;
        
        log(`Входящий звонок принят. Обмениваемся аудио-пакетами...`);
        call.answer(localStream);
        
        call.on('stream', (remoteStream) => {
            addAudioStream(call.peer, remoteStream);
        });
    });
}

function addAudioStream(peerId, stream) {
    if (connectedPeers.has(peerId)) return;
    connectedPeers.add(peerId);

    // Создаем аудио-тег с обходом ограничений iOS/Сафари
    const audio = document.createElement('audio');
    audio.id = `audio-${peerId}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.controls = false;
    
    // КРИТИЧЕСКИЕ атрибуты для мобильных браузеров (iPhone/Safari)
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('autoplay', 'true');
    
    audioContainer.appendChild(audio);
    
    // Принудительный пинок для Safari/iOS, который часто блокирует автозвук
    audio.play().catch(e => {
        log("Браузер заблокировал автозвук. Нажмите в любом месте экрана.");
        document.body.addEventListener('click', () => { audio.play(); }, { once: true });
    });
    
    log(`УРА! Звуковой поток успешно пробит и запущен!`);
    statusText.innerText = `Связь установлена!`;
}
