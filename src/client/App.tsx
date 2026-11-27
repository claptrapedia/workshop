import { Box, Button, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'

import { api } from './api.ts'
import { Library } from './Library.tsx'
import { Settings } from './Settings.tsx'
import { Splash } from './Splash.tsx'
import type { Status } from '../shared/types.ts'

type View = 'library' | 'removed' | 'settings'

export function App() {
  const [status, setStatus] = useState<Status | null>(null)
  const [view, setView] = useState<View>('library')
  const [error, setError] = useState('')

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
        <Button color={view === 'library' ? 'primary' : 'inherit'} onClick={() => setView('library')}>
          Library
        </Button>
        <Button color={view === 'removed' ? 'primary' : 'inherit'} onClick={() => setView('removed')}>
          Removed
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
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {view === 'settings' ? (
          <Settings
            onChanged={refresh}
            onReset={() => {
              setStatus({ ready: false })
            }}
          />
        ) : (
          <Library removed={view === 'removed'} onChanged={refresh} />
        )}
      </Box>
    </Box>
  )
}
