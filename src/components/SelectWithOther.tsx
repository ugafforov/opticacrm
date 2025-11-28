import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Check if current value is a custom one (not in predefined options)
  useEffect(() => {
    const isCustom = value && !options.some(opt => opt.value === value) && value !== "__other__";
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

  const handleSelectChange = (newValue: string) => {
    if (newValue === "__other__") {
      setShowCustomInput(true);
      setCustomValue("");
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

  // Determine what to display in the Select
  const isValueCustom = value && !options.some(opt => opt.value === value);
  const displayValue = showCustomInput && !value ? "__other__" : (isValueCustom || showCustomInput) ? "__other__" : value;

  return (
    <div className="space-y-2">
      <Select value={displayValue} onValueChange={handleSelectChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder}>
            {showCustomInput && customValue ? customValue : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value="__other__" className="border-t border-border mt-1 pt-1">
            📝 {otherLabel}
          </SelectItem>
        </SelectContent>
      </Select>

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
