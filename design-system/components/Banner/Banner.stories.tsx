import type { Meta, StoryObj } from '@storybook/react'
import { Banner } from './Banner'
import { Info, AlertTriangle, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'

const meta: Meta<typeof Banner> = {
  title: 'Components/Feedback/Banner',
  component: Banner,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Contextual banners for alerts, tips, and status messages. Supports icon slots, bold titles, body copy, and an optional dismiss button across 5 color variants.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'info', 'warning', 'success', 'error'],
      description: 'Visual variant',
    },
    dismissible: {
      control: 'boolean',
      description: 'Show dismiss button',
    },
    title: {
      control: 'text',
      description: 'Bold title text',
    },
  },
}

export default meta
type Story = StoryObj<typeof Banner>

export const Default: Story = {
  args: {
    title: 'Welcome to Summit',
    children: 'Track your habits and build a healthier lifestyle, one day at a time.',
  },
}

export const WithIcon: Story = {
  args: {
    icon: <Info className="h-5 w-5 text-sky-500" />,
    variant: 'info',
    title: 'Quick Tip',
    children: 'You can long-press any habit to reorder your dashboard.',
  },
}

export const Dismissible: Story = {
  render: () => {
    const [visible, setVisible] = useState(true)

    if (!visible) {
      return (
        <button
          className="text-sm text-summit-emerald underline"
          onClick={() => setVisible(true)}
        >
          Show banner again
        </button>
      )
    }

    return (
      <Banner
        title="Heads up"
        dismissible
        onDismiss={() => setVisible(false)}
      >
        This banner can be dismissed. Click the X to hide it.
      </Banner>
    )
  },
}

export const InfoVariant: Story = {
  name: 'Info',
  args: {
    variant: 'info',
    icon: <Info className="h-5 w-5 text-sky-500" />,
    title: 'Did you know?',
    children: 'Streaks reset at midnight in your local timezone.',
  },
}

export const WarningVariant: Story = {
  name: 'Warning',
  args: {
    variant: 'warning',
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    title: 'Streak at risk',
    children: "You haven't logged today's habits yet. Complete at least one to keep your streak alive.",
  },
}

export const SuccessVariant: Story = {
  name: 'Success',
  args: {
    variant: 'success',
    icon: <CheckCircle className="h-5 w-5 text-summit-emerald" />,
    title: 'All habits complete!',
    children: 'Great work — you finished everything on your list for today.',
  },
}

export const ErrorVariant: Story = {
  name: 'Error',
  args: {
    variant: 'error',
    icon: <XCircle className="h-5 w-5 text-red-500" />,
    title: 'Sync failed',
    children: "We couldn't save your latest changes. Check your connection and try again.",
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Banner title="Default" variant="default">
        The default banner style.
      </Banner>
      <Banner title="Info" variant="info" icon={<Info className="h-5 w-5 text-sky-500" />}>
        Informational context for the user.
      </Banner>
      <Banner title="Warning" variant="warning" icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}>
        Something needs attention.
      </Banner>
      <Banner title="Success" variant="success" icon={<CheckCircle className="h-5 w-5 text-summit-emerald" />}>
        Action completed successfully.
      </Banner>
      <Banner title="Error" variant="error" icon={<XCircle className="h-5 w-5 text-red-500" />}>
        Something went wrong.
      </Banner>
    </div>
  ),
  name: 'All Variants',
}

export const BodyOnly: Story = {
  args: {
    children: 'This banner has body copy only — no title or icon.',
  },
  name: 'Body Only',
}

export const Onboarding: Story = {
  render: () => {
    const [visible, setVisible] = useState(true)

    if (!visible) {
      return (
        <button
          className="text-sm text-summit-emerald underline"
          onClick={() => setVisible(true)}
        >
          Show banner again
        </button>
      )
    }

    return (
      <Banner
        variant="info"
        icon={<Sparkles className="h-5 w-5 text-sky-500" />}
        title="Welcome to Summit!"
        dismissible
        onDismiss={() => setVisible(false)}
      >
        Start by adding your first habit. We recommend beginning with something small
        — like drinking a glass of water each morning — and building from there.
      </Banner>
    )
  },
  name: 'Example - Onboarding',
}
