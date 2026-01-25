import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Toggle } from '../components/Toggle'

const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Whether the toggle is on or off',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant of the toggle',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the toggle is disabled',
    },
    onChange: {
      action: 'changed',
      description: 'Callback when toggle state changes',
    },
  },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

// Wrapper component for interactive stories
function ToggleWrapper(props: any) {
  const [checked, setChecked] = useState(props.checked || false)

  return (
    <Toggle
      {...props}
      checked={checked}
      onChange={setChecked}
    />
  )
}

export const Default: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    checked: false,
  },
}

export const Checked: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    checked: true,
  },
}

export const Small: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    size: 'sm',
    checked: false,
  },
}

export const Large: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    size: 'lg',
    checked: false,
  },
}

export const Disabled: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    disabled: true,
    checked: false,
  },
}

export const DisabledChecked: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    disabled: true,
    checked: true,
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6 items-start">
      <div className="flex items-center gap-3">
        <ToggleWrapper size="sm" />
        <span className="text-sm text-text-secondary">Small</span>
      </div>
      <div className="flex items-center gap-3">
        <ToggleWrapper size="md" />
        <span className="text-sm text-text-secondary">Medium (default)</span>
      </div>
      <div className="flex items-center gap-3">
        <ToggleWrapper size="lg" />
        <span className="text-sm text-text-secondary">Large</span>
      </div>
    </div>
  ),
}

export const WithLabel: Story = {
  render: () => {
    const [enabled, setEnabled] = useState(false)

    return (
      <div className="flex items-center gap-3">
        <Toggle checked={enabled} onChange={setEnabled} />
        <label className="text-sm font-medium text-summit-forest">
          {enabled ? 'Enabled' : 'Disabled'}
        </label>
      </div>
    )
  },
}

export const TrackingExample: Story = {
  render: () => {
    const [trackingEnabled, setTrackingEnabled] = useState(false)

    return (
      <div className="w-80 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-summit-forest">Track Details</span>
          <Toggle
            checked={trackingEnabled}
            onChange={setTrackingEnabled}
            size="lg"
          />
        </div>
        {trackingEnabled && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-text-muted">
              Tracking is now enabled. You can log your progress daily.
            </p>
          </div>
        )}
      </div>
    )
  },
}
