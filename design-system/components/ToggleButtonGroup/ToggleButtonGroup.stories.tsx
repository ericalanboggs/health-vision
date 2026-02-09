import type { Meta, StoryObj } from '@storybook/react'
import { ToggleButtonGroup } from './ToggleButtonGroup'
import { useState } from 'react'

const meta = {
  title: 'Components/ToggleButtonGroup',
  component: ToggleButtonGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    fullWidth: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof ToggleButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

// Interactive wrapper for stories
const ToggleButtonGroupDemo = (props: any) => {
  const [value, setValue] = useState(props.value || props.options[0]?.value)

  return (
    <ToggleButtonGroup
      {...props}
      value={value}
      onChange={setValue}
    />
  )
}

export const Default: Story = {
  render: (args) => <ToggleButtonGroupDemo {...args} />,
  args: {
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    size: 'md',
  },
}

export const YesNoMetrics: Story = {
  render: (args) => <ToggleButtonGroupDemo {...args} />,
  args: {
    options: [
      { value: 'yn', label: 'Y/N' },
      { value: 'metrics', label: 'Metrics' },
    ],
    size: 'md',
  },
}

export const ThreeOptions: Story = {
  render: (args) => <ToggleButtonGroupDemo {...args} />,
  args: {
    options: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
    ],
    size: 'md',
  },
}

export const FourOptions: Story = {
  render: (args) => <ToggleButtonGroupDemo {...args} />,
  args: {
    options: [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' },
      { value: 'archived', label: 'Archived' },
    ],
    size: 'md',
  },
}

export const Small: Story = {
  render: (args) => <ToggleButtonGroupDemo {...args} />,
  args: {
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    size: 'sm',
  },
}

export const Large: Story = {
  render: (args) => <ToggleButtonGroupDemo {...args} />,
  args: {
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    size: 'lg',
  },
}

export const FullWidth: Story = {
  render: (args) => (
    <div className="w-96">
      <ToggleButtonGroupDemo {...args} />
    </div>
  ),
  args: {
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    size: 'md',
    fullWidth: true,
  },
}

export const WithDisabledOption: Story = {
  render: (args) => <ToggleButtonGroupDemo {...args} />,
  args: {
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'maybe', label: 'Maybe', disabled: true },
    ],
    size: 'md',
  },
}

export const WithDescription: Story = {
  render: (args) => (
    <div className="space-y-4 max-w-md">
      <div>
        <h3 className="text-sm font-medium text-summit-forest mb-2">
          Track you did it, yes or no.
        </h3>
        <ToggleButtonGroupDemo {...args} />
      </div>
    </div>
  ),
  args: {
    options: [
      { value: 'yn', label: 'Y/N' },
      { value: 'metrics', label: 'Metrics' },
    ],
    size: 'md',
  },
}

export const MultipleGroups: Story = {
  args: {
    options: [
      { value: 'yn', label: 'Y/N' },
      { value: 'metrics', label: 'Metrics' },
    ],
  },
  render: () => {
    const [tracking, setTracking] = useState('yn')
    const [frequency, setFrequency] = useState('daily')

    return (
      <div className="space-y-6 max-w-md">
        <div>
          <label className="block text-sm font-medium text-summit-forest mb-2">
            Tracking Type
          </label>
          <ToggleButtonGroup
            options={[
              { value: 'yn', label: 'Y/N' },
              { value: 'metrics', label: 'Metrics' },
            ]}
            value={tracking}
            onChange={setTracking}
            fullWidth
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-summit-forest mb-2">
            Frequency
          </label>
          <ToggleButtonGroup
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={frequency}
            onChange={setFrequency}
            fullWidth
          />
        </div>
      </div>
    )
  },
}
