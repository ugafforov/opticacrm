import { useState, useMemo } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";

export const useDateFilter = <T extends { sana: string; createdAt: string }>(items: T[]) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("today");

  const filteredItems = useMemo(() => {
    if (dateFilter === "all") return items;

    const now = new Date();
    let start: Date, end: Date;

    switch (dateFilter) {
      case "today":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        start = startOfDay(yesterday);
        end = endOfDay(yesterday);
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
        start = startOfDay(new Date(selectedDate));
        end = endOfDay(new Date(selectedDate));
        break;
      default:
        return items;
    }

    return items.filter((item) => {
      // Foydalanuvchi tanlagan sanani (sana) tekshirish - createdAt emas
      const itemDate = parseISO(item.sana);
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
