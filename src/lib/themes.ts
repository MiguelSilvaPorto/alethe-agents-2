import type { Theme } from './types'

export type ThemeOption = {
  id: Theme
  label: string
  description: string
  colors: [string, string, string]
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Escuro',
    description: 'Neutro, alto contraste e discreto.',
    colors: ['#101114', '#2a2d33', '#f3f4f6'],
  },
  {
    id: 'light',
    label: 'Claro',
    description: 'Superfícies claras para ambientes iluminados.',
    colors: ['#f6f7fb', '#ffffff', '#18181b'],
  },
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'Roxo, ciano e rosa no padrão clássico Dracula.',
    colors: ['#282a36', '#bd93f9', '#ff79c6'],
  },
  {
    id: 'nord',
    label: 'Nord',
    description: 'Azuis frios e contraste suave.',
    colors: ['#2e3440', '#88c0d0', '#a3be8c'],
  },
  {
    id: 'gruvbox',
    label: 'Gruvbox',
    description: 'Tema quente retrô com tons terrosos.',
    colors: ['#282828', '#fabd2f', '#b8bb26'],
  },
  {
    id: 'solarized',
    label: 'Solarized',
    description: 'Base azul-petróleo e contraste calibrado.',
    colors: ['#002b36', '#268bd2', '#b58900'],
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    description: 'Azul escuro moderno com acentos vibrantes.',
    colors: ['#1a1b26', '#7aa2f7', '#bb9af7'],
  },
  {
    id: 'vscode',
    label: 'VS Code',
    description: 'Paleta Dark+ padrão do Visual Studio Code.',
    colors: ['#1e1e1e', '#007acc', '#cccccc'],
  },
  {
    id: 'min-dark',
    label: 'Min Dark',
    description: 'Paleta minimalista do Min Theme para ambientes escuros.',
    colors: ['#1f1f1f', '#fafafa', '#888888'],
  },
  {
    id: 'min-light',
    label: 'Min Light',
    description: 'Paleta minimalista do Min Theme para ambientes claros.',
    colors: ['#ffffff', '#1976D2', '#6f42c1'],
  },
  {
    id: 'dark-lemon',
    label: 'Dark Lemon',
    description: 'Quase preto com acento limão e sintaxe Material.',
    colors: ['#141414', '#ffff50', '#c792ea'],
  },
]

export const THEME_LABEL: Record<Theme, string> = Object.fromEntries(
  THEME_OPTIONS.map((theme) => [theme.id, theme.label]),
) as Record<Theme, string>
