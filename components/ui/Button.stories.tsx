import type { Meta, StoryObj } from "@storybook/react";
import Button from "@/components/ui/Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  argTypes: {
    variant: { control: "select", options: ["primary", "danger", "outline", "ghost"] },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: { children: "Create stream", variant: "primary" },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Danger: Story = { args: { variant: "danger", children: "Cancel stream" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const FullWidth: Story = { args: { fullWidth: true } };
export const Disabled: Story = { args: { disabled: true } };
