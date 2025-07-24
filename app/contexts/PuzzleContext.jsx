import { createContext, useContext, useReducer, useCallback } from 'react';

const PuzzleContext = createContext();

const initialState = {
  player: null,
  gameSession: null,
  leaderboard: [],
  isModalOpen: false,
  gameStarted: false,
  gameCompleted: false,
  currentScore: null,
  error: null,
  loading: false
};

function puzzleReducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, player: action.payload };
    
    case 'SET_GAME_SESSION':
      return { ...state, gameSession: action.payload };
    
    case 'SET_LEADERBOARD':
      return { ...state, leaderboard: action.payload };
    
    case 'OPEN_MODAL':
      return { ...state, isModalOpen: true };
    
    case 'CLOSE_MODAL':
      return { 
        ...state, 
        isModalOpen: false, 
        gameStarted: false, 
        gameCompleted: false,
        currentScore: null,
        error: null
      };
    
    case 'START_GAME':
      return { ...state, gameStarted: true, gameCompleted: false };
    
    case 'COMPLETE_GAME':
      return { 
        ...state, 
        gameCompleted: true, 
        currentScore: action.payload 
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET_GAME':
      return {
        ...state,
        gameStarted: false,
        gameCompleted: false,
        currentScore: null,
        error: null
      };
    
    default:
      return state;
  }
}

export function PuzzleProvider({ children }) {
  const [state, dispatch] = useReducer(puzzleReducer, initialState);

  const setPlayer = useCallback((player) => {
    dispatch({ type: 'SET_PLAYER', payload: player });
  }, []);

  const setGameSession = useCallback((session) => {
    dispatch({ type: 'SET_GAME_SESSION', payload: session });
  }, []);

  const setLeaderboard = useCallback((leaderboard) => {
    dispatch({ type: 'SET_LEADERBOARD', payload: leaderboard });
  }, []);

  const openModal = useCallback(() => {
    dispatch({ type: 'OPEN_MODAL' });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const completeGame = useCallback((score) => {
    dispatch({ type: 'COMPLETE_GAME', payload: score });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const value = {
    ...state,
    setPlayer,
    setGameSession,
    setLeaderboard,
    openModal,
    closeModal,
    startGame,
    completeGame,
    setError,
    setLoading,
    clearError,
    resetGame
  };

  return (
    <PuzzleContext.Provider value={value}>
      {children}
    </PuzzleContext.Provider>
  );
}

export function usePuzzleContext() {
  const context = useContext(PuzzleContext);
  if (!context) {
    throw new Error('usePuzzleContext must be used within a PuzzleProvider');
  }
  return context;
}