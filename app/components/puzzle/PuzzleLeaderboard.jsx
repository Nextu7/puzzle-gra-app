import { useState, useEffect, memo } from 'react';
import { useFetcher } from '@remix-run/react';

const PuzzleLeaderboard = memo(({ 
  productId, 
  difficulty, 
  visible = true,
  showGlobal = false 
}) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetcher = useFetcher();

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const loadLeaderboard = async () => {
    if (!productId || !difficulty) return;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        productId,
        difficulty,
        limit: '10',
        global: showGlobal.toString()
      });

      const response = await fetch(`/api/puzzle/scores?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      } else {
        setError(data.error || 'Failed to load leaderboard');
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Network error while loading leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // Load leaderboard when component mounts or parameters change
  useEffect(() => {
    if (visible) {
      loadLeaderboard();
    }
  }, [productId, difficulty, visible, showGlobal]);

  if (!visible) {
    return null;
  }

  return (
    <div className="leaderboard-container">
      <h4 style={{ textAlign: 'center' }}>
        🏆 {showGlobal ? 'Global Ranking' : 'Shop Ranking'} - {difficulty.substring(1)} pieces 🏆
      </h4>
      
      {loading && (
        <p style={{ textAlign: 'center', color: '#666' }}>
          Loading leaderboard...
        </p>
      )}
      
      {error && (
        <p style={{ textAlign: 'center', color: '#e74c3c' }}>
          {error}
        </p>
      )}
      
      {!loading && !error && (
        <ol className="leaderboard-list">
          {leaderboard.length > 0 ? (
            leaderboard.map((score, index) => (
              <li key={score.id} className="leaderboard-item">
                <span className="leaderboard-rank">#{index + 1}</span>
                <span className="leaderboard-name">{score.nickname}</span>
                <strong className="leaderboard-time">
                  {formatTime(score.timeInSeconds)}
                </strong>
                {score.verified && (
                  <span className="leaderboard-verified" title="Server verified">
                    ✓
                  </span>
                )}
              </li>
            ))
          ) : (
            <li className="leaderboard-empty">
              No scores yet. Be the first!
            </li>
          )}
        </ol>
      )}
      
      <div className="leaderboard-controls">
        <button 
          onClick={loadLeaderboard}
          disabled={loading}
          className="puzzle-btn puzzle-btn-small"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        
        <label className="leaderboard-toggle">
          <input 
            type="checkbox" 
            checked={showGlobal}
            onChange={() => {}} // Controlled by parent
            disabled
          />
          Global Rankings
        </label>
      </div>
    </div>
  );
});

PuzzleLeaderboard.displayName = 'PuzzleLeaderboard';

export { PuzzleLeaderboard };