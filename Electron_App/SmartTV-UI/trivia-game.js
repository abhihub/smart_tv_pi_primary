class MultiplayerTriviaClient {
    constructor(serverUrl = window.appConfig?.WEBSOCKET_URL || 'ws://localhost:3000') {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.playerId = null;
        this.roomId = null;
        this.playerName = '';
        this.isHost = false;
        this.gameState = 'waiting';
        this.players = new Map();
        this.currentQuestion = null;
        this.timeRemaining = 0;
        this.timer = null;
        
        this.onGameStart = null;
        this.onQuestionReceived = null;
        this.onPlayerAnswered = null;
        this.onQuestionResults = null;
        this.onGameEnd = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onError = null;
        this.onConnected = null;
        this.onDisconnected = null;
    }

    connect(playerName) {
        return new Promise((resolve, reject) => {
            try {
                this.playerName = playerName;
                this.socket = new WebSocket(this.serverUrl);
                
                this.socket.onopen = () => {
                    console.log('Connected to multiplayer server');
                    this.setupSocketListeners();
                    if (this.onConnected) this.onConnected();
                    resolve();
                };
                
                this.socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    if (this.onError) this.onError('Connection failed');
                    reject(error);
                };
                
                this.socket.onclose = () => {
                    console.log('Disconnected from server');
                    if (this.onDisconnected) this.onDisconnected();
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // Setup socket event listeners
    setupSocketListeners() {
        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleServerMessage(message);
            } catch (error) {
                console.error('Error parsing server message:', error);
            }
        };
    }

    // Handle incoming messages from server
    handleServerMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'player_id':
                this.playerId = data.playerId;
                break;
                
            case 'room_created':
                this.roomId = data.roomId;
                this.isHost = true;
                console.log(`Room created: ${this.roomId}`);
                break;
                
            case 'room_joined':
                this.roomId = data.roomId;
                this.isHost = data.isHost;
                this.updatePlayers(data.players);
                console.log(`Joined room: ${this.roomId}`);
                break;
                
            case 'player_joined':
                this.addPlayer(data.player);
                if (this.onPlayerJoined) this.onPlayerJoined(data.player);
                break;
                
            case 'player_left':
                this.removePlayer(data.playerId);
                if (this.onPlayerLeft) this.onPlayerLeft(data.playerId);
                break;
                
            case 'game_started':
                this.gameState = 'playing';
                if (this.onGameStart) this.onGameStart(data);
                break;
                
            case 'question':
                this.currentQuestion = data.question;
                this.timeRemaining = data.timeLimit || 30;
                this.startQuestionTimer();
                if (this.onQuestionReceived) this.onQuestionReceived(data);
                break;
                
            case 'player_answered':
                this.updatePlayerAnswer(data.playerId, data.hasAnswered);
                if (this.onPlayerAnswered) this.onPlayerAnswered(data);
                break;
                
            case 'question_results':
                this.stopQuestionTimer();
                this.updatePlayerScores(data.results);
                if (this.onQuestionResults) this.onQuestionResults(data);
                break;
                
            case 'game_ended':
                this.gameState = 'finished';
                this.stopQuestionTimer();
                if (this.onGameEnd) this.onGameEnd(data);
                break;
                
            case 'error':
                console.error('Server error:', data.message);
                if (this.onError) this.onError(data.message);
                break;
                
            default:
                console.log('Unknown message type:', type);
        }
    }

    // Send message to server
    sendMessage(type, data = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, data }));
        } else {
            console.error('Socket not connected');
        }
    }

    // Create a new room
    createRoom(maxPlayers = 4) {
        this.sendMessage('create_room', {
            playerName: this.playerName,
            maxPlayers
        });
    }

    // Join an existing room
    joinRoom(roomId) {
        this.sendMessage('join_room', {
            roomId,
            playerName: this.playerName
        });
    }

    // Start the game (host only)
    startGame() {
        if (this.isHost) {
            this.sendMessage('start_game');
        }
    }

    // Submit an answer
    submitAnswer(answerIndex) {
        this.sendMessage('submit_answer', {
            questionId: this.currentQuestion?.id,
            answerIndex,
            timestamp: Date.now()
        });
    }

    // Get current game state
    getGameState() {
        return {
            gameState: this.gameState,
            players: Array.from(this.players.values()),
            currentQuestion: this.currentQuestion,
            timeRemaining: this.timeRemaining,
            isHost: this.isHost,
            roomId: this.roomId
        };
    }

    // Player management
    updatePlayers(players) {
        this.players.clear();
        players.forEach(player => this.players.set(player.id, player));
    }

    addPlayer(player) {
        this.players.set(player.id, player);
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    updatePlayerAnswer(playerId, hasAnswered) {
        const player = this.players.get(playerId);
        if (player) {
            player.hasAnswered = hasAnswered;
        }
    }

    updatePlayerScores(results) {
        results.forEach(result => {
            const player = this.players.get(result.playerId);
            if (player) {
                player.score = result.score;
                player.isCorrect = result.isCorrect;
                player.hasAnswered = false; // Reset for next question
            }
        });
    }

    // Timer management
    startQuestionTimer() {
        this.stopQuestionTimer();
        this.timer = setInterval(() => {
            this.timeRemaining--;
            if (this.timeRemaining <= 0) {
                this.stopQuestionTimer();
            }
        }, 1000);
    }

    stopQuestionTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    // Disconnect from server
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.stopQuestionTimer();
        this.players.clear();
        this.gameState = 'waiting';
    }

    // Get player by ID
    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    // Get current player
    getCurrentPlayer() {
        return this.players.get(this.playerId);
    }

    // Check if all players have answered
    allPlayersAnswered() {
        return Array.from(this.players.values()).every(player => 
            player.id === this.playerId || player.hasAnswered
        );
    }
}

// Game Integration Helper
class MultiplayerGameIntegration {
    constructor(triviaClient) {
        this.client = triviaClient;
        this.originalGame = null;
        this.playersListElement = null;
        this.timerElement = null;
        this.setupUI();
        this.setupClientCallbacks();
    }

    setupUI() {
        // Add multiplayer UI elements
        this.createPlayersPanel();
        this.createTimerDisplay();
        this.createConnectionPanel();
    }

    createPlayersPanel() {
        const gameHeader = document.querySelector('.game-header');
        const playersPanel = document.createElement('div');
        playersPanel.className = 'players-panel';
        playersPanel.innerHTML = `
            <div class="players-list">
                <h3>Players</h3>
                <div id="playersList"></div>
            </div>
        `;
        gameHeader.appendChild(playersPanel);
        this.playersListElement = document.getElementById('playersList');
    }

    createTimerDisplay() {
        const statsBar = document.querySelector('.game-stats-bar');
        const timerStat = document.createElement('div');
        timerStat.className = 'stat-item';
        timerStat.innerHTML = `
            <div class="stat-label">Time</div>
            <div class="stat-value" id="timeRemaining">30</div>
        `;
        statsBar.appendChild(timerStat);
        this.timerElement = document.getElementById('timeRemaining');
    }

    createConnectionPanel() {
        const connectionPanel = document.createElement('div');
        connectionPanel.id = 'connectionPanel';
        connectionPanel.className = 'connection-panel';
        connectionPanel.innerHTML = `
            <div class="connection-form">
                <h2>Join Multiplayer Game</h2>
                <input type="text" id="playerName" placeholder="Enter your name" maxlength="20">
                <input type="text" id="roomCode" placeholder="Room code (optional)">
                <div class="connection-buttons">
                    <button id="createRoomBtn" class="next-btn">Create Room</button>
                    <button id="joinRoomBtn" class="next-btn">Join Room</button>
                </div>
                <div id="connectionStatus"></div>
            </div>
        `;
        document.body.appendChild(connectionPanel);
        
        this.setupConnectionEvents();
    }

    setupConnectionEvents() {
        const createBtn = document.getElementById('createRoomBtn');
        const joinBtn = document.getElementById('joinRoomBtn');
        const statusDiv = document.getElementById('connectionStatus');

        createBtn.addEventListener('click', async () => {
            const playerName = document.getElementById('playerName').value.trim();
            if (!playerName) {
                statusDiv.textContent = 'Please enter your name';
                return;
            }
            
            try {
                statusDiv.textContent = 'Connecting...';
                await this.client.connect(playerName);
                this.client.createRoom();
                statusDiv.textContent = 'Creating room...';
            } catch (error) {
                statusDiv.textContent = 'Connection failed';
            }
        });

        joinBtn.addEventListener('click', async () => {
            const playerName = document.getElementById('playerName').value.trim();
            const roomCode = document.getElementById('roomCode').value.trim();
            
            if (!playerName) {
                statusDiv.textContent = 'Please enter your name';
                return;
            }
            
            if (!roomCode) {
                statusDiv.textContent = 'Please enter room code';
                return;
            }
            
            try {
                statusDiv.textContent = 'Connecting...';
                await this.client.connect(playerName);
                this.client.joinRoom(roomCode);
                statusDiv.textContent = 'Joining room...';
            } catch (error) {
                statusDiv.textContent = 'Connection failed';
            }
        });
    }

    setupClientCallbacks() {
        this.client.onConnected = () => {
            console.log('Connected to multiplayer server');
        };

        this.client.onPlayerJoined = (player) => {
            this.updatePlayersList();
        };

        this.client.onPlayerLeft = (playerId) => {
            this.updatePlayersList();
        };

        this.client.onQuestionReceived = (data) => {
            this.handleMultiplayerQuestion(data);
        };

        this.client.onPlayerAnswered = (data) => {
            this.updatePlayersList();
        };

        this.client.onQuestionResults = (data) => {
            this.handleQuestionResults(data);
        };

        this.client.onGameStart = () => {
            document.getElementById('connectionPanel').style.display = 'none';
            this.updatePlayersList();
        };

        this.client.onError = (message) => {
            document.getElementById('connectionStatus').textContent = `Error: ${message}`;
        };
    }

    handleMultiplayerQuestion(data) {
        const question = data.question;
        
        // Update the UI with the new question
        document.getElementById('questionText').textContent = question.question;
        
        const answersGrid = document.getElementById('answersGrid');
        answersGrid.innerHTML = '';
        
        question.answers.forEach((answer, index) => {
            const answerBtn = document.createElement('button');
            answerBtn.className = 'answer-btn';
            answerBtn.textContent = answer;
            answerBtn.addEventListener('click', () => {
                this.selectMultiplayerAnswer(index);
            });
            answersGrid.appendChild(answerBtn);
        });

        // Start timer display
        this.updateTimer();
    }

    selectMultiplayerAnswer(answerIndex) {
        // Disable all buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.disabled = true;
        });
        
        // Highlight selected answer
        document.querySelectorAll('.answer-btn')[answerIndex].style.background = 
            'rgba(102, 126, 234, 0.5)';
        
        // Submit answer to server
        this.client.submitAnswer(answerIndex);
    }

    handleQuestionResults(data) {
        const answerButtons = document.querySelectorAll('.answer-btn');
        const correctIndex = data.correctAnswer;
        
        // Show correct answer
        answerButtons[correctIndex].classList.add('correct');
        
        // Update player scores
        this.updatePlayersList();
    }

    updatePlayersList() {
        if (!this.playersListElement) return;
        
        const players = Array.from(this.client.players.values());
        this.playersListElement.innerHTML = players.map(player => `
            <div class="player-item ${player.id === this.client.playerId ? 'current-player' : ''}">
                <span class="player-name">${player.name}</span>
                <span class="player-score">${player.score || 0}</span>
                ${player.hasAnswered ? '<span class="answered">✓</span>' : ''}
            </div>
        `).join('');
    }

    updateTimer() {
        if (!this.timerElement) return;
        
        const updateInterval = setInterval(() => {
            this.timerElement.textContent = this.client.timeRemaining;
            if (this.client.timeRemaining <= 0) {
                clearInterval(updateInterval);
            }
        }, 1000);
    }
}

window.MultiplayerTriviaClient = MultiplayerTriviaClient;
window.MultiplayerGameIntegration = MultiplayerGameIntegration;

const client = new MultiplayerTriviaClient();
const integration = new MultiplayerGameIntegration(client);

