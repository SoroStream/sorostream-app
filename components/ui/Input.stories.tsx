import type { Meta, StoryObj } from "@storybook/react";
import Input from "@/components/ui/Input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  args: { id: "amount", label: "Amount", placeholder: "0.00" },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const WithSuffix: Story = { args: { suffix: "XLM" } };
export const Disabled: Story = { args: { disabled: true, value: "100" } };
