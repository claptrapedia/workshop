import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { api } from './api.ts'
import { mono } from './theme.ts'
import type { ItemSource, RawRecord, ResearchView, WeaponDraft } from '../shared/types.ts'

const SCOPE_KIND: Record<string, string> = {
  game: 'Game',
  'item-type': 'Item type',
  subtype: 'Subtype',
  manufacturer: 'Manufacturer',
  element: 'Element',
}

const SCOPE_VALUE: Record<string, string> = {
  borderlands: 'Borderlands',
  weapon: 'Weapon',
  smg: 'SMG',
  maliwan: 'Maliwan',
  incendiary: 'Incendiary',
}

function scopeLabel(kind: string, value: string): string {
  const shown = SCOPE_VALUE[value] ?? value
  return `${SCOPE_KIND[kind] ?? kind} · ${shown}`
}

export function Review({ id, records }: { id: string; records: RawRecord[] | null }) {
  const [view, setView] = useState<ResearchView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [url, setUrl] = useState('')
  const [draft, setDraft] = useState<WeaponDraft | null>(null)
  const [capture, setCapture] = useState<{ title: string; text: string } | null>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    api<ResearchView>(`/api/research?id=${encodeURIComponent(id)}`)
      .then((next) => {
        setView(next)
        setDraft(next.draft)
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
  }, [id])

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest' })
  }, [error])

  function apply(next: ResearchView) {
    setView(next)
    setDraft(next.draft)
  }

  function run(label: string, work: Promise<ResearchView>): Promise<ResearchView | undefined> {
    setBusy(label)
    setError('')
    return work
      .then((next) => {
        apply(next)
        return next
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : String(caught))
        return undefined
      })
      .finally(() => setBusy(''))
  }

  if (!view) return null

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2">Hellfire draft</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Find pages stores the URLs and stops. Fetch captures them. Write draft uses the selected agent.
      </Typography>
      {busy && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ mb: 0.75 }}>
            {busy}
          </Typography>
          <LinearProgress />
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Button variant="contained" disabled={Boolean(busy)} onClick={() => run('Finding pages', api('/api/research/find', { method: 'POST', body: JSON.stringify({ id }) }))}>
          Find pages
        </Button>
        <Button
          variant="outlined"
          disabled={Boolean(busy) || !view.canWrite}
          onClick={() => run('Writing the draft', api('/api/research/draft', { method: 'POST', body: JSON.stringify({ id }) }))}
        >
          Write draft
        </Button>
      </Box>
      {error && (
        <Typography ref={errorRef} color="error" sx={{ mb: 1.5, whiteSpace: 'pre-wrap' }}>
          {error}
        </Typography>
      )}
      {view.sources.map((source) => (
        <SourceRow
          key={source.id}
          source={source}
          scopes={view.scopes}
          busy={Boolean(busy)}
          onOpen={() => void api('/api/research/open', { method: 'POST', body: JSON.stringify({ sourceId: source.id }) }).catch(show)}
          onFetch={() => run(source.site === 'wiki' ? 'Fetching the Borderlands Wiki' : 'Rendering LootLemon', api('/api/research/fetch', { method: 'POST', body: JSON.stringify({ sourceId: source.id }) }))}
          onReject={() => run('Rejecting the URL', api('/api/research/reject', { method: 'POST', body: JSON.stringify({ sourceId: source.id }) }))}
          onRestore={() => run('Restoring the URL', api('/api/research/restore', { method: 'POST', body: JSON.stringify({ sourceId: source.id }) }))}
          onShare={(kind, value) => run('Sharing the page', api('/api/research/share', { method: 'POST', body: JSON.stringify({ sourceId: source.id, kind, value }) }))}
          onCapture={() => showCapture(source)}
        />
      ))}
      {view.shared.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Shared pages. A matching capture is included in the draft.
          </Typography>
          {view.shared.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              scopes={view.scopes}
              shared
              busy={Boolean(busy)}
              onOpen={() => void api('/api/research/open', { method: 'POST', body: JSON.stringify({ sourceId: source.id }) }).catch(show)}
              onFetch={() => run(source.site === 'wiki' ? 'Fetching the Borderlands Wiki' : 'Rendering LootLemon', api('/api/research/fetch', { method: 'POST', body: JSON.stringify({ sourceId: source.id }) }))}
              onReject={() => run('Rejecting the URL', api('/api/research/reject', { method: 'POST', body: JSON.stringify({ sourceId: source.id }) }))}
              onRestore={() => run('Restoring the URL', api('/api/research/restore', { method: 'POST', body: JSON.stringify({ sourceId: source.id }) }))}
              onRemove={() => run('Removing the shared page', api('/api/research/remove', { method: 'POST', body: JSON.stringify({ sourceId: source.id }) }))}
              onShare={() => {}}
              onCapture={() => showCapture(source)}
            />
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
        <TextField size="small" fullWidth placeholder="Add a wiki or LootLemon URL" value={url} onChange={(event) => setUrl(event.target.value)} />
        <Button
          disabled={Boolean(busy) || !url.trim()}
          onClick={() =>
            void run('Adding the URL', api('/api/research/source', { method: 'POST', body: JSON.stringify({ id, url }) })).then((next) => {
              if (next) setUrl('')
            })
          }
        >
          Add
        </Button>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
        <Box sx={{ display: 'grid', gap: 1.25, alignContent: 'start' }}>
          {draft ? (
            <>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="subtitle2">Draft</Typography>
                {draft.model && <Chip size="small" label={draft.model} />}
                {draft.approved && <Chip size="small" label="Approved" sx={{ bgcolor: '#2ee6d6', color: '#06221f' }} />}
              </Box>
              <TextField label="Summary" size="small" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
              <TextField label="Description" size="small" multiline minRows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              <TextField label="Manufacturer" size="small" value={draft.manufacturer} onChange={(event) => setDraft({ ...draft, manufacturer: event.target.value })} />
              <TextField label="Element" size="small" value={draft.element} onChange={(event) => setDraft({ ...draft, element: event.target.value })} />
              <TextField label="Rarity" size="small" value={draft.rarity} onChange={(event) => setDraft({ ...draft, rarity: event.target.value })} />
              <TextField label="Damage" size="small" value={draft.damage} onChange={(event) => setDraft({ ...draft, damage: event.target.value })} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  disabled={Boolean(busy)}
                  onClick={() => run('Saving the edit', api('/api/research/draft', { method: 'PUT', body: JSON.stringify({ id, ...draft }) }))}
                >
                  Save edit
                </Button>
                <Button
                  variant="contained"
                  disabled={Boolean(busy) || draft.approved}
                  onClick={() => run('Approving', api('/api/research/approve', { method: 'POST', body: JSON.stringify({ id }) }))}
                >
                  Approve
                </Button>
                {draft.approved && (
                  <Button
                    variant="outlined"
                    disabled={Boolean(busy)}
                    onClick={() => run('Withdrawing the approval', api('/api/research/unapprove', { method: 'POST', body: JSON.stringify({ id }) }))}
                  >
                    Unapprove
                  </Button>
                )}
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Fetch Hellfire’s own page, then write the draft. A shared page does not stand in for it.
            </Typography>
          )}
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Raw records{records ? ` · ${records.length}` : ''}
          </Typography>
          <Box component="pre" sx={{ m: 0, maxHeight: 520, overflow: 'auto', fontFamily: mono, fontSize: 11, whiteSpace: 'pre-wrap' }}>
            {records ? JSON.stringify(records, null, 2) : 'Loading records…'}
          </Box>
        </Box>
      </Box>
      <Dialog open={Boolean(capture)} onClose={() => setCapture(null)} fullWidth maxWidth="md">
        <DialogTitle>{capture?.title}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: mono, whiteSpace: 'pre-wrap', fontSize: 13 }}>{capture?.text}</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  )

  function show(caught: unknown) {
    setError(caught instanceof Error ? caught.message : String(caught))
  }

  function showCapture(source: ItemSource) {
    setCapture({ title: source.url, text: 'Loading…' })
    api<{ text: string }>(`/api/sources/${source.id}/capture`)
      .then((body) => setCapture({ title: source.url, text: body.text }))
      .catch((caught: unknown) => setCapture({ title: source.url, text: caught instanceof Error ? caught.message : String(caught) }))
  }
}

function SourceRow({
  source,
  scopes,
  shared,
  busy,
  onOpen,
  onFetch,
  onReject,
  onRestore,
  onShare,
  onRemove,
  onCapture,
}: {
  source: ItemSource
  scopes: ResearchView['scopes']
  shared?: boolean
  busy: boolean
  onOpen: () => void
  onFetch: () => void
  onReject: () => void
  onRestore: () => void
  onShare: (kind: string, value: string) => void
  onRemove?: () => void
  onCapture: () => void
}) {
  return (
    <Box sx={{ py: 1, borderTop: 1, borderColor: 'divider' }}>
      {shared && source.scope && (
        <Typography variant="body2" color="text.secondary">
          {scopeLabel(source.scope.kind, source.scope.value)}
        </Typography>
      )}
      <Typography sx={{ fontFamily: mono, fontSize: 12, wordBreak: 'break-all' }}>{source.url}</Typography>
      {source.fact && <Typography variant="body2">{source.fact}</Typography>}
      {source.rejected && (
        <Typography variant="body2" color="warning.main">
          Rejected. A later find will not add it.
        </Typography>
      )}
      {source.error && (
        <Typography variant="body2" color="error" sx={{ whiteSpace: 'pre-wrap' }}>
          {source.error}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.75 }}>
        <Button size="small" disabled={busy} onClick={onOpen}>
          Open
        </Button>
        <Button size="small" disabled={busy || source.rejected} onClick={onFetch}>
          Fetch
        </Button>
        {source.via && (
          <Chip size="small" label="Fetched" onClick={onCapture} sx={{ bgcolor: '#2ee6d6', color: '#06221f' }} />
        )}
        {source.rejected ? (
          <Button size="small" disabled={busy} onClick={onRestore}>
            Restore
          </Button>
        ) : (
          <Button size="small" color="warning" disabled={busy} onClick={onReject}>
            Reject
          </Button>
        )}
        {!source.rejected && !shared && (
          <TextField
            select
            size="small"
            label="Share with"
            value=""
            disabled={busy}
            onChange={(event) => {
              const split = event.target.value.indexOf(':')
              if (split > 0) onShare(event.target.value.slice(0, split), event.target.value.slice(split + 1))
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Choose a scope</MenuItem>
            {scopes.map((scope) => (
              <MenuItem key={`${scope.kind}:${scope.value}`} value={`${scope.kind}:${scope.value}`}>
                {scopeLabel(scope.kind, scope.value)}
              </MenuItem>
            ))}
          </TextField>
        )}
        {shared && onRemove && (
          <Button size="small" color="warning" disabled={busy} onClick={onRemove}>
            Remove
          </Button>
        )}
      </Box>
    </Box>
  )
}
