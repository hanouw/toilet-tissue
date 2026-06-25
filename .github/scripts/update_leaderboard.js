const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      console.error("No GITHUB_EVENT_PATH found.");
      process.exit(1);
    }

    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const issueBody = event.issue.body;
    console.log("Analyzing issue body...");

    // Extract JSON payload from issue body
    const jsonMatch = issueBody.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      console.error("No JSON code block found in issue body.");
      process.exit(1);
    }

    const data = JSON.parse(jsonMatch[1].trim());
    const { levelId, name, passcode, score, time, tissue, path: ghostPath } = data;

    // Validate data types
    if (
      typeof levelId !== 'number' ||
      typeof name !== 'string' ||
      typeof passcode !== 'string' ||
      typeof score !== 'number' ||
      typeof time !== 'string' ||
      typeof tissue !== 'number' ||
      !Array.isArray(ghostPath)
    ) {
      console.error("Invalid data types in JSON payload.");
      process.exit(1);
    }

    // Sanitize username (limit to 10 chars, remove HTML tags)
    const sanitizedName = name.replace(/<[^>]*>/g, '').substring(0, 10) || '익명';
    const sanitizedPasscode = passcode.trim();

    if (!sanitizedPasscode) {
      console.error("Passcode cannot be empty.");
      process.exit(1);
    }

    const usersFilePath = path.join(__dirname, '../../public/users.json');
    const leaderboardFilePath = path.join(__dirname, '../../public/leaderboard.json');

    // 1. Verify User Credentials (Hijacking Prevention)
    let users = {};
    if (fs.existsSync(usersFilePath)) {
      users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    }

    if (users[sanitizedName]) {
      // User exists, verify passcode
      if (users[sanitizedName] !== sanitizedPasscode) {
        console.error(`CREDENTIALS_FAILED: The username "${sanitizedName}" is protected. The passcode provided does not match.`);
        // Write a marker file so the Github workflow can read it to leave a warning comment!
        fs.writeFileSync(path.join(__dirname, 'auth_failed.txt'), `닉네임 보호 실패: "${sanitizedName}"은 보호된 닉네임입니다. 입력하신 비밀번호가 올바르지 않습니다. 🚨`);
        process.exit(1);
      }
    } else {
      // User is brand new, register passcode
      users[sanitizedName] = sanitizedPasscode;
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
      console.log(`Registered new user: ${sanitizedName}`);
    }

    // 2. Load and Update Leaderboard
    let leaderboard = {};
    if (fs.existsSync(leaderboardFilePath)) {
      leaderboard = JSON.parse(fs.readFileSync(leaderboardFilePath, 'utf8'));
    }

    if (!leaderboard[levelId]) {
      leaderboard[levelId] = [];
    }

    const newEntry = {
      name: sanitizedName,
      score: score,
      time: time,
      tissue: tissue,
      rank: getRankTitle(score)
    };

    // Merge and sort
    const levelScores = [...leaderboard[levelId], newEntry];
    levelScores.sort((a, b) => b.score - a.score);
    
    // Keep top 8
    leaderboard[levelId] = levelScores.slice(0, 8);

    // Save leaderboard back
    fs.writeFileSync(leaderboardFilePath, JSON.stringify(leaderboard, null, 2), 'utf8');
    console.log(`Updated leaderboard for Level ${levelId} with user ${sanitizedName} (${score} pts)`);

    // Check if this new score is the #1 spot
    const isNewRecord = leaderboard[levelId][0].score === score && leaderboard[levelId][0].name === sanitizedName;
    if (isNewRecord && ghostPath.length > 0) {
      const ghostFilePath = path.join(__dirname, `../../public/ghost_level_${levelId}.json`);
      fs.writeFileSync(ghostFilePath, JSON.stringify(ghostPath), 'utf8');
      console.log(`Saved new global Ghost Path for Level ${levelId}!`);
    }

  } catch (error) {
    console.error("Error processing leaderboard update:", error);
    process.exit(1);
  }
}

function getRankTitle(score) {
  if (score >= 9000) return "👑 황금 괄약근";
  if (score >= 8000) return "🧻 휴지 장인";
  if (score >= 6500) return "🚶 평범한 시민";
  if (score >= 4500) return "💦 아슬아슬 세이프";
  return "💩 턱걸이 골인";
}

run();
