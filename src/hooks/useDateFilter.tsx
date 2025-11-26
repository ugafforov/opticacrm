import { useState, useMemo } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, isWithinInterval, parseISO } from "date-fns";

export const useDateFilter = <T extends { sana: string; createdAt: string }>(items: T[]) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("all");

  const filteredItems = useMemo(() => {
    if (dateFilter === "all") return items;

    const now = new Date();
    let start: Date, end: Date;

    switch (dateFilter) {
      case "today":
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "yesterday":
        start = subDays(new Date(now.setHours(0, 0, 0, 0)), 1);
        end = subDays(new Date(now.setHours(23, 59, 59, 999)), 1);
        break;
      case "thisWeek":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "lastWeek":
        const lastWeek = subWeeks(now, 1);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case "thisMonth":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case "custom":
        start = new Date(selectedDate.setHours(0, 0, 0, 0));
        end = new Date(selectedDate.setHours(23, 59, 59, 999));
        break;
      default:
        return items;
    }

    return items.filter((item) => {
      const itemDate = parseISO(item.createdAt);
      return isWithinInterval(itemDate, { start, end });
    });
  }, [items, dateFilter, selectedDate]);

  return {
    selectedDate,
    setSelectedDate,
    dateFilter,
    setDateFilter,
    filteredItems,
  };
};
