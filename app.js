// Фиксированный ID для главной комнаты. Измените, чтобы никто чужой не зашел.
const ROOM_ID = "my-secret-global-audio-room-2026"; 

// Генерируем случайный ID для гостя, если комната уже создана
const MY_GUEST_ID = "guest-" + Math.random().toString(36).substring(2, 9);

let peer = null;
let localStream = null;
const connectedPeers = new Set();

const joinBtn = document.getElementById('joinBtn');
const statusText = document.getElementById('statusText');
const logDiv = document.getElementById('log');
const audioContainer = document.getElementById('remoteAudioContainer');

function log(msg) {
    logDiv.innerHTML += `<br>> ${msg}`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    statusText.innerText = "Запрос микрофона...";
    
    try {
        // 1. Включаем микрофон
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        log("Микрофон подключен.");
        
        statusText.innerText = "Подключение к комнате...";
        
        // 2. Сначала пробуем создать комнату как Хост (главный)
        tryToConnectAsHost();

    } catch (err) {
        log(`Ошибка: ${err.message}`);
        statusText.innerText = "Нужен доступ к микрофону!";
        joinBtn.disabled = false;
    }
});

// Пытаемся стать создателем комнаты
function tryToConnectAsHost() {
    peer = new Peer(ROOM_ID);
    
    peer.on('open', (id) => {
        log(`Вы создали комнату! Ожидаем друзей...`);
        statusText.innerText = "Вы — Хост комнаты. Ожидание подключений...";
        listenForCalls();
    });

    peer.on('error', (err) => {
        // Если этот ID уже занят (значит друг зашел раньше вас и создал комнату)
        if (err.type === 'unavailable-id') {
            log("Комната уже создана другом. Подключаемся как гость...");
            connectAsGuest();
        } else {
            log(`Ошибка сети: ${err.type}`);
        }
    });
}

// Если комната занята, подключаемся как участник
function connectAsGuest() {
    // Пересоздаем Peer со случайным ID гостя
    peer = new Peer(MY_GUEST_ID);
    
    peer.on('open', (id) => {
        log(`Вы вошли как гость. Звоним создателю комнаты...`);
        statusText.innerText = "Соединение с хостом...";
        
        // Сразу автоматически звоним создателю комнаты
        const call = peer.call(ROOM_ID, localStream);
        
        call.on('stream', (remoteStream) => {
            addAudioStream(ROOM_ID, remoteStream);
        });
        
        listenForCalls(); // Тоже слушаем входящие на случай новых гостей
    });
}

// Слушаем входящие звонки
function listenForCalls() {
    peer.on('call', (call) => {
        if (connectedPeers.has(call.peer)) return;
        
        log(`Обнаружено входящее подключение...`);
        call.answer(localStream);
        
        call.on('stream', (remoteStream) => {
            addAudioStream(call.peer, remoteStream);
        });
    });
}

// Добавление звука на страницу
function addAudioStream(peerId, stream) {
    if (connectedPeers.has(peerId)) return;
    connectedPeers.add(peerId);

    const audio = document.createElement('audio');
    audio.id = `audio-${peerId}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    audioContainer.appendChild(audio);
    
    log(`Звук успешно подключен!`);
    statusText.innerText = `В сети. Собеседников: ${connectedPeers.size}`;
}
