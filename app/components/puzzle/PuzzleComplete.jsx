import { useState, useEffect } from 'react';
import { usePuzzleAPI } from '../../hooks/usePuzzleAPI';
import { usePuzzleContext } from '../../contexts/PuzzleContext';

export function PuzzleComplete({ 
  completionTime, 
  difficulty, 
  productId, 
  customerId, 
  onPlayAgain 
}) {
  const [showNicknameForm, setShowNicknameForm] = useState(false);
  const [nickname, setNickname] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  
  const { player, setPlayer } = usePuzzleContext();
  const { 
    createOrGetPlayer, 
    updatePlayerNickname, 
    saveScore, 
    getLeaderboard,
    loading 
  } = usePuzzleAPI();

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) return;

    try {
      if (player) {
        const updatedPlayer = await updatePlayerNickname(player.id, nickname.trim());
        setPlayer(updatedPlayer);
      } else if (customerId) {
        const newPlayer = await createOrGetPlayer(customerId, nickname.trim());
        setPlayer(newPlayer);
      }

      if (player || customerId) {
        await saveScore(
          player?.id || 'temp', 
          productId, 
          difficulty, 
          completionTime
        );
      }

      setShowNicknameForm(false);
      loadLeaderboard();
    } catch (error) {
      console.error('Error saving nickname:', error);
    }
  };

  const loadLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const data = await getLeaderboard(productId, difficulty);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    const initializeCompletion = async () => {
      if (!customerId) {
        // Guest user - show login prompt
        return;
      }

      try {
        let currentPlayer = player;
        
        if (!currentPlayer) {
          // Try to get existing player
          try {
            currentPlayer = await createOrGetPlayer(customerId);
            setPlayer(currentPlayer);
          } catch (error) {
            // Player doesn't exist, show nickname form
            setShowNicknameForm(true);
            return;
          }
        }

        if (currentPlayer) {
          // Save score and load leaderboard
          await saveScore(
            currentPlayer.id, 
            productId, 
            difficulty, 
            completionTime
          );
          loadLeaderboard();
        }
      } catch (error) {
        console.error('Error initializing completion:', error);
      }
    };

    initializeCompletion();
  }, [customerId, player, productId, difficulty, completionTime]);

  return (
    <div className="puzzle-complete">
      <div className="puzzle-complete-content">
        <span>✓</span> PUZZLE UŁOŻONE!
      </div>
      <div className="puzzle-complete-time">
        Czas: {formatTime(completionTime)}
      </div>

      {!customerId ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h4>Aby zapisać wynik, musisz mieć konto.</h4>
          <a href="/account/login" className="puzzle-btn" style={{ textDecoration: 'none' }}>
            Zaloguj się
          </a>
        </div>
      ) : showNicknameForm ? (
        <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ccc' }}>
          <h4>Wybierz swoją nazwę gracza</h4>
          <p style={{ fontSize: '14px', marginTop: 0 }}>
            Ta nazwa będzie widoczna w rankingu. Wybierasz ją tylko raz.
          </p>
          <input
            type="text"
            placeholder="Twój nick..."
            maxLength="25"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{ 
              padding: '8px', 
              width: '200px', 
              textAlign: 'center' 
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveNickname()}
          />
          <button 
            className="puzzle-btn" 
            style={{ marginLeft: '10px' }}
            onClick={handleSaveNickname}
            disabled={loading || !nickname.trim()}
          >
            {loading ? 'Zapisywanie...' : 'Zapisz'}
          </button>
        </div>
      ) : (
        <div className="leaderboard-container">
          <h4 style={{ textAlign: 'center' }}>🏆 Ranking dla tego poziomu 🏆</h4>
          {loadingLeaderboard ? (
            <p>Ładowanie...</p>
          ) : (
            <ol>
              {leaderboard.map((score, index) => (
                <li key={score.id}>
                  <span>{score.nickname}</span>{' '}
                  <strong>{formatTime(score.timeInSeconds)}</strong>
                </li>
              ))}
              {leaderboard.length === 0 && <li>Brak wyników.</li>}
            </ol>
          )}
        </div>
      )}

      <button className="puzzle-btn" onClick={onPlayAgain}>
        Zagraj ponownie
      </button>
    </div>
  );
}