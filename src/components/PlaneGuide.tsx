import React, { useState } from 'react';
import { Volume2, Square, Sparkles, CheckCircle2, HelpCircle } from 'lucide-react';
import { ENCYCLOPEDIA_ENTRIES } from '../data/aviationKnowledge';
import { EncyclopediaEntry } from '../types/aviation';
import { playSpotChime, playTapPing } from '../utils/soundAndSpeech';
import { PlaneIllustration } from './PlaneArt';

interface PlaneGuideProps {
  speakingId: string | null;
  speechNotice: string | null;
  solvedQuizzes: string[];
  onSpeakEntry: (entry: EncyclopediaEntry) => void;
  onSolveQuiz: (quizId: string) => void;
}

export const PlaneGuide: React.FC<PlaneGuideProps> = ({
  speakingId,
  speechNotice,
  solvedQuizzes,
  onSpeakEntry,
  onSolveQuiz,
}) => {
  const [selectedId, setSelectedId] = useState<string>(ENCYCLOPEDIA_ENTRIES[0].id);
  const [pickedOption, setPickedOption] = useState<Record<string, number>>({});

  const activeEntry =
    ENCYCLOPEDIA_ENTRIES.find((item) => item.id === selectedId) || ENCYCLOPEDIA_ENTRIES[0];
  const isSpeaking = speakingId === `guide-${activeEntry.id}`;
  const isQuizSolved = solvedQuizzes.includes(activeEntry.id);
  const currentPick = pickedOption[activeEntry.id];

  const handleOptionClick = (entry: EncyclopediaEntry, idx: number) => {
    setPickedOption((prev) => ({ ...prev, [entry.id]: idx }));
    if (idx === entry.quiz.answerIndex) {
      playSpotChime();
      if (!solvedQuizzes.includes(entry.id)) {
        onSolveQuiz(entry.id);
      }
    } else {
      playTapPing();
    }
  };

  return (
    <div className="guide-layout">
      <div className="guide-intro-banner">
        <div>
          <h2 className="section-heading">✈️ Kid’s Plane Encyclopedia</h2>
          <p className="section-sub">
            Pick an aircraft to see how big and fast it is, hear a story, and earn quiz stars!
          </p>
        </div>
        <div className="quiz-progress-pill">
          <Sparkles size={18} />
          <span>
            Quizzes Solved: <strong>{solvedQuizzes.length}</strong> / {ENCYCLOPEDIA_ENTRIES.length}
          </span>
        </div>
      </div>

      {/* Big tactile plane family selector */}
      <div className="guide-selector-grid" role="tablist" aria-label="Aircraft types">
        {ENCYCLOPEDIA_ENTRIES.map((entry) => {
          const active = entry.id === activeEntry.id;
          const solved = solvedQuizzes.includes(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`guide-tab-card ${active ? 'is-active' : ''}`}
              style={{
                borderColor: active ? entry.color : undefined,
                boxShadow: active ? `0 6px 0 ${entry.color}` : undefined,
              }}
              onClick={() => {
                playTapPing();
                setSelectedId(entry.id);
              }}
            >
              <PlaneIllustration category={entry.category} color={entry.color} size={64} />
              <span className="guide-tab-title">{entry.title}</span>
              {solved && (
                <span className="guide-solved-star" title="Quiz Solved!">
                  ⭐
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected plane detail showcase */}
      <div className="guide-showcase-card" style={{ borderTopColor: activeEntry.color }}>
        <div className="guide-showcase-top">
          <div className="guide-hero-art" style={{ backgroundColor: `${activeEntry.color}18` }}>
            <PlaneIllustration category={activeEntry.category} color={activeEntry.color} size={132} />
          </div>

          <div className="guide-hero-text">
            <span className="guide-subtitle-tag" style={{ color: activeEntry.color }}>
              {activeEntry.subtitle}
            </span>
            <h3 className="guide-hero-title">{activeEntry.title}</h3>
            <p className="guide-hero-tagline">{activeEntry.tagline}</p>

            <button
              type="button"
              className={`btn-chunky btn-voice ${isSpeaking ? 'is-playing' : ''}`}
              onClick={() => onSpeakEntry(activeEntry)}
            >
              {isSpeaking ? (
                <>
                  <Square size={20} fill="currentColor" />
                  <span>Stop Story</span>
                </>
              ) : (
                <>
                  <Volume2 size={22} />
                  <span>Hear Audio Story!</span>
                </>
              )}
            </button>

            {speechNotice && <p className="speech-notice">{speechNotice}</p>}
          </div>
        </div>

        <div className={`story-box ${isSpeaking ? 'is-speaking' : ''}`}>
          <p className="story-text">{activeEntry.spokenScript}</p>
        </div>

        {/* Fun comparisons */}
        <div className="guide-comparisons-grid">
          <div className="comparison-card">
            <span className="comparison-label">📏 HOW BIG?</span>
            <p className="comparison-text">{activeEntry.sizeComparison}</p>
          </div>
          <div className="comparison-card">
            <span className="comparison-label">⚡ HOW FAST?</span>
            <p className="comparison-text">{activeEntry.speedComparison}</p>
          </div>
          <div className="comparison-card">
            <span className="comparison-label">☁️ HOW HIGH?</span>
            <p className="comparison-text">{activeEntry.altitudeComparison}</p>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="guide-facts-section">
          <h4>🤓 Awesome Sky Facts</h4>
          <ul className="guide-facts-list">
            {activeEntry.funFacts.map((fact, idx) => (
              <li key={idx}>
                <span className="fact-num" style={{ backgroundColor: activeEntry.color }}>
                  {idx + 1}
                </span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mini Pilot Quiz */}
        <div className="guide-quiz-box">
          <div className="guide-quiz-header">
            <HelpCircle size={22} color="#7C3AED" />
            <h4>Mini Pilot Quiz</h4>
            {isQuizSolved && (
              <span className="quiz-earned-pill">
                <CheckCircle2 size={16} /> Star Earned!
              </span>
            )}
          </div>
          <p className="quiz-question">{activeEntry.quiz.question}</p>
          <div className="quiz-options">
            {activeEntry.quiz.options.map((opt, idx) => {
              const isCorrect = idx === activeEntry.quiz.answerIndex;
              const wasPicked = currentPick === idx;
              let stateClass = '';
              if (wasPicked || (isQuizSolved && isCorrect)) {
                stateClass = isCorrect ? 'is-correct' : 'is-wrong';
              }
              return (
                <button
                  key={opt}
                  type="button"
                  className={`quiz-option-btn ${stateClass}`}
                  onClick={() => handleOptionClick(activeEntry, idx)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {(currentPick === activeEntry.quiz.answerIndex || isQuizSolved) && (
            <p className="quiz-explanation">🎉 {activeEntry.quiz.explanation}</p>
          )}
          {currentPick !== undefined && currentPick !== activeEntry.quiz.answerIndex && !isQuizSolved && (
            <p className="quiz-try-again">Not quite — give another button a tap!</p>
          )}
        </div>
      </div>
    </div>
  );
};
