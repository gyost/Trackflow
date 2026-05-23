import { execSync } from 'child_process';
try {
  console.log("Attempting to revert src/App.tsx using git...");
  const res = execSync('git checkout -- src/App.tsx');
  console.log(res.toString());
  console.log("Successfully reverted src/App.tsx!");
} catch (err) {
  console.error("Failed to revert src/App.tsx:", err.message);
}
