import type { Meta, StoryObj } from '@storybook/react'
import { Tag, Badge } from './Tag'
import { Flame, Star, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'

const meta: Meta<typeof Tag> = {
  title: 'Components/Tag',
  component: Tag,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Tone-on-tone tags and badges for categorization and status. Tags are pill-shaped by default with a soft sage background and forest text.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info', 'outline'],
      description: 'Visual variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tag size',
    },
    shape: {
      control: 'select',
      options: ['default', 'pill'],
      description: 'Tag shape',
    },
    removable: {
      control: 'boolean',
      description: 'Show remove button',
    },
    children: {
      control: 'text',
      description: 'Tag content',
    },
  },
}

export default meta
type Story = StoryObj<typeof Tag>

export const Default: Story = {
  args: {
    children: 'Habit',
  },
}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag variant="default">Default</Tag>
      <Tag variant="primary">Primary</Tag>
      <Tag variant="secondary">Secondary</Tag>
      <Tag variant="success">Success</Tag>
      <Tag variant="warning">Warning</Tag>
      <Tag variant="error">Error</Tag>
      <Tag variant="info">Info</Tag>
      <Tag variant="outline">Outline</Tag>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Tag size="sm">Small</Tag>
      <Tag size="md">Medium</Tag>
      <Tag size="lg">Large</Tag>
    </div>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag icon={<Flame className="h-3.5 w-3.5" />} variant="primary">
        7 day streak
      </Tag>
      <Tag icon={<Star className="h-3.5 w-3.5" />} variant="default">
        Featured
      </Tag>
      <Tag icon={<Clock className="h-3.5 w-3.5" />} variant="secondary">
        5 min
      </Tag>
    </div>
  ),
}

export const Removable: Story = {
  render: () => {
    const [tags, setTags] = useState(['Morning', 'Exercise', 'Meditation', 'Reading'])

    return (
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Tag
            key={tag}
            removable
            onRemove={() => setTags(tags.filter((t) => t !== tag))}
          >
            {tag}
          </Tag>
        ))}
        {tags.length === 0 && (
          <span className="text-sm text-text-muted">All tags removed</span>
        )}
      </div>
    )
  },
}

export const StatusTags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag variant="success" icon={<CheckCircle className="h-3.5 w-3.5" />}>
        Completed
      </Tag>
      <Tag variant="warning" icon={<Clock className="h-3.5 w-3.5" />}>
        In Progress
      </Tag>
      <Tag variant="error" icon={<AlertCircle className="h-3.5 w-3.5" />}>
        Missed
      </Tag>
      <Tag variant="info" icon={<Star className="h-3.5 w-3.5" />}>
        New
      </Tag>
    </div>
  ),
}

export const CategoryTags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag>Health</Tag>
      <Tag>Mindfulness</Tag>
      <Tag>Fitness</Tag>
      <Tag>Nutrition</Tag>
      <Tag>Sleep</Tag>
    </div>
  ),
}

// Badge stories
export const BadgeDefault: Story = {
  render: () => <Badge>3</Badge>,
  name: 'Badge - Default',
}

export const BadgeVariants: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge variant="default">5</Badge>
      <Badge variant="primary">3</Badge>
      <Badge variant="success">12</Badge>
      <Badge variant="warning">!</Badge>
      <Badge variant="error">99+</Badge>
      <Badge variant="info">New</Badge>
    </div>
  ),
  name: 'Badge - Variants',
}

export const BadgeSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge size="sm">2</Badge>
      <Badge size="md">5</Badge>
      <Badge size="lg">10</Badge>
    </div>
  ),
  name: 'Badge - Sizes',
}

export const BadgeWithIcon: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="relative">
        <span className="text-summit-forest">Notifications</span>
        <Badge variant="error" size="sm" className="absolute -right-6 -top-2">
          3
        </Badge>
      </div>
      <div className="relative">
        <span className="text-summit-forest">Messages</span>
        <Badge variant="primary" size="sm" className="absolute -right-8 -top-2">
          12
        </Badge>
      </div>
    </div>
  ),
  name: 'Badge - Positioned',
}

export const HabitCardExample: Story = {
  render: () => (
    <div className="w-80 rounded-xl bg-white p-4 shadow-card">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-semibold text-summit-forest">Morning Meditation</h3>
        <Badge variant="success" size="sm">7</Badge>
      </div>
      <p className="mb-3 text-sm text-text-secondary">
        Start each day with 10 minutes of mindful breathing
      </p>
      <div className="flex gap-2">
        <Tag size="sm">Mindfulness</Tag>
        <Tag size="sm">Morning</Tag>
        <Tag size="sm" variant="secondary">10 min</Tag>
      </div>
    </div>
  ),
  name: 'Example - Habit Card',
}
