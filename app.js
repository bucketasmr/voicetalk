const ROOM_ID = "global-audio-bridge-ukraine-usa-2026"; 
const MY_GUEST_ID = "guest-" + Math.random().toString(36).substring(2, 9);

let peer = null;
let localStream = null;
const connectedPeers = new Set();

// Словарь переводов
const translations = {
    en: {
        title: "Global Audio Chat",
        badge: "Room: World Wide",
        btnJoin: "Join Room",
        statusWait: "Click button to connect...",
        statusMicRequest: "Requesting microphone...",
        statusNetConnect: "Connecting to international network...",
        statusHostWait: "You are Host. Waiting for friends...",
        statusGuestConnect: "Connecting to host...",
        statusConnected: "Connection established!",
        logMicOk: "Microphone connected.",
        logHostCreated: "You created the room (Host). Waiting for friend...",
        logGuestMode: "Room already exists. Connecting as guest...",
        logGuestCall: "You joined as guest. Calling host...",
        logIncomingCall: "Incoming call accepted. Exchanging audio packets...",
        logStreamOk: "Audio stream successfully established!",
        logAudioBlock: "Browser blocked auto-audio. Click anywhere on the screen.",
        micNeeded: "Microphone access is required!"
    },
    uk: {
        title: "Глобальний аудіочат",
        badge: "Кімната: Світ",
        btnJoin: "Увійти в кімнату",
        statusWait: "Натисніть кнопку для підключення...",
        statusMicRequest: "Запит мікрофона...",
        statusNetConnect: "Підключення до міжнародної мережі...",
        statusHostWait: "Ви Хост. Очікування друзів...",
        statusGuestConnect: "З'єднання з хостом...",
        statusConnected: "Зв'язок встановлено!",
        logMicOk: "Мікрофон підключено.",
        logHostCreated: "Ви створили кімнату (Хост). Очікуємо друга...",
        logGuestMode: "Кімната вже створена. Підключаємося як гість...",
        logGuestCall: "Ви зайшли як гість. Дзвонимо хосту...",
        logIncomingCall: "Вхідний дзвінок прийнято. Обмін аудіо-пакетами...",
        logStreamOk: "Аудіопотік успішно запущено!",
        logAudioBlock: "Браузер заблокував автозвук. Клікніть у будь-якому місці екрана.",
        micNeeded: "Потрібен доступ до мікрофона!"
    },
    ru: {
        title: "Глобальный аудиочат",
        badge: "Комната: Весь мир",
        btnJoin: "Войти в комнату",
        statusWait: "Натисніть кнопку для підключення...", // Оставил как в оригинале, обновим на ру ниже
        statusWait: "Нажмите кнопку для подключения...",
        statusMicRequest: "Запрос микрофона...",
        statusNetConnect: "Подключение к международной сети...",
        statusHostWait: "Вы Хост. Ожидание друзей...",
        statusGuestConnect: "Соединение с хостом...",
        statusConnected: "Связь установлена!",
        logMicOk: "Микрофон подключен.",
        logHostCreated: "Вы создали комнату (Хост). Ожидаем друга...",
        logGuestMode: "Комната уже создана. Подключаемся как гость...",
        logGuestCall: "Вы вошли как гость. Звоним хосту...",
        logIncomingCall: "Входящий звонок принят. Обмен аудио-пакетами...",
        logStreamOk: "Аудиопоток успешно запущен!",
        logAudioBlock: "Браузер заблокировал автозвук. Кликните в любом месте экрана.",
        micNeeded: "Нужен доступ к микрофону!"
    }
};

// Язык по умолчанию
let currentLang = 'en';

const joinBtn = document.getElementById('joinBtn');
const statusText = document.getElementById('statusText');
const logDiv = document.getElementById('log');
const audioContainer = document.getElementById('remoteAudioContainer');

const peerConfig = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            {
                urls: 'turn:all-in-one-turnserver.ddns.net:3478?transport=udp',
                username: 'guest',
                credential: 'somepassword'
            }
        ],
        sdpSemantics: 'unified-plan'
    }
};

function log(msgKey, isDirectText = false) {
    const text = isDirectText ? msgKey : (translations[currentLang][msgKey] || msgKey);
    logDiv.innerHTML += `<br>> ${text}`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

// Функция смены языка интерфейса
function changeLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;

    // Обновляем визуальный активный статус кнопок
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${lang}`).classList.add('active');

    // Переводим элементы
    document.getElementById('txt-title').innerText = translations[lang].title;
    document.getElementById('txt-badge').innerText = translations[lang].badge;
    
    if (!joinBtn.disabled) {
        joinBtn.innerText = translations[lang].btnJoin;
    }
    
    // Переводим текущий статус динамически (если связь еще не установлена или установлена)
    if (statusText.innerText === translations.en.statusWait || statusText.innerText === translations.uk.statusWait || statusText.innerText === translations.ru.statusWait) {
        statusText.innerText = translations[lang].statusWait;
    } else if (statusText.innerText.includes("Connected") || statusText.innerText.includes("встановлено") || statusText.innerText.includes("установлена")) {
        statusText.innerText = translations[lang].statusConnected;
    }
}

// Автоопределение языка при загрузке страницы
function detectDeviceLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const shortLang = browserLang.substring(0, 2).toLowerCase(); // Получаем первые 2 буквы (ru, uk, en)

    if (shortLang === 'uk' || shortLang === 'ua') {
        changeLanguage('uk');
    } else if (shortLang === 'ru') {
        changeLanguage('ru');
    } else {
        changeLanguage('en'); // Все остальные языки мира по умолчанию полетят на английском
    }
}

// Запуск детектора при старте скрипта
detectDeviceLanguage();

joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    statusText.innerText = translations[currentLang].statusMicRequest;
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
            video: false 
        });
        log("logMicOk");
        statusText.innerText = translations[currentLang].statusNetConnect;
        
        tryToConnectAsHost();

    } catch (err) {
        log(err.message, true);
        statusText.innerText = translations[currentLang].micNeeded;
        joinBtn.disabled = false;
    }
});

function tryToConnectAsHost() {
    peer = new Peer(ROOM_ID, peerConfig);
    
    peer.on('open', (id) => {
        log("logHostCreated");
        statusText.innerText = translations[currentLang].statusHostWait;
        listenForCalls();
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            log("logGuestMode");
            connectAsGuest();
        } else {
            log(`Network Error: ${err.type}`, true);
        }
    });
}

function connectAsGuest() {
    peer = new Peer(MY_GUEST_ID, peerConfig);
    
    peer.on('open', (id) => {
        log("logGuestCall");
        statusText.innerText = translations[currentLang].statusGuestConnect;
        
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
        
        log("logIncomingCall");
        call.answer(localStream);
        
        call.on('stream', (remoteStream) => {
            addAudioStream(call.peer, remoteStream);
        });
    });
}

function addAudioStream(peerId, stream) {
    if (connectedPeers.has(peerId)) return;
    connectedPeers.add(peerId);

    const audio = document.createElement('audio');
    audio.id = `audio-${peerId}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('autoplay', 'true');
    
    audioContainer.appendChild(audio);
    
    audio.play().catch(e => {
        log("logAudioBlock");
        document.body.addEventListener('click', () => { audio.play(); }, { once: true });
    });
    
    log("logStreamOk");
    statusText.innerText = translations[currentLang].statusConnected;
}
