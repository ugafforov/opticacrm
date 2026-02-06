/**
 * Helper utilities for Supabase operations
 * Handles pagination to overcome the 1000-row default limit
 */

import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 1000;

/**
 * Fetch all rows from a table for a specific user, paginating automatically
 * to overcome Supabase's default 1000-row limit.
 */
export async function fetchAllRows(
  table: string,
  userId: string
): Promise<any[]> {
  const allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allRows.push(...data);
      from += data.length;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allRows;
}
