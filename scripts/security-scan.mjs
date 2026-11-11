import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.isFile()) files.push(target);
  }
}
walk(root);
const problems = [];
const rules = [
  ['Telegram bot token', /\b\d{8,12}:[A-Za-z0-9_-]{25,}\b/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
];
for (const file of files) {
  const relative = path.relative(root, file);
  if (/(^|\/)\.env(?:\.|$)/.test(relative) && !relative.endsWith('.env.example')) {
    problems.push(`${relative}: forbidden secret file`);
    continue;
  }
  if (/\.(?:pem|key)$/.test(relative)) {
    problems.push(`${relative}: forbidden secret file`);
    continue;
  }
  if (!/\.(?:mjs|js|json|yaml|yml|md|html|css|sh|toml|txt)$/.test(relative)) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (relative.endsWith('.env.example')) continue;
  for (const [label, pattern] of rules) {
    if (pattern.test(content)) problems.push(`${relative}: ${label} pattern detected`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Security scan passed (${files.length} files checked; no forbidden secret files or known credential patterns).`);
