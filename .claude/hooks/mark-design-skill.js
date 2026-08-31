#!/usr/bin/env node
// Хук-пара до require-design-skill.js: ставить мітку, що скіл дизайну відкрито.
//
// Навіщо окремим файлом: PreToolUse-хук на Edit не бачить, що робив агент до
// цього. Мітка у теці тимчасових файлів — найдешевший спосіб передати один біт
// («методику вже відкривали») між викликами в межах ОДНІЄЇ сесії. Нова розмова —
// новий id — нагадування приходить знову, і це навмисно: контекст губиться
// разом із сесією.
//
// Мітка ставиться лише на скіли дизайну; решта Skill-викликів проходять повз.

const fs = require('fs')
const os = require('os')
const path = require('path')

const DESIGN = /frontend-design|motion-design|motion-dev-animations|ui-ux-pro-max|ui-styling|design-system|theme-factory|design:/i

function markerPath() {
  const id = process.env.CLAUDE_SESSION_ID || process.env.CLAUDE_PROJECT_DIR || 'default'
  const safe = String(id).replace(/[^a-z0-9]+/gi, '-').slice(-60)
  return path.join(os.tmpdir(), `claude-design-skill-${safe}.flag`)
}

try {
  // Ім'я скіла приходить аргументом або в змінній оточення — приймаємо обидва.
  const raw = [process.argv[2], process.env.CLAUDE_TOOL_INPUT, process.env.CLAUDE_SKILL_NAME]
    .filter(Boolean)
    .join(' ')
  if (DESIGN.test(raw)) fs.writeFileSync(markerPath(), new Date().toISOString())
} catch {
  // мовчки
}
process.exit(0)
