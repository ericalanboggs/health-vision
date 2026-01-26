import type { Preview } from '@storybook/react'
import React from 'react'
import '../styles.css'
import './typography-docs.css'

const preview: Preview = {
  decorators: [
    (Story) => (
      React.createElement('div', {
        style: {
          minHeight: '100vh',
          background: 'linear-gradient(to bottom, #FFFFFF, #F0FDFA)',
          padding: '2rem',
        }
      }, React.createElement(Story))
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
    },
    layout: 'fullscreen',
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
