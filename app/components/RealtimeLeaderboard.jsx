import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';

export function RealtimeLeaderboard({ productId, difficulty, shopGlobal = false }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetcher = useFetcher();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const params = new URLSearchParams({
          productId,
          difficulty,
          limit: '10',
          global: shopGlobal.toString()
        });

        const response = await fetch(`/api/puzzle/scores?${params}`);
        const data = await response.json();

        if (data.success) {
          setLeaderboard(data.leaderboard);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchLeaderboard, 30000);

    return () => clearInterval(interval);
  }, [productId, difficulty, shopGlobal]);

  if (loading) {
    return (
      <div className="leaderboard-loading">
        <div className="spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="leaderboard-empty">
        <p>No scores yet. Be the first to complete this puzzle!</p>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="realtime-leaderboard">
      <h3>🏆 Top Players</h3>
      <div className="leaderboard-list">
        {leaderboard.map((score, index) => (
          <div key={score.id} className={`leaderboard-item rank-${index + 1}`}>
            <div className="rank">#{index + 1}</div>
            <div className="player-info">
              <span className="nickname">{score.nickname}</span>
              <span className="time">{formatTime(score.timeInSeconds)}</span>
            </div>
            {score.verified && <div className="verified-badge">✓</div>}
          </div>
        ))}
      </div>
      <div className="leaderboard-refresh">
        <small>Updates every 30 seconds</small>
      </div>
    </div>
  );
}