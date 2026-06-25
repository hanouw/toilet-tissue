// Vercel Serverless Function: api/scores.js
// Interfaces directly with Vercel KV Redis REST API to manage scores, users, and ghost paths

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return res.status(500).json({
      error: 'Vercel KV Database variables (KV_REST_API_URL / KV_REST_API_TOKEN) are not configured. Please link a KV Storage in Vercel.'
    });
  }

  // Helper function to query Redis REST API
  async function redisCommand(commandArray) {
    const response = await fetch(kvUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commandArray)
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Redis REST error: ${text}`);
    }
    
    const data = await response.json();
    return data.result;
  }

  // 1. GET Request: Fetch Leaderboard and Ghost for a level
  if (req.method === 'GET') {
    try {
      const levelId = req.query.levelId;
      if (!levelId) {
        return res.status(400).json({ error: 'Missing levelId' });
      }

      // Parallel fetch leaderboard and ghost using Redis pipeline or simple multiple requests
      const leaderboardPromise = redisCommand(['GET', `leaderboard:${levelId}`]);
      const ghostPromise = redisCommand(['GET', `ghost:${levelId}`]);

      const [leaderboardStr, ghostStr] = await Promise.all([leaderboardPromise, ghostPromise]);

      const leaderboard = leaderboardStr ? JSON.parse(leaderboardStr) : [];
      const ghost = ghostStr ? JSON.parse(ghostStr) : null;

      return res.status(200).json({ leaderboard, ghost });
    } catch (e) {
      console.error("GET Scores Error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  // 2. POST Request: Submit a score and update leaderboard/ghost
  if (req.method === 'POST') {
    try {
      const { levelId, name, passcode, score, time, tissue, path } = req.body;

      if (!levelId || !name || !passcode || score === undefined || !time || tissue === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const sanitizedName = name.toString().substring(0, 10).trim();
      const sanitizedPasscode = passcode.toString().substring(0, 4).trim();

      if (!sanitizedName || !sanitizedPasscode) {
        return res.status(400).json({ error: 'Name and passcode cannot be empty' });
      }

      // A. Authenticate User (Hijacking Protection)
      // Check password in hashmap 'users'
      const registeredPasscode = await redisCommand(['HGET', 'users', sanitizedName]);

      if (registeredPasscode) {
        // User exists, verify passcode
        if (registeredPasscode !== sanitizedPasscode) {
          return res.status(403).json({
            error: `닉네임 보호 실패: "${sanitizedName}"은 보호된 닉네임입니다. 비밀번호가 일치하지 않습니다. 🚨`
          });
        }
      } else {
        // User is brand new, register passcode
        await redisCommand(['HSET', 'users', sanitizedName, sanitizedPasscode]);
        console.log(`Registered new KV user: ${sanitizedName}`);
      }

      // B. Load current leaderboard
      const leaderboardStr = await redisCommand(['GET', `leaderboard:${levelId}`]);
      let leaderboard = leaderboardStr ? JSON.parse(leaderboardStr) : [];

      // Append new score entry
      const newEntry = {
        name: sanitizedName,
        score: parseInt(score),
        time: time.toString(),
        tissue: parseInt(tissue),
        rank: getRankTitle(score)
      };

      leaderboard.push(newEntry);
      // Sort descending by score
      leaderboard.sort((a, b) => b.score - a.score);
      // Keep top 8
      leaderboard = leaderboard.slice(0, 8);

      // Save updated leaderboard
      await redisCommand(['SET', `leaderboard:${levelId}`, JSON.stringify(leaderboard)]);

      // C. Check if this is the new #1 record to update ghost path
      const isNewRecord = leaderboard[0].score === newEntry.score && leaderboard[0].name === sanitizedName;
      if (isNewRecord && Array.isArray(path) && path.length > 0) {
        await redisCommand(['SET', `ghost:${levelId}`, JSON.stringify(path)]);
        console.log(`Saved new global KV Ghost Path for Level ${levelId}!`);
      }

      return res.status(200).json({ success: true, leaderboard });

    } catch (e) {
      console.error("POST Scores Error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function getRankTitle(score) {
  if (score >= 9000) return "👑 황금 괄약근";
  if (score >= 8000) return "🧻 휴지 장인";
  if (score >= 6500) return "🚶 평범한 시민";
  if (score >= 4500) return "💦 아슬아슬 세이프";
  return "💩 턱걸이 골인";
}
