import { useState, useCallback } from 'react';
import { useFetcher } from '@remix-run/react';

export function usePuzzleAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const playerFetcher = useFetcher();
  const scoreFetcher = useFetcher();
  const sessionFetcher = useFetcher();
  const leaderboardFetcher = useFetcher();

  const createOrGetPlayer = useCallback(async (customerId, nickname = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/puzzle/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, nickname }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create player');
      }

      return data.player;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePlayerNickname = useCallback(async (playerId, nickname) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/puzzle/players', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId, nickname }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update player');
      }

      return data.player;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveScore = useCallback(async (playerId, productId, difficulty, timeInSeconds) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/puzzle/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId, productId, difficulty, timeInSeconds }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save score');
      }

      return data.score;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLeaderboard = useCallback(async (productId, difficulty, limit = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        productId,
        difficulty,
        limit: limit.toString()
      });

      const response = await fetch(`/api/puzzle/scores?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      return data.leaderboard;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createGameSession = useCallback(async (playerId, productId, difficulty) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/puzzle/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId, productId, difficulty }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create game session');
      }

      return data.session;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeGameSession = useCallback(async (sessionId, timeSpent) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/puzzle/sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, timeSpent }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to complete game session');
      }

      return data.session;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createOrGetPlayer,
    updatePlayerNickname,
    saveScore,
    getLeaderboard,
    createGameSession,
    completeGameSession,
    clearError: () => setError(null)
  };
}