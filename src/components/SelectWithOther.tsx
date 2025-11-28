import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

  const handleDeleteCustomOption = (optionToDelete: string) => {
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

  const customOptionsToShow = savedCustomOptions.filter(customOpt => !options.some(opt => opt.value === customOpt));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
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
              
              {customOptionsToShow.length > 0 && (
                <div className="border-t border-border my-1" />
              )}
              
              {customOptionsToShow.map((customOpt) => (
                <SelectItem key={customOpt} value={customOpt}>
                  {customOpt}
                </SelectItem>
              ))}
              
              <SelectItem value="__other__" className="border-t border-border mt-1 pt-1">
                📝 {otherLabel}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {customOptionsToShow.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                title="Manage saved options"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="font-medium text-sm">Saqlangan variantlar</div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {customOptionsToShow.map((customOpt) => (
                    <div
                      key={customOpt}
                      className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm flex-1 truncate">{customOpt}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive shrink-0"
                        onClick={() => handleDeleteCustomOption(customOpt)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

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
