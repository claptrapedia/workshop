import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2ee6d6' },
    warning: { main: '#f0b429' },
    error: { main: '#ff5d6c' },
    background: { default: '#07080d', paper: '#10141c' },
    text: { primary: '#f4f7fb', secondary: '#93a0b5' },
    divider: '#2a3142',
  },
  typography: {
    fontFamily: '"Outfit", "Avenir Next", sans-serif',
    h1: { fontWeight: 600, letterSpacing: '-0.03em' },
    h2: { fontWeight: 600, letterSpacing: '-0.03em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#07080d' },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
})

export const mono = '"IBM Plex Mono", ui-monospace, monospace'
