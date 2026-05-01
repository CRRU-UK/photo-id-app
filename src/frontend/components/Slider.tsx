import { FormControl, Label, Stack } from "@primer/react";
import { useState } from "react";

interface SliderProps {
  callback: (value: number) => void;
  disabled?: boolean;
  initial: number;
  max: number;
  min: number;
  name: string;
  simple?: boolean;
}

/**
 * Callers reset the slider by bumping a `key` prop (via the editor's `resetKey`), which remounts
 * the component and re-initialises `value` from `initial`. So no `useEffect` is needed to sync
 * `initial` into local state, and skipping it avoids interrupting the user's drag if `initial`
 * happens to change mid-interaction.
 */
const Slider = ({
  name,
  min,
  max,
  initial,
  disabled = false,
  simple = false,
  callback,
}: SliderProps) => {
  const [value, setValue] = useState<number>(initial);

  return (
    <FormControl className="slider" disabled={disabled}>
      <FormControl.Label style={{ width: "100%" }} visuallyHidden={simple}>
        <Stack align="center" direction="horizontal" justify="space-between">
          {name}
          <Label variant="secondary">
            <pre>{value}</pre>
          </Label>
        </Stack>
      </FormControl.Label>

      <input
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => {
          const newValue = Number(event.target.value);
          setValue(newValue);
          callback(newValue);
        }}
        type="range"
        value={value}
      />
    </FormControl>
  );
};

export default Slider;
