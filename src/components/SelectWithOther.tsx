import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectWithOtherProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  otherLabel?: string;
  customInputLabel?: string;
  id?: string;
}

// Native <select> based component to completely avoid portal/DOM issues
export const SelectWithOther = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  otherLabel = "Other...",
  customInputLabel = "Enter custom value",
  id,
}: SelectWithOtherProps) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");

  // Detect if current value is custom (not in predefined options)
  useEffect(() => {
    const isCustom = value && !options.some((opt) => opt.value === value) && value !== "__other__";
    if (isCustom) {
      setShowCustomInput(true);
      setCustomValue(value);
    } else if (value === "__other__") {
      setShowCustomInput(true);
      setCustomValue("");
    } else {
      setShowCustomInput(false);
      setCustomValue("");
    }
  }, [value, options]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue === "__other__") {
      setShowCustomInput(true);
      setCustomValue("");
      // Do not immediately change parent value, wait for text input
    } else {
      setShowCustomInput(false);
      setCustomValue("");
      onChange(newValue);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomValue(newValue);
    onChange(newValue);
  };

  // Determine what should be selected in the native <select>
  const isValueCustom = value && !options.some((opt) => opt.value === value);
  const selectValue = showCustomInput && !value ? "__other__" : isValueCustom ? "__other__" : value;

  return (
    <div className="space-y-2">
      <select
        id={id}
        value={selectValue}
        onChange={handleSelectChange}
        className="flex h-10 w-full rounded-xl border-2 border-input bg-background/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-all duration-300 hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value="__other__">📝 {otherLabel}</option>
      </select>

      {showCustomInput && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <Label htmlFor={`${id}-custom`} className="text-xs text-muted-foreground">
            {customInputLabel}
          </Label>
          <Input
            id={`${id}-custom`}
            value={customValue}
            onChange={handleCustomInputChange}
            placeholder={customInputLabel}
            autoFocus
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
};
