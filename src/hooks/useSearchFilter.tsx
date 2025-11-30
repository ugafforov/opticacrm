import { useState, useMemo } from "react";

export const useSearchFilter = <T extends Record<string, any>>(
  items: T[],
  searchFields: (keyof T)[]
) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase().trim();
    const queryDigits = query.replace(/\D/g, "");
    
    return items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        
        const stringValue = String(value).toLowerCase();
        
        // Check for regular text match
        if (stringValue.includes(query)) return true;
        
        // For phone number fields, also check digit-only match
        if (queryDigits && field.toString().includes('telefon')) {
          const valueDigits = stringValue.replace(/\D/g, "");
          return valueDigits.includes(queryDigits);
        }
        
        return false;
      })
    );
  }, [items, searchQuery, searchFields]);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
  };
};
