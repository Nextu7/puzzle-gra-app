import { useState, useEffect } from 'react';
import { DIFFICULTY_LEVELS } from '../../hooks/usePuzzleGeneration';

export function PuzzleSetupControls({ difficulty, onDifficultyChange, onStartGame }) {
  return (
    <div className="puzzle-setup-controls">
      <p className="puzzle-setup-title">Wybierz poziom trudności:</p>
      <div className="puzzle-difficulty-pills">
        {Object.keys(DIFFICULTY_LEVELS).map(level => (
          <button
            key={level}
            className={`puzzle-btn ${difficulty === level ? 'active' : ''}`}
            onClick={() => onDifficultyChange(level)}
          >
            {level.substring(1)}
          </button>
        ))}
      </div>
      <button 
        onClick={onStartGame}
        className="puzzle-btn puzzle-btn-start"
      >
        Rozpocznij grę
      </button>
    </div>
  );
}

export function PuzzleGameControls({ 
  showPreview, 
  onTogglePreview, 
  onReset, 
  startTime 
}) {
  const [time, setTime] = useState('00:00');

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      setTime(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="puzzle-controls">
      <button 
        className="puzzle-btn puzzle-btn-reset"
        onClick={onReset}
      >
        <span>↻</span> Reset
      </button>
      <button 
        className={`puzzle-btn puzzle-btn-preview ${showPreview ? 'active' : ''}`}
        onClick={onTogglePreview}
      >
        Podgląd
      </button>
      <span className="puzzle-timer">
        ⏱️ Czas: <span>{time}</span>
      </span>
    </div>
  );
}