import React, { useState, useEffect } from 'react';
import { LEVELS } from './utils/levels';
import { SKINS } from './utils/skins';
import { soundManager } from './utils/sound';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import './App.css';

export default function App() {
  const [currentLevel, setCurrentLevel] = useState(LEVELS[0]);
  const [selectedSkin, setSelectedSkin] = useState(SKINS[0]);
  const [gameState, setGameState] = useState('idle'); // 'idle' | 'drawing' | 'running' | 'win' | 'failed'
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  
  // User Authentication
  const [userSession, setUserSession] = useState(() => {
    const stored = localStorage.getItem('toilet_user_session');
    return stored ? JSON.parse(stored) : null;
  });
  const [loginName, setLoginName] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');

  // Scoring & Stats
  const [totalScore, setTotalScore] = useState(0);
  const [levelHighScores, setLevelHighScores] = useState({});
  const [latestRun, setLatestRun] = useState(null);
  const [failReason, setFailReason] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [globalSubmitStatus, setGlobalSubmitStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'

  // Ghosts competitive system
  const [ghostPath, setGhostPath] = useState(null);
  const [ghostEnabled, setGhostEnabled] = useState(true);

  // Double-tap/Double-click tracking for stage select
  const lastClickTimeRef = React.useRef({});

  // Load high scores and unlock skins on mount
  useEffect(() => {
    const storedScores = localStorage.getItem('toilet_level_highscores');
    if (storedScores) {
      const parsed = JSON.parse(storedScores);
      setLevelHighScores(parsed);
      
      const total = Object.values(parsed).reduce((sum, item) => sum + (item.score || 0), 0);
      setTotalScore(total);
    }
  }, []);

  // Update ghost path when level changes (tries global first, falls back to local)
  useEffect(() => {
    const loadGhost = async () => {
      try {
        const response = await fetch(`/api/scores?levelId=${currentLevel.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ghost && Array.isArray(data.ghost) && data.ghost.length > 0) {
            setGhostPath(data.ghost);
            return;
          }
        }
      } catch (e) {
        // silent fallback
      }

      const storedGhost = localStorage.getItem(`toilet_ghost_${currentLevel.id}`);
      if (storedGhost) {
        setGhostPath(JSON.parse(storedGhost));
      } else {
        setGhostPath(null);
      }
    };

    loadGhost();
  }, [currentLevel]);

  const handleMuteToggle = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundManager.resume();
    soundManager.setMute(nextMuted);
  };

  const handleStartDraw = () => {
    soundManager.resume();
    soundManager.playSelect();
    setGameState('drawing');
    setIsPaused(false);
    setGlobalSubmitStatus('idle');
  };

  const handlePauseToggle = () => {
    soundManager.playSelect();
    setIsPaused(!isPaused);
  };

  const handleRestart = () => {
    soundManager.playSelect();
    setGameState('drawing');
    setIsPaused(false);
    setGlobalSubmitStatus('idle');
  };

  const handleBackToLobby = () => {
    soundManager.playSelect();
    setGameState('idle');
    setIsPaused(false);
    setShowLeaderboard(false);
    setGlobalSubmitStatus('idle');
  };

  const handleSelectLevel = (lvl) => {
    soundManager.playSelect();
    setCurrentLevel(lvl);
    setGameState('idle');
    setShowLeaderboard(false);
    setGlobalSubmitStatus('idle');
  };

  const handleSelectSkin = (skin) => {
    if (skin.locked && totalScore < skin.unlockScore) {
      soundManager.playFart();
      return;
    }
    soundManager.playSelect();
    setSelectedSkin(skin);
  };

  const handleWin = async (scoreData) => {
    setLatestRun(scoreData);
    setGameState('win');
    
    // 1. Save score locally
    const currentHigh = levelHighScores[currentLevel.id]?.score || 0;
    if (scoreData.score > currentHigh) {
      const newHighs = {
        ...levelHighScores,
        [currentLevel.id]: {
          score: scoreData.score,
          time: scoreData.time,
          tissue: scoreData.tissueUsed
        }
      };
      setLevelHighScores(newHighs);
      localStorage.setItem('toilet_level_highscores', JSON.stringify(newHighs));
      
      const newTotal = Object.values(newHighs).reduce((sum, item) => sum + item.score, 0);
      setTotalScore(newTotal);
    }

    // Save to the local leaderboard for Leaderboard component
    const getRankTitle = (score) => {
      if (score >= 9000) return "👑 황금 괄약근";
      if (score >= 8000) return "🧻 휴지 장인";
      if (score >= 6500) return "🚶 평범한 시민";
      if (score >= 4500) return "💦 아슬아슬 세이프";
      return "💩 턱걸이 골인";
    };

    const storedLocal = localStorage.getItem(`toilet_local_scores_lvl_${currentLevel.id}`);
    const localScores = storedLocal ? JSON.parse(storedLocal) : [];
    const newLocalEntry = {
      name: userSession ? userSession.name : "익명",
      score: scoreData.score,
      time: scoreData.time,
      tissue: scoreData.tissueUsed,
      rank: getRankTitle(scoreData.score),
      date: new Date().toLocaleDateString()
    };
    const updatedLocal = [...localScores, newLocalEntry].sort((a, b) => b.score - a.score).slice(0, 10);
    localStorage.setItem(`toilet_local_scores_lvl_${currentLevel.id}`, JSON.stringify(updatedLocal));

    // 2. AUTOMATIC SUBMISSION TO VERCEL KV
    if (userSession) {
      setGlobalSubmitStatus('submitting');
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            levelId: parseInt(currentLevel.id),
            name: userSession.name,
            passcode: userSession.passcode,
            score: scoreData.score,
            time: scoreData.time.toString(),
            tissue: scoreData.tissueUsed,
            path: scoreData.path || []
          })
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          setGlobalSubmitStatus('success');
        } else {
          setGlobalSubmitStatus('error');
        }
      } catch (e) {
        setGlobalSubmitStatus('error');
      }
    }
  };

  const handleLose = (reason) => {
    setFailReason(reason);
    setGameState('failed');
  };

  const recordGhostRun = (pathArray) => {
    const currentHigh = levelHighScores[currentLevel.id]?.score || 0;
    if (!latestRun || latestRun.score >= currentHigh) {
      localStorage.setItem(`toilet_ghost_${currentLevel.id}`, JSON.stringify(pathArray));
      setGhostPath(pathArray);
    }
  };

  // Login handlers
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginName.trim() || loginPasscode.length !== 4) return;
    
    soundManager.playSelect();
    const session = {
      name: loginName.trim(),
      passcode: loginPasscode
    };
    setUserSession(session);
    localStorage.setItem('toilet_user_session', JSON.stringify(session));
    setLoginName('');
    setLoginPasscode('');
  };

  const handleLogout = () => {
    soundManager.playFart();
    setUserSession(null);
    localStorage.removeItem('toilet_user_session');
  };

  // 1. ENFORCE LOGIN WALL
  if (!userSession) {
    return (
      <div style={{
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '85vh',
        justifyContent: 'center',
        fontFamily: '"Outfit", sans-serif'
      }}>
        <h1 className="comic-title" style={{ fontSize: '3.5rem', marginBottom: '8px' }}>🧻 급똥 레이서 🚽</h1>
        <p style={{ color: '#00e5ff', marginBottom: '28px', fontWeight: 'bold', fontSize: '15px', textShadow: '0 0 10px rgba(0,229,255,0.3)' }}>
          ⚠️ 플레이를 위해선 괄약근 안전 로그인이 필수입니다!
        </p>
        
        <div className="glass animate-float" style={{
          padding: '36px',
          width: '360px',
          border: '3px solid var(--color-primary)',
          textAlign: 'center',
          background: 'rgba(30, 30, 38, 0.95)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '8px' }}>🔑</span>
          <h2 style={{ color: '#ffeb3b', marginBottom: '12px', fontFamily: 'var(--font-heading)', fontSize: '22px' }}>
            로그인 및 닉네임 등록
          </h2>
          <p style={{ fontSize: '11px', color: '#b0bec5', marginBottom: '24px', lineHeight: '1.4' }}>
            닉네임과 비밀번호(4자리)를 설정하세요.<br/>
            최초 로그인 시 해당 닉네임이 입력하신 비밀번호로 즉시 자동 보호됩니다. (도용 방지)
          </p>
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="text"
              placeholder="닉네임 입력 (최대 10자)"
              maxLength={10}
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              required
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: '#2d2d38',
                color: '#fff',
                outline: 'none',
                fontSize: '14px',
                textAlign: 'center'
              }}
            />
            <input
              type="password"
              placeholder="비밀번호 4자리 숫자"
              maxLength={4}
              pattern="\d{4}"
              value={loginPasscode}
              onChange={(e) => setLoginPasscode(e.target.value)}
              required
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: '#2d2d38',
                color: '#fff',
                outline: 'none',
                textAlign: 'center',
                letterSpacing: '6px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            />
            <button type="submit" className="btn-comic btn-yellow" style={{
              padding: '14px',
              fontSize: '15px',
              marginTop: '8px',
              boxShadow: '3px 3px 0 #000'
            }}>
              🛡️ 안전 로그인 및 입장
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. MAIN GAME INTERFACE (ONLY ACCESSIBLE ONCE LOGGED IN)
  return (
    <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* HEADER SECTION */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingBottom: '16px',
        borderBottom: '2px solid rgba(255,255,255,0.08)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="comic-title" style={{ margin: 0, fontSize: '2.5rem' }}>🧻 급똥 레이서 🚽</h1>
          <span style={{ fontSize: '12px', color: '#b0bec5', fontWeight: '600' }}>경쟁의 소용돌이! 휴지를 수호하라!</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* LOGGED IN ACCOUNT CHIP */}
          <div className="glass" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            border: '1px solid rgba(0, 230, 118, 0.2)'
          }}>
            <span style={{ color: '#00e676', fontWeight: 'bold' }}>👤 {userSession.name} 로그인됨</span>
            <button onClick={handleLogout} className="btn-comic btn-grey" style={{ padding: '4px 8px', fontSize: '10px', boxShadow: '1px 1px 0px #000' }}>로그아웃</button>
          </div>

          <div className="glass" style={{ padding: '8px 16px', fontSize: '14px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
            🏆 누적 점수: <strong style={{ color: '#ffeb3b', fontSize: '16px' }}>{totalScore}점</strong>
          </div>
          <button onClick={handleMuteToggle} className="btn-comic btn-grey" style={{ padding: '8px 12px', boxShadow: '2px 2px 0px #000' }}>
            {muted ? '🔇 음소거 해제' : '🔊 사운드 ON'}
          </button>
        </div>
      </header>

      {/* LOBBY / MAIN MENU */}
      {gameState === 'idle' && !showLeaderboard && (
        <div className="lobby-container">
          <div className="lobby-main glass">
            <h2 style={{ fontFamily: 'var(--font-heading)', color: '#ffeb3b', marginBottom: '16px', fontSize: '24px' }}>
              🎯 화장실 맵 선택 (Level Select)
            </h2>
            <p style={{ color: '#b0bec5', fontSize: '14px', marginBottom: '20px' }}>
              스테이지를 고르고 마우스나 터치로 안전한 화장지 길을 설계해 탈출하세요!
            </p>
            
            <div className="level-grid">
              {LEVELS.map((lvl) => {
                const isSelected = currentLevel.id === lvl.id;
                const isUnlocked = lvl.id === 1 || levelHighScores[lvl.id - 1] !== undefined;
                const high = levelHighScores[lvl.id];
                return (
                  <div
                    key={lvl.id}
                    className={`level-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (isUnlocked) {
                        const now = Date.now();
                        const DOUBLE_PRESS_DELAY = 300;
                        if (lastClickTimeRef.current[lvl.id] && (now - lastClickTimeRef.current[lvl.id] < DOUBLE_PRESS_DELAY)) {
                          handleSelectLevel(lvl);
                          handleStartDraw();
                        } else {
                          handleSelectLevel(lvl);
                        }
                        lastClickTimeRef.current[lvl.id] = now;
                      } else {
                        soundManager.playFart();
                      }
                    }}
                    style={{
                      opacity: isUnlocked ? 1.0 : 0.45,
                      cursor: isUnlocked ? 'pointer' : 'not-allowed',
                      pointerEvents: 'auto',
                      border: isSelected ? '2px solid var(--color-secondary)' : !isUnlocked ? '1px dashed rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: isSelected ? '#00e5ff' : '#ffffff' }}>
                        Lv {lvl.id}. {lvl.name} {!isUnlocked && '🔒'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#b0bec5', marginTop: '4px' }}>
                        {lvl.obstacles.length > 0 ? `🧱 장애물 ${lvl.obstacles.length}개` : '벽 없음'}
                        {lvl.puddles && lvl.puddles.length > 0 ? ` 💦 물웅덩이 ${lvl.puddles.length}개` : ''}
                        {lvl.movingPuddles && lvl.movingPuddles.length > 0 ? ` 💦 이동물 ${lvl.movingPuddles.length}개` : ''}
                        {lvl.monsters && lvl.monsters.length > 0 ? ` 👾 몬스터 ${lvl.monsters.length}마리` : ''}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      {isUnlocked ? (
                        high ? (
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffeb3b' }}>
                              {high.score}점
                            </div>
                            <div style={{ fontSize: '10px', color: '#b0bec5' }}>
                              {high.time}초 / {high.tissue}m
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#00e676', fontStyle: 'italic', fontWeight: 'bold' }}>입장 가능</div>
                        )
                      ) : (
                        <div>
                          <div style={{ fontSize: '12px', color: '#ff3d00', fontWeight: 'bold' }}>잠김 🔒</div>
                          <div style={{ fontSize: '9px', color: '#b0bec5' }}>이전 클리어 필수</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(0,0,0,0.25)',
              borderLeft: '4px solid #ffeb3b'
            }}>
              <h3 style={{ fontSize: '15px', color: '#ffeb3b', marginBottom: '4px' }}>💬 스토리 & 상태</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.4', color: '#e0e0e0' }}>{currentLevel.intro}</p>
              <div style={{ fontSize: '12px', color: '#00e5ff', marginTop: '8px', fontWeight: 'bold' }}>
                💡 꿀팁: {currentLevel.hint}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
              <button
                onClick={handleStartDraw}
                className="btn-comic btn-yellow"
                style={{ flex: 2, padding: '16px', fontSize: '18px' }}
              >
                🎮 괄약근 탈출 작전 시작!
              </button>
              
              <button
                onClick={() => {
                  soundManager.playSelect();
                  setShowLeaderboard(true);
                }}
                className="btn-comic btn-cyan"
                style={{ flex: 1 }}
              >
                🏆 랭킹 보기
              </button>
            </div>
          </div>

          <div className="lobby-sidebar glass">
            <h2 style={{ fontFamily: 'var(--font-heading)', color: '#ffeb3b', fontSize: '20px', marginBottom: '8px' }}>
              🧻 스킨 상점
            </h2>
            <div style={{ fontSize: '11px', color: '#b0bec5', marginBottom: '12px' }}>
              누적 점수로 스킨을 해금하여 캐릭터 속도를 높이고 쾌적하게 똥을 싸세요!
            </div>
            
            <div className="skin-grid">
              {SKINS.map((skin) => {
                const isUnlocked = skin.unlocked || totalScore >= skin.unlockScore;
                const isSelected = selectedSkin.id === skin.id;
                
                return (
                  <div
                    key={skin.id}
                    className={`skin-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
                    onClick={() => handleSelectSkin({ ...skin, unlocked: isUnlocked })}
                  >
                    <span style={{ fontSize: '32px' }}>{isUnlocked ? skin.emoji : '🔒'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: isSelected ? '#ffeb3b' : '#ffffff' }}>
                        {skin.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#b0bec5', marginTop: '2px', lineHeight: '1.2' }}>
                        {isUnlocked ? skin.description : `누적 ${skin.unlockScore}점 도달 시 잠금 해제`}
                      </div>
                    </div>
                    {isUnlocked && (
                      <span style={{ fontSize: '10px', color: '#00e5ff', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 4px', borderRadius: '4px', position: 'absolute', top: '6px', right: '6px' }}>
                        속도 x{skin.speed}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GAME LEADERBOARD SCREEN */}
      {showLeaderboard && (
        <Leaderboard
          levelId={currentLevel.id}
          onBack={handleBackToLobby}
        />
      )}

      {/* GAMEPLAY SCREEN */}
      {gameState !== 'idle' && !showLeaderboard && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          
          <div className="glass" style={{
            width: '100%',
            maxWidth: '800px',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid rgba(0, 229, 255, 0.2)'
          }}>
            <div>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#00e5ff', fontWeight: 'bold' }}>
                Stage {currentLevel.id < 10 ? `0${currentLevel.id}` : currentLevel.id}
              </span>
              <h2 style={{ fontSize: '18px', margin: 0, color: '#ffffff' }}>{currentLevel.name}</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#b0bec5' }}>
                <input
                  type="checkbox"
                  checked={ghostEnabled}
                  onChange={() => setGhostEnabled(!ghostEnabled)}
                  style={{ width: '15px', height: '15px', accentColor: '#00e5ff' }}
                />
                1위 고스트 라이벌 {ghostPath ? '⚡' : '(기록 없음)'}
              </label>

              <button onClick={handlePauseToggle} className="btn-comic btn-grey" style={{ padding: '6px 12px', fontSize: '13px', boxShadow: '2px 2px 0px #000' }}>
                {isPaused ? '▶️ 계속하기' : '⏸️ 일시정지'}
              </button>
              
              <button onClick={handleBackToLobby} className="btn-comic btn-red" style={{ padding: '6px 12px', fontSize: '13px', boxShadow: '2px 2px 0px #000' }}>
                🏃 로비로 포기
              </button>
            </div>
          </div>

          <GameCanvas
            level={currentLevel}
            gameState={gameState}
            setGameState={setGameState}
            selectedSkin={selectedSkin}
            onWin={handleWin}
            onLose={handleLose}
            isPaused={isPaused}
            currentGhost={ghostPath}
            recordGhostRun={recordGhostRun}
            ghostPlaybackActive={ghostEnabled}
          />
          
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#b0bec5', maxWidth: '600px', fontStyle: 'italic' }}>
            {gameState === 'drawing' && `👉 마우스로 캐릭터를 꾹 누르고 끄집어당겨 변기(🚽)까지 선을 그으세요!`}
            {gameState === 'running' && `🏃 캐릭터가 기어가는 중입니다! 몬스터나 물을 피해 휴지가 무사하길 기도하세요!`}
          </div>

          {/* PAUSE OVERLAY */}
          {isPaused && (
            <div className="glass" style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              padding: '30px',
              textAlign: 'center',
              width: '320px',
              border: '2px solid var(--color-primary)'
            }}>
              <h2 style={{ color: '#ffeb3b', marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>💩 괄약근 멈춰!</h2>
              <p style={{ color: '#e0e0e0', fontSize: '14px', marginBottom: '24px' }}>
                시간이 지연될 수록 괄약근의 압박이 밀려올 수 있습니다... 조심하세요!
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={handlePauseToggle} className="btn-comic btn-yellow" style={{ width: '100%' }}>
                  ▶️ 괄약근 다시 작동 (Resume)
                </button>
                <button onClick={handleRestart} className="btn-comic btn-cyan" style={{ width: '100%' }}>
                  🔄 처음부터 재도전 (Restart)
                </button>
                <button onClick={handleBackToLobby} className="btn-comic btn-red" style={{ width: '100%' }}>
                  🏃 똥 싸는거 포기하고 항복
                </button>
              </div>
            </div>
          )}

          {/* WIN MODAL */}
          {gameState === 'win' && latestRun && (
            <div className="glass" style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              padding: '30px',
              textAlign: 'center',
              width: '380px',
              border: '3px solid var(--color-success)',
              boxShadow: '0px 0px 30px rgba(0, 230, 118, 0.4)'
            }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '10px' }}>🚽✨🎉</span>
              <h2 style={{ color: '#00e676', fontSize: '28px', fontFamily: 'var(--font-heading)', marginBottom: '16px' }}>
                골인 대성공!
              </h2>
              
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '12px',
                fontSize: '14px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div>⏱️ 탈출 소요 시간: <strong style={{ color: '#00e5ff' }}>{latestRun.time}초</strong></div>
                <div>🧻 낭비한 화장지: <strong style={{ color: '#00e5ff' }}>{latestRun.tissueUsed}m</strong></div>
                <div>💥 괄약근 한계점: <strong style={{ color: '#ff3d00' }}>{latestRun.urgency}%</strong></div>
                <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
                <div style={{ fontSize: '18px', textAlign: 'center', fontWeight: 'bold', color: '#ffeb3b', marginTop: '4px' }}>
                  획득 점수: {latestRun.score}점
                </div>
              </div>

              {/* AUTOMATIC SUBMIT STATUS HUD */}
              <div style={{
                marginBottom: '16px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)',
                fontSize: '13px',
                fontWeight: '600',
                textAlign: 'center',
                border: globalSubmitStatus === 'success' ? '1px solid rgba(0, 230, 118, 0.35)' : globalSubmitStatus === 'submitting' ? '1px solid rgba(255, 235, 59, 0.35)' : globalSubmitStatus === 'error' ? '1px solid rgba(255, 61, 0, 0.35)' : 'none',
                color: globalSubmitStatus === 'success' ? '#00e676' : globalSubmitStatus === 'submitting' ? '#ffeb3b' : globalSubmitStatus === 'error' ? '#ff8a65' : '#ffffff'
              }}>
                {globalSubmitStatus === 'submitting' && "🌍 글로벌 랭킹 자동 등록 중... 🧻"}
                {globalSubmitStatus === 'success' && "🌍 실시간 글로벌 랭킹 자동 등록 완료! ✅"}
                {globalSubmitStatus === 'error' && "🌍 글로벌 랭킹 자동 등록 실패 (서버 연결 불가) ❌"}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => {
                    soundManager.playSelect();
                    setShowLeaderboard(true);
                  }}
                  className="btn-comic btn-yellow"
                  style={{ width: '100%' }}
                >
                  🏆 랭킹 리더보드 확인하기
                </button>
                
                {currentLevel.id < LEVELS.length ? (
                  <button
                    onClick={() => {
                      const nextLvl = LEVELS.find(l => l.id === currentLevel.id + 1);
                      if (nextLvl) handleSelectLevel(nextLvl);
                      handleStartDraw();
                    }}
                    className="btn-comic btn-cyan"
                    style={{ width: '100%' }}
                  >
                    ⏩ 다음 스테이지 도전!
                  </button>
                ) : (
                  <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '13px', margin: '6px 0' }}>
                    👑 축하합니다! 모든 화장실을 정복했습니다! 👑
                  </div>
                )}
                
                <button onClick={handleRestart} className="btn-comic btn-grey" style={{ width: '100%' }}>
                  🔄 한 번 더 도전해서 기록 갱신
                </button>
                
                <button onClick={handleBackToLobby} className="btn-comic btn-red" style={{ width: '100%' }}>
                  🏠 메인 메뉴로 나가기
                </button>
              </div>
            </div>
          )}

          {/* LOSE MODAL */}
          {gameState === 'failed' && (
            <div className="glass shake-urgent" style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              padding: '30px',
              textAlign: 'center',
              width: '360px',
              border: '3px solid var(--color-accent)',
              boxShadow: '0px 0px 30px rgba(255, 61, 0, 0.4)'
            }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '10px' }}>😭💩💦</span>
              <h2 style={{ color: '#ff3d00', fontSize: '26px', fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>
                으아아악! 폭발!
              </h2>
              
              <p style={{
                background: 'rgba(255, 61, 0, 0.1)',
                border: '1px solid rgba(255, 61, 0, 0.2)',
                padding: '12px',
                borderRadius: '8px',
                color: '#ff8a65',
                fontSize: '14px',
                lineHeight: '1.4',
                marginBottom: '20px'
              }}>
                {failReason || "안타깝게도 화장실 골인에 실패하셨습니다... 바지가 차갑습니다..."}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={handleRestart} className="btn-comic btn-yellow" style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
                  🔄 눈물 닦고 다시 도전!
                </button>
                <button onClick={handleBackToLobby} className="btn-comic btn-grey" style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
                  🏠 냄새나는 현장 탈출하기 (Lobby)
                </button>
              </div>
            </div>
          )}

        </div>
      )}


      
      {/* FOOTER */}
      <footer style={{ marginTop: '40px', fontSize: '12px', color: '#607d8b', textAlign: 'center', paddingBottom: '20px' }}>
        Toilet Rush Game v1.0.0 © 2026. Made with 🧻 & 💩. B-grade comedy game series.
      </footer>
    </div>
  );
}
