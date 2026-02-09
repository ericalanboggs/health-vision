import type { Meta, StoryObj } from '@storybook/react'
import { Input, Textarea } from './Input'
import { Search, Mail, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const meta: Meta<typeof Input> = {
  title: 'Components/Forms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Clean, focused inputs with an emerald glow ring on focus. Includes text input and textarea variants with support for labels, helper text, and error states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Input size',
    },
    state: {
      control: 'select',
      options: ['default', 'error', 'success'],
      description: 'Visual state',
    },
    label: {
      control: 'text',
      description: 'Label text',
    },
    helperText: {
      control: 'text',
      description: 'Helper text below input',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message (overrides helper text)',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: {
    placeholder: 'Enter your email',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Email address',
    placeholder: 'you@example.com',
  },
}

export const WithHelperText: Story = {
  args: {
    label: 'Habit name',
    placeholder: 'e.g., 10 minute morning walk',
    helperText: 'Choose something small and sustainable',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email address',
    placeholder: 'you@example.com',
    errorMessage: 'Please enter a valid email address',
    defaultValue: 'invalid-email',
  },
}

export const WithSuccess: Story = {
  args: {
    label: 'Username',
    placeholder: 'Choose a username',
    state: 'success',
    defaultValue: 'summit_climber',
    helperText: 'Username is available',
  },
}

export const WithLeftIcon: Story = {
  args: {
    placeholder: 'Search habits...',
    leftIcon: <Search className="h-4 w-4" />,
  },
}

export const WithRightIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    rightIcon: <Mail className="h-4 w-4" />,
  },
}

export const PasswordInput: Story = {
  render: () => {
    const [showPassword, setShowPassword] = useState(false)
    return (
      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
        />
        <button
          type="button"
          className="absolute right-3 top-[38px] text-text-muted hover:text-summit-forest"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input size="sm" placeholder="Small input" />
      <Input size="md" placeholder="Medium input (default)" />
      <Input size="lg" placeholder="Large input" />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    label: 'Disabled input',
    placeholder: 'Cannot edit',
    disabled: true,
    defaultValue: 'Locked value',
  },
}

export const TextareaDefault: Story = {
  render: () => (
    <Textarea
      label="Your vision"
      placeholder="What does feeling your best look like to you?"
      helperText="Take your time to reflect on what truly matters"
    />
  ),
}

export const TextareaWithError: Story = {
  render: () => (
    <Textarea
      label="Reflection"
      placeholder="How did today's climb feel?"
      errorMessage="Please write at least a few words"
      defaultValue="Good"
    />
  ),
}

export const FormExample: Story = {
  render: () => (
    <form className="flex flex-col gap-4">
      <Input
        label="Habit name"
        placeholder="e.g., Morning meditation"
        helperText="What small action will you practice daily?"
      />
      <Input
        label="Target"
        type="number"
        placeholder="10"
        helperText="How many minutes?"
      />
      <Textarea
        label="Why this matters"
        placeholder="How does this habit connect to your North Star?"
        rows={3}
      />
    </form>
  ),
}
