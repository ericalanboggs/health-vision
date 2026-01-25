import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './Checkbox'
import { useState } from 'react'

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Tactile circular checkboxes with a satisfying "pop" animation on check. Designed for habit tracking and task completion with a large touch target (32px default).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Checkbox size (sm: 24px, md: 32px, lg: 40px)',
    },
    shape: {
      control: 'select',
      options: ['circle', 'rounded'],
      description: 'Checkbox shape',
    },
    label: {
      control: 'text',
      description: 'Label text',
    },
    description: {
      control: 'text',
      description: 'Description below label',
    },
    checked: {
      control: 'boolean',
      description: 'Controlled checked state',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the checkbox',
    },
    indeterminate: {
      control: 'boolean',
      description: 'Show indeterminate state',
    },
  },
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Default: Story = {
  args: {
    label: 'Morning meditation',
  },
}

export const Checked: Story = {
  args: {
    label: 'Morning meditation',
    defaultChecked: true,
  },
}

export const WithDescription: Story = {
  args: {
    label: '10 minute walk',
    description: 'A gentle movement to start the day',
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Checkbox size="sm" label="Small checkbox (24px)" />
      <Checkbox size="md" label="Medium checkbox (32px) - Default" />
      <Checkbox size="lg" label="Large checkbox (40px)" />
    </div>
  ),
}

export const Shapes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Checkbox shape="circle" label="Circle (default)" />
      <Checkbox shape="rounded" label="Rounded square" />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    label: 'Disabled checkbox',
    disabled: true,
  },
}

export const DisabledChecked: Story = {
  args: {
    label: 'Disabled and checked',
    disabled: true,
    defaultChecked: true,
  },
}

export const Indeterminate: Story = {
  args: {
    label: 'Select all habits',
    indeterminate: true,
  },
}

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className="flex flex-col gap-4">
        <Checkbox
          label="Controlled checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <p className="text-sm text-text-muted">
          State: {checked ? 'Checked' : 'Unchecked'}
        </p>
      </div>
    )
  },
}

export const HabitList: Story = {
  render: () => {
    const [habits, setHabits] = useState([
      { id: 1, name: 'Morning meditation', description: '10 minutes', done: true },
      { id: 2, name: 'Drink 8 glasses of water', description: 'Stay hydrated', done: true },
      { id: 3, name: '30 minute walk', description: 'After lunch', done: false },
      { id: 4, name: 'Evening journaling', description: 'Reflect on the day', done: false },
    ])

    const toggleHabit = (id: number) => {
      setHabits(habits.map(h =>
        h.id === id ? { ...h, done: !h.done } : h
      ))
    }

    return (
      <div className="w-80 rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-4 text-lg font-semibold text-summit-forest">Today's Habits</h3>
        <div className="flex flex-col gap-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center rounded-lg bg-surface-page p-3"
            >
              <Checkbox
                checked={habit.done}
                onChange={() => toggleHabit(habit.id)}
                label={habit.name}
                description={habit.description}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-text-muted">
          {habits.filter(h => h.done).length} of {habits.length} completed
        </div>
      </div>
    )
  },
}

export const CheckboxOnly: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Checkbox aria-label="Option 1" />
      <Checkbox aria-label="Option 2" defaultChecked />
      <Checkbox aria-label="Option 3" />
    </div>
  ),
}

export const AnimationDemo: Story = {
  render: () => (
    <div className="text-center">
      <p className="mb-4 text-sm text-text-muted">
        Click the checkbox to see the "pop" animation
      </p>
      <Checkbox size="lg" label="Click me!" />
    </div>
  ),
}
