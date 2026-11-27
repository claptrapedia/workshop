import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

import { api } from './api.ts'
import { mono } from './theme.ts'
import type { CandidateDetail, RawRecord } from '../shared/types.ts'
import { CHARACTERS, ITEM_TYPES } from '../shared/vocab.ts'

export function Detail({
  id,
  removed,
  onChanged,
  onOpen,
}: {
  id: string
  removed: boolean
  onChanged: () => void
  onOpen: (id: string, groupKey?: string) => void
}) {
  const [detail, setDetail] = useState<CandidateDetail | null>(null)
  const [records, setRecords] = useState<RawRecord[] | null>(null)
  const [error, setError] = useState('')
  const [itemType, setItemType] = useState('')
  const [subtype, setSubtype] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [imageQuery, setImageQuery] = useState('')

  useEffect(() => {
    let live = true
    setRecords(null)
    setError('')
    api<CandidateDetail>(`/api/candidates/detail?id=${encodeURIComponent(id)}`)
      .then((next) => {
        if (!live) return
        setDetail(next)
        setItemType(next.bucket.typeSet ? (next.bucket.itemType ?? '') : '')
        setSubtype(next.bucket.typeSet ? (next.bucket.subtype ?? '') : '')
        setCharacterId(next.bucket.characterSet ? (next.bucket.characterId ?? '') : '')
      })
      .catch((caught: unknown) => {
        if (live) setError(caught instanceof Error ? caught.message : String(caught))
      })
    api<RawRecord[]>(`/api/candidates/records?id=${encodeURIComponent(id)}`)
      .then((next) => {
        if (live) setRecords(next)
      })
      .catch((caught: unknown) => {
        if (live) setError(caught instanceof Error ? caught.message : String(caught))
      })
    return () => {
      live = false
    }
  }, [id])

  useEffect(() => {
    const needle = imageQuery.trim()
    if (!needle) {
      setImages([])
      return
    }
    const handle = setTimeout(() => {
      api<string[]>(`/api/images?q=${encodeURIComponent(needle)}`)
        .then(setImages)
        .catch(() => setImages([]))
    }, 150)
    return () => clearTimeout(handle)
  }, [imageQuery])

  async function patch(body: unknown) {
    setError('')
    try {
      const next = await api<CandidateDetail>('/api/candidates', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...(body as object) }),
      })
      setDetail(next)
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  if (!detail) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  const subtypes = ITEM_TYPES.find((type) => type.id === itemType)?.subtypes ?? []
  const showCharacter = itemType === 'class-mod' || itemType === 'artifact'

  return (
    <Box sx={{ p: 2.5, overflow: 'auto', height: '100%' }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {detail.imageUrl && (
          <Box
            component="img"
            src={detail.imageUrl}
            alt=""
            sx={{ width: 96, height: 96, objectFit: 'contain', bgcolor: '#07080d', borderRadius: 1 }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5">{detail.name || '(no name)'}</Typography>
          <Typography color="text.secondary">{detail.groupLabel}</Typography>
        </Box>
      </Box>
      <Typography sx={{ mt: 2, fontFamily: mono, fontSize: 12, wordBreak: 'break-all' }} color="text.secondary">
        {detail.candidateId}
      </Typography>
      <Typography sx={{ fontFamily: mono, fontSize: 12, wordBreak: 'break-all' }}>{detail.path}</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', my: 1.5 }}>
        {detail.className && <Chip size="small" label={detail.className} />}
        <Chip size="small" label={detail.originLabel} />
        {detail.named && <Chip size="small" label="Named" />}
        {detail.duplicateCount > 0 && (
          <Chip
            size="small"
            color="warning"
            label={
              detail.duplicates.length === 1
                ? `Also in ${detail.duplicates[0]?.groupLabel ?? 'another group'}`
                : `Same name in ${detail.duplicates.length} other groups`
            }
          />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary">
        Extract bucket: {detail.extractedLabel}
      </Typography>
      {detail.dedupeReason && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {detail.dedupeReason} Restore puts it back.
        </Typography>
      )}

      <Box sx={{ display: 'grid', gap: 1.5, mt: 2 }}>
        <TextField select label="Item type" size="small" value={itemType} onChange={(event) => {
          setItemType(event.target.value)
          setSubtype('')
          setCharacterId('')
        }}>
          <MenuItem value="">Use extract bucket</MenuItem>
          {ITEM_TYPES.map((type) => (
            <MenuItem key={type.id} value={type.id}>
              {type.label}
            </MenuItem>
          ))}
        </TextField>
        {subtypes.length > 0 && (
          <TextField select label="Subtype" size="small" value={subtype} onChange={(event) => setSubtype(event.target.value)}>
            <MenuItem value="">No subtype</MenuItem>
            {subtypes.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        )}
        {showCharacter && (
          <TextField
            select
            label="Character"
            size="small"
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
          >
            <MenuItem value="">No character</MenuItem>
            {CHARACTERS.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={() =>
              void patch({
                bucket: itemType
                  ? { itemType, subtype: subtype || null, characterId: characterId || null }
                  : { reset: true },
              })
            }
          >
            Save correction
          </Button>
        </Box>
      </Box>

      <Typography sx={{ mt: 3, mb: 1 }} variant="subtitle2">
        Card image
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Button size="small" onClick={() => void patch({ image: { mode: 'auto' } })}>
          Automatic
        </Button>
        <Button size="small" onClick={() => void patch({ image: { mode: 'none' } })}>
          None
        </Button>
      </Box>
      <TextField
        size="small"
        fullWidth
        placeholder="Find a file in src/data/img"
        value={imageQuery}
        onChange={(event) => setImageQuery(event.target.value)}
      />
      <Box sx={{ maxHeight: 160, overflow: 'auto', mt: 1 }}>
        {images.slice(0, 40).map((file) => (
          <Button
            key={file}
            size="small"
            fullWidth
            sx={{ justifyContent: 'flex-start', fontFamily: mono, fontSize: 11 }}
            onClick={() => void patch({ image: { mode: 'file', path: file } })}
          >
            {file}
          </Button>
        ))}
      </Box>

      {detail.duplicates.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2">Same display name, different file</Typography>
          {detail.duplicates.map((other) => (
            <Button
              key={other.id}
              size="small"
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}
              onClick={() => onOpen(other.id, other.groupKey)}
            >
              {other.groupLabel}
              <Box component="span" sx={{ fontFamily: mono, fontSize: 11, color: 'text.secondary' }}>
                {other.path}
              </Box>
            </Button>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
        {removed ? (
          <Button variant="outlined" onClick={() => void act('restore')}>
            Restore
          </Button>
        ) : (
          <Button color="error" variant="outlined" onClick={() => void act('remove')}>
            Delete
          </Button>
        )}
      </Box>
      {error && (
        <Typography color="error" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
          {error}
        </Typography>
      )}

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
        Raw records{records ? ` · ${records.length}` : ''}
      </Typography>
      {records?.map((record, index) => {
        const type = String(record.record_type ?? 'record')
        const recordId = String(record.id ?? index)
        const text = JSON.stringify(record, null, 2)
        return (
          <Accordion key={`${recordId}-${index}`} disableGutters defaultExpanded={type === 'catalogue_identity' && text.length < 5000}>
            <AccordionSummary>
              <Typography sx={{ fontFamily: mono, fontSize: 12, wordBreak: 'break-all' }}>
                {type} · {recordId}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  maxHeight: 320,
                  overflow: 'auto',
                  fontFamily: mono,
                  fontSize: 11,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {text}
              </Box>
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Box>
  )

  async function act(kind: 'remove' | 'restore') {
    setError('')
    try {
      await api(`/api/candidates/${kind}`, { method: 'POST', body: JSON.stringify({ id }) })
      onChanged()
      onOpen('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }
}
