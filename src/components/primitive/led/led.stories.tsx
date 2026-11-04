import type { Meta, StoryObj } from "@storybook/react-vite";

import { markingClasses } from "../instrument.styles";
import { Led } from "./led";
import { ledBezelClasses, twSignal, twSize, twState } from "./led.styles";

const signalOptions = Object.keys(twSignal) as Array<keyof typeof twSignal>;
const stateOptions = Object.keys(twState) as Array<keyof typeof twState>;
const sizeOptions = Object.keys(twSize) as Array<keyof typeof twSize>;

/*===== Meta =====*/
const meta = {
  title: "Primitive/Led",
  component: Led,
  args: { signal: "action", state: "on", label: "در حال ضبط" },
  argTypes: {
    signal: { control: "select", options: signalOptions },
    state: { control: "select", options: stateOptions },
    size: { control: "select", options: sizeOptions },
  },
} satisfies Meta<typeof Led>;

export default meta;
type Story = StoryObj<typeof meta>;

/*===== Stories =====*/
export const Playground: Story = {};

// Every signal in every state. The printed word beside each LED is what carries the meaning.
export const Signals: Story = {
  render: () => (
    <div className="grid w-fit grid-cols-4 gap-x-8 gap-y-4">
      {stateOptions.map((state) =>
        signalOptions.map((signal) => (
          <span key={`${signal}-${state}`} className="flex items-center gap-2">
            <Led signal={signal} state={state} />
            <span className={markingClasses}>
              {signal} / {state}
            </span>
          </span>
        )),
      )}
    </div>
  ),
};

// A level meter: bars in a black bezel, lit in the display's ink, with only the top cell orange.
export const Meter: Story = {
  render: () => (
    <div className="flex w-fit flex-col gap-3">
      {[1, 2, 3, 4].map((level) => (
        <span key={level} className={ledBezelClasses}>
          {(["glass", "glass", "glass", "action"] as const).map((signal, index) => (
            <Led key={index} signal={signal} size="bar" state={index < level ? "on" : "off"} />
          ))}
        </span>
      ))}
    </div>
  ),
};

// The meanings the app uses. Blinking is for live states only.
export const InUse: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <span className="flex items-center gap-2">
        <Led signal="positive" state="blink" />
        <span className={markingClasses}>در حال اجرا</span>
      </span>
      <span className="flex items-center gap-2">
        <Led signal="attention" state="on" />
        <span className={markingClasses}>مکث</span>
      </span>
      <span className="flex items-center gap-2">
        <Led signal="attention" state="blink" />
        <span className={markingClasses}>مسدود</span>
      </span>
      <span className="flex items-center gap-2">
        <Led signal="selection" state="on" />
        <span className={markingClasses}>انتخاب‌شده</span>
      </span>
      <span className="flex items-center gap-2">
        <Led signal="action" state="off" />
        <span className={markingClasses}>آماده</span>
      </span>
    </div>
  ),
};
