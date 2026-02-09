import type { Meta, StoryObj } from '@storybook/react'
import { Select } from './Select'

const meta = {
  title: 'Components/Forms/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    state: {
      control: 'select',
      options: ['default', 'error', 'success'],
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <>
        <option value="">Select an option...</option>
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
        <option value="option3">Option 3</option>
      </>
    ),
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Choose an option',
    children: (
      <>
        <option value="">Select an option...</option>
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
        <option value="option3">Option 3</option>
      </>
    ),
  },
}

export const WithHelperText: Story = {
  args: {
    label: 'Preferred contact method',
    helperText: 'How would you like us to reach you?',
    children: (
      <>
        <option value="">Select...</option>
        <option value="email">Email</option>
        <option value="phone">Phone</option>
        <option value="sms">SMS</option>
      </>
    ),
  },
}

export const WithError: Story = {
  args: {
    label: 'Country',
    errorMessage: 'Please select a country',
    children: (
      <>
        <option value="">Select a country...</option>
        <option value="us">United States</option>
        <option value="ca">Canada</option>
        <option value="mx">Mexico</option>
      </>
    ),
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: (
      <>
        <option value="">Small select...</option>
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
      </>
    ),
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: (
      <>
        <option value="">Large select...</option>
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
      </>
    ),
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled select',
    disabled: true,
    children: (
      <>
        <option value="">Cannot select...</option>
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
      </>
    ),
  },
}

export const MetricUnits: Story = {
  args: {
    label: 'Metric unit',
    helperText: 'Choose the unit for tracking',
    children: (
      <>
        <option value="">Select a unit...</option>
        <optgroup label="Volume">
          <option value="oz">oz</option>
          <option value="cups">cups</option>
          <option value="liters">liters</option>
        </optgroup>
        <optgroup label="Weight">
          <option value="lbs">lbs</option>
          <option value="kg">kg</option>
        </optgroup>
        <optgroup label="Distance">
          <option value="miles">miles</option>
          <option value="km">km</option>
          <option value="steps">steps</option>
        </optgroup>
        <optgroup label="Time">
          <option value="minutes">minutes</option>
          <option value="hours">hours</option>
        </optgroup>
        <optgroup label="Exercise">
          <option value="reps">reps</option>
          <option value="sets">sets</option>
        </optgroup>
        <optgroup label="Other">
          <option value="servings">servings</option>
          <option value="calories">calories</option>
          <option value="pages">pages</option>
        </optgroup>
      </>
    ),
  },
}

export const WithOptgroups: Story = {
  args: {
    label: 'Category selection',
    children: (
      <>
        <option value="">Select...</option>
        <optgroup label="Fruits">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
          <option value="orange">Orange</option>
        </optgroup>
        <optgroup label="Vegetables">
          <option value="carrot">Carrot</option>
          <option value="broccoli">Broccoli</option>
          <option value="spinach">Spinach</option>
        </optgroup>
      </>
    ),
  },
}
