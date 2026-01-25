import { addons } from '@storybook/manager-api'
import { create } from '@storybook/theming/create'

const summitTheme = create({
  base: 'light',

  // Brand
  brandTitle: 'Summit Design System',
  brandUrl: 'https://summithealth.app',
  brandTarget: '_blank',

  // UI Colors
  colorPrimary: '#10B981',
  colorSecondary: '#059669',

  // UI
  appBg: '#F0FDFA',
  appContentBg: '#FFFFFF',
  appPreviewBg: '#F0FDFA',
  appBorderColor: '#D1FAE5',
  appBorderRadius: 8,

  // Text colors
  textColor: '#064E3B',
  textInverseColor: '#FFFFFF',
  textMutedColor: 'rgba(6, 78, 59, 0.5)',

  // Toolbar default and active colors
  barTextColor: '#064E3B',
  barSelectedColor: '#10B981',
  barHoverColor: '#059669',
  barBg: '#FFFFFF',

  // Form colors
  inputBg: '#FFFFFF',
  inputBorder: '#D1FAE5',
  inputTextColor: '#064E3B',
  inputBorderRadius: 6,

  // Button colors
  buttonBg: '#10B981',
  buttonBorder: '#10B981',

  // Boolean inputs
  booleanBg: '#D1FAE5',
  booleanSelectedBg: '#10B981',

  // Typography
  fontBase: '"Inter", system-ui, -apple-system, sans-serif',
  fontCode: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
})

addons.setConfig({
  theme: summitTheme,
  sidebar: {
    showRoots: true,
    collapsedRoots: [],
  },
})
