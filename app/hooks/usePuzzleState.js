import { useReducer, useCallback } from 'react';

// Action types
const ACTIONS = {
  INITIALIZE_GAME: 'INITIALIZE_GAME',
  START_GAME: 'START_GAME',
  RESET_GAME: 'RESET_GAME',
  SET_DIFFICULTY: 'SET_DIFFICULTY',
  SET_PIECES: 'SET_PIECES',
  UPDATE_PIECE_POSITION: 'UPDATE_PIECE_POSITION',
  CONNECT_PIECES: 'CONNECT_PIECES',
  COMPLETE_PUZZLE: 'COMPLETE_PUZZLE',
  TOGGLE_PREVIEW: 'TOGGLE_PREVIEW',
  SET_DRAGGING: 'SET_DRAGGING',
  SET_MOBILE_MODE: 'SET_MOBILE_MODE',
  UPDATE_SLIDER_SCROLL: 'UPDATE_SLIDER_SCROLL',
  SET_IMAGE: 'SET_IMAGE',
  UPDATE_TARGET_POSITION: 'UPDATE_TARGET_POSITION',
  SET_MAX_Z: 'SET_MAX_Z'
};

const initialState = {
  isInitialized: false,
  gameStarted: false,
  difficulty: "p56",
  isComplete: false,
  showPreview: false,
  pieces: [],
  groups: [],
  image: null,
  startTime: null,
  draggedGroup: null,
  clickedPiece: null,
  dragOffset: { x: 0, y: 0 },
  SNAP_DISTANCE: 30,
  interactionMode: "IDLE",
  isMobile: false,
  sliderScrollX: 0,
  maxZ: 0,
  targetPosition: null,
  pieceById: new Map(),
  groupById: new Map(),
  piecesByGroup: new Map(),
  openEdgesByGroup: new Map()
};

function puzzleStateReducer(state, action) {
  switch (action.type) {
    case ACTIONS.INITIALIZE_GAME:
      return {
        ...state,
        isInitialized: true,
        isMobile: action.payload.isMobile
      };

    case ACTIONS.START_GAME:
      return {
        ...state,
        gameStarted: true,
        startTime: Date.now(),
        isComplete: false
      };

    case ACTIONS.RESET_GAME:
      return {
        ...initialState,
        isInitialized: state.isInitialized,
        image: state.image,
        difficulty: state.difficulty,
        isMobile: state.isMobile
      };

    case ACTIONS.SET_DIFFICULTY:
      return {
        ...state,
        difficulty: action.payload
      };

    case ACTIONS.SET_PIECES:
      const { pieces, groups, SNAP_DISTANCE, targetPosition } = action.payload;
      
      // Rebuild indexes
      const pieceById = new Map();
      const groupById = new Map();
      const piecesByGroup = new Map();
      const openEdgesByGroup = new Map();
      
      pieces.forEach(p => pieceById.set(p.id, p));
      groups.forEach(g => {
        groupById.set(g.id, g);
        piecesByGroup.set(g.id, new Set(g.pieces));
        openEdgesByGroup.set(g.id, g.fringe);
      });

      return {
        ...state,
        pieces,
        groups,
        SNAP_DISTANCE,
        targetPosition,
        pieceById,
        groupById,
        piecesByGroup,
        openEdgesByGroup,
        maxZ: pieces.length
      };

    case ACTIONS.UPDATE_PIECE_POSITION:
      const { pieceId, x, y } = action.payload;
      return {
        ...state,
        pieces: state.pieces.map(p => 
          p.id === pieceId ? { ...p, x, y } : p
        )
      };

    case ACTIONS.CONNECT_PIECES:
      const { connection } = action.payload;
      // Complex logic for merging groups - simplified for now
      return state;

    case ACTIONS.COMPLETE_PUZZLE:
      return {
        ...state,
        isComplete: true,
        gameStarted: false
      };

    case ACTIONS.TOGGLE_PREVIEW:
      return {
        ...state,
        showPreview: !state.showPreview
      };

    case ACTIONS.SET_DRAGGING:
      return {
        ...state,
        draggedGroup: action.payload.group,
        clickedPiece: action.payload.piece,
        dragOffset: action.payload.offset,
        interactionMode: action.payload.mode
      };

    case ACTIONS.SET_MOBILE_MODE:
      return {
        ...state,
        isMobile: action.payload
      };

    case ACTIONS.UPDATE_SLIDER_SCROLL:
      return {
        ...state,
        sliderScrollX: action.payload
      };

    case ACTIONS.SET_IMAGE:
      return {
        ...state,
        image: action.payload
      };

    case ACTIONS.UPDATE_TARGET_POSITION:
      return {
        ...state,
        targetPosition: action.payload
      };

    case ACTIONS.SET_MAX_Z:
      return {
        ...state,
        maxZ: action.payload
      };

    default:
      return state;
  }
}

export function usePuzzleState() {
  const [state, dispatch] = useReducer(puzzleStateReducer, initialState);

  const actions = {
    initializeGame: useCallback((isMobile) => {
      dispatch({ type: ACTIONS.INITIALIZE_GAME, payload: { isMobile } });
    }, []),

    startGame: useCallback(() => {
      dispatch({ type: ACTIONS.START_GAME });
    }, []),

    resetGame: useCallback(() => {
      dispatch({ type: ACTIONS.RESET_GAME });
    }, []),

    setDifficulty: useCallback((difficulty) => {
      dispatch({ type: ACTIONS.SET_DIFFICULTY, payload: difficulty });
    }, []),

    setPieces: useCallback((puzzleData) => {
      dispatch({ type: ACTIONS.SET_PIECES, payload: puzzleData });
    }, []),

    updatePiecePosition: useCallback((pieceId, x, y) => {
      dispatch({ type: ACTIONS.UPDATE_PIECE_POSITION, payload: { pieceId, x, y } });
    }, []),

    connectPieces: useCallback((connection) => {
      dispatch({ type: ACTIONS.CONNECT_PIECES, payload: { connection } });
    }, []),

    completePuzzle: useCallback(() => {
      dispatch({ type: ACTIONS.COMPLETE_PUZZLE });
    }, []),

    togglePreview: useCallback(() => {
      dispatch({ type: ACTIONS.TOGGLE_PREVIEW });
    }, []),

    setDragging: useCallback((group, piece, offset, mode = "DRAGGING") => {
      dispatch({ 
        type: ACTIONS.SET_DRAGGING, 
        payload: { group, piece, offset, mode } 
      });
    }, []),

    setMobileMode: useCallback((isMobile) => {
      dispatch({ type: ACTIONS.SET_MOBILE_MODE, payload: isMobile });
    }, []),

    updateSliderScroll: useCallback((scrollX) => {
      dispatch({ type: ACTIONS.UPDATE_SLIDER_SCROLL, payload: scrollX });
    }, []),

    setImage: useCallback((image) => {
      dispatch({ type: ACTIONS.SET_IMAGE, payload: image });
    }, []),

    updateTargetPosition: useCallback((position) => {
      dispatch({ type: ACTIONS.UPDATE_TARGET_POSITION, payload: position });
    }, []),

    setMaxZ: useCallback((maxZ) => {
      dispatch({ type: ACTIONS.SET_MAX_Z, payload: maxZ });
    }, []),

    // Convenience methods used by PuzzleGame
    movePiece: useCallback((pieceId, x, y) => {
      dispatch({ type: ACTIONS.UPDATE_PIECE_POSITION, payload: { pieceId, x, y } });
    }, []),

    checkConnections: useCallback((pieceId) => {
      // Simplified connection check - just a placeholder for now
      // Real implementation would check for piece connections and merge groups
      console.log('Checking connections for piece:', pieceId);
    }, []),

    completeGame: useCallback(() => {
      dispatch({ type: ACTIONS.COMPLETE_PUZZLE });
    }, [])
  };

  const canConnect = useCallback((p1, p2, groupId) => {
    const r = p1.neighbors.right === p2.id;
    const l = p1.neighbors.left === p2.id;
    const b = p1.neighbors.bottom === p2.id;
    const t = p1.neighbors.top === p2.id;
    
    if (!r && !l && !b && !t) return null;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const sd = state.SNAP_DISTANCE;
    const dragged = p1.groupId === groupId;
    
    let connection = null;
    
    if (r && Math.abs(dx - p1.pieceWidth) < sd && Math.abs(dy) < sd) {
      connection = { offsetX: p2.x - p1.pieceWidth - p1.x, offsetY: p2.y - p1.y };
    } else if (l && Math.abs(dx + p2.pieceWidth) < sd && Math.abs(dy) < sd) {
      connection = { offsetX: p2.x + p2.pieceWidth - p1.x, offsetY: p2.y - p1.y };
    } else if (b && Math.abs(dy - p1.pieceHeight) < sd && Math.abs(dx) < sd) {
      connection = { offsetX: p2.x - p1.x, offsetY: p2.y - p1.pieceHeight - p1.y };
    } else if (t && Math.abs(dy + p2.pieceHeight) < sd && Math.abs(dx) < sd) {
      connection = { offsetX: p2.x - p1.x, offsetY: p2.y + p2.pieceHeight - p1.y };
    }

    if (connection && dragged) {
      return {
        ...connection,
        movingGroup: p1.groupId,
        staticGroup: p2.groupId,
        movingPieceId: p1.id,
        staticPieceId: p2.id
      };
    }
    
    return null;
  }, [state.SNAP_DISTANCE]);

  return {
    state,
    actions,
    canConnect,
    ACTIONS
  };
}