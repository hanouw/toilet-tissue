import React, { useRef, useEffect, useState } from 'react';
import { getDistance, lineIntersectsCircle, lineIntersectsRect, circleIntersectsRect, pointInRect } from '../utils/physics';
import { soundManager } from '../utils/sound';

export default function GameCanvas({
  level,
  gameState,
  setGameState,
  selectedSkin,
  onWin,
  onLose,
  isPaused,
  currentGhost,
  recordGhostRun,
  ghostPlaybackActive
}) {
  const canvasRef = useRef(null);
  
  // Game states and positions
  const [path, setPath] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [urgency, setUrgency] = useState(0); // 0 to 100
  const [characterPos, setCharacterPos] = useState({ x: 0, y: 0 });
  const [monsters, setMonsters] = useState([]);
  const [movingPuddles, setMovingPuddles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [tissueLength, setTissueLength] = useState(0);
  
  // Mother Patrol State
  const [motherPos, setMotherPos] = useState({ x: 0, y: 0 });
  const [motherAngle, setMotherAngle] = useState(0);
  
  // Internal animation/physics references
  const gameLoopRef = useRef(null);
  const currentPathIndexRef = useRef(0);
  const charPosRef = useRef({ x: 0, y: 0 });
  const pathRef = useRef([]);
  const monstersRef = useRef([]);
  const movingPuddlesRef = useRef([]);
  const levelRef = useRef(level);
  const urgencyRef = useRef(0);
  const startTimeRef = useRef(0);
  const wetSegmentsRef = useRef({}); // index -> wetness level
  const cutIndexRef = useRef(null);
  const ghostIndexRef = useRef(0);
  const ghostPosRef = useRef(null);
  
  // Mother Patrol Ref
  const motherPosRef = useRef({ x: 0, y: 0 });
  const motherAngleRef = useRef(0);
  const motherTargetIdxRef = useRef(0);

  // Initialize level positions
  useEffect(() => {
    levelRef.current = level;
    resetLevel();
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [level]);

  const resetLevel = () => {
    setPath([]);
    pathRef.current = [];
    setIsDrawing(false);
    setUrgency(0);
    urgencyRef.current = 0;
    cutIndexRef.current = null;
    
    const startPos = { ...levelRef.current.start };
    setCharacterPos(startPos);
    charPosRef.current = startPos;
    
    // Copy monsters and add initial movement state
    const levelMonsters = (levelRef.current.monsters || []).map(m => {
      const copy = { ...m };
      if (copy.pathType === 'pingpong') {
        copy.currentWaypointIdx = 0;
        copy.targetWaypoint = copy.waypoints[0];
      }
      return copy;
    });
    setMonsters(levelMonsters);
    monstersRef.current = levelMonsters;

    // Reset Moving Puddles (Level 11 & 13)
    const levelPuddles = (levelRef.current.movingPuddles || []).map(p => {
      const copy = { ...p };
      if (copy.pathType === 'pingpong') {
        copy.currentWaypointIdx = 0;
        copy.targetWaypoint = copy.waypoints[0];
      }
      return copy;
    });
    setMovingPuddles(levelPuddles);
    movingPuddlesRef.current = levelPuddles;

    // Reset Mother Patrol if level has it
    if (levelRef.current.motherPatrol) {
      const mPatrol = levelRef.current.motherPatrol;
      motherPosRef.current = { x: mPatrol.x, y: mPatrol.y };
      setMotherPos({ x: mPatrol.x, y: mPatrol.y });
      motherTargetIdxRef.current = 0;
      motherAngleRef.current = 0;
      setMotherAngle(0);
    }
    
    setParticles([]);
    setTissueLength(0);
    wetSegmentsRef.current = {};
    currentPathIndexRef.current = 0;
    ghostIndexRef.current = 0;
    ghostPosRef.current = currentGhost && currentGhost.length > 0 ? currentGhost[0] : null;
  };

  // Synchronize game state changes
  useEffect(() => {
    if (gameState === 'running') {
      startTimeRef.current = Date.now();
      currentPathIndexRef.current = 0;
      charPosRef.current = path[0] || level.start;
      soundManager.playFart();
    } else if (gameState === 'idle') {
      resetLevel();
    }
  }, [gameState]);

  // Touch and mouse drawing handlers
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const handleStart = (e) => {
    if (gameState !== 'drawing' || isPaused) return;
    soundManager.resume();
    
    const coords = getCanvasCoords(e);
    const startDist = getDistance(coords, level.start);
    
    if (startDist <= 45) {
      setIsDrawing(true);
      const startPoint = { x: level.start.x, y: level.start.y };
      setPath([startPoint]);
      pathRef.current = [startPoint];
      soundManager.playDraw();
      createParticles(coords.x, coords.y, '#ffffff', 5);
    }
  };

  const handleMove = (e) => {
    if (!isDrawing || gameState !== 'drawing' || isPaused) return;
    let coords = getCanvasCoords(e);
    
    // Wind Zone effect during drawing (Deflect path!)
    if (level.windZone && pointInRect(coords, level.windZone)) {
      const windWave = Math.sin(Date.now() * 0.015) * 6;
      coords.x += level.windZone.forceX * 3.5 + windWave;
      coords.y += level.windZone.forceY * 3.5;
    }
    
    const lastPoint = pathRef.current[pathRef.current.length - 1];
    const dist = getDistance(coords, lastPoint);
    
    if (dist > 8) {
      // Check if path crosses any wall obstacle
      let crossesObstacle = false;
      for (const obstacle of level.obstacles) {
        if (lineIntersectsRect(lastPoint, coords, obstacle)) {
          crossesObstacle = true;
          break;
        }
      }
      
      if (crossesObstacle) {
        setIsDrawing(false);
        setPath([]);
        pathRef.current = [];
        soundManager.playSquish();
        createParticles(coords.x, coords.y, '#ff3d00', 12);
        return;
      }
      
      const newPath = [...pathRef.current, coords];
      setPath(newPath);
      pathRef.current = newPath;
      
      let len = 0;
      for (let i = 1; i < newPath.length; i++) {
        len += getDistance(newPath[i-1], newPath[i]);
      }
      setTissueLength(Math.round(len));
      
      if (Math.random() < 0.15) {
        soundManager.playDraw();
      }

      const toiletDist = getDistance(coords, level.toilet);
      if (toiletDist <= 40) {
        setIsDrawing(false);
        const snappedPath = [...newPath, { x: level.toilet.x, y: level.toilet.y }];
        setPath(snappedPath);
        pathRef.current = snappedPath;
        soundManager.playSelect();
        setGameState('running');
      }
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const lastPoint = pathRef.current[pathRef.current.length - 1];
    if (lastPoint) {
      const toiletDist = getDistance(lastPoint, level.toilet);
      if (toiletDist > 40) {
        setPath([]);
        pathRef.current = [];
        setTissueLength(0);
        soundManager.playSquish();
      }
    }
  };

  const createParticles = (x, y, color, count = 8, speedScale = 1) => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3 + 1) * speedScale;
      list.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 4 + 2,
        color,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.02
      });
    }
    setParticles(prev => [...prev, ...list]);
  };

  // Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let lastTime = performance.now();
    
    const updatePhysics = (dt) => {
      if (isPaused) return;

      // 1. Move Monsters
      const updatedMonsters = monstersRef.current.map(monster => {
        let { x, y, speed, pathType } = monster;
        
        if (pathType === 'pingpong') {
          let target = monster.targetWaypoint;
          let dist = getDistance({ x, y }, target);
          
          if (dist < 5) {
            const nextIdx = (monster.currentWaypointIdx + 1) % monster.waypoints.length;
            monster.currentWaypointIdx = nextIdx;
            monster.targetWaypoint = monster.waypoints[nextIdx];
            target = monster.waypoints[nextIdx];
          }
          
          const dx = target.x - x;
          const dy = target.y - y;
          const len = Math.sqrt(dx * dx + dy * dy);
          x += (dx / len) * speed * (dt / 16);
          y += (dy / len) * speed * (dt / 16);
        } else if (pathType === 'circle') {
          monster.angle = (monster.angle || 0) + (speed * 0.005) * (dt / 16);
          x = monster.cx + Math.cos(monster.angle) * monster.radius;
          y = monster.cy + Math.sin(monster.angle) * monster.radius;
        } else if (pathType === 'chase' && gameState === 'running') {
          const charPos = charPosRef.current;
          const dx = charPos.x - x;
          const dy = charPos.y - y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            x += (dx / len) * speed * (dt / 16);
            y += (dy / len) * speed * (dt / 16);
          }
        }
        
        return { ...monster, x, y };
      });
      monstersRef.current = updatedMonsters;
      setMonsters(updatedMonsters);

      // 2. Move Moving Puddles (Level 11 & 13)
      const updatedPuddles = movingPuddlesRef.current.map(puddle => {
        let { x, y, speed, pathType } = puddle;
        
        if (pathType === 'pingpong') {
          let target = puddle.targetWaypoint;
          let dist = getDistance({ x, y }, target);
          
          if (dist < 5) {
            const nextIdx = (puddle.currentWaypointIdx + 1) % puddle.waypoints.length;
            puddle.currentWaypointIdx = nextIdx;
            puddle.targetWaypoint = puddle.waypoints[nextIdx];
            target = puddle.waypoints[nextIdx];
          }
          
          const dx = target.x - x;
          const dy = target.y - y;
          const len = Math.sqrt(dx * dx + dy * dy);
          x += (dx / len) * speed * (dt / 16);
          y += (dy / len) * speed * (dt / 16);
        }
        
        return { ...puddle, x, y };
      });
      movingPuddlesRef.current = updatedPuddles;
      setMovingPuddles(updatedPuddles);

      // 3. Move Mother Patrol NPC (Level 8 & 13)
      if (levelRef.current.motherPatrol) {
        const mPatrol = levelRef.current.motherPatrol;
        let { x, y } = motherPosRef.current;
        let target = mPatrol.waypoints[motherTargetIdxRef.current];
        let dist = getDistance({ x, y }, target);

        if (dist < 5) {
          const nextIdx = (motherTargetIdxRef.current + 1) % mPatrol.waypoints.length;
          motherTargetIdxRef.current = nextIdx;
          target = mPatrol.waypoints[nextIdx];
        }

        const dx = target.x - x;
        const dy = target.y - y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len > 0) {
          const vx = (dx / len) * mPatrol.speed * (dt / 16);
          const vy = (dy / len) * mPatrol.speed * (dt / 16);
          x += vx;
          y += vy;
          motherAngleRef.current = Math.atan2(vy, vx);
        }

        motherPosRef.current = { x, y };
        setMotherPos({ x, y });
        setMotherAngle(motherAngleRef.current);
      }

      // Wind blowing ambient particles
      if (levelRef.current.windZone && Math.random() < 0.25) {
        const wz = levelRef.current.windZone;
        setParticles(prev => [
          ...prev,
          {
            x: wz.x + Math.random() * 20,
            y: wz.y + Math.random() * wz.height,
            vx: wz.forceX * 3 + Math.random() * 2,
            vy: wz.forceY * 3,
            r: Math.random() * 2 + 1,
            color: 'rgba(0, 229, 255, 0.25)',
            life: 1.0,
            decay: 0.03
          }
        ]);
      }

      // Particles update
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - p.decay
          }))
          .filter(p => p.life > 0)
      );

      // If playing, execute character run physics
      if (gameState === 'running') {
        const fullPath = pathRef.current;
        if (fullPath.length === 0) return;

        // Progress Urgency Meter
        urgencyRef.current = Math.min(100, urgencyRef.current + 0.12 * (dt / 16));
        setUrgency(Math.round(urgencyRef.current));
        
        if (urgencyRef.current >= 100) {
          setGameState('failed');
          onLose("대형 참사가 일어났습니다! 바지에 지려버렸군요... 💩💦");
          soundManager.playLose();
          soundManager.playFart();
          createParticles(charPosRef.current.x, charPosRef.current.y, '#8d6e63', 35, 1.8);
          return;
        }

        if (Math.random() < 0.04 * (urgencyRef.current / 100)) {
          createParticles(
            charPosRef.current.x - 10,
            charPosRef.current.y + 10,
            'rgba(141, 110, 99, 0.4)',
            3,
            0.5
          );
        }

        // Character speed (deflected when inside wind zone)
        let charSpeed = selectedSkin.speed || 3.5;
        let windOffsetX = 0;
        let windOffsetY = 0;

        if (levelRef.current.windZone && pointInRect(charPosRef.current, levelRef.current.windZone)) {
          windOffsetX = levelRef.current.windZone.forceX * 0.8;
          windOffsetY = levelRef.current.windZone.forceY * 0.8;
        }

        let distMoved = charSpeed * (dt / 16);
        let currIdx = currentPathIndexRef.current;
        let currentPos = { ...charPosRef.current };
        
        while (distMoved > 0 && currIdx < fullPath.length - 1) {
          const nextPt = fullPath[currIdx + 1];
          const distToNext = getDistance(currentPos, nextPt);
          
          if (distMoved >= distToNext) {
            distMoved -= distToNext;
            currentPos = { ...nextPt };
            currIdx++;
          } else {
            const dx = nextPt.x - currentPos.x;
            const dy = nextPt.y - currentPos.y;
            currentPos.x += (dx / distToNext) * distMoved + windOffsetX;
            currentPos.y += (dy / distToNext) * distMoved + windOffsetY;
            distMoved = 0;
          }
        }
        
        currentPathIndexRef.current = currIdx;
        charPosRef.current = currentPos;
        setCharacterPos({ ...currentPos });

        // Win check
        if (currIdx >= fullPath.length - 1) {
          setGameState('win');
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const score = Math.max(100, Math.round(10000 - (elapsed * 350) - (tissueLength * 2.5)));
          soundManager.playWin();
          soundManager.playFlush();
          
          recordGhostRun(fullPath);
          onWin({
            time: elapsed.toFixed(2),
            tissueUsed: tissueLength,
            urgency: Math.round(urgencyRef.current),
            score,
            path: fullPath
          });
          return;
        }

        // Ghost Playback Update
        if (ghostPlaybackActive && currentGhost && currentGhost.length > 0) {
          let gIdx = ghostIndexRef.current;
          let gSpeed = 3.5;
          let gDist = gSpeed * (dt / 16);
          let gPos = ghostPosRef.current ? { ...ghostPosRef.current } : { ...currentGhost[0] };

          while (gDist > 0 && gIdx < currentGhost.length - 1) {
            const nextGPt = currentGhost[gIdx + 1];
            const distToNext = getDistance(gPos, nextGPt);

            if (gDist >= distToNext) {
              gDist -= distToNext;
              gPos = { ...nextGPt };
              gIdx++;
            } else {
              const dx = nextGPt.x - gPos.x;
              const dy = nextGPt.y - gPos.y;
              gPos.x += (dx / distToNext) * gDist;
              gPos.y += (dy / distToNext) * gDist;
              gDist = 0;
            }
          }
          ghostIndexRef.current = gIdx;
          ghostPosRef.current = gPos;
        }

        // COLLISION CHECKS DURING RUN
        
        // A. Static Water puddles & B. Moving water puddles dissolving toilet paper
        const allPuddles = [...levelRef.current.puddles, ...updatedPuddles];
        for (let i = currIdx; i < fullPath.length - 1; i++) {
          const pA = fullPath[i];
          const pB = fullPath[i + 1];
          
          let segmentWet = false;
          for (const puddle of allPuddles) {
            if (lineIntersectsCircle(pA, pB, puddle, puddle.r)) {
              segmentWet = true;
              break;
            }
          }
          
          if (segmentWet) {
            const wetIdx = i;
            const currentWet = wetSegmentsRef.current[wetIdx] || 0;
            const newWet = Math.min(1.0, currentWet + 0.04 * (dt / 16));
            wetSegmentsRef.current[wetIdx] = newWet;
            
            if (newWet > 0.4 && Math.random() < 0.1) {
              createParticles((pA.x + pB.x)/2, (pA.y + pB.y)/2, '#00b0ff', 2, 0.4);
            }
            
            if (newWet >= 1.0) {
              cutIndexRef.current = wetIdx;
              setGameState('failed');
              onLose("물웅덩이에 젖은 휴지가 사르르 녹아 끊어져 버렸습니다! 💦🧻");
              soundManager.playLose();
              soundManager.playSquish();
              createParticles((pA.x + pB.x)/2, (pA.y + pB.y)/2, '#b0bec5', 20, 1.2);
              return;
            }
          }
        }

        // C. Fire Sprinklers Cross Water Sprays (Level 9)
        if (levelRef.current.sprinklers) {
          for (const sprinkler of levelRef.current.sprinklers) {
            const isActive = Math.sin(Date.now() * sprinkler.pulseSpeed) > 0.0;
            if (isActive) {
              // Spray horizontal segment: (x - length, y) to (x + length, y)
              // Spray vertical segment: (x, y - length) to (x, y + length)
              const hSegA = { x: sprinkler.x - sprinkler.length, y: sprinkler.y };
              const hSegB = { x: sprinkler.x + sprinkler.length, y: sprinkler.y };
              const vSegA = { x: sprinkler.x, y: sprinkler.y - sprinkler.length };
              const vSegB = { x: sprinkler.x, y: sprinkler.y + sprinkler.length };
              
              // Spray thickness circle check (we approximate spray line as a series of small circles, or check distance to spray lines)
              for (let i = currIdx; i < fullPath.length - 1; i++) {
                const pA = fullPath[i];
                const pB = fullPath[i + 1];
                
                // Segment-circle collision on several points along the cross
                let sprayHit = false;
                for (let offset = -sprinkler.length; offset <= sprinkler.length; offset += 30) {
                  const ptH = { x: sprinkler.x + offset, y: sprinkler.y };
                  const ptV = { x: sprinkler.x, y: sprinkler.y + offset };
                  if (lineIntersectsCircle(pA, pB, ptH, 12) || lineIntersectsCircle(pA, pB, ptV, 12)) {
                    sprayHit = true;
                    break;
                  }
                }
                
                if (sprayHit) {
                  cutIndexRef.current = i;
                  setGameState('failed');
                  onLose("세차게 내리쬐는 스프링클러 물줄기에 휴지가 다 젖어 찢어졌습니다! 🚿💦");
                  soundManager.playLose();
                  soundManager.playSquish();
                  createParticles((pA.x + pB.x)/2, (pA.y + pB.y)/2, '#00b0ff', 20, 1.2);
                  return;
                }
              }

              // Check Character Spray collision
              const dH = Math.abs(currentPos.y - sprinkler.y);
              const dV = Math.abs(currentPos.x - sprinkler.x);
              const inHSpray = dH <= 20 && Math.abs(currentPos.x - sprinkler.x) <= sprinkler.length;
              const inVSpray = dV <= 20 && Math.abs(currentPos.y - sprinkler.y) <= sprinkler.length;
              
              if (inHSpray || inVSpray) {
                setGameState('failed');
                onLose("소방 스프링클러 물벼락을 정면으로 맞아 온몸이 젖어 주저앉았습니다! 🚿💧😭");
                soundManager.playLose();
                soundManager.playSquish();
                createParticles(currentPos.x, currentPos.y, '#00e5ff', 30, 1.5);
                return;
              }
            }
          }
        }

        // D. Fart Bombs Poop Mines (Level 10 & 13)
        if (levelRef.current.bombs) {
          for (const bomb of levelRef.current.bombs) {
            // Check character proximity
            if (getDistance(bomb, currentPos) <= bomb.r + 15) {
              setGameState('failed');
              onLose("유황 똥 지뢰를 밟아 대장 폭발 사고가 일어났습니다! 💩💣💥🔥");
              soundManager.playLose();
              soundManager.playFart();
              createParticles(currentPos.x, currentPos.y, '#8d6e63', 35, 2.0);
              return;
            }
            // Check active toilet paper overlap
            for (let i = currIdx; i < fullPath.length - 1; i++) {
              if (lineIntersectsCircle(fullPath[i], fullPath[i+1], bomb, bomb.r)) {
                cutIndexRef.current = i;
                setGameState('failed');
                onLose("휴지 선이 똥지뢰를 건드려 퓨전 폭발이 일어났습니다! 💩💣🔥");
                soundManager.playLose();
                soundManager.playFart();
                createParticles(bomb.x, bomb.y, '#795548', 25, 1.8);
                return;
              }
            }
          }
        }

        // E. Electric Sparks
        const isSparkActive = Math.sin(Date.now() * 0.007) > -0.2;
        if (levelRef.current.sparks && isSparkActive) {
          for (const spark of levelRef.current.sparks) {
            for (let i = currIdx; i < fullPath.length - 1; i++) {
              if (lineIntersectsCircle(fullPath[i], fullPath[i+1], spark, spark.r)) {
                cutIndexRef.current = i;
                setGameState('failed');
                onLose("피복이 벗겨진 전선 스파크에 소중한 휴지가 활활 타버렸습니다! 🔌⚡🔥");
                soundManager.playLose();
                soundManager.playFart();
                createParticles(spark.x, spark.y, '#ffd700', 30, 2.0);
                return;
              }
            }
            if (getDistance(spark, currentPos) <= spark.r + 15) {
              setGameState('failed');
              onLose("바닥의 고전압 스파크에 감전되어 기절하셨습니다! ⚡⚡💥");
              soundManager.playLose();
              soundManager.playFart();
              createParticles(currentPos.x, currentPos.y, '#ffeb3b', 25, 1.8);
              return;
            }
          }
        }

        // F. Mother Patrol
        if (levelRef.current.motherPatrol) {
          const mPatrol = levelRef.current.motherPatrol;
          const mPos = motherPosRef.current;
          const distToMother = getDistance(mPos, currentPos);
          
          if (distToMother <= mPatrol.sightRadius) {
            const angleToPlayer = Math.atan2(currentPos.y - mPos.y, currentPos.x - mPos.x);
            let angleDiff = angleToPlayer - motherAngleRef.current;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) <= 0.7) {
              setGameState('failed');
              onLose("방 청소하러 오신 어머니의 시야(손전등 불빛)에 들켜 등짝 스매싱을 맞았습니다! 👵🚨💥");
              soundManager.playLose();
              soundManager.playSquish();
              createParticles(currentPos.x, currentPos.y, '#e53935', 30, 1.5);
              return;
            }
          }
        }

        // G. Monsters cutting line
        for (const monster of updatedMonsters) {
          for (let i = currIdx; i < fullPath.length - 1; i++) {
            const pA = fullPath[i];
            const pB = fullPath[i + 1];
            
            if (lineIntersectsCircle(pA, pB, monster, monster.r)) {
              cutIndexRef.current = i;
              setGameState('failed');
              onLose(`${monster.name}이(가) 소중한 휴지 끈을 싹둑 끊어버렸습니다! 🐱✂️`);
              soundManager.playLose();
              soundManager.playSquish();
              
              const cutX = (pA.x + pB.x) / 2;
              const cutY = (pA.y + pB.y) / 2;
              createParticles(cutX, cutY, '#ff9100', 25, 1.5);
              return;
            }
          }
          
          const distToChar = getDistance(monster, currentPos);
          if (distToChar <= monster.r + 20) {
            setGameState('failed');
            onLose(`${monster.name}에게 습격당해 기절해 버렸습니다! 😱`);
            soundManager.playLose();
            soundManager.playSquish();
            createParticles(currentPos.x, currentPos.y, '#e53935', 25, 1.5);
            return;
          }
        }
      }
    };

    // Draw everything onto Canvas
    const draw = () => {
      ctx.fillStyle = '#1e1e24';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = '#2d2d38';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Wind Zone
      if (levelRef.current.windZone) {
        const wz = levelRef.current.windZone;
        ctx.fillStyle = 'rgba(0, 229, 255, 0.04)';
        ctx.fillRect(wz.x, wz.y, wz.width, wz.height);
        
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.strokeRect(wz.x, wz.y, wz.width, wz.height);
        ctx.setLineDash([]);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#00e5ff';
        ctx.textAlign = 'center';
        ctx.fillText(wz.label, wz.x + wz.width / 2, wz.y + 20);

        ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
        ctx.lineWidth = 2;
        const arrowSpacing = 80;
        const arrowOffset = (Date.now() * 0.1) % arrowSpacing;
        
        for (let wy = wz.y + 50; wy < wz.y + wz.height; wy += 60) {
          for (let wx = wz.x + arrowOffset; wx < wz.x + wz.width; wx += arrowSpacing) {
            ctx.beginPath();
            ctx.moveTo(wx - 10, wy);
            ctx.lineTo(wx, wy);
            ctx.lineTo(wx - 4, wy - 4);
            ctx.moveTo(wx, wy);
            ctx.lineTo(wx - 4, wy + 4);
            ctx.stroke();
          }
        }
      }

      // Draw Water Puddles (Static & Moving)
      const allPuddles = [...levelRef.current.puddles, ...movingPuddles];
      allPuddles.forEach(puddle => {
        const grad = ctx.createRadialGradient(puddle.x, puddle.y, 0, puddle.x, puddle.y, puddle.r);
        grad.addColorStop(0, 'rgba(0, 176, 255, 0.45)');
        grad.addColorStop(0.7, 'rgba(0, 176, 255, 0.25)');
        grad.addColorStop(1, 'rgba(0, 176, 255, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(puddle.x, puddle.y, puddle.r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0, 176, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const timeFactor = (Date.now() * 0.002) % 1;
        ctx.strokeStyle = `rgba(0, 176, 255, ${0.4 * (1 - timeFactor)})`;
        ctx.beginPath();
        ctx.arc(puddle.x, puddle.y, puddle.r * timeFactor, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw Electric Sparks
      if (levelRef.current.sparks) {
        const isSparkActive = Math.sin(Date.now() * 0.007) > -0.2;
        levelRef.current.sparks.forEach(spark => {
          if (isSparkActive) {
            const grad = ctx.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, spark.r + 10);
            grad.addColorStop(0, 'rgba(255, 235, 59, 0.45)');
            grad.addColorStop(0.6, 'rgba(255, 145, 0, 0.2)');
            grad.addColorStop(1, 'rgba(255, 145, 0, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.r + 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(spark.x, spark.y);
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
              const rDist = spark.r * (0.6 + Math.random() * 0.4);
              const tx = spark.x + Math.cos(angle) * rDist;
              const ty = spark.y + Math.sin(angle) * rDist;
              ctx.lineTo(tx, ty);
            }
            ctx.closePath();
            ctx.stroke();
            
            ctx.font = '16px Arial';
            ctx.fillText('⚡', spark.x, spark.y);
          } else {
            ctx.strokeStyle = 'rgba(120, 120, 120, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillText('🔌', spark.x, spark.y);
          }
        });
      }

      // Draw Fire Sprinklers Cross Water Sprays (Level 9)
      if (levelRef.current.sprinklers) {
        levelRef.current.sprinklers.forEach(sprinkler => {
          const isActive = Math.sin(Date.now() * sprinkler.pulseSpeed) > 0.0;
          
          if (isActive) {
            // Draw glowing water cross spray
            const gradH = ctx.createLinearGradient(sprinkler.x - sprinkler.length, sprinkler.y, sprinkler.x + sprinkler.length, sprinkler.y);
            gradH.addColorStop(0, 'rgba(0, 229, 255, 0)');
            gradH.addColorStop(0.5, 'rgba(0, 229, 255, 0.35)');
            gradH.addColorStop(1, 'rgba(0, 229, 255, 0)');

            const gradV = ctx.createLinearGradient(sprinkler.x, sprinkler.y - sprinkler.length, sprinkler.x, sprinkler.y + sprinkler.length);
            gradV.addColorStop(0, 'rgba(0, 229, 255, 0)');
            gradV.addColorStop(0.5, 'rgba(0, 229, 255, 0.35)');
            gradV.addColorStop(1, 'rgba(0, 229, 255, 0)');

            // Horizontal spray rectangle
            ctx.fillStyle = gradH;
            ctx.fillRect(sprinkler.x - sprinkler.length, sprinkler.y - 12, sprinkler.length * 2, 24);

            // Vertical spray rectangle
            ctx.fillStyle = gradV;
            ctx.fillRect(sprinkler.x - 12, sprinkler.y - sprinkler.length, 24, sprinkler.length * 2);

            // Draw spray water droplets details
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([2, 12]);
            ctx.beginPath();
            ctx.moveTo(sprinkler.x - sprinkler.length, sprinkler.y);
            ctx.lineTo(sprinkler.x + sprinkler.length, sprinkler.y);
            ctx.moveTo(sprinkler.x, sprinkler.y - sprinkler.length);
            ctx.lineTo(sprinkler.x, sprinkler.y + sprinkler.length);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Sprinkler Head box
          ctx.font = '24px Arial';
          ctx.fillText('🚿', sprinkler.x, sprinkler.y);
        });
      }

      // Draw Fart Bombs Poop Mines (Level 10 & 13)
      if (levelRef.current.bombs) {
        levelRef.current.bombs.forEach(bomb => {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ff3d00';
          ctx.font = '32px Arial';
          ctx.fillText('💩', bomb.x, bomb.y);
          ctx.shadowBlur = 0;

          // Flashing red light indicator
          const lightFlash = Math.floor(Date.now() / 200) % 2 === 0;
          ctx.fillStyle = lightFlash ? '#ff3d00' : '#4e342e';
          ctx.beginPath();
          ctx.arc(bomb.x + 8, bomb.y - 10, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw Toilet
      const toiletPos = levelRef.current.toilet;
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚽', toiletPos.x, toiletPos.y);
      
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00e676';
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(toiletPos.x, toiletPos.y, 45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Ghost Highscore Path
      if (ghostPlaybackActive && currentGhost && currentGhost.length > 0) {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
        ctx.lineWidth = 6;
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.moveTo(currentGhost[0].x, currentGhost[0].y);
        for (let i = 1; i < currentGhost.length; i++) {
          ctx.lineTo(currentGhost[i].x, currentGhost[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (gameState === 'running' && ghostPosRef.current) {
          ctx.font = '28px Arial';
          ctx.globalAlpha = 0.4;
          ctx.fillText('👥', ghostPosRef.current.x, ghostPosRef.current.y);
          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#00e5ff';
          ctx.fillText('Ghost Rank 1', ghostPosRef.current.x, ghostPosRef.current.y - 25);
          ctx.globalAlpha = 1.0;
        }
      }

      // Draw Path (Toilet Paper Roll Line 🧻)
      if (pathRef.current.length > 0) {
        const fullPath = pathRef.current;
        for (let i = 0; i < fullPath.length - 1; i++) {
          const ptA = fullPath[i];
          const ptB = fullPath[i + 1];
          
          ctx.beginPath();
          ctx.moveTo(ptA.x, ptA.y);
          ctx.lineTo(ptB.x, ptB.y);

          const wetness = wetSegmentsRef.current[i] || 0;
          if (wetness > 0) {
            ctx.strokeStyle = `rgb(${255 - wetness * 180}, ${255 - wetness * 80}, 255)`;
          } else {
            ctx.strokeStyle = selectedSkin.paperColor || '#f5f5f5';
          }
          ctx.lineWidth = selectedSkin.lineWidth || 10;
          ctx.stroke();
          
          ctx.strokeStyle = 'rgba(0,0,0,0.06)';
          ctx.lineWidth = (selectedSkin.lineWidth || 10) / 2;
          ctx.stroke();
        }

        if (cutIndexRef.current !== null && cutIndexRef.current < fullPath.length - 1) {
          const cutPt = fullPath[cutIndexRef.current];
          ctx.font = '24px Arial';
          ctx.fillText('✂️', cutPt.x, cutPt.y);
        }
      }

      // Draw Obstacles
      levelRef.current.obstacles.forEach(obs => {
        ctx.fillStyle = obs.color || '#37474f';
        ctx.beginPath();
        const r = 8;
        const { x, y, width: w, height: h } = obs;
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(obs.label || '', x + w / 2, y + h / 2);
      });

      // Draw Mother Patrol NPC (Level 8 & 13)
      if (levelRef.current.motherPatrol) {
        const mPatrol = levelRef.current.motherPatrol;
        const mPos = motherPosRef.current;
        const mAngle = motherAngleRef.current;

        ctx.fillStyle = 'rgba(255, 235, 59, 0.15)';
        ctx.beginPath();
        ctx.moveTo(mPos.x, mPos.y);
        
        const startConeAngle = mAngle - 0.7;
        const endConeAngle = mAngle + 0.7;
        ctx.arc(mPos.x, mPos.y, mPatrol.sightRadius, startConeAngle, endConeAngle);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 235, 59, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mPos.x, mPos.y, mPatrol.sightRadius, startConeAngle, endConeAngle);
        ctx.stroke();

        ctx.font = '34px Arial';
        ctx.fillText('👵', mPos.x, mPos.y);
        
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#ffeb3b';
        ctx.fillText('순찰중', mPos.x, mPos.y - 25);
      }

      // Draw Monsters
      monstersRef.current.forEach(monster => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = monster.pathType === 'chase' ? '#8d6e63' : '#e53935';
        
        ctx.font = `${monster.r * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let emoji = '👾';
        if (monster.name.includes('고양이')) emoji = '🐱';
        else if (monster.name.includes('청소기')) emoji = '🤖';
        else if (monster.name.includes('똥')) emoji = '💩';
        else if (monster.name.includes('불독')) emoji = '🐶';
        
        ctx.fillText(emoji, monster.x, monster.y);
        ctx.shadowBlur = 0;

        if (monster.pathType === 'chase') {
          ctx.strokeStyle = 'rgba(255,0,0,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(monster.x, monster.y, monster.r + 5 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI*2);
          ctx.stroke();
        }
      });

      // Draw Character
      const charPos = charPosRef.current;
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(255,255,255,0.3)';
      
      ctx.font = '36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let charEmoji = selectedSkin.emoji || '😣';
      if (gameState === 'win') {
        charEmoji = '😎';
      } else if (gameState === 'failed') {
        charEmoji = urgencyRef.current >= 100 ? '💩' : '😭';
      } else if (gameState === 'running') {
        if (urgencyRef.current > 75) {
          charEmoji = '😱';
        } else if (urgencyRef.current > 40) {
          charEmoji = '😫';
        } else {
          charEmoji = selectedSkin.emoji || '😣';
        }
      }
      ctx.fillText(charEmoji, charPos.x, charPos.y);
      ctx.shadowBlur = 0;

      // Draw Character Label
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#ffffff';
      if (gameState === 'drawing' && isDrawing) {
        ctx.fillText('풀리는 중...🧻', charPos.x, charPos.y - 28);
      } else if (gameState === 'running') {
        ctx.fillStyle = urgencyRef.current > 75 ? '#ff3d00' : '#ffeb3b';
        ctx.fillText(`급함: ${Math.round(urgencyRef.current)}%`, charPos.x, charPos.y - 28);
      }

      // Draw Particles
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      if (gameState === 'drawing' && !isDrawing) {
        ctx.strokeStyle = 'rgba(255, 235, 59, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(levelRef.current.start.x, levelRef.current.start.y, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#ffeb3b';
        ctx.fillText('여기서 출발!', levelRef.current.start.x, levelRef.current.start.y - 30);
      }
    };

    const loop = (time) => {
      const dt = time - lastTime;
      lastTime = time;
      
      updatePhysics(dt);
      draw();
      
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [gameState, isPaused, path, selectedSkin, currentGhost, ghostPlaybackActive, motherPos, motherAngle, movingPuddles]);

  return (
    <div className="canvas-container" style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '4px solid #3f3f46',
          backgroundColor: '#18181b',
          cursor: gameState === 'drawing' ? 'crosshair' : 'default',
          touchAction: 'none'
        }}
      />
      
      <div className="canvas-hud" style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        fontFamily: '"Outfit", sans-serif'
      }}>
        <div className="hud-metric" style={{
          background: 'rgba(24, 24, 27, 0.85)',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#ffffff',
          backdropFilter: 'blur(4px)'
        }}>
          🧻 사용한 휴지 길이: <span style={{ color: '#00e5ff', fontWeight: 'bold' }}>{tissueLength}m</span>
        </div>

        {gameState === 'running' && (
          <div className="hud-metric" style={{
            background: 'rgba(24, 24, 27, 0.85)',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ffffff',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>💩 괄약근 긴장도:</span>
            <div style={{
              width: '100px',
              height: '12px',
              backgroundColor: '#3f3f46',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${urgency}%`,
                height: '100%',
                backgroundColor: urgency > 75 ? '#ff3d00' : urgency > 40 ? '#ffeb3b' : '#00e676',
                transition: 'width 0.1s linear'
              }} />
            </div>
            <span style={{ color: urgency > 75 ? '#ff3d00' : '#ffffff', fontWeight: 'bold' }}>{urgency}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
