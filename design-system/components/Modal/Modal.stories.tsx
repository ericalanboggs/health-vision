import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalCallout,
} from './Modal'
import { Button } from '../Button'

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Modal>

// Interactive wrapper for demos
const ModalDemo = ({
  variant,
  size,
  overlay,
}: {
  variant?: 'default' | 'gradient' | 'gradient-glow' | 'feature'
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  overlay?: 'default' | 'light' | 'dark' | 'blur'
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        variant={variant}
        size={size}
        overlay={overlay}
      >
        <ModalHeader badge="Welcome" badgeVariant="success">
          <ModalTitle>You're set to go 🎉</ModalTitle>
          <ModalDescription>
            Everything is configured and ready.
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          <p className="text-stone-700 leading-relaxed">
            Take a moment to update anything you want right now—or feel free to
            jump out and get on with your day. Nothing here needs to be perfect.
          </p>

          <p className="text-stone-700 leading-relaxed">
            If you opted in to SMS reminders, we'll text you to help you stay
            consistent with your habits.
          </p>

          <ModalCallout>
            <h3 className="font-semibold text-summit-forest mb-2">Need help?</h3>
            <ul className="space-y-1 text-sm text-stone-700">
              <li>• For technical issues, email support</li>
              <li>• For coaching, use the booking link</li>
            </ul>
          </ModalCallout>

          <p className="text-summit-forest font-medium text-center pt-2">
            Let's do it. Small steps. Consistent progress.
          </p>
        </ModalBody>

        <ModalFooter>
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full bg-summit-emerald hover:bg-emerald-700 text-white"
            size="lg"
          >
            Alright!
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export const Default: Story = {
  render: () => <ModalDemo variant="default" />,
}

export const Gradient: Story = {
  render: () => <ModalDemo variant="gradient" />,
  parameters: {
    docs: {
      description: {
        story:
          'Subtle gradient from white to mint, adding depth and a premium feel.',
      },
    },
  },
}

export const GradientGlow: Story = {
  render: () => <ModalDemo variant="gradient-glow" />,
  parameters: {
    docs: {
      description: {
        story:
          'Ambient emerald glow effect using a pseudo-element overlay.',
      },
    },
  },
}

export const Feature: Story = {
  render: () => <ModalDemo variant="feature" />,
  parameters: {
    docs: {
      description: {
        story:
          'Feature variant with mint gradient and subtle border, ideal for announcements.',
      },
    },
  },
}

export const BlurOverlay: Story = {
  render: () => <ModalDemo variant="gradient" overlay="blur" />,
  parameters: {
    docs: {
      description: {
        story: 'Frosted glass effect with backdrop blur on the overlay.',
      },
    },
  },
}

export const SmallSize: Story = {
  render: () => <ModalDemo variant="default" size="sm" />,
}

export const LargeSize: Story = {
  render: () => <ModalDemo variant="default" size="xl" />,
}

// Confirmation dialog example
const ConfirmationDemo = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Delete Item
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="sm"
        variant="default"
      >
        <ModalHeader bordered={false}>
          <ModalTitle>Delete this item?</ModalTitle>
          <ModalDescription>
            This action cannot be undone.
          </ModalDescription>
        </ModalHeader>

        <ModalFooter align="right">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setIsOpen(false)}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export const ConfirmationDialog: Story = {
  render: () => <ConfirmationDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Compact confirmation dialog without body content.',
      },
    },
  },
}
