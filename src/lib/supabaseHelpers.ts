/**
 * Helper utilities for Supabase operations
 * Handles pagination to overcome the 1000-row default limit
 */

import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 1000;

interface FetchAllRowsOptions {
  orderBy?: string;
  ascending?: boolean;
  filterColumn?: string;
  filterValue?: string;
}

/**
 * Fetch all rows from a table for a specific user, paginating automatically
 * to overcome Supabase's default 1000-row limit.
 */
export async function fetchAllRows(
  table: string,
  userId: string,
  options?: FetchAllRowsOptions
): Promise<any[]> {
  const allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = (supabase as any)
      .from(table)
      .select("*")
      .eq("user_id", userId);

    if (options?.filterColumn && options?.filterValue) {
      query = query.eq(options.filterColumn, options.filterValue);
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }

    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, error } = await query;

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
