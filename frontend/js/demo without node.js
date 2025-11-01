// copy this entire code and replace code in app.js to work without node.js install (opens in live server)

class ChatApplication {
    constructor() {
        this.currentUser = null;
        this.currentRoom = 'general';
        this.messages = [];
        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.showLoginModal();
        this.loadDemoData();
    }

    loadDemoData() {
        // Demo messages for UI testing
        this.messages = [
            {
                id: 1,
                username: 'Alex',
                message: 'Hello everyone! Welcome to the chat.',
                timestamp: new Date(),
                type: 'message'
            },
            {
                id: 2,
                username: 'Sam',
                message: 'Hi Alex! This is a **demo** chat application.',
                timestamp: new Date(),
                type: 'message'
            },
            {
                id: 3,
                username: 'System',
                message: 'Real-time features require Node.js backend',
                timestamp: new Date(),
                type: 'system'
            }
        ];
    }

    bindEvents() {
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keydown', (e) => this.handleInputKeydown(e));
        document.getElementById('addRoomBtn').addEventListener('click', () => this.showRoomModal());
        
        // Formatting buttons
        document.getElementById('boldBtn').addEventListener('click', () => this.wrapSelection('**', '**'));
        document.getElementById('italicBtn').addEventListener('click', () => this.wrapSelection('*', '*'));
        
        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('mobileMenuBtn2').addEventListener('click', () => this.toggleSidebar());
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'flex';
    }

    hideLoginModal() {
        document.getElementById('loginModal').style.display = 'none';
    }

    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const room = document.getElementById('roomSelect').value;

        if (username) {
            this.currentUser = username;
            this.hideLoginModal();
            document.getElementById('mainContainer').style.display = 'flex';
            document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
            document.getElementById('usernameDisplay').textContent = username;
            document.getElementById('currentRoom').textContent = this.getRoomName(room);
            
            this.displayDemoMessages();
            this.showNotification('Demo Mode: UI Only - Install Node.js for real-time features', 'info');
        }
    }

    displayDemoMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '';

        this.messages.forEach(msg => {
            if (msg.type === 'system') {
                this.displaySystemMessage(msg.message, msg.timestamp);
            } else {
                this.displayMessage(msg);
            }
        });
    }

    displayMessage(data) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${data.username === this.currentUser ? 'own' : ''}`;
        
        const timestamp = data.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageElement.innerHTML = `
            <div class="message-avatar">${data.username.charAt(0).toUpperCase()}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${data.username}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-text">${this.formatMessage(data.message)}</div>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    displaySystemMessage(message, timestamp) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-message';
        
        const time = timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-text">${message}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message) return;

        // Add to demo messages
        const newMessage = {
            id: Date.now(),
            username: this.currentUser,
            message: message,
            timestamp: new Date(),
            type: 'message'
        };

        this.messages.push(newMessage);
        this.displayMessage(newMessage);
        
        messageInput.value = '';
        this.resetInputHeight();
    }

    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    formatMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
            .replace(/\n/g, '<br>');
    }

    wrapSelection(before, after) {
        const input = document.getElementById('messageInput');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const selectedText = input.value.substring(start, end);
        
        input.setRangeText(before + selectedText + after, start, end, 'select');
        input.focus();
    }

    showRoomModal() {
        alert('Room creation requires Node.js backend. Please install Node.js for full functionality.');
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    resetInputHeight() {
        const input = document.getElementById('messageInput');
        input.style.height = 'auto';
    }

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
    }

    getRoomName(roomId) {
        const roomNames = {
            'general': 'General',
            'random': 'Random', 
            'tech': 'Tech Talk',
            'gaming': 'Gaming',
            'music': 'Music Lovers'
        };
        return roomNames[roomId] || roomId;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Auto-resize textarea
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('messageInput');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    new ChatApplication();
});