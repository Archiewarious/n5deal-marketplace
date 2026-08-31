#!/usr/bin/env node
// Хук: БЛОКУВАТИ git-команди, які стирають незакомічену роботу.
//
// Навіщо. Це не гіпотеза, а інцидент 13.08.2026: `git checkout -- src/lib/planFact.ts`
// був виконаний, щоб скасувати ОДНУ пробну зміну, і стер ВІСІМ незакомічених правок у
// тому ж файлі. Відновлювали руками. Правило «ніколи так не роби» записане в CLAUDE.md,
// але правило — це памʼять, а памʼять відмовляє саме в поганий день.
//
// Що робить: перед Bash перевіряє команду. Якщо вона може стерти незакомічене
// (checkout -- / restore без --staged / reset --hard / clean -f / stash без list) —
// блокує з поясненням і безпечною альтернативою. Якщо в дереві НЕМАЄ незакоміченого,
// пропускає: тоді команда нічого не руйнує.

const { execSync } = require('child_process')

// Кожен патерн — із коротким поясненням, ЧОМУ саме він небезпечний
const DANGER = [
  { re: /\bgit\s+checkout\s+(--\s|.*\s--\s)/, what: 'git checkout -- <файл> викидає ВСІ незакомічені зміни файла, а не лише останню' },
  { re: /\bgit\s+restore\b(?!.*--staged)/, what: 'git restore без --staged перезаписує робочу копію з індексу/HEAD' },
  { re: /\bgit\s+reset\s+--hard\b/, what: 'git reset --hard стирає незакомічене в усьому дереві' },
  { re: /\bgit\s+clean\s+-[a-z]*f/, what: 'git clean -f видаляє невідстежувані файли назавжди' },
  { re: /\bgit\s+stash\b(?!\s+(list|show))/, what: 'git stash ховає незакомічене — після нього легко забути про stash і працювати «на чистому»' },
]

// ⚠️ Аналізувати треба КОМАНДИ, а не весь рядок. Перше ж бойове спрацювання 13.08.2026
// було ХИБНИМ: `git commit` із heredoc, у тілі якого описано, що хук блокує «git
// checkout --», заблокував сам себе. Тому: спершу вирізаємо тіла heredoc і лапки, потім
// ділимо на підкоманди і дивимось лише на ті, що ПОЧИНАЮТЬСЯ з git.
function gitSubcommands(cmd) {
  const noHeredoc = cmd.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, ' ')
  const noStrings = noHeredoc.replace(/'[^']*'|"[^"]*"/g, ' ')
  return noStrings
    .split(/&&|\|\||;|\n|\|/)
    .map((s) => s.trim())
    .filter((s) => /^git\b/.test(s))
}

function dirtyFiles() {
  try {
    const out = execSync('git status --porcelain', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return out.split(/\r?\n/).filter(Boolean)
  } catch {
    return [] // не git-тека → блокувати нема сенсу
  }
}

let raw = ''
process.stdin.on('data', (c) => (raw += c))
process.stdin.on('end', () => {
  let cmd = ''
  try {
    cmd = ((JSON.parse(raw || '{}').tool_input) || {}).command || ''
  } catch {
    process.exit(0)
  }
  const subs = gitSubcommands(cmd)
  let hit = null
  let hitCmd = ''
  for (const s of subs) {
    const d = DANGER.find((x) => x.re.test(s))
    if (d) {
      hit = d
      hitCmd = s
      break
    }
  }
  if (!hit) process.exit(0)

  const dirty = dirtyFiles()
  if (!dirty.length) process.exit(0) // нічого втрачати — пропускаємо

  console.error(
    [
      '🛑 ЗАБЛОКОВАНО: команда може стерти НЕЗАКОМІЧЕНУ роботу.',
      `Команда: ${hitCmd}`,
      `Причина: ${hit.what}`,
      `Зараз незакоміченого у дереві: ${dirty.length} файл(ів):`,
      ...dirty.slice(0, 12).map((l) => '  ' + l),
      dirty.length > 12 ? `  … ще ${dirty.length - 12}` : '',
      '',
      'Інцидент 13.08.2026: саме так було стерто вісім правок у planFact.ts.',
      'Безпечні альтернативи:',
      '  • скасувати ОДНУ пробу — зробити копію файла ДО проби і повернути з неї;',
      '  • зберегти роботу — git add -A && git commit (можна тимчасовий коміт);',
      '  • якщо дійсно треба викинути — спершу покажи власнику, що саме зникне.',
    ]
      .filter(Boolean)
      .join('\n'),
  )
  process.exit(2) // 2 = заблокувати виклик і показати stderr агенту
})
