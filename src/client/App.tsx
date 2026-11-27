import { Box, Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'

import { api } from './api.ts'
import { Library } from './Library.tsx'
import { Settings } from './Settings.tsx'
import { Sources } from './Sources.tsx'
import { Splash } from './Splash.tsx'
import type { AgentId, AgentPing, Status } from '../shared/types.ts'

type View = 'library' | 'removed' | 'sources' | 'settings'

export function App() {
  const [status, setStatus] = useState<Status | null>(null)
  const [view, setView] = useState<View>('library')
  const [error, setError] = useState('')
  const [agent, setAgent] = useState<AgentId>('claude')
  const [ping, setPing] = useState<AgentPing | null>(null)
  const [pingError, setPingError] = useState('')
  const [asking, setAsking] = useState(false)

  const refresh = useCallback(() => {
    api<Status>('/api/status')
      .then((next) => {
        setStatus(next)
        setError('')
        if (!next.ready) setView('library')
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : String(caught))
      })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!status?.ready) return
    api<{ agent: AgentId }>('/api/agent')
      .then((next) => setAgent(next.agent))
      .catch(() => setAgent('claude'))
  }, [status?.ready])

  function chooseAgent(next: AgentId) {
    setAgent(next)
    setPing(null)
    setPingError('')
    api<{ agent: AgentId }>('/api/agent', { method: 'PUT', body: JSON.stringify({ agent: next }) }).catch(
      (caught: unknown) => setPingError(caught instanceof Error ? caught.message : String(caught)),
    )
  }

  function ask() {
    setAsking(true)
    setPing(null)
    setPingError('')
    api<AgentPing>('/api/agent/ping', { method: 'POST', body: JSON.stringify({ agent }) })
      .then(setPing)
      .catch((caught: unknown) => setPingError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setAsking(false))
  }

  if (error && !status) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }
  if (!status) return <Box sx={{ minHeight: '100vh' }} />
  if (!status.ready) return <Splash onUploaded={refresh} />

  const summary = status.summary
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2.5,
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontWeight: 700, letterSpacing: '0.08em', fontSize: 13 }}>
          CLAPTRAPEDIA
        </Typography>
        <Typography color="text.secondary">Borderlands 1</Typography>
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={agent}
          onChange={(_event, next: AgentId | null) => {
            if (next) chooseAgent(next)
          }}
        >
          <ToggleButton value="claude" sx={{ color: '#c4b5fd', '&.Mui-selected': { color: '#1a1028', bgcolor: '#c4b5fd' } }}>
            Claude Code
          </ToggleButton>
          <ToggleButton value="codex" sx={{ color: '#f0b429', '&.Mui-selected': { color: '#1a1408', bgcolor: '#f0b429' } }}>
            Codex
          </ToggleButton>
        </ToggleButtonGroup>
        <Button variant="outlined" disabled={asking} onClick={ask}>
          {asking ? 'Asking…' : 'Ask'}
        </Button>
        <Button color={view === 'library' ? 'primary' : 'inherit'} onClick={() => setView('library')}>
          Library
        </Button>
        <Button color={view === 'removed' ? 'primary' : 'inherit'} onClick={() => setView('removed')}>
          Removed
        </Button>
        <Button color={view === 'sources' ? 'primary' : 'inherit'} onClick={() => setView('sources')}>
          Sources
        </Button>
        <Button color={view === 'settings' ? 'primary' : 'inherit'} onClick={() => setView('settings')}>
          Settings
        </Button>
      </Box>
      {summary && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, py: 1 }}>
          {summary.weapons} weapons · {summary.smgs} SMGs · {summary.enemies} enemies · {summary.locations}{' '}
          locations · {summary.missions} missions · {summary.shields} shields · {summary.grenadeMods} grenade
          mods · {summary.classMods} class mods · {summary.artifacts} artifacts · {summary.maps} maps
        </Typography>
      )}
      {(ping || pingError) && (
        <Box sx={{ px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
          {ping && (
            <>
              <Typography variant="caption" color="text.secondary">
                {ping.model}
              </Typography>
              <Typography>{ping.reply}</Typography>
            </>
          )}
          {pingError && (
            <Typography color="error" sx={{ whiteSpace: 'pre-wrap' }}>
              {pingError}
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {view === 'settings' ? (
          <Settings
            onChanged={refresh}
            onReset={() => {
              setStatus({ ready: false })
            }}
          />
        ) : view === 'sources' ? (
          <Sources />
        ) : (
          <Library removed={view === 'removed'} onChanged={refresh} />
        )}
      </Box>
    </Box>
  )
}
