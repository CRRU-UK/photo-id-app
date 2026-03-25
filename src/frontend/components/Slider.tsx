import { FormControl, Label, Stack } from "@primer/react";
import { useEffect, useState } from "react";

interface SliderProps {
  name: string;
  min: number;
  max: number;
  initial: number;
  disabled?: boolean;
  simple?: boolean;
  callback: (value: number) => void;
}

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

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  return (
    <FormControl disabled={disabled}>
      <FormControl.Label visuallyHidden={simple} style={{ width: "100%" }}>
        <Stack direction="horizontal" align="center" justify="space-between">
          {name}
          <Label variant="secondary">
            <pre>{value}</pre>
          </Label>
        </Stack>
      </FormControl.Label>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const newValue = Number(event.target.value);
          setValue(newValue);
          callback(newValue);
        }}
      />
    </FormControl>
  );
};

export default Slider;
