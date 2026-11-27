import { spawn } from 'node:child_process'
import os from 'node:os'

import { settingGet, settingSet } from './db.ts'

export type AgentId = 'claude' | 'codex'

const PROMPT = 'Reply with exactly this sentence and nothing else: workshop agent ok'
const TIMEOUT_MS = 120_000

const CLAUDE_MODEL = 'claude-sonnet-5-5'
const CODEX_MODEL = 'gpt-6.2-sol'

export function getAgent(): AgentId {
  return settingGet('agent') === 'codex' ? 'codex' : 'claude'
}

export function setAgent(value: unknown): AgentId {
  if (value !== 'claude' && value !== 'codex') throw new Error('Choose Claude Code or Codex.')
  settingSet('agent', value)
  return value
}

export type AgentRun = (agent: AgentId, model: string) => Promise<string>

export function agentLaunch(agent: AgentId, model: string): { command: string; args: string[] } {
  if (agent === 'claude') {
    return {
      command: 'claude',
      args: [
        '-p',
        '--output-format',
        'json',
        '--model',
        model,
        '--effort',
        'medium',
        '--no-session-persistence',
        '--disable-slash-commands',
        '--setting-sources',
        'user',
        '--tools=',
        PROMPT,
      ],
    }
  }
  return {
    command: 'codex',
    args: [
      'exec',
      '--ephemeral',
      '--skip-git-repo-check',
      '--json',
      '--color',
      'never',
      '-m',
      model,
      '-c',
      'model_reasoning_effort="medium"',
      '-s',
      'read-only',
      PROMPT,
    ],
  }
}

export async function askAgent(agent: AgentId, execute: AgentRun = run): Promise<{ model: string; reply: string }> {
  const model = agent === 'claude' ? CLAUDE_MODEL : CODEX_MODEL
  try {
    return await call(agent, model, execute)
  } catch (error) {
    if (agent !== 'claude' || !modelRejected(error)) throw error
    return call(agent, 'sonnet', execute)
  }
}

export async function completeAgent(
  agent: AgentId,
  prompt: string,
  purpose: 'search' | 'draft',
): Promise<{ model: string; reply: string }> {
  const model = agent === 'claude' ? CLAUDE_MODEL : CODEX_MODEL
  const timeout = purpose === 'search' ? 180_000 : TIMEOUT_MS
  const execute: AgentRun = (next, chosen) => {
    const { command, args } = taskLaunch(next, chosen, prompt, purpose)
    return spawnCli(command, args, timeout)
  }
  try {
    return await call(agent, model, execute)
  } catch (error) {
    if (agent !== 'claude' || !modelRejected(error)) throw error
    return call(agent, 'sonnet', execute)
  }
}

function taskLaunch(
  agent: AgentId,
  model: string,
  prompt: string,
  purpose: 'search' | 'draft',
): { command: string; args: string[] } {
  if (agent === 'claude') {
    const tools =
      purpose === 'search'
        ? ['--tools', 'WebSearch,WebFetch', '--allowedTools', 'WebSearch,WebFetch', '--permission-mode', 'dontAsk', '--permission-prompts', 'none']
        : ['--tools=']
    return {
      command: 'claude',
      args: [
        '-p',
        '--output-format',
        'json',
        '--model',
        model,
        '--effort',
        'medium',
        '--no-session-persistence',
        '--disable-slash-commands',
        '--setting-sources',
        'user',
        ...tools,
        prompt,
      ],
    }
  }
  return {
    command: 'codex',
    args: [
      'exec',
      '--ephemeral',
      '--skip-git-repo-check',
      '--json',
      '--color',
      'never',
      '-m',
      model,
      '-c',
      'model_reasoning_effort="medium"',
      '-s',
      'read-only',
      prompt,
    ],
  }
}

async function call(agent: AgentId, model: string, execute: AgentRun): Promise<{ model: string; reply: string }> {
  const stdout = await execute(agent, model)
  return agent === 'claude' ? claudeReply(stdout, model) : codexReply(stdout, model)
}

function run(agent: AgentId, model: string): Promise<string> {
  const { command, args } = agentLaunch(agent, model)
  return spawnCli(command, args, TIMEOUT_MS)
}

function spawnCli(command: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: os.tmpdir(), stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let settled = false
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      finish(new Error(`The call timed out after ${Math.round(timeout / 1000)} seconds.`))
    }, timeout)
    const finish = (error?: Error, value?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve(value ?? '')
    }
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') finish(new Error(`${command} was not found on PATH.`))
      else finish(error)
    })
    child.on('close', (code) => {
      if (code === 0) finish(undefined, stdout)
      else finish(new Error([stderr, stdout].map((part) => part.trim()).filter(Boolean).join('\n') || `${command} exited ${code}.`))
    })
  })
}

function claudeReply(stdout: string, requested: string): { model: string; reply: string } {
  let body: {
    result?: unknown
    model?: unknown
    is_error?: boolean
    error?: unknown
    modelUsage?: Record<string, { canonicalModel?: string }>
  }
  try {
    body = JSON.parse(stdout) as typeof body
  } catch {
    throw new Error(stdout.trim() || 'Claude returned nothing.')
  }
  if (body.is_error) {
    throw new Error(textOf(body.result) || textOf(body.error) || 'Claude returned an error.')
  }
  const reply = textOf(body.result).trim()
  if (!reply) throw new Error('Claude returned an empty reply.')
  const usage = body.modelUsage ? Object.entries(body.modelUsage)[0] : undefined
  const model = textOf(body.model) || usage?.[1]?.canonicalModel || usage?.[0] || requested
  return { model, reply }
}

function codexReply(stdout: string, requested: string): { model: string; reply: string } {
  let reply = ''
  let model = ''
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{')) continue
    let event: { type?: string; item?: { type?: string; text?: string }; model?: string; message?: string }
    try {
      event = JSON.parse(trimmed) as typeof event
    } catch {
      continue
    }
    if (event.type === 'error' && event.message) throw new Error(event.message)
    if (typeof event.model === 'string') model = event.model
    const item = event.item
    if (item && (item.type === 'agent_message' || item.type === 'message') && item.text) reply = item.text
  }
  reply = reply.trim()
  if (!reply) throw new Error(stdout.trim() || 'Codex returned an empty reply.')
  return { model: model || requested, reply }
}

function modelRejected(error: unknown): boolean {
  const text = error instanceof Error ? error.message.toLowerCase() : ''
  return text.includes('model') && (text.includes('invalid') || text.includes('unknown') || text.includes('not found'))
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
