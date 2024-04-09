document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let isQueued = false;

    const languageSelectionForm = document.getElementById('language-selection-form');
    const chatForm = document.getElementById('chat-form');
    const messagesList = document.getElementById('messages');
    const statusMessage = document.getElementById('status-message');

    // Function to show status message
    function showStatusMessage(message) {
        statusMessage.innerHTML = message;
    }

    function enterQueue(learnLanguage) {
        isQueued = true;
        languageSelectionForm.style.display = 'none';
        chatForm.style.display = 'none';
        showStatusMessage(`Searching for another user that speaks <strong>${learnLanguage}</strong>...`);
    }

    function leaveQueue() {
        isQueued = false;
        languageSelectionForm.style.display = 'block';
        chatForm.style.display = 'none';
        showStatusMessage('');
    }

    languageSelectionForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const nativeLanguageSelect = document.getElementById('native-language');
        const learnLanguageSelect = document.getElementById('learn-language');
        const nativeLanguage = nativeLanguageSelect.value;
        const learnLanguage = learnLanguageSelect.value;

        if (!isQueued) {
            enterQueue(learnLanguage);
            socket.emit('join queue', { nativeLanguage, learnLanguage });
        }
    });

    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message');

    const sendButton = document.getElementById('message-button')

    sendButton.addEventListener('click', (event) => {
        event.preventDefault();

        const message = messageInput.value.trim();
        if (message !== '') {
            socket.emit('message', message);
            messageInput.value = '';
        }
    });

    socket.on('message', (data) => {
        const { senderId, message } = data;
        const li = document.createElement('li');

        if (senderId === socket.id) {
            li.innerHTML = `<strong class="you">YOU:</strong> ${message}`;
        } else if (senderId === 'server') {
            li.innerHTML = `<strong class="server">SERVER:</strong> ${message}`;
        } else {
            li.innerHTML = `<strong class="stranger">STRANGER:</strong> ${message}`;
        }

        messagesList.appendChild(li);
        messagesList.scrollTop = messagesList.scrollHeight; // Scroll to bottom
    });

    socket.on('match found', () => {
        showStatusMessage('');
        languageSelectionForm.style.display = 'none';
        chatForm.style.display = 'block';
    });

    socket.on('disconnect', () => {
        if (isQueued) {
            leaveQueue();
            showStatusMessage('');
        }
    });
});
