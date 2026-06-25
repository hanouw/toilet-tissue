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
    const { levelId, name, score, time, tissue, path: ghostPath } = data;

    // Validate data types
    if (
      typeof levelId !== 'number' ||
      typeof name !== 'string' ||
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

    const leaderboardFilePath = path.join(__dirname, '../../public/leaderboard.json');
    
    // Load existing leaderboard
    let leaderboard = {};
    if (fs.existsSync(leaderboardFilePath)) {
      leaderboard = JSON.parse(fs.readFileSync(leaderboardFilePath, 'utf8'));
    }

    if (!leaderboard[levelId]) {
      leaderboard[levelId] = [];
    }

    // Append new entry
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
