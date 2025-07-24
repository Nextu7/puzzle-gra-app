import { useCallback, useRef, useEffect } from 'react';

export function usePuzzleRenderer() {
  const pieceCache = useRef(new Map());
  const pieceCacheOrder = useRef([]);
  const animationFrameRef = useRef(null);
  const lastRenderTime = useRef(0);

  const pieceCacheKey = useCallback((piece) => {
    const dpr = window.devicePixelRatio || 1;
    return `${piece.id}-${dpr}-${Math.round(piece.pieceWidth)}x${Math.round(piece.pieceHeight)}`;
  }, []);

  const enforcePieceCacheLimit = useCallback(() => {
    const limit = 100; // Reasonable cache limit
    while (pieceCacheOrder.current.length > limit) {
      const k = pieceCacheOrder.current.shift();
      if (k) pieceCache.current.delete(k);
    }
  }, []);

  const renderPiece = useCallback((ctx, piece, image) => {
    const key = pieceCacheKey(piece);
    const dpr = window.devicePixelRatio || 1;

    if (!pieceCache.current.has(key)) {
      const offCanvas = document.createElement("canvas");
      const offCtx = offCanvas.getContext("2d");
      const pad = 30;

      offCanvas.width = (piece.pieceWidth + pad * 2) * dpr;
      offCanvas.height = (piece.pieceHeight + pad * 2) * dpr;
      offCtx.scale(dpr, dpr);

      offCtx.save();
      offCtx.translate(pad, pad);
      offCtx.clip(piece.path2D);
      offCtx.drawImage(
        image.element, 
        -piece.col * piece.pieceWidth, 
        -piece.row * piece.pieceHeight, 
        piece.boardWidth, 
        piece.boardHeight
      );

      offCtx.strokeStyle = "rgba(0,0,0,0.5)";
      offCtx.lineWidth = 1.5;
      offCtx.stroke(piece.path2D);
      offCtx.restore();

      pieceCache.current.set(key, offCanvas);
      pieceCacheOrder.current.push(key);
      enforcePieceCacheLimit();
    } else {
      // Move to end for LRU cache
      const idx = pieceCacheOrder.current.indexOf(key);
      if (idx > -1) {
        pieceCacheOrder.current.splice(idx, 1);
        pieceCacheOrder.current.push(key);
      }
    }

    const cached = pieceCache.current.get(key);
    const pad = 30;
    ctx.drawImage(cached, piece.x - pad, piece.y - pad, cached.width / dpr, cached.height / dpr);
  }, [pieceCacheKey, enforcePieceCacheLimit]);

  const renderMobileSlider = useCallback((ctx, pieces, sliderBounds, sliderScrollX) => {
    if (!sliderBounds) return;

    const dpr = window.devicePixelRatio || 1;
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(sliderBounds.x * dpr, sliderBounds.y * dpr, sliderBounds.width * dpr, sliderBounds.height * dpr);
    
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, sliderBounds.y * dpr);
    ctx.lineTo(sliderBounds.width * dpr, sliderBounds.y * dpr);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(sliderBounds.x, sliderBounds.y, sliderBounds.width, sliderBounds.height);
    ctx.clip();

    const sliderPieces = pieces.filter(p => p.inSlider);
    const pieceSpacing = 10;
    const padding = 10;

    sliderPieces.forEach((piece, index) => {
      const x = padding + index * (piece.pieceWidth + pieceSpacing) - sliderScrollX;
      const y = sliderBounds.y + (sliderBounds.height - piece.pieceHeight) / 2;
      
      if (x + piece.pieceWidth > 0 && x < sliderBounds.width) {
        ctx.save();
        ctx.translate(x, y);
        renderPiece(ctx, { ...piece, x: 0, y: 0 }, piece.image);
        ctx.restore();
      }
    });

    ctx.restore();
  }, [renderPiece]);

  const render = useCallback((canvas, ctx, gameState, image) => {
    if (!canvas || !ctx || !image) return;

    const now = performance.now();
    const targetInterval = 16; // ~60fps
    
    if (now - lastRenderTime.current < targetInterval) return;
    lastRenderTime.current = now;

    const dpr = window.devicePixelRatio || 1;
    
    // Clear canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw target area
    if (gameState.targetPosition && !gameState.isComplete) {
      const pos = gameState.targetPosition;
      
      if (gameState.showPreview) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(image.element, pos.x, pos.y, pos.width, pos.height);
        ctx.globalAlpha = 1;
      } else {
        ctx.save();
        ctx.strokeStyle = "#dee2e6";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
        
        ctx.fillStyle = "#adb5bd";
        ctx.font = "500 24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Ułóż puzzle tutaj", pos.x + pos.width / 2, pos.y + pos.height / 2);
        ctx.restore();
      }
    }

    // Draw pieces
    if (gameState.pieces && gameState.pieces.length > 0) {
      const sortedPieces = [...gameState.pieces].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      
      for (const piece of sortedPieces) {
        if (!piece.inSlider || piece.forceRenderOutside) {
          renderPiece(ctx, piece, image);
        }
      }
    }

    // Draw mobile slider if needed
    if (gameState.isMobile && gameState.gameStarted) {
      const sliderBounds = {
        x: 0,
        y: canvas.height / dpr - 120,
        width: canvas.width / dpr,
        height: 120
      };
      renderMobileSlider(ctx, gameState.pieces, sliderBounds, gameState.sliderScrollX || 0);
    }
  }, [renderPiece, renderMobileSlider]);

  const startRenderLoop = useCallback((canvas, ctx, gameState, image) => {
    const renderFrame = () => {
      render(canvas, ctx, gameState, image);
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [render]);

  const stopRenderLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const clearCache = useCallback(() => {
    pieceCache.current.clear();
    pieceCacheOrder.current.length = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRenderLoop();
      clearCache();
    };
  }, [stopRenderLoop, clearCache]);

  return {
    render,
    startRenderLoop,
    stopRenderLoop,
    renderPiece,
    clearCache
  };
}