import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { ArrowRight, Plus, Check, Trash2 } from 'lucide-react'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Pill-shaped, tactile buttons with satisfying hover and click animations. Use the primary variant for main CTAs and secondary/ghost for less prominent actions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'link'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'icon', 'icon-sm', 'icon-lg'],
      description: 'Button size',
    },
    shape: {
      control: 'select',
      options: ['default', 'pill'],
      description: 'Button shape (pill for rounded ends)',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether button takes full width',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button',
    },
    children: {
      control: 'text',
      description: 'Button label',
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    children: 'Begin Your Ascent',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Learn More',
    variant: 'secondary',
  },
}

export const Ghost: Story = {
  args: {
    children: 'Cancel',
    variant: 'ghost',
  },
}

export const Danger: Story = {
  args: {
    children: 'Delete Habit',
    variant: 'danger',
  },
}

export const Link: Story = {
  args: {
    children: 'View all habits',
    variant: 'link',
  },
}

export const PillShape: Story = {
  args: {
    children: 'Get Started',
    variant: 'primary',
    shape: 'pill',
  },
}

export const WithLeftIcon: Story = {
  args: {
    children: 'Add Habit',
    variant: 'primary',
    leftIcon: <Plus className="h-4 w-4" />,
  },
}

export const WithRightIcon: Story = {
  args: {
    children: 'Continue',
    variant: 'primary',
    rightIcon: <ArrowRight className="h-4 w-4" />,
  },
}

export const IconOnly: Story = {
  args: {
    children: <Plus className="h-5 w-5" />,
    variant: 'primary',
    size: 'icon',
    'aria-label': 'Add new item',
  },
}

export const Loading: Story = {
  args: {
    children: 'Saving...',
    variant: 'primary',
    loading: true,
  },
}

export const Disabled: Story = {
  args: {
    children: 'Submit',
    variant: 'primary',
    disabled: true,
  },
}

export const FullWidth: Story = {
  args: {
    children: 'Save Changes',
    variant: 'primary',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="primary" shape="pill">Primary Pill</Button>
        <Button variant="secondary" shape="pill">Secondary Pill</Button>
        <Button variant="ghost" shape="pill">Ghost Pill</Button>
      </div>
    </div>
  ),
}

export const IconButtons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button variant="primary" size="icon-sm" aria-label="Add">
        <Plus className="h-4 w-4" />
      </Button>
      <Button variant="primary" size="icon" aria-label="Complete">
        <Check className="h-5 w-5" />
      </Button>
      <Button variant="danger" size="icon-lg" aria-label="Delete">
        <Trash2 className="h-6 w-6" />
      </Button>
    </div>
  ),
}

export const ButtonGroup: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Save Changes</Button>
    </div>
  ),
}
