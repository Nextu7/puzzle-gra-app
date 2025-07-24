/**
 * Puzzle Game - Modular JavaScript Implementation
 * Migrated from Liquid theme to Shopify App Extension
 */

(function(window) {
    'use strict';

    // Namespace to prevent global conflicts
    const PuzzleGameNamespace = 'ShopifyPuzzleGame';
    
    if (window[PuzzleGameNamespace]) {
        console.warn('Puzzle Game already initialized');
        return;
    }

    // Configuration management with validation
    class PuzzleConfig {
        constructor() {
            this.firebaseConfig = null;
            this.productId = null;
            this.customerData = null;
            this.initialized = false;
        }

        init(config) {
            if (this.initialized) return;
            
            this.validateConfig(config);
            this.firebaseConfig = config.firebase;
            this.productId = config.productId;
            this.customerData = config.customerData;
            this.initialized = true;
        }

        validateConfig(config) {
            if (!config.firebase || !config.productId) {
                throw new Error('Invalid puzzle game configuration');
            }
        }

        getFirebaseConfig() {
            return this.firebaseConfig;
        }

        getProductId() {
            return this.productId;
        }

        getCustomerData() {
            return this.customerData;
        }
    }

    // State management with proper cleanup
    class PuzzleState {
        constructor() {
            this.reset();
        }

        reset() {
            this.gameStarted = false;
            this.isComplete = false;
            this.pieces = [];
            this.groups = [];
            this.difficulty = 'p56';
            this.image = null;
            this.startTime = null;
            this.timers = new Set();
            this.eventListeners = new Set();
            this.animationFrames = new Set();
        }

        addTimer(timerId) {
            this.timers.add(timerId);
        }

        addEventListener(element, event, handler) {
            element.addEventListener(event, handler);
            this.eventListeners.add({ element, event, handler });
        }

        addAnimationFrame(frameId) {
            this.animationFrames.add(frameId);
        }

        cleanup() {
            // Clear all timers
            this.timers.forEach(timerId => clearInterval(timerId));
            this.timers.clear();

            // Remove all event listeners
            this.eventListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            this.eventListeners.clear();

            // Cancel animation frames
            this.animationFrames.forEach(frameId => cancelAnimationFrame(frameId));
            this.animationFrames.clear();

            this.reset();
        }
    }

    // Firebase service with error handling
    class FirebaseService {
        constructor(config) {
            this.db = null;
            this.initialized = false;
            this.config = config;
        }

        async init() {
            try {
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase SDK not loaded');
                }

                if (!firebase.apps.length) {
                    firebase.initializeApp(this.config.getFirebaseConfig());
                }
                
                this.db = firebase.firestore();
                this.initialized = true;
                console.log('Firebase initialized successfully');
            } catch (error) {
                console.error('Firebase initialization failed:', error);
                this.initialized = false;
            }
        }

        async saveScore(scoreData) {
            if (!this.initialized) {
                console.warn('Firebase not initialized, cannot save score');
                return;
            }

            try {
                await this.db.collection('scores').add({
                    ...scoreData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('Error saving score:', error);
                throw error;
            }
        }

        async getLeaderboard(productId, difficulty, limit = 10) {
            if (!this.initialized) return [];

            try {
                const querySnapshot = await this.db.collection('scores')
                    .where('productId', '==', productId)
                    .where('difficulty', '==', difficulty)
                    .orderBy('timeInSeconds', 'asc')
                    .limit(limit)
                    .get();

                return querySnapshot.docs.map(doc => doc.data());
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
                return [];
            }
        }
    }

    // Canvas renderer with performance optimizations
    class PuzzleRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { 
                alpha: true, 
                desynchronized: true,
                willReadFrequently: false 
            });
            this.dpr = window.devicePixelRatio || 1;
            this.pieceCache = new Map();
            this.lastRenderTime = 0;
            this.targetFPS = 60;
        }

        setSize(width, height) {
            this.canvas.width = width * this.dpr;
            this.canvas.height = height * this.dpr;
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        render(gameState) {
            const now = performance.now();
            const deltaTime = now - this.lastRenderTime;
            
            if (deltaTime < 1000 / this.targetFPS) return;
            
            this.lastRenderTime = now;
            this.clearCanvas();
            this.renderPieces(gameState.pieces);
        }

        clearCanvas() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        renderPieces(pieces) {
            pieces.forEach(piece => this.renderPiece(piece));
        }

        renderPiece(piece) {
            // Simplified rendering logic
            this.ctx.save();
            this.ctx.translate(piece.x, piece.y);
            this.ctx.fillStyle = '#ddd';
            this.ctx.fillRect(0, 0, piece.width || 50, piece.height || 50);
            this.ctx.restore();
        }

        dispose() {
            this.pieceCache.clear();
        }
    }

    // Main puzzle game class
    class PuzzleGame {
        constructor() {
            this.config = new PuzzleConfig();
            this.state = new PuzzleState();
            this.firebase = null;
            this.renderer = null;
            this.modal = null;
        }

        async init(element, config) {
            try {
                this.config.init(config);
                this.firebase = new FirebaseService(this.config);
                await this.firebase.init();
                
                this.setupModal(element);
                this.setupEventListeners();
                
                console.log('Puzzle game initialized successfully');
            } catch (error) {
                console.error('Failed to initialize puzzle game:', error);
                this.showError('Failed to initialize game');
            }
        }

        setupModal(element) {
            this.modal = element.querySelector('.puzzle-modal');
            const canvas = element.querySelector('#puzzle-canvas');
            
            if (canvas) {
                this.renderer = new PuzzleRenderer(canvas);
            }
        }

        setupEventListeners() {
            const closeBtn = this.modal?.querySelector('#puzzle-close-btn');
            if (closeBtn) {
                this.state.addEventListener(closeBtn, 'click', () => this.closeModal());
            }

            // Setup other event listeners with proper cleanup tracking
            this.setupDifficultyButtons();
            this.setupGameControls();
        }

        setupDifficultyButtons() {
            const difficultyContainer = this.modal?.querySelector('.puzzle-difficulty-pills');
            if (difficultyContainer) {
                this.state.addEventListener(difficultyContainer, 'click', (e) => {
                    if (e.target.matches('[data-difficulty]')) {
                        this.setDifficulty(e.target.dataset.difficulty);
                    }
                });
            }
        }

        setupGameControls() {
            const startBtn = this.modal?.querySelector('#puzzle-btn-start-game');
            if (startBtn) {
                this.state.addEventListener(startBtn, 'click', () => this.startGame());
            }
        }

        setDifficulty(difficulty) {
            this.state.difficulty = difficulty;
            // Update UI
            const buttons = this.modal?.querySelectorAll('[data-difficulty]');
            buttons?.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
            });
        }

        startGame() {
            this.state.gameStarted = true;
            this.state.startTime = Date.now();
            this.showGameControls();
            this.startTimer();
        }

        showGameControls() {
            const setup = this.modal?.querySelector('#puzzle-setup-controls');
            const controls = this.modal?.querySelector('.puzzle-controls');
            
            if (setup) setup.style.display = 'none';
            if (controls) controls.style.display = 'flex';
        }

        startTimer() {
            const timerId = setInterval(() => this.updateTimer(), 1000);
            this.state.addTimer(timerId);
        }

        updateTimer() {
            if (!this.state.startTime) return;
            
            const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            const timerDisplay = this.modal?.querySelector('#timer-display');
            if (timerDisplay) {
                timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }

        async completeGame() {
            this.state.isComplete = true;
            const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
            
            try {
                if (this.config.getCustomerData()?.id) {
                    await this.saveScore(elapsed);
                }
                this.showCompletion(elapsed);
            } catch (error) {
                console.error('Error completing game:', error);
            }
        }

        async saveScore(timeInSeconds) {
            const customerData = this.config.getCustomerData();
            if (!customerData) return;

            const scoreData = {
                name: customerData.first_name || 'Anonymous',
                timeInSeconds,
                difficulty: this.state.difficulty,
                productId: this.config.getProductId(),
                customerId: customerData.id
            };

            await this.firebase.saveScore(scoreData);
        }

        showCompletion(elapsed) {
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const completeEl = this.modal?.querySelector('#puzzle-complete');
            const timeEl = this.modal?.querySelector('#puzzle-complete-time');
            
            if (completeEl) completeEl.style.display = 'block';
            if (timeEl) timeEl.textContent = `Czas: ${timeString}`;
        }

        openModal() {
            if (this.modal) {
                this.modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }

        closeModal() {
            if (this.modal) {
                this.modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            this.cleanup();
        }

        showError(message) {
            console.error('Puzzle Game Error:', message);
            // Show user-friendly error message
        }

        cleanup() {
            this.state.cleanup();
            if (this.renderer) {
                this.renderer.dispose();
            }
        }

        dispose() {
            this.cleanup();
            this.firebase = null;
            this.renderer = null;
            this.modal = null;
        }
    }

    // Global API
    window[PuzzleGameNamespace] = {
        PuzzleGame,
        instances: new Map(),
        
        create(element, config) {
            const game = new PuzzleGame();
            game.init(element, config);
            this.instances.set(element, game);
            return game;
        },
        
        destroy(element) {
            const game = this.instances.get(element);
            if (game) {
                game.dispose();
                this.instances.delete(element);
            }
        },
        
        version: '1.0.0'
    };

})(window);