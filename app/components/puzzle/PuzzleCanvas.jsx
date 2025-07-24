import { useEffect, useRef, useCallback, memo } from 'react';
import { usePuzzleRenderer } from '../../hooks/usePuzzleRenderer';

const PuzzleCanvas = memo(({ 
  gameState,
  image,
  onPieceClick,
  onPieceMove,
  onPieceRelease,
  onCanvasReady
}) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const { render, renderPiece, startRenderLoop, stopRenderLoop } = usePuzzleRenderer();

  const handleMouseDown = useCallback((e) => {
    if (!gameState.gameStarted || gameState.interactionMode !== "IDLE") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked piece using spatial optimization
    const candidates = getHitCandidates(x, y, gameState);
    let hitPiece = null;

    for (let i = candidates.length - 1; i >= 0; i--) {
      const piece = candidates[i];
      if (piece.isFixed || piece.inSlider) continue;
      
      if (x >= piece.x && x <= piece.x + piece.pieceWidth && 
          y >= piece.y && y <= piece.y + piece.pieceHeight) {
        const ctx = contextRef.current;
        if (ctx && ctx.isPointInPath(piece.path2D, x - piece.x, y - piece.y)) {
          hitPiece = piece;
          break;
        }
      }
    }

    if (hitPiece) {
      onPieceClick?.(hitPiece, { x, y });
    }
  }, [gameState, onPieceClick]);

  const handleMouseMove = useCallback((e) => {
    if (gameState.interactionMode === "IDLE" || !gameState.longPressTimer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onPieceMove?.({ x, y });
  }, [gameState.interactionMode, gameState.longPressTimer, onPieceMove]);

  const handleMouseUp = useCallback(() => {
    if (gameState.interactionMode === "DRAGGING") {
      onPieceRelease?.();
    }
  }, [gameState.interactionMode, onPieceRelease]);

  const handleTouchStart = useCallback((e) => {
    if (!gameState.gameStarted) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }
  }, [gameState.gameStarted, handleMouseDown]);

  const handleTouchMove = useCallback((e) => {
    if (gameState.interactionMode !== "IDLE" || gameState.longPressTimer) {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
      }
    }
  }, [gameState.interactionMode, gameState.longPressTimer, handleMouseMove]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    handleMouseUp();
  }, [handleMouseUp]);

  // Spatial optimization for hit detection
  const getHitCandidates = useCallback((x, y, state) => {
    if (!state.pieces) return [];
    
    // Simple spatial partitioning - can be improved with grid
    const candidates = state.pieces.filter(piece => {
      const margin = 50; // Search margin
      return x >= piece.x - margin && x <= piece.x + piece.pieceWidth + margin &&
             y >= piece.y - margin && y <= piece.y + piece.pieceHeight + margin;
    });

    return candidates.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { 
      alpha: true, 
      desynchronized: true 
    });
    contextRef.current = ctx;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Notify parent that canvas is ready
    onCanvasReady?.(canvas, ctx);

    // Event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleMouseDown, handleTouchStart, onCanvasReady]);

  // Global mouse events
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Start render loop when game starts
  useEffect(() => {
    if (gameState.gameStarted && canvasRef.current && contextRef.current && image) {
      startRenderLoop(canvasRef.current, contextRef.current, gameState, image);
    } else {
      stopRenderLoop();
    }

    return () => stopRenderLoop();
  }, [gameState.gameStarted, gameState, image, startRenderLoop, stopRenderLoop]);

  return (
    <canvas 
      ref={canvasRef}
      id="puzzle-canvas"
      className={`puzzle-canvas ${gameState.interactionMode === "DRAGGING" ? "dragging" : ""}`}
      style={{ 
        backgroundColor: '#fff',
        cursor: gameState.interactionMode === "DRAGGING" ? 'grabbing' : 'default',
        touchAction: 'none',
        width: '100%',
        height: '100%'
      }}
    />
  );
});

PuzzleCanvas.displayName = 'PuzzleCanvas';

export { PuzzleCanvas };