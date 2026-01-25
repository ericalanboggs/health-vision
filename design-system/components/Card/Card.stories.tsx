import type { Meta, StoryObj } from '@storybook/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FeatureCard,
} from './Card'
import { Button } from '../Button'
import { Tag, Badge } from '../Tag'
import { Checkbox } from '../Checkbox'
import { ArrowRight, Mountain, Target, Sparkles } from 'lucide-react'

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Floating, shadow-based cards with minimal borders. Cards provide a subtle elevation effect and can be interactive or static.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'ghost', 'feature'],
      description: 'Visual variant',
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Internal padding',
    },
    radius: {
      control: 'select',
      options: ['none', 'md', 'lg', 'xl'],
      description: 'Border radius',
    },
    interactive: {
      control: 'boolean',
      description: 'Enable hover/click effects',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>
            This is a description of the card content.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <p className="text-text-secondary">
            Cards are floating containers with subtle shadows, designed to feel
            light and modern.
          </p>
        </CardContent>
      </>
    ),
  },
}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Card variant="default">
        <CardTitle>Default</CardTitle>
        <p className="mt-2 text-sm text-text-secondary">Subtle shadow</p>
      </Card>
      <Card variant="elevated">
        <CardTitle>Elevated</CardTitle>
        <p className="mt-2 text-sm text-text-secondary">More prominent shadow</p>
      </Card>
      <Card variant="outlined">
        <CardTitle>Outlined</CardTitle>
        <p className="mt-2 text-sm text-text-secondary">Border, no shadow</p>
      </Card>
      <Card variant="feature">
        <CardTitle>Feature</CardTitle>
        <p className="mt-2 text-sm text-text-secondary">Gradient background</p>
      </Card>
    </div>
  ),
}

export const Interactive: Story = {
  args: {
    interactive: true,
    children: (
      <>
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
          <CardDescription>Click or hover to see the effect</CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <p className="text-text-secondary">
            Interactive cards scale slightly on hover and have enhanced shadows.
          </p>
        </CardContent>
      </>
    ),
  },
}

export const WithActions: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Morning Meditation</CardTitle>
          <CardDescription>Start each day with clarity</CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <p className="text-text-secondary">
            A 10-minute guided meditation to center your mind and set intentions
            for the day ahead.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" size="sm">
            Learn More
          </Button>
          <Button size="sm">
            Start Practice
          </Button>
        </CardFooter>
      </>
    ),
  },
}

export const HabitCard: Story = {
  render: () => (
    <Card>
      <div className="flex items-start justify-between">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Daily Walk</CardTitle>
            <Badge variant="success" size="sm">7</Badge>
          </div>
          <CardDescription>30 minutes after lunch</CardDescription>
        </CardHeader>
        <Checkbox defaultChecked aria-label="Mark complete" />
      </div>
      <CardContent className="mt-4">
        <div className="flex gap-2">
          <Tag size="sm">Fitness</Tag>
          <Tag size="sm">Afternoon</Tag>
        </div>
      </CardContent>
    </Card>
  ),
}

export const VisionCard: Story = {
  render: () => (
    <Card variant="feature" padding="lg">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-summit-moss">
        Your North Star
      </div>
      <h2 className="mb-4 text-2xl font-bold text-summit-forest">
        Feel energized and present for my family
      </h2>
      <p className="text-text-secondary">
        Building a foundation of health that allows me to show up fully in every
        moment, with the energy to play, engage, and be truly present.
      </p>
      <CardFooter>
        <Button variant="ghost" rightIcon={<ArrowRight className="h-4 w-4" />}>
          Edit Vision
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const StatsCard: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>This Week's Progress</CardTitle>
      </CardHeader>
      <CardContent className="mt-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-text-secondary">5 of 7 days</span>
          <span className="font-semibold text-summit-forest">71%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-summit-sage">
          <div
            className="h-full rounded-full bg-summit-emerald transition-all duration-slowest"
            style={{ width: '71%' }}
          />
        </div>
        <p className="mt-3 text-sm text-text-muted">
          You're building great momentum!
        </p>
      </CardContent>
    </Card>
  ),
}

export const FeatureCardExample: Story = {
  render: () => (
    <FeatureCard
      illustration={
        <div className="flex h-32 items-center justify-center rounded-lg bg-summit-sage">
          <Mountain className="h-16 w-16 text-summit-moss" />
        </div>
      }
      illustrationPosition="right"
    >
      <div className="text-sm font-semibold uppercase tracking-wide text-summit-moss">
        Feature
      </div>
      <h3 className="mt-2 text-xl font-bold text-summit-forest">
        Track Your Ascent
      </h3>
      <p className="mt-2 text-text-secondary">
        Visualize your progress with beautiful charts and celebrate every
        milestone.
      </p>
      <Button className="mt-4" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
        Learn More
      </Button>
    </FeatureCard>
  ),
}

export const CardGrid: Story = {
  render: () => (
    <div className="grid w-[800px] grid-cols-3 gap-4">
      {[
        { icon: Mountain, title: 'Vision', desc: 'Define your North Star' },
        { icon: Target, title: 'Habits', desc: 'Build daily practices' },
        { icon: Sparkles, title: 'Reflect', desc: 'Weekly insights' },
      ].map((item) => (
        <Card key={item.title} interactive className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-summit-sage">
            <item.icon className="h-6 w-6 text-summit-moss" />
          </div>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription className="mt-1">{item.desc}</CardDescription>
        </Card>
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: 'auto' }}>
        <Story />
      </div>
    ),
  ],
}

export const EmptyState: Story = {
  render: () => (
    <Card variant="outlined" className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-summit-mint">
        <Mountain className="h-8 w-8 text-summit-moss" />
      </div>
      <CardTitle>No habits yet</CardTitle>
      <CardDescription className="mt-1">
        Start your climb by adding a small, daily practice.
      </CardDescription>
      <CardFooter className="justify-center">
        <Button>Add Your First Habit</Button>
      </CardFooter>
    </Card>
  ),
}
