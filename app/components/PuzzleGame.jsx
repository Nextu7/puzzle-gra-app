import { useState, useEffect, useRef, useCallback } from 'react';
import { PuzzleProvider, usePuzzleContext } from '../contexts/PuzzleContext';
import { usePuzzleState } from '../hooks/usePuzzleState';
import { usePuzzleGeneration } from '../hooks/usePuzzleGeneration';
import { usePuzzleAPI } from '../hooks/usePuzzleAPI';
import { PuzzleCanvas } from './puzzle/PuzzleCanvas';
import { PuzzleSetupControls, PuzzleGameControls } from './puzzle/PuzzleControls';
import { PuzzleComplete } from './puzzle/PuzzleComplete';
import { PuzzleLeaderboard } from './puzzle/PuzzleLeaderboard';

function PuzzleGameInner({ 
  productId, 
  customerData, 
  puzzleSrc, 
  puzzlePreview,
  baseImg 
}) {
  const {
    isModalOpen,
    gameStarted,
    gameCompleted,
    openModal,
    closeModal,
    startGame,
    resetGame,
    setError
  } = usePuzzleContext();

  // Use new modular hooks
  const { state: gameState, actions, canConnect } = usePuzzleState();
  const { createPuzzlePieces } = usePuzzleGeneration();
  const { createOrGetPlayer, saveScore, getLeaderboard } = usePuzzleAPI();

  const [currentSession, setCurrentSession] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const gameAreaRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const timerRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    clickedPiece: null,
    draggedGroup: null,
    dragOffset: { x: 0, y: 0 }
  });

  // Initialize puzzle image
  useEffect(() => {
    if (!isModalOpen || !puzzleSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const imageData = {
        src: img.src,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        element: img
      };
      actions.setImage(imageData);
    };
    img.onerror = () => {
      setError('Nie udało się załadować obrazka puzzle');
    };
    img.src = puzzleSrc;
  }, [isModalOpen, puzzleSrc, updateGameState, setError]);

  // Setup game area and pieces when modal opens
  useEffect(() => {
    if (!isModalOpen || !gameAreaRef.current || !gameState.image) return;

    const gameArea = gameAreaRef.current;
    const updateGameArea = () => {
      const rect = gameArea.getBoundingClientRect();
      if (rect.width && rect.height) {
        const puzzleData = createPuzzlePieces(gameState.image, rect, gameState.difficulty, gameState.isMobile);
        if (puzzleData) {
          actions.setPieces(puzzleData);
        }
      }
    };

    // Initial setup
    updateGameArea();

    // Setup resize observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }
    resizeObserverRef.current = new ResizeObserver(updateGameArea);
    resizeObserverRef.current.observe(gameArea);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [isModalOpen, gameState.image, createPuzzlePieces]);

  const handleModalClose = () => {
    closeModal();
    stopTimer();
    resetGame();
    document.body.style.overflow = "auto";
  };

  const handleModalOpen = () => {
    openModal();
    document.body.style.overflow = "hidden";
  };

  const handleStartGame = async () => {
    try {
      if (customerData?.id) {
        // Simple session tracking
        const session = {
          id: Date.now().toString(),
          startedAt: new Date()
        };
        setCurrentSession(session);
      }
      
      startGame();
      actions.startGame();
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Nie udało się rozpocząć gry');
    }
  };

  const handleDifficultyChange = (difficulty) => {
    actions.setDifficulty(difficulty);
    if (gameState.image && gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      const puzzleData = createPuzzlePieces(gameState.image, rect, difficulty, gameState.isMobile);
      if (puzzleData) {
        actions.setPieces(puzzleData);
      }
    }
  };

  const handleTogglePreview = () => {
    actions.togglePreview();
  };

  const handleReset = () => {
    resetGame();
    actions.resetGame();
    if (gameState.image && gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      const puzzleData = createPuzzlePieces(gameState.image, rect, gameState.difficulty, gameState.isMobile);
      if (puzzleData) {
        actions.setPieces(puzzleData);
      }
    }
  };

  const handlePlayAgain = () => {
    resetGame();
    actions.resetGame();
  };

  const handlePieceClick = (piece, position) => {
    // Implementation for piece interaction
    dragStateRef.current.isDragging = true;
    dragStateRef.current.clickedPiece = piece;
    dragStateRef.current.dragOffset = {
      x: position.x - piece.x,
      y: position.y - piece.y
    };
  };

  const handlePieceMove = (position) => {
    if (!dragStateRef.current.isDragging || !dragStateRef.current.clickedPiece) return;
    
    const piece = dragStateRef.current.clickedPiece;
    const newX = position.x - dragStateRef.current.dragOffset.x;
    const newY = position.y - dragStateRef.current.dragOffset.y;
    
    actions.movePiece(piece.id, newX, newY);
  };

  const handlePieceRelease = () => {
    if (!dragStateRef.current.isDragging) return;
    
    const piece = dragStateRef.current.clickedPiece;
    dragStateRef.current.isDragging = false;
    dragStateRef.current.clickedPiece = null;
    dragStateRef.current.draggedGroup = null;

    if (piece) {
      // Check for connections and update game state
      actions.checkConnections(piece.id);
      
      // Check for puzzle completion
      const allFixed = gameState.pieces.every(p => p.isFixed);
      if (allFixed && !gameState.isComplete) {
        handlePuzzleComplete();
      }
    }
  };

  const handlePuzzleComplete = async () => {
    const completionTime = Math.floor((Date.now() - gameState.startTime) / 1000);
    
    try {
      if (currentSession) {
        // Simple completion tracking
        console.log('Game completed in', completionTime, 'seconds');
      }
      
      actions.completeGame();
    } catch (error) {
      console.error('Error completing game:', error);
    }
  };

  if (!isModalOpen) {
    return (
      <button onClick={handleModalOpen} className="puzzle-trigger-btn">
        Zagraj w Puzzle
      </button>
    );
  }

  return (
    <div id="puzzle-modal" className="puzzle-modal">
      <div className="puzzle-modal-content">
        <button 
          onClick={handleModalClose}
          className="puzzle-close-btn"
        >
          &times;
        </button>
        
        <div className="puzzle-layout-container">
          <div className="puzzle-left-section">
            {!gameStarted ? (
              <PuzzleSetupControls
                difficulty={gameState.difficulty}
                onDifficultyChange={handleDifficultyChange}
                onStartGame={handleStartGame}
              />
            ) : (
              <PuzzleGameControls
                showPreview={gameState.showPreview}
                onTogglePreview={handleTogglePreview}
                onReset={handleReset}
                startTime={gameState.startTime}
              />
            )}

            {gameState.isComplete && (
              <PuzzleComplete
                completionTime={Math.floor((Date.now() - gameState.startTime) / 1000)}
                difficulty={gameState.difficulty}
                productId={productId}
                customerId={customerData?.id}
                onPlayAgain={handlePlayAgain}
              />
            )}

            <div className="puzzle-container">
              <div ref={gameAreaRef} className="puzzle-game-area">
                <PuzzleCanvas
                  gameState={gameState}
                  image={gameState.image}
                  onPieceClick={handlePieceClick}
                  onPieceMove={handlePieceMove}
                  onPieceRelease={handlePieceRelease}
                />
              </div>
            </div>
          </div>

          <div className="puzzle-product-section">
            <div className="puzzle-product-container">
              <div id="puzzle-product-image-container">
                <img 
                  src={puzzlePreview} 
                  alt="Puzzle Preview"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
              <div id="puzzle-product-form-container">
                {/* Product form will be moved here */}
              </div>
              
              <PuzzleLeaderboard
                productId={productId}
                difficulty={gameState.difficulty}
                visible={showLeaderboard}
                showGlobal={false}
              />
              
              <button 
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="puzzle-btn puzzle-btn-small"
                style={{ marginTop: '10px' }}
              >
                {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PuzzleGame(props) {
  return (
    <PuzzleProvider>
      <PuzzleGameInner {...props} />
    </PuzzleProvider>
  );
}