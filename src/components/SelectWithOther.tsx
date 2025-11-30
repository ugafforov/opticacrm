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
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// Native <select> based component to completely avoid portal/DOM issues
export const SelectWithOther = ({
  value,
  onChange,
  options,
  placeholder = "Tanlang...",
  otherLabel = "Boshqa...",
  customInputLabel = "Qiymat kiriting",
  id,
  helperText,
  error,
  required = false,
  disabled = false,
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
    <div className="space-y-1.5">
      <select
        id={id}
        value={selectValue}
        onChange={handleSelectChange}
        required={required}
        disabled={disabled}
        className={`flex h-10 w-full rounded-xl border-2 bg-background/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          error
            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
            : "border-input focus-visible:border-primary hover:border-primary/50"
        }`}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
      >
        <option value="" disabled>
          {placeholder}
          {required && " *"}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value="__other__">📝 {otherLabel}</option>
      </select>

      {helperText && !error && (
        <p id={`${id}-helper`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive flex items-center gap-1">
          <span className="text-base">⚠️</span>
          {error}
        </p>
      )}

      {showCustomInput && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200 pt-1">
          <Label htmlFor={`${id}-custom`} className="text-xs text-muted-foreground mb-1.5 block">
            {customInputLabel}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            id={`${id}-custom`}
            value={customValue}
            onChange={handleCustomInputChange}
            placeholder={`Masalan: Premium linza`}
            autoFocus
            required={required}
            disabled={disabled}
            className={error ? "border-destructive focus-visible:ring-destructive/20" : ""}
          />
        </div>
      )}
    </div>
  );
};
