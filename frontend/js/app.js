class ChatApplication {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentRoom = 'general';
        this.typingTimer = null;
        this.isTyping = false;

        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.showLoginModal();
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        
        // Message sending
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keydown', (e) => this.handleInputKeydown(e));
        document.getElementById('messageInput').addEventListener('input', () => this.handleTyping());
        
        // Room management
        document.getElementById('addRoomBtn').addEventListener('click', () => this.showRoomModal());
        document.getElementById('closeRoomModal').addEventListener('click', () => this.hideRoomModal());
        document.getElementById('roomForm').addEventListener('submit', (e) => this.createRoom(e));
        
        // Formatting buttons
        document.getElementById('boldBtn').addEventListener('click', () => this.wrapSelection('**', '**'));
        document.getElementById('italicBtn').addEventListener('click', () => this.wrapSelection('*', '*'));
        document.getElementById('linkBtn').addEventListener('click', () => this.insertLink());
        
        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('mobileMenuBtn2').addEventListener('click', () => this.toggleSidebar());
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Close modals on outside click
        window.addEventListener('click', (e) => this.handleOutsideClick(e));
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('username').focus();
    }

    hideLoginModal() {
        document.getElementById('loginModal').style.display = 'none';
    }

    showRoomModal() {
        document.getElementById('roomModal').style.display = 'flex';
        document.getElementById('roomName').focus();
    }

    hideRoomModal() {
        document.getElementById('roomModal').style.display = 'none';
        document.getElementById('roomName').value = '';
    }

    handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const room = document.getElementById('roomSelect').value;
        
        if (!username) {
            this.showError('Please enter a username');
            return;
        }

        if (username.length < 2) {
            this.showError('Username must be at least 2 characters long');
            return;
        }

        this.joinChat(username, room);
    }

    joinChat(username, room) {
        this.currentUser = username;
        this.currentRoom = room;

        // Initialize socket connection
        this.socket = io();

        // Set up socket event listeners
        this.setupSocketListeners();

        // Join the chat room
        this.socket.emit('user_join', {
            username: username,
            room: room
        });

        // Update UI
        document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
        document.getElementById('usernameDisplay').textContent = username;
        document.getElementById('currentRoom').textContent = this.getRoomName(room);
        
        this.hideLoginModal();
        document.getElementById('mainContainer').style.display = 'flex';
        
        this.showNotification(`Welcome to ${this.getRoomName(room)}!`, 'success');
    }

    setupSocketListeners() {
        // Handle connection errors
        this.socket.on('connect_error', (error) => {
            this.showNotification('Connection error. Please try again.', 'error');
        });

        // Handle username taken
        this.socket.on('username_taken', (data) => {
            this.showError(data.message);
        });

        // Handle room info
        this.socket.on('room_info', (data) => {
            this.updateRoomInfo(data);
        });

        // Handle new messages
        this.socket.on('receive_message', (data) => {
            this.displayMessage(data);
        });

        // Handle user joined
        this.socket.on('user_joined', (data) => {
            this.displaySystemMessage(data.message, data.timestamp);
            this.updateUsersList(data.roomUsers);
        });

        // Handle user left
        this.socket.on('user_left', (data) => {
            this.displaySystemMessage(data.message, data.timestamp);
            this.updateUsersList(data.roomUsers);
        });

        // Handle room created
        this.socket.on('room_created', (data) => {
            this.addRoomToList(data);
            this.showNotification(`New room created: ${data.name}`, 'success');
        });

        // Handle typing indicators
        this.socket.on('user_typing', (data) => {
            this.showTypingIndicator(data);
        });
    }

    updateRoomInfo(data) {
        this.currentRoom = data.room;
        document.getElementById('currentRoom').textContent = data.roomName;
        this.updateRoomsList(data.rooms);
        this.updateUsersList(data.users);
    }

    updateRoomsList(rooms) {
        const roomsList = document.getElementById('roomsList');
        roomsList.innerHTML = '';

        rooms.forEach(room => {
            const roomElement = document.createElement('li');
            roomElement.className = `room-item ${room.id === this.currentRoom ? 'active' : ''}`;
            roomElement.setAttribute('data-room', room.id);
            
            roomElement.innerHTML = `
                <i class="fas fa-hashtag room-icon"></i>
                <span class="room-name">${room.name}</span>
                <span class="room-users">${room.userCount}</span>
            `;

            roomElement.addEventListener('click', () => this.changeRoom(room.id));
            roomsList.appendChild(roomElement);
        });
    }

    updateUsersList(users) {
        const usersList = document.getElementById('usersList');
        const userCount = document.getElementById('userCount');
        
        usersList.innerHTML = '';
        userCount.textContent = users.length;

        users.forEach(username => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            
            userElement.innerHTML = `
                <div class="user-status"></div>
                <div class="user-avatar small">${username.charAt(0).toUpperCase()}</div>
                <span>${username}</span>
            `;

            usersList.appendChild(userElement);
        });
    }

    changeRoom(newRoom) {
        if (newRoom === this.currentRoom) return;

        this.socket.emit('change_room', {
            newRoom: newRoom
        });

        // Clear messages container
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <h3>Welcome to ${this.getRoomName(newRoom)}!</h3>
                <p>Loading messages...</p>
            </div>
        `;

        this.showNotification(`Joined ${this.getRoomName(newRoom)}`, 'success');
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message) return;

        this.socket.emit('send_message', {
            message: message
        });

        // Clear input and reset height
        messageInput.value = '';
        this.resetInputHeight();
        
        // Stop typing indicator
        this.stopTyping();
    }

    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
        
        // Keyboard shortcuts for formatting
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    this.wrapSelection('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    this.wrapSelection('*', '*');
                    break;
            }
        }
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing_start');
        }

        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
            this.stopTyping();
        }, 1000);
    }

    stopTyping() {
        this.isTyping = false;
        this.socket.emit('typing_stop');
    }

    showTypingIndicator(data) {
        const typingIndicator = document.getElementById('typingIndicator');
        
        if (data.isTyping) {
            typingIndicator.textContent = `${data.username} is typing...`;
        } else {
            typingIndicator.textContent = '';
        }
    }

    displayMessage(data) {
        const messagesContainer = document.getElementById('messagesContainer');
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = `message ${data.username === this.currentUser ? 'own' : ''}`;
        
        const timestamp = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageElement.innerHTML = `
            <div class="message-avatar">${data.username.charAt(0).toUpperCase()}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${data.username === this.currentUser ? 'You' : data.username}</span>
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
        
        const time = new Date(timestamp).toLocaleTimeString([], { 
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

    formatMessage(text) {
        // Convert markdown-like syntax to HTML
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

    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            this.wrapSelection('[', `](${url})`);
        }
    }

    createRoom(e) {
        e.preventDefault();
        
        const roomName = document.getElementById('roomName').value.trim();
        if (!roomName) return;

        this.socket.emit('create_room', {
            roomName: roomName
        });

        this.hideRoomModal();
    }

    addRoomToList(room) {
        const roomsList = document.getElementById('roomsList');
        
        const roomElement = document.createElement('li');
        roomElement.className = 'room-item';
        roomElement.setAttribute('data-room', room.id);
        
        roomElement.innerHTML = `
            <i class="fas fa-hashtag room-icon"></i>
            <span class="room-name">${room.name}</span>
            <span class="room-users">${room.userCount}</span>
        `;

        roomElement.addEventListener('click', () => this.changeRoom(room.id));
        roomsList.appendChild(roomElement);
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

    logout() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        location.reload();
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

    showError(message) {
        const errorElement = document.getElementById('usernameError');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    handleOutsideClick(e) {
        // Close room modal when clicking outside
        const roomModal = document.getElementById('roomModal');
        if (e.target === roomModal) {
            this.hideRoomModal();
        }
        
        // Close sidebar on mobile when clicking outside
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const mobileMenuBtns = document.querySelectorAll('.mobile-menu-btn');
            
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !Array.from(mobileMenuBtns).some(btn => btn.contains(e.target))) {
                this.toggleSidebar();
            }
        }
    }
}

// Auto-resize textarea
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('messageInput');
    
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Initialize the application
    new ChatApplication();
});