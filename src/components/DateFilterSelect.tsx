import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface DateFilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const DateFilterSelect = ({ value, onValueChange }: DateFilterSelectProps) => {
  const { t } = useLanguage();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px] bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("dateFilter.all")}</SelectItem>
        <SelectItem value="today">{t("dateFilter.today")}</SelectItem>
        <SelectItem value="yesterday">{t("dateFilter.yesterday")}</SelectItem>
        <SelectItem value="thisWeek">{t("dateFilter.thisWeek")}</SelectItem>
        <SelectItem value="lastWeek">{t("dateFilter.lastWeek")}</SelectItem>
        <SelectItem value="thisMonth">{t("dateFilter.thisMonth")}</SelectItem>
        <SelectItem value="lastMonth">{t("dateFilter.lastMonth")}</SelectItem>
        <SelectItem value="custom">{t("common.custom")}</SelectItem>
      </SelectContent>
    </Select>
  );
};
