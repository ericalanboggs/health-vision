import type { Preview } from '@storybook/react'
import '../styles.css'
import './typography-docs.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'Summit Mint',
      values: [
        {
          name: 'Summit Mint',
          value: '#F0FDFA',
        },
        {
          name: 'White',
          value: '#FFFFFF',
        },
        {
          name: 'Summit Forest',
          value: '#064E3B',
        },
      ],
    },
    layout: 'centered',
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'sun',
        items: ['light'],
        showName: true,
      },
    },
  },
}

export default preview
