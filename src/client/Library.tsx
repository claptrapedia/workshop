import { Box, Button, Chip, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import { api } from './api.ts'
import { Detail } from './Detail.tsx'
import { mono } from './theme.ts'
import type { CandidateList, GroupNode } from '../shared/types.ts'

export function Library({ removed, onChanged }: { removed: boolean; onChanged: () => void }) {
  const [groups, setGroups] = useState<GroupNode[]>([])
  const [group, setGroup] = useState('')
  const [query, setQuery] = useState('')
  const [missing, setMissing] = useState(false)
  const [list, setList] = useState<CandidateList>({ total: 0, shown: 0, rows: [] })
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    api<GroupNode[]>(`/api/groups?removed=${removed ? '1' : '0'}`)
      .then((next) => {
        setGroups(next)
        setGroup((current) => {
          if (current && next.some((item) => item.key === current || item.children.some((child) => child.key === current))) {
            return current
          }
          const weapons = next.find((item) => item.key === 'weapon')
          const smg = weapons?.children.find((child) => child.key === 'weapon/smg')
          return smg?.key ?? weapons?.key ?? next[0]?.key ?? ''
        })
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
  }, [removed, reload])

  useEffect(() => {
    if (!group && !query) return
    const handle = setTimeout(() => {
      const params = new URLSearchParams({
        group,
        q: query,
        missing: missing ? '1' : '0',
        removed: removed ? '1' : '0',
      })
      api<CandidateList>(`/api/candidates?${params}`)
        .then(setList)
        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
    }, 150)
    return () => clearTimeout(handle)
  }, [group, query, missing, removed, reload])

  const current = groups.find((item) => item.key === group) ?? groups.find((item) => item.children.some((child) => child.key === group))

  return (
    <Box sx={{ height: '100%', display: 'flex', minHeight: 0 }}>
      <Box sx={{ width: 240, flexShrink: 0, overflow: 'auto', borderRight: 1, borderColor: 'divider', py: 1 }}>
        {groups.map((item) => (
          <Box key={item.key}>
            <Button
              fullWidth
              color={group === item.key ? 'primary' : 'inherit'}
              sx={{ justifyContent: 'space-between', px: 2, borderRadius: 0 }}
              onClick={() => setGroup(item.key)}
            >
              <span>{item.label}</span>
              <Typography component="span" variant="caption" color="text.secondary">
                {item.held}
              </Typography>
            </Button>
            {item.children.map((child) => (
              <Button
                key={child.key}
                fullWidth
                color={group === child.key ? 'primary' : 'inherit'}
                sx={{ justifyContent: 'space-between', pl: 3.5, pr: 2, borderRadius: 0 }}
                onClick={() => setGroup(child.key)}
              >
                <span>{child.label}</span>
                <Typography component="span" variant="caption" color="text.secondary">
                  {child.held}
                </Typography>
              </Button>
            ))}
          </Box>
        ))}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', px: 2, py: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search names"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button variant={missing ? 'contained' : 'outlined'} onClick={() => setMissing((value) => !value)}>
            Missing card image
          </Button>
        </Box>
        {current && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 1 }}>
            0 done · 0 need attention · {current.key === group ? current.held : (current.children.find((child) => child.key === group)?.held ?? list.total)} in this group
          </Typography>
        )}
        {error && (
          <Typography color="error" sx={{ px: 2, whiteSpace: 'pre-wrap' }}>
            {error}
          </Typography>
        )}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {list.rows.map((row) => (
            <Box
              key={row.id}
              onClick={() => setSelected(row.id)}
              sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'center',
                px: 2,
                py: 1,
                cursor: 'pointer',
                bgcolor: selected === row.id ? 'rgba(46, 230, 214, 0.08)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
              }}
            >
              {row.imageUrl && (
                <Box
                  component="img"
                  src={row.imageUrl}
                  alt=""
                  sx={{ width: 40, height: 40, objectFit: 'contain' }}
                />
              )}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography>{row.name || '(no name)'}</Typography>
                <Typography sx={{ fontFamily: mono, fontSize: 11 }} color="text.secondary" noWrap>
                  {row.path}
                </Typography>
                {row.dedupeReason && (
                  <Typography sx={{ fontSize: 12 }} color="text.secondary">
                    {row.dedupeReason}
                  </Typography>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {row.originLabel}
              </Typography>
              {row.named && <Chip size="small" label="Named" />}
              {row.duplicateCount > 0 && <Chip size="small" color="warning" label="Same name" />}
            </Box>
          ))}
          {list.total > list.shown && (
            <Typography sx={{ px: 2, py: 2 }} color="text.secondary">
              Showing {list.shown} of {list.total}. Type more of the name.
            </Typography>
          )}
          {list.total === 0 && (
            <Typography sx={{ px: 2, py: 4 }} color="text.secondary">
              Nothing in this list.
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ width: 420, flexShrink: 0, borderLeft: 1, borderColor: 'divider', minHeight: 0 }}>
        {selected ? (
          <Detail
            id={selected}
            removed={removed}
            onOpen={(next, groupKey) => {
              setSelected(next)
              if (groupKey) setGroup(groupKey)
            }}
            onChanged={() => {
              setReload((value) => value + 1)
              onChanged()
            }}
          />
        ) : (
          <Typography color="text.secondary" sx={{ p: 3 }}>
            Open a row to see the raw records.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
