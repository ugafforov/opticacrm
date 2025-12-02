import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatPrice, parsePrice } from "@/lib/utils";

interface PriceInputProps {
  id?: string;
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  id,
  value,
  onChange,
  required = false,
  placeholder,
  className,
}) => {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    // Format the value for display when it changes from outside
    if (value !== "" && value !== null && value !== undefined) {
      const numValue = typeof value === 'string' ? parsePrice(value) : value;
      const formatted = formatPrice(numValue);
      setDisplayValue(formatted);
    } else {
      setDisplayValue("0");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove all non-digit characters
    const digitsOnly = inputValue.replace(/\D/g, "");
    
    if (digitsOnly === "") {
      setDisplayValue("0");
      onChange("0");
      return;
    }

    // Parse to number and format
    const numValue = parseInt(digitsOnly, 10);
    const formatted = formatPrice(numValue);
    
    setDisplayValue(formatted);
    onChange(digitsOnly);
  };

  const handleBlur = () => {
    // Ensure formatting is correct on blur
    if (displayValue) {
      const numValue = parsePrice(displayValue);
      setDisplayValue(formatPrice(numValue));
    }
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      required={required}
      placeholder={placeholder}
      className={className}
    />
  );
};
