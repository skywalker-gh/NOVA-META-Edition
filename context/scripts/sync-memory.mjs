import fs from 'node:fs/promises';
import path from 'node:path';

async function syncMemory() {
  console.log('Scanning repository for model handoffs and syncing extended memory...');
  const root = process.cwd();
  const files = await fs.readdir(root);
  const handoffs = files.filter(f => f.startsWith('MODEL_HANDOFF_') && f.endsWith('.md'));

  let handoffSection = '\n## 5. Aggregated Model Handoffs\n';
  if (handoffs.length === 0) {
    handoffSection += 'No active handoff artifacts currently found in root.\n';
  } else {
    for (const h of handoffs) {
      const content = await fs.readFile(path.join(root, h), 'utf8');
      handoffSection += `\n### Handoff: ${h}\n\`\`\`markdown\n${content.slice(0, 1500)}\n\`\`\`\n`;
    }
  }

  const contextPath = path.join(root, 'PROJECT_CONTEXT.md');
  let currentContext = '';
  try {
    currentContext = await fs.readFile(contextPath, 'utf8');
  } catch {
    currentContext = '# Nova-Ygdrassil Project Context\n';
  }

  // Remove existing handoff section if present
  const idx = currentContext.indexOf('\n## 5. Aggregated Model Handoffs');
  if (idx !== -1) {
    currentContext = currentContext.slice(0, idx);
  }

  const updated = currentContext.trim() + '\n' + handoffSection + `\n*Last Auto-Sync:* ${new Date().toISOString()}\n`;
  await fs.writeFile(contextPath, updated, 'utf8');
  console.log('PROJECT_CONTEXT.md successfully synchronized with extended memory!');
}

syncMemory().catch(err => {
  console.error('Memory sync failed:', err);
  process.exit(1);
});
