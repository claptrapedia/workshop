import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { api } from './api.ts'
import type { Status } from '../shared/types.ts'

export function Settings({ onChanged, onReset }: { onChanged: () => void; onReset: () => void }) {
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [resetOpen, setResetOpen] = useState(false)

  async function uploadExtract(file: File | undefined) {
    if (!file) return
    setError('')
    setNote('')
    setBusy(true)
    try {
      const body = new FormData()
      body.set('file', file)
      await api('/api/extract', { method: 'POST', body })
      setNote('Extract replaced. Deletions and corrections are still here.')
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function checkSnapshot(file: File | undefined) {
    if (!file) return
    setError('')
    setNote('')
    setBusy(true)
    try {
      const body = new FormData()
      body.set('file', file)
      const result = await api<{ token: string }>('/api/snapshot/check', { method: 'POST', body })
      setToken(result.token)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ p: 4, maxWidth: 720, display: 'grid', gap: 4 }}>
      <Box>
        <Typography variant="h5">Upload extract again</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          The same capture keeps deletions, type corrections and image choices.
        </Typography>
        <Button component="label" variant="outlined" disabled={busy}>
          Choose zip
          <input hidden type="file" accept=".zip,application/zip" onChange={(event) => void uploadExtract(event.target.files?.[0])} />
        </Button>
      </Box>

      <Box>
        <Typography variant="h5">Snapshot</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          A snapshot is the workshop store. It is not the card images and not the catalogue database.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" href="/api/snapshot">
            Export snapshot
          </Button>
          <Button component="label" variant="outlined" disabled={busy}>
            Import snapshot
            <input hidden type="file" accept=".zip,application/zip" onChange={(event) => void checkSnapshot(event.target.files?.[0])} />
          </Button>
        </Box>
      </Box>

      <Box>
        <Typography variant="h5" color="error">
          Reset app
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          Deletes the workshop store and returns to the upload splash. Card images stay. The database, site and
          extractions repos stay.
        </Typography>
        <Button color="error" variant="contained" size="large" onClick={() => setResetOpen(true)}>
          Reset app
        </Button>
      </Box>

      {note && <Alert severity="success">{note}</Alert>}
      {error && (
        <Alert severity="error" sx={{ whiteSpace: 'pre-wrap' }}>
          {error}
        </Alert>
      )}

      <Dialog open={Boolean(token)} onClose={() => void cancelImport()}>
        <DialogTitle>Replace the workshop store?</DialogTitle>
        <DialogContent>
          <Typography>
            This puts the workshop back to that snapshot, and every change made after it will be discarded.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void cancelImport()}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              void api<Status>('/api/snapshot/confirm', {
                method: 'POST',
                body: JSON.stringify({ token }),
              })
                .then(() => {
                  setToken('')
                  onChanged()
                })
                .catch((caught: unknown) => {
                  setToken('')
                  setError(caught instanceof Error ? caught.message : String(caught))
                })
            }}
          >
            Replace store
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resetOpen}
        onClose={() => {
          setResetOpen(false)
          setConfirmText('')
        }}
      >
        <DialogTitle>Reset the workshop?</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Type CONFIRM to delete the workshop store.</Typography>
          <TextField
            autoFocus
            fullWidth
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResetOpen(false)
              setConfirmText('')
            }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={confirmText !== 'CONFIRM'}
            onClick={() => {
              void api('/api/reset', { method: 'POST', body: JSON.stringify({ confirm: confirmText }) })
                .then(() => {
                  setResetOpen(false)
                  setConfirmText('')
                  onReset()
                })
                .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
            }}
          >
            Reset app
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )

  async function cancelImport() {
    const current = token
    setToken('')
    if (current) await api('/api/snapshot/cancel', { method: 'POST', body: JSON.stringify({ token: current }) }).catch(() => undefined)
  }
}
