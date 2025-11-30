import { useState, useMemo } from "react";

export const useSearchFilter = <T extends Record<string, any>>(
  items: T[],
  searchFields: (keyof T)[]
) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase().trim();
    // Normalize query for phone number search (remove spaces, dashes, parentheses)
    const normalizedQuery = query.replace(/[\s\-()]/g, '');
    
    return items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        
        const stringValue = String(value).toLowerCase();
        // Check both original and normalized versions
        if (stringValue.includes(query)) return true;
        
        // For phone-like fields, also check normalized version
        const normalizedValue = stringValue.replace(/[\s\-()]/g, '');
        return normalizedValue.includes(normalizedQuery);
      })
    );
  }, [items, searchQuery, searchFields]);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
  };
};
