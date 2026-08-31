#!/usr/bin/env node
// Хук: файл прочитано ЧАСТКОВО — сказати про це вголос.
//
// Навіщо. Головний механізм помилок, названий власником 13.08.2026: «прочитав пів
// файла, вирішивши, що отримав усю потрібну інфу, і пішов робити задачу, а в другій
// частині файла були дані, які кардинально змінюють усе». Правило «Read з limit — це
// вибірка» живе в CLAUDE.md, але вмирає через 20 викликів інструментів. Хук не вмирає.
//
// Що робить: якщо Read викликали з limit/offset і за межами вибірки лишився хвіст —
// друкує в stderr, скільки рядків НЕ прочитано і скільки в них ⚠️-попереджень.
// Нічого не блокує: це нагадування, а не заборона.
//
// Запуск і без хука: node .claude/hooks/warn-partial-read.js <файл> <offset> <limit>

const fs = require('fs')

function report(file, offset, limit) {
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return null // файла немає/бінарник — не наша справа
  }
  const lines = text.split(/\r?\n/)
  const total = lines.length
  const from = Math.max(0, (Number(offset) || 1) - 1)
  const to = limit ? from + Number(limit) : total
  if (to >= total && from === 0) return null // прочитано цілком — тиша

  const unreadStart = lines.slice(0, from)
  const unreadEnd = lines.slice(Math.min(to, total))
  const unread = unreadStart.length + unreadEnd.length
  if (unread <= 0) return null

  // ⚠️-блоки — саме там у цьому проєкті лежить причина, чому не можна робити очевидне
  const warnAll = lines.filter((l) => l.includes('⚠️')).length
  const warnUnread = [...unreadStart, ...unreadEnd].filter((l) => l.includes('⚠️')).length

  const parts = [
    `⚠️ ЧАСТКОВЕ ЧИТАННЯ: ${file}`,
    `прочитано рядків ${Math.min(to, total) - from} з ${total}, поза вибіркою лишилось ${unread}`,
  ]
  if (warnUnread > 0) {
    parts.push(
      `у НЕпрочитаній частині ${warnUnread} із ${warnAll} блоків «⚠️» — саме там у цьому проєкті лежать причини, чому очевидна правка ламає інше`,
      `перевір: grep -n "⚠️" "${file}"`,
    )
  }
  parts.push('висновок про поведінку по цій вибірці робити НЕ можна (CLAUDE.md → САМОПЕРЕВІРКА)')
  return parts.join('\n')
}

// ── Режим CLI (ручний запуск) ──
if (process.argv[2] && !process.env.CLAUDE_HOOK) {
  const msg = report(process.argv[2], process.argv[3], process.argv[4])
  if (msg) console.error(msg)
  process.exit(0)
}

// ── Режим хука: JSON на stdin ──
// Вивід дублюємо: stderr (видно в логах) + hookSpecificOutput.systemMessage (потрапляє
// в контекст агента — саме це й потрібно, бо нагадування має спрацювати в його голові,
// а не в лог-файлі).
let raw = ''
process.stdin.on('data', (c) => (raw += c))
process.stdin.on('end', () => {
  try {
    const ev = JSON.parse(raw || '{}')
    const i = ev.tool_input || {}
    if (!i.file_path) return process.exit(0)
    // limit/offset відсутні → Read прочитав файл цілком (до вбудованого капа) — не чіпаємо
    if (!i.limit && !i.offset) return process.exit(0)
    const msg = report(i.file_path, i.offset, i.limit)
    if (msg) {
      console.error(msg)
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: { hookEventName: ev.hook_event_name || 'PostToolUse', systemMessage: msg },
        }),
      )
    }
  } catch {
    /* хук ніколи не валить роботу */
  }
  process.exit(0)
})
