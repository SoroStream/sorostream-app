import type { Meta, StoryObj } from "@storybook/react";
import Tooltip from "@/components/ui/Tooltip";

/**
 * Accessible tooltip — opens on hover, keyboard focus, or Enter/Space,
 * and closes on Escape or blur.
 */
const meta: Meta<typeof Tooltip> = {
  title: "UI/Tooltip",
  component: Tooltip,
  argTypes: { align: { control: "select", options: ["left", "right"] } },
  args: {
    label: "What is a metadata URI?",
    children: "A URI pointing to metadata about this stream.",
  },
  decorators: [(Story) => <div style={{ padding: "8rem 16rem" }}><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {};
export const AlignRight: Story = { args: { align: "right" } };
