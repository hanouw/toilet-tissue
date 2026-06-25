import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/sound';

const DEFAULT_LEADERBOARD = {
  1: [
    { name: "번개괄약근 ⚡", score: 8500, time: "4.20", tissue: 520, rank: "👑 황금 괄약근" },
    { name: "휴지아끼기장인 🧻", score: 7800, time: "5.10", tissue: 480, rank: "🧻 휴지 장인" },
    { name: "길치인생 🧭", score: 6200, time: "6.80", tissue: 710, rank: "🚶 평범한 시민" }
  ],
  2: [
    { name: "아쿠아맨 🧜‍♂️", score: 8900, time: "5.50", tissue: 620, rank: "🧻 휴지 장인" }
  ],
  3: [
    { name: "집사탈출기 🐈", score: 9100, time: "7.10", tissue: 780, rank: "👑 황금 괄약근" }
  ],
  4: [
    { name: "청소기피해자 🤖", score: 8200, time: "8.50", tissue: 840, rank: "🧻 휴지 장인" }
  ],
  5: [
    { name: "괄약근의마왕 👑", score: 9300, time: "9.30", tissue: 1120, rank: "👑 황금 괄약근" }
  ],
  6: [
    { name: "전기뱀장어 ⚡", score: 8800, time: "8.20", tissue: 980, rank: "🧻 휴지 장인" }
  ],
  7: [
    { name: "바람의아들 🌀", score: 9050, time: "7.50", tissue: 890, rank: "👑 황금 괄약근" }
  ],
  8: [
    { name: "엄마습격생존자 👵", score: 9200, time: "10.80", tissue: 1150, rank: "👑 황금 괄약근" }
  ]
};

export default function Leaderboard({ levelId, latestRun, userSession, onBack }) {
  const [scores, setScores] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [activeTab, setActiveTab] = useState('global');
  const [localScores, setLocalScores] = useState([]);

  // Load global leaderboard from real-time Vercel KV API
  const loadGlobalLeaderboard = async () => {
    try {
      const response = await fetch(`/api/scores?levelId=${levelId}`);
      if (response.ok) {
        const data = await response.json();
        setScores(data.leaderboard && data.leaderboard.length > 0 ? data.leaderboard : DEFAULT_LEADERBOARD[levelId] || []);
      } else {
        setScores(DEFAULT_LEADERBOARD[levelId] || []);
      }
    } catch (e) {
      setScores(DEFAULT_LEADERBOARD[levelId] || []);
    }
  };

  // Load local scores from localStorage
  const loadLocalLeaderboard = () => {
    const stored = localStorage.getItem(`toilet_local_scores_lvl_${levelId}`);
    if (stored) {
      setLocalScores(JSON.parse(stored));
    } else {
      setLocalScores([]);
    }
  };

  useEffect(() => {
    loadGlobalLeaderboard();
    loadLocalLeaderboard();
  }, [levelId]);

  const getRankTitle = (score) => {
    if (score >= 9000) return "👑 황금 괄약근";
    if (score >= 8000) return "🧻 휴지 장인";
    if (score >= 6500) return "🚶 평범한 시민";
    if (score >= 4500) return "💦 아슬아슬 세이프";
    return "💩 턱걸이 골인";
  };

  // 1. Submit locally
  const handleSubmitLocal = (name) => {
    const newEntry = {
      name: name,
      score: latestRun.score,
      time: latestRun.time,
      tissue: latestRun.tissueUsed,
      rank: getRankTitle(latestRun.score),
      date: new Date().toLocaleDateString()
    };

    const updated = [...localScores, newEntry].sort((a, b) => b.score - a.score).slice(0, 10);
    setLocalScores(updated);
    localStorage.setItem(`toilet_local_scores_lvl_${levelId}`, JSON.stringify(updated));
  };

  // 2. Submit globally in background via Vercel KV API
  const handleSubmitGlobal = async (e) => {
    e.preventDefault();
    if (!userSession || !latestRun) return;

    soundManager.playSelect();
    setIsSubmitting(true);
    setSubmitError('');
    
    // Save locally
    handleSubmitLocal(userSession.name);

    const payload = {
      levelId: parseInt(levelId),
      name: userSession.name,
      passcode: userSession.passcode,
      score: latestRun.score,
      time: latestRun.time.toString(),
      tissue: latestRun.tissueUsed,
      path: latestRun.path || []
    };

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        soundManager.playWin();
        setSubmitted(true);
        // Instant reload with newly returned real-time leaderboard
        setScores(resData.leaderboard && resData.leaderboard.length > 0 ? resData.leaderboard : []);
        setActiveTab('global'); // Directly show global so they see their score updated instantly!
      } else {
        soundManager.playFart();
        setSubmitError(resData.error || '점수 전송 도중 에러가 발생했습니다.');
      }
    } catch (err) {
      soundManager.playFart();
      setSubmitError('네트워크 오류 또는 API 연결 실패.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedScores = activeTab === 'global' ? scores : localScores;

  return (
    <div className="leaderboard-overlay glass" style={{
      padding: '24px',
      borderRadius: '16px',
      color: '#ffffff',
      maxWidth: '520px',
      width: '95%',
      margin: '20px auto',
      border: '1px solid rgba(0, 229, 255, 0.15)',
      background: 'rgba(30, 30, 36, 0.95)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: '"Outfit", sans-serif',
      position: 'relative'
    }}>
      {/* LOADER OVERLAY */}
      {isSubmitting && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(24, 24, 27, 0.9)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          gap: '12px'
        }}>
          <span style={{ fontSize: '48px', animation: 'float 1.5s ease-in-out infinite' }}>🧻</span>
          <div style={{ fontWeight: 'bold', color: '#ffeb3b' }}>서버에 괄약근 데이터 전송 중...</div>
          <div style={{ fontSize: '11px', color: '#b0bec5' }}>Vercel KV 실시간 데이터베이스에 반영하고 있습니다.</div>
        </div>
      )}

      <h2 style={{
        textAlign: 'center',
        margin: '0 0 16px 0',
        fontSize: '26px',
        color: '#ffeb3b',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
      }}>
        🏆 랭킹 리더보드 (Stage {levelId})
      </h2>

      {/* TABS SELECT */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => { soundManager.playSelect(); setActiveTab('global'); }}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '6px',
            background: activeTab === 'global' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(0,0,0,0.3)',
            color: activeTab === 'global' ? '#00e5ff' : '#b0bec5',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderBottom: activeTab === 'global' ? '2px solid #00e5ff' : 'none'
          }}
        >
          🌍 전 세계 글로벌 랭킹
        </button>
        <button
          onClick={() => { soundManager.playSelect(); setActiveTab('local'); }}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '6px',
            background: activeTab === 'local' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(0,0,0,0.3)',
            color: activeTab === 'local' ? '#00e5ff' : '#b0bec5',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderBottom: activeTab === 'local' ? '2px solid #00e5ff' : 'none'
          }}
        >
          💻 내 기기 로컬 기록
        </button>
      </div>

      {/* Global submit box */}
      {latestRun && !submitted && (
        <div style={{
          background: 'rgba(255, 235, 59, 0.08)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 235, 59, 0.25)',
          marginBottom: '20px'
        }}>
          <div style={{ textAlign: 'center', fontSize: '15px', marginBottom: '8px' }}>
            🎉 이번 판 획득 점수: <strong style={{ color: '#ffeb3b', fontSize: '18px' }}>{latestRun.score}점</strong>
          </div>
          <div style={{ fontSize: '12px', textAlign: 'center', color: '#b0bec5', marginBottom: '12px' }}>
            나의 괄약근 등급: <strong style={{ color: '#00e676' }}>{getRankTitle(latestRun.score)}</strong>
          </div>
          
          <form onSubmit={handleSubmitGlobal} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={userSession.name}
                disabled
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1f1f28',
                  color: '#00e676',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'not-allowed',
                  textAlign: 'center'
                }}
              />
              <button type="submit" className="btn-comic btn-yellow" style={{
                padding: '10px 16px',
                fontSize: '13px',
                boxShadow: '2px 2px 0px #000'
              }}>
                🌍 실시간 글로벌 랭킹 등록
              </button>
            </div>
            
            <div style={{ fontSize: '10px', color: '#b0bec5', textAlign: 'center', marginTop: '4px', lineHeight: '1.3' }}>
              * <strong>{userSession.name}</strong> 계정으로 Vercel KV DB에 직접 등록합니다.<br/>
              * 제출하는 즉시 랭킹 리더보드가 실시간(0.1초)으로 반영되어 나타납니다!
            </div>
          </form>

          {submitError && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 61, 0, 0.1)',
              border: '1px solid rgba(255, 61, 0, 0.3)',
              color: '#ff8a65',
              fontSize: '12px',
              textAlign: 'center',
              borderRadius: '6px'
            }}>
              🚨 <strong>제출 실패:</strong> {submitError} <br/>
              <span style={{ fontSize: '10px' }}>(Vercel 대시보드에 KV (Redis) 스토리지가 연결되어 있는지 확인해 주세요.)</span>
            </div>
          )}
        </div>
      )}

      {/* Global score submit success confirmation text */}
      {submitted && (
        <div style={{
          background: 'rgba(0, 230, 118, 0.08)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(0, 230, 118, 0.3)',
          color: '#00e676',
          fontSize: '13px',
          textAlign: 'center',
          marginBottom: '20px',
          lineHeight: '1.4'
        }}>
          ✅ <strong>실시간 글로벌 랭킹 등록 완료!</strong> <br/>
          점수 데이터가 Vercel KV 클라우드에 성공적으로 반영되었습니다. 🚽✨
        </div>
      )}

      {/* SCORES DISPLAY LIST */}
      <div className="scores-list" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '280px',
        overflowY: 'auto',
        marginBottom: '20px',
        paddingRight: '4px'
      }}>
        {displayedScores.length > 0 ? (
          displayedScores.map((entry, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.04)',
              fontSize: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontWeight: 'bold',
                  color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#90a4ae',
                  width: '20px',
                  textAlign: 'center'
                }}>
                  {idx + 1}
                </span>
                <span style={{ fontWeight: 'bold' }}>{entry.name}</span>
                <span style={{ fontSize: '10px', color: '#00e5ff', background: 'rgba(0,229,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                  {entry.rank?.replace("👑 ", "")?.replace("🧻 ", "")?.replace("🚶 ", "")?.replace("💦 ", "")?.replace("💩 ", "") || '시민'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: '#ffeb3b' }}>{entry.score}점</div>
                <div style={{ fontSize: '10px', color: '#b0bec5' }}>
                  {entry.time}초 / {entry.tissue}m {entry.date ? `(${entry.date})` : ''}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#607d8b', fontSize: '14px', fontStyle: 'italic' }}>
            등록된 기록이 없습니다. 플레이해서 첫 기록을 올려보세요!
          </div>
        )}
      </div>

      <button onClick={onBack} className="btn-comic btn-grey" style={{
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        boxShadow: '3px 3px 0 #000'
      }}>
        🔙 메인 로비로 나가기
      </button>
    </div>
  );
}
