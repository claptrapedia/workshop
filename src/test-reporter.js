import path from 'node:path'

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text)
const green = (text) => paint('32', text)
const red = (text) => paint('31', text)
const dim = (text) => paint('2', text)
const bold = (text) => paint('1', text)

export default async function* reporter(source) {
  let file = ''
  let output = ''
  let passed = 0
  let failed = 0
  let skipped = 0
  let summary = null

  for await (const event of source) {
    if (event.type === 'test:stdout' || event.type === 'test:stderr') {
      output += text(event.data.message)
      continue
    }
    if (event.type === 'test:diagnostic' && event.data.level !== 'info') {
      yield `${event.data.level === 'error' ? red(event.data.message) : event.data.message}\n`
      continue
    }
    if (event.type === 'test:pass' || event.type === 'test:fail') {
      if (event.data.details?.type === 'suite') continue
      const next = rel(event.data.file)
      if (next && next !== file) {
        file = next
        yield `\n${bold(file)}\n`
      }
      const skippedTest = Boolean(event.data.skip)
      const failedTest = event.type === 'test:fail'
      const mark = failedTest ? red('✗') : skippedTest ? dim('–') : green('✓')
      const time = clock(event.data.details?.duration_ms)
      yield `  ${mark} ${event.data.name}${time ? dim(`  ${time}`) : ''}\n`
      if (failedTest) {
        failed += 1
        yield `${indent(failText(event.data.details?.error))}\n`
      } else if (skippedTest) skipped += 1
      else passed += 1
      continue
    }
    if (event.type === 'test:summary' && !event.data.file) summary = event.data
  }

  if (failed && output.trim()) yield `\n${dim(output.trim())}\n`
  if (!summary) return
  const total = passed + failed + skipped
  const counts = [passed ? green(`${passed} passed`) : '', failed ? red(`${failed} failed`) : '', skipped ? dim(`${skipped} skipped`) : '']
    .filter(Boolean)
    .join(dim(' | '))
  yield `\n${dim('Tests')}  ${counts}${dim(` (${total})`)}\n`
  yield `${dim('Time ')}  ${clock(summary.duration_ms, true)}\n`
}

function rel(file) {
  return file ? path.relative(process.cwd(), file) : ''
}

function clock(ms, always = false) {
  if (ms == null || (!always && ms < 100)) return ''
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function failText(error) {
  const cause = error?.cause
  const stack = cause?.stack || error?.stack || cause?.message || error?.message || 'The test failed.'
  return stack
    .split('\n')
    .filter((line) => !line.includes('node:internal') && !line.includes('node:async_hooks'))
    .join('\n')
}

function indent(value) {
  return value
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')
}

function text(value) {
  return typeof value === 'string' ? value : String(value ?? '')
}
