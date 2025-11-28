import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  storageKey?: string;
}

export const SelectWithOther = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  otherLabel = "Other...",
  customInputLabel = "Enter custom value",
  id,
  storageKey,
}: SelectWithOtherProps) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [savedCustomOptions, setSavedCustomOptions] = useState<string[]>([]);

  // Load saved custom options from localStorage
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setSavedCustomOptions(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved custom options:", e);
        }
      }
    }
  }, [storageKey]);

  // Check if current value is a custom one
  useEffect(() => {
    const isInPredefined = options.some(opt => opt.value === value);
    const isInSaved = savedCustomOptions.includes(value);
    const isCustom = value && !isInPredefined && !isInSaved && value !== "__other__";
    
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
  }, [value, options, savedCustomOptions]);

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

  const handleCustomInputBlur = () => {
    // Save custom value to localStorage when input loses focus
    if (customValue.trim() && storageKey) {
      const updatedCustomOptions = [...new Set([...savedCustomOptions, customValue.trim()])];
      setSavedCustomOptions(updatedCustomOptions);
      localStorage.setItem(storageKey, JSON.stringify(updatedCustomOptions));
    }
  };

  const handleDeleteCustomOption = (optionToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (storageKey) {
      const updatedOptions = savedCustomOptions.filter(opt => opt !== optionToDelete);
      setSavedCustomOptions(updatedOptions);
      localStorage.setItem(storageKey, JSON.stringify(updatedOptions));
      
      // If currently selected value is being deleted, clear it
      if (value === optionToDelete) {
        onChange("");
      }
    }
  };

  // Determine what to display in the Select
  const isValueCustom = value && !options.some(opt => opt.value === value) && !savedCustomOptions.includes(value);
  const displayValue = showCustomInput && !value ? "__other__" : (isValueCustom || showCustomInput) ? "__other__" : value;

  // Combine predefined and saved custom options
  const allOptions = [
    ...options,
    ...savedCustomOptions
      .filter(customOpt => !options.some(opt => opt.value === customOpt))
      .map(customOpt => ({ value: customOpt, label: customOpt }))
  ];

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
          
          {savedCustomOptions.length > 0 && (
            <div className="border-t border-border my-1" />
          )}
          
          {savedCustomOptions
            .filter(customOpt => !options.some(opt => opt.value === customOpt))
            .map((customOpt) => (
              <SelectItem 
                key={customOpt} 
                value={customOpt}
                className="group"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="flex-1">{customOpt}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => handleDeleteCustomOption(customOpt, e)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </SelectItem>
            ))}
          
          <SelectItem value="__other__" className="border-t border-border mt-1 pt-1">
            📝 {otherLabel}
          </SelectItem>
        </SelectContent>
      </Select>

      {showCustomInput && (
        <div className="mt-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <Label htmlFor={`${id}-custom`} className="text-xs text-muted-foreground">
            {customInputLabel}
          </Label>
          <Input
            id={`${id}-custom`}
            value={customValue}
            onChange={handleCustomInputChange}
            onBlur={handleCustomInputBlur}
            placeholder={customInputLabel}
            autoFocus
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
};
