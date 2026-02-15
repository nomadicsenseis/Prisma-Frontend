// Chatbot UI
const chatbotClose = document.getElementById('chatbotClose');
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotWindow = document.getElementById('chatbotWindow');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatMessages = document.getElementById('chatMessages');

function toggleChat() {
    chatbotWindow.classList.toggle('open');
}
chatbotToggle.addEventListener('click', toggleChat);
chatbotClose.addEventListener('click', toggleChat);

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    // Handle newlines for bot responses
    if (sender === 'bot') {
        const formatted = text.replace(/\n/g, '<br>');
        div.innerHTML = `<p>${formatted}</p>`;
    } else {
        div.innerHTML = `<p>${text}</p>`;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

let currentConversationId = null;

async function handleSend() {
    const txt = chatInput.value.trim();
    if (!txt) return;

    addMessage(txt, 'user');
    chatInput.value = '';

    // Add loading indicator
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.classList.add('message', 'bot');
    loadingDiv.innerHTML = '<p>...</p>';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const res = await fetch('/api/chat-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: txt,
                conversation_id: currentConversationId
            })
        });

        // Remove loading
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (!res.ok) {
            throw new Error(`Server status: ${res.status}`);
        }

        const data = await res.json();

        if (data.error) {
            addMessage(`Error: ${data.error}`, 'bot');
        } else {
            // Save conversation ID for context
            if (data.conversation_id) {
                currentConversationId = data.conversation_id;
            }
            addMessage(data.response, 'bot');
        }
    } catch (e) {
        // Remove loading
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        console.error('Chat Error:', e);
        addMessage('Lo siento, el servicio de asistente no está disponible en este momento.', 'bot');
    }
}
chatSend.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });
