import { useCallback, useRef } from 'react';

export const DIFFICULTY_LEVELS = {
  p30: { cols: 2, rows: 2 },
  p56: { cols: 7, rows: 8 },
  p99: { cols: 9, rows: 11 },
  p143: { cols: 11, rows: 13 },
  p304: { cols: 16, rows: 19 },
};

export function usePuzzleGeneration() {
  const rngSeedRef = useRef(0);

  const rng = useCallback(() => {
    let t = (rngSeedRef.current += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }, []);

  const generatePuzzleShape = useCallback((connections, w, h) => {
    const tabW = w * 0.25;
    const tabH = h * 0.25;
    const neckW = w * 0.1;
    const neckH = h * 0.1;
    const segs = [];

    segs.push("M 0,0");

    // Top edge
    if (connections.top === "out") {
      const mid = w / 2;
      segs.push(`L ${mid - neckW},0 C ${mid - neckW},-${tabH * 0.3} ${mid - tabW},-${tabH} ${mid},-${tabH} C ${mid + tabW},-${tabH} ${mid + neckW},-${tabH * 0.3} ${mid + neckW},0 L ${w},0`);
    } else if (connections.top === "in") {
      const mid = w / 2;
      segs.push(`L ${mid - neckW},0 C ${mid - neckW},${tabH * 0.3} ${mid - tabW},${tabH} ${mid},${tabH} C ${mid + tabW},${tabH} ${mid + neckW},${tabH * 0.3} ${mid + neckW},0 L ${w},0`);
    } else {
      segs.push(`L ${w},0`);
    }

    // Right edge
    if (connections.right === "out") {
      const mid = h / 2;
      segs.push(`L ${w},${mid - neckH} C ${w + tabW * 0.3},${mid - neckH} ${w + tabW},${mid - tabH} ${w + tabW},${mid} C ${w + tabW},${mid + tabH} ${w + tabW * 0.3},${mid + neckH} ${w},${mid + neckH} L ${w},${h}`);
    } else if (connections.right === "in") {
      const mid = h / 2;
      segs.push(`L ${w},${mid - neckH} C ${w - tabW * 0.3},${mid - neckH} ${w - tabW},${mid - tabH} ${w - tabW},${mid} C ${w - tabW},${mid + tabH} ${w - tabW * 0.3},${mid + neckH} ${w},${mid + neckH} L ${w},${h}`);
    } else {
      segs.push(`L ${w},${h}`);
    }

    // Bottom edge
    if (connections.bottom === "out") {
      const mid = w / 2;
      segs.push(`L ${mid + neckW},${h} C ${mid + neckW},${h + tabH * 0.3} ${mid + tabW},${h + tabH} ${mid},${h + tabH} C ${mid - tabW},${h + tabH} ${mid - neckW},${h + tabH * 0.3} ${mid - neckW},${h} L 0,${h}`);
    } else if (connections.bottom === "in") {
      const mid = w / 2;
      segs.push(`L ${mid + neckW},${h} C ${mid + neckW},${h - tabH * 0.3} ${mid + tabW},${h - tabH} ${mid},${h - tabH} C ${mid - tabW},${h - tabH} ${mid - neckW},${h - tabH * 0.3} ${mid - neckW},${h} L 0,${h}`);
    } else {
      segs.push(`L 0,${h}`);
    }

    // Left edge
    if (connections.left === "out") {
      const mid = h / 2;
      segs.push(`L 0,${mid + neckH} C -${tabW * 0.3},${mid + neckH} -${tabW},${mid + tabH} -${tabW},${mid} C -${tabW},${mid - tabH} -${tabW * 0.3},${mid - neckH} 0,${mid - neckH} L 0,0`);
    } else if (connections.left === "in") {
      const mid = h / 2;
      segs.push(`L 0,${mid + neckH} C ${tabW * 0.3},${mid + neckH} ${tabW},${mid + tabH} ${tabW},${mid} C ${tabW},${mid - tabH} ${tabW * 0.3},${mid - neckH} 0,${mid - neckH} L 0,0`);
    } else {
      segs.push(`L 0,0`);
    }

    segs.push("Z");
    return segs.join(" ");
  }, []);

  const generateConnections = useCallback((cols, rows) => {
    const connections = {};
    const layout = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        layout.push({ id, row: r, col: c });
        connections[id] = { top: null, right: null, bottom: null, left: null };
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        
        if (r > 0) {
          const topId = (r - 1) * cols + c;
          if (connections[topId].bottom === null) {
            connections[topId].bottom = rng() > 0.5 ? "out" : "in";
          }
          connections[id].top = connections[topId].bottom === "out" ? "in" : "out";
        }
        
        if (c > 0) {
          const leftId = r * cols + (c - 1);
          if (connections[leftId].right === null) {
            connections[leftId].right = rng() > 0.5 ? "out" : "in";
          }
          connections[id].left = connections[leftId].right === "out" ? "in" : "out";
        }
        
        if (c < cols - 1) connections[id].right = rng() > 0.5 ? "out" : "in";
        if (r < rows - 1) connections[id].bottom = rng() > 0.5 ? "out" : "in";
      }
    }

    return { connections, layout };
  }, [rng]);

  const createPuzzlePieces = useCallback((image, gameAreaRect, difficulty, isMobile) => {
    if (!image || !gameAreaRect) return null;

    const level = DIFFICULTY_LEVELS[difficulty];
    let cols, rows;
    
    if (image.aspectRatio > 1) {
      cols = level.rows;
      rows = level.cols;
    } else {
      cols = level.cols;
      rows = level.rows;
    }

    const { connections, layout } = generateConnections(cols, rows);
    
    const maxW = gameAreaRect.width - 20;
    const maxH = isMobile ? gameAreaRect.height - 120 - 20 : gameAreaRect.height - 20;
    
    let boardWidth = maxW;
    let boardHeight = boardWidth / image.aspectRatio;
    
    if (boardHeight > maxH) {
      boardHeight = maxH;
      boardWidth = boardHeight * image.aspectRatio;
    }

    const pieceWidth = boardWidth / cols;
    const pieceHeight = boardHeight / rows;
    
    const centerX = gameAreaRect.width / 2;
    const centerY = (isMobile ? gameAreaRect.height - 120 : gameAreaRect.height) / 2;
    const targetX = centerX - boardWidth / 2;
    const targetY = centerY - boardHeight / 2;

    const pieces = layout.map(({ id, row, col }) => {
      const shape = generatePuzzleShape(connections[id], pieceWidth, pieceHeight);
      return {
        id,
        row,
        col,
        shape,
        path2D: new Path2D(shape),
        connections: connections[id],
        x: targetX + col * pieceWidth,
        y: targetY + row * pieceHeight,
        correctX: targetX + col * pieceWidth,
        correctY: targetY + row * pieceHeight,
        groupId: id,
        zIndex: id + 1,
        isFixed: false,
        inSlider: false,
        neighbors: {
          top: row > 0 ? (row - 1) * cols + col : null,
          right: col < cols - 1 ? id + 1 : null,
          bottom: row < rows - 1 ? (row + 1) * cols + col : null,
          left: col > 0 ? id - 1 : null
        },
        boardWidth,
        boardHeight,
        pieceWidth,
        pieceHeight
      };
    });

    const groups = pieces.map(p => ({
      id: p.groupId,
      pieces: [p.id],
      fringe: new Set([p.id])
    }));

    const SNAP_DISTANCE = Math.min(Math.max(Math.min(pieceWidth, pieceHeight) * 0.6, 10), 32);
    const targetPosition = { x: targetX, y: targetY, width: boardWidth, height: boardHeight };

    return { pieces, groups, SNAP_DISTANCE, targetPosition };
  }, [generateConnections, generatePuzzleShape]);

  const setSeed = useCallback((seed) => {
    rngSeedRef.current = seed;
  }, []);

  return {
    createPuzzlePieces,
    generatePuzzleShape,
    generateConnections,
    setSeed,
    DIFFICULTY_LEVELS
  };
}