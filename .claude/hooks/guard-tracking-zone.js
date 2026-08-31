#!/usr/bin/env node
// Хук: БЛОКУВАТИ будь-який запис у зону Світлани (розділ «Слідкування»).
//
// Навіщо. Рішення власника 18.08.2026, дослівно: «щоб ми НІКОЛИ не чіпали її файли,
// навіть випадково». Права в обох однакові скрізь, тож ніщо, крім домовленості, не
// заважає залізти в чуже — а домовленість живе в тексті й відмовляє саме в поганий
// день. Тому механічний бар'єр, як `guard-destructive-git.js`.
//
// Що робить: перед Edit/Write/NotebookEdit дивиться на шлях, перед Bash — на команди
// запису (перенаправлення, sed -i, rm, mv, cp, tee, touch). Потрапляння в зону
// `tracking` → блокує з поясненням. ЧИТАННЯ не чіпає взагалі: cat/grep/git log по її
// файлах дозволені — заборонено писати, а не дивитись.
//
// ⚠️ Увімкнений ЛОКАЛЬНО, через `.claude/settings.local.json` (він у .gitignore).
// У клоні Світлани цей файл лежить НЕвимкненим НАВМИСНО: увімкнений у неї, він
// блокував би їй правку її ж власних файлів. Дзеркальний бар'єр на нашу зону вона
// може завести собі сама тим самим способом.
//
// Safe-by-default: будь-яка внутрішня помилка → exit 0, роботу не валить.

// Зона Світлани. Тримати в синхроні з розділом «Два розробники, дві зони» в CLAUDE.md.
const ZONE = [
  { re: /src[\/\\]app[\/\\]\(app\)[\/\\]tracking[\/\\]/i, what: 'розділ /tracking' },
  { re: /src[\/\\]components[\/\\]tracking[\/\\]/i, what: 'компоненти розділу «Слідкування»' },
  { re: /src[\/\\]lib[\/\\]tracking/i, what: 'логіка розділу «Слідкування»' },
  { re: /db[\/\\]migrations[\/\\]tracking_/i, what: 'міграції схеми tracking' },
]

// Дієслова запису для Bash. Читання (cat/grep/sed -n/git log) сюди НЕ входить свідомо.
const WRITE_VERBS = [
  /\bsed\s+(-[a-z]*i|--in-place)/i,
  /\b(rm|mv|cp|touch|chmod|truncate)\b/i,
  /\btee\b/i,
  />>?[^>]/,
]

function zoneHit(text) {
  for (const z of ZONE) if (z.re.test(text)) return z
  return null
}

// ⚠️ Аналізувати треба КОМАНДУ, а не весь рядок. Перше ж бойове спрацювання 18.08.2026
// було ХИБНИМ: `git commit` із heredoc, у тілі якого описані і шлях `components/
// tracking/`, і перелік дієслів запису («sed -i, rm, mv, cp, tee»), заблокував сам
// себе. Той самий клас уже описаний у `guard-destructive-git.js` — вирізаємо тіла
// heredoc і лапки ДО перевірки.
function stripText(cmd) {
  return cmd
    .replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, ' ')
    .replace(/'[^']*'|"[^"]*"/g, ' ')
}

function block(what, detail) {
  console.error(
    [
      '🛑 ЗАБЛОКОВАНО: це зона Світлани, ми туди не пишемо. НІКОЛИ.',
      `Ціль: ${detail}`,
      `Зона: ${what}`,
      '',
      'Рішення власника 18.08.2026: її файли й схема `tracking` — не наша зона,',
      'навіть якщо правка виглядає очевидною і корисною. Права однакові, тож єдине,',
      'що стоїть між нами і чужою роботою, — це правило.',
      '',
      'Що робити замість правки:',
      '  • знайшов проблему в її коді — СКАЗАТИ власнику, він передасть їй;',
      '  • треба щось від її даних — читати можна (cat/grep/select), писати не можна;',
      '  • здається, що без правки не працює НАШЕ — це теж привід сказати, а не правити.',
    ].join('\n'),
  )
  process.exit(2) // 2 = заблокувати виклик і показати stderr агенту
}

let raw = ''
process.stdin.on('data', (c) => (raw += c))
process.stdin.on('end', () => {
  let tool = ''
  let input = {}
  try {
    const j = JSON.parse(raw || '{}')
    tool = j.tool_name || ''
    input = j.tool_input || {}
  } catch {
    process.exit(0)
  }

  // Edit / Write / NotebookEdit — дивимось прямо на шлях
  const path = input.file_path || input.notebook_path || ''
  if (path) {
    const hit = zoneHit(String(path))
    if (hit) block(hit.what, String(path))
    process.exit(0)
  }

  // Bash — блокуємо лише команди ЗАПИСУ, що згадують зону
  if (tool === 'Bash') {
    const cmd = stripText(String(input.command || ''))
    const hit = zoneHit(cmd)
    if (hit && WRITE_VERBS.some((re) => re.test(cmd))) block(hit.what, cmd.slice(0, 200))
  }

  process.exit(0)
})
