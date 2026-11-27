import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

import { api } from './api.ts'
import { mono } from './theme.ts'
import type { SourceProof } from '../shared/types.ts'

export function Sources() {
  const [rows, setRows] = useState<SourceProof[]>([])
  const [busy, setBusy] = useState<SourceProof | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<SourceProof | null>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    api<SourceProof[]>('/api/sources')
      .then(setRows)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
  }, [])

  function replace(next: SourceProof) {
    setRows((current) => current.map((row) => (row.id === next.id ? next : row)))
  }

  function fetchSource(row: SourceProof) {
    setBusy(row)
    setError('')
    api<SourceProof>(`/api/sources/${row.id}/fetch`, { method: 'POST' })
      .then(replace)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(null))
  }

  function launch(row: SourceProof) {
    setError('')
    api(`/api/sources/${row.id}/open`, { method: 'POST' }).catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : String(caught)),
    )
  }

  function showCapture(row: SourceProof) {
    setOpen(row)
    setText('')
    api<{ text: string }>(`/api/sources/${row.id}/capture`)
      .then((body) => setText(body.text))
      .catch((caught: unknown) => setText(caught instanceof Error ? caught.message : String(caught)))
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', px: 3, py: 2.5 }}>
      <Typography variant="h2" sx={{ fontSize: 28 }}>
        Source proof
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2, maxWidth: 720 }}>
        Two fixed Hellfire pages. Fetch stores the page. Open launches it in your browser.
      </Typography>
      {busy && (
        <Box sx={{ maxWidth: 880, mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.75 }}>
            {busy.site === 'wiki' ? 'Fetching the Borderlands Wiki' : 'Rendering LootLemon'}
          </Typography>
          <LinearProgress />
        </Box>
      )}
      {error && (
        <Typography color="error" sx={{ whiteSpace: 'pre-wrap', mb: 2, maxWidth: 880 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ display: 'grid', gap: 1.5, maxWidth: 880 }}>
        {rows.map((row) => (
          <Paper key={row.id} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {row.name} · {row.site === 'wiki' ? 'Wiki' : 'LootLemon'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: mono, wordBreak: 'break-all' }}>
                  {row.url}
                </Typography>
              </Box>
              <Button variant="outlined" disabled={Boolean(busy)} onClick={() => launch(row)}>
                Open
              </Button>
              <Button variant="contained" disabled={Boolean(busy)} onClick={() => fetchSource(row)}>
                Fetch
              </Button>
            </Box>
            {row.fact && (
              <Typography sx={{ mt: 1.25 }}>{row.fact}</Typography>
            )}
            {row.signal?.revisionId && (
              <Typography variant="body2" color="text.secondary">
                revision {row.signal.revisionId}
                {row.signal.revisedAt ? ` · ${row.signal.revisedAt}` : ''}
              </Typography>
            )}
            {row.via && (
              <Chip
                label="Fetched"
                size="small"
                onClick={() => showCapture(row)}
                sx={{ mt: 1.25, bgcolor: '#2ee6d6', color: '#06221f' }}
              />
            )}
            {row.error && (
              <Typography color="error" sx={{ whiteSpace: 'pre-wrap', mt: 1.25 }}>
                {row.error}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>
      <Dialog open={Boolean(open)} onClose={() => setOpen(null)} fullWidth maxWidth="md">
        <DialogTitle>
          {open?.name} · {open?.site === 'wiki' ? 'Wiki' : 'LootLemon'}
          {open?.signal?.revisionId ? ` · revision ${open.signal.revisionId}` : ''}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: mono, whiteSpace: 'pre-wrap', fontSize: 13 }}>{text}</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
