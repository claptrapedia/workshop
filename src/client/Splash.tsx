import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import { useState } from 'react'

import { api } from './api.ts'
import type { Summary } from '../shared/types.ts'

export function Splash({ onUploaded }: { onUploaded: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const body = new FormData()
      body.set('file', file)
      await api<{ summary: Summary }>('/api/extract', { method: 'POST', body })
      onUploaded()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 3,
      }}
    >
      <Box sx={{ width: 'min(560px, 100%)' }}>
        <Typography variant="overline" color="primary" sx={{ letterSpacing: '0.16em' }}>
          Claptrapedia
        </Typography>
        <Typography variant="h2" sx={{ mt: 1, mb: 2 }}>
          Workshop
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 460 }}>
          Upload the Borderlands 1 Enhanced extract. The zip is the capture from 10 November 2026.
        </Typography>
        <Button component="label" variant="contained" size="large" disabled={busy}>
          {busy ? 'Reading the extract…' : 'Choose zip'}
          <input
            hidden
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </Button>
        {busy && <CircularProgress size={22} sx={{ ml: 2, verticalAlign: 'middle' }} />}
        {error && (
          <Alert severity="error" sx={{ mt: 3, whiteSpace: 'pre-wrap' }}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  )
}
