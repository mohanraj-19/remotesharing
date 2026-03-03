/**
 * Chat Implementation
 */

let chatMessages = [];

/**
 * Toggle Chat Panel
 */
function toggleChat() {
  const chatPanel = document.getElementById('chat-panel');
  const filePanel = document.getElementById('file-panel');
  
  if (chatPanel) {
    chatPanel.style.display = chatPanel.style.display === 'none' ? 'block' : 'none';
  }
  
  if (filePanel && chatPanel.style.display !== 'none') {
    filePanel.style.display = 'none';
  }
}

/**
 * Send Chat Message
 */
function sendChatMessage() {
  const chatInput = document.getElementById('chat-input');
  
  if (!chatInput || chatInput.value.trim() === '') {
    showNotification('Message cannot be empty', 'warning');
    return;
  }

  const message = chatInput.value.trim();

  if (!socket || !socket.connected) {
    showNotification('Not connected to server', 'error');
    return;
  }

  // Send message
  socket.emit('chat-message', {
    targetUserID: connectedUserID,
    message
  });

  // Display locally
  addChatMessage({
    fromUserID: userID,
    fromDisplayName: 'You',
    message,
    timestamp: new Date().toISOString(),
    own: true
  });

  chatInput.value = '';
  chatInput.focus();

  console.log('Chat message sent:', message);
}

/**
 * Add Chat Message to Display
 */
function addChatMessage(data) {
  const { fromUserID, fromDisplayName, message, own } = data;

  const chatMessages = document.getElementById('chat-messages');
  
  if (!chatMessages) return;

  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${own ? 'own' : ''}`;

  const nameElement = document.createElement('div');
  nameElement.className = 'chat-message-name';
  nameElement.textContent = fromDisplayName || fromUserID;

  const textElement = document.createElement('div');
  textElement.className = 'chat-message-text';
  textElement.textContent = message;

  messageElement.appendChild(nameElement);
  messageElement.appendChild(textElement);

  chatMessages.appendChild(messageElement);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Add to history
  chatMessages.push({
    fromUserID,
    fromDisplayName,
    message,
    own,
    timestamp: new Date().toISOString()
  });
}

/**
 * Clear Chat Messages
 */
function clearChatMessages() {
  const chatMessagesDiv = document.getElementById('chat-messages');
  if (chatMessagesDiv) {
    chatMessagesDiv.innerHTML = '';
  }
  chatMessages = [];
}

/**
 * Export Chat History
 */
function exportChatHistory() {
  const content = chatMessages.map(msg => {
    return `[${msg.timestamp}] ${msg.fromDisplayName}: ${msg.message}`;
  }).join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  downloadFile(blob, 'chat-history.txt');

  showNotification('Chat history exported', 'success');
}

// Listen for chat events
if (socket) {
  socket.off('chat-message');
  socket.on('chat-message', (data) => {
    console.log('Chat message received:', data);
    addChatMessage(data);
    
    // Play notification sound
    if (storage.get('soundEnabled', true)) {
      playNotificationSound();
    }
  });
}

// Setup chat input enter key
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chat-input');
  
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
});
