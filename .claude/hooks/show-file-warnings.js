#!/usr/bin/env node
// Хук: перед правкою файла показати ЙОГО ⚠️-попередження.
//
// Навіщо. У цьому проєкті ключова інформація живе не в сигнатурах, а в коментарях
// «⚠️ …, інакше …» — з датою і ціною помилки. Їх 361 у src, з них 48 в одному
// planFact.ts на 4200 рядків. Вони розкидані по всьому файлу і майже ніколи не лежать
// поруч із місцем правки, тому греп по імені символа їх НЕ дістає: попередження про
// периметр або про знак витрат не містить імені функції, яку чіпаєш.
//
// Що робить: перед Edit/Write друкує в stderr список ⚠️-рядків цільового файла
// (номер + текст). Не блокує. Якщо попереджень немає — мовчить.
//
// Запуск і без хука: node .claude/hooks/show-file-warnings.js <файл>

const fs = require('fs')

const MAX_SHOW = 40 // більше — не читається; далі агент має грепнути сам
const MAX_LEN = 160

function report(file) {
  if (!/\.(ts|tsx|js|jsx|sql|css)$/.test(file)) return null
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return null // новий файл — попереджати нема про що
  }
  const hits = []
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.includes('⚠️')) {
      const clean = line.replace(/^\s*\/\/\s?/, '').trim()
      hits.push(`  ${i + 1}: ${clean.length > MAX_LEN ? clean.slice(0, MAX_LEN) + '…' : clean}`)
    }
  })
  if (!hits.length) return null

  const head = `⚠️ У ФАЙЛІ ${file} — ${hits.length} попереджень. Перш ніж правити, звір, які з них стосуються твоєї зміни:`
  const body = hits.slice(0, MAX_SHOW).join('\n')
  const tail =
    hits.length > MAX_SHOW
      ? `\n  … ще ${hits.length - MAX_SHOW}. Повний список: grep -n "⚠️" "${file}"`
      : ''
  return `${head}\n${body}${tail}`
}

if (process.argv[2] && !process.env.CLAUDE_HOOK) {
  const msg = report(process.argv[2])
  if (msg) console.error(msg)
  process.exit(0)
}

let raw = ''
process.stdin.on('data', (c) => (raw += c))
process.stdin.on('end', () => {
  try {
    const ev = JSON.parse(raw || '{}')
    const f = (ev.tool_input || {}).file_path
    if (f) {
      const msg = report(f)
      if (msg) {
        console.error(msg)
        // systemMessage — щоб попередження лягло в контекст агента, а не лише в лог
        process.stdout.write(
          JSON.stringify({
            hookSpecificOutput: { hookEventName: ev.hook_event_name || 'PreToolUse', systemMessage: msg },
          }),
        )
      }
    }
  } catch {
    /* хук ніколи не валить роботу */
  }
  process.exit(0)
})
