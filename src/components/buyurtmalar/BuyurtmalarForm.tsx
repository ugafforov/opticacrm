import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatPhoneNumber, formatPrice, formatOdOs } from "@/lib/utils";
import { PriceInput } from "@/components/PriceInput";
import { SelectWithOther } from "@/components/SelectWithOther";

interface BuyurtmalarFormProps {
  onSubmit: (data: BuyurtmaFormData, selectedDate: Date) => Promise<void>;
}

export interface BuyurtmaFormData {
  mijoz: string;
  telefon: string;
  od: string;
  os: string;
  oynaTuri: string;
  oynaNarxi: string;
  opravaNarxi: string;
  opravaTuri: string;
}

export const BuyurtmalarForm = ({ onSubmit }: BuyurtmalarFormProps) => {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [form, setForm] = useState<BuyurtmaFormData>({
    mijoz: "",
    telefon: "+998 ",
    od: "",
    os: "",
    oynaTuri: "",
    oynaNarxi: "",
    opravaNarxi: "",
    opravaTuri: "",
  });

  const handleOdOsChange = (field: 'od' | 'os', value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleOdOsBlur = (field: 'od' | 'os', value: string) => {
    const formatted = formatOdOs(value);
    if (formatted !== value) {
      setForm({ ...form, [field]: formatted });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form, selectedDate);
    
    // Reset form
    setSelectedDate(new Date());
    setForm({
      mijoz: "",
      telefon: "+998 ",
      od: "",
      os: "",
      oynaTuri: "",
      oynaNarxi: "",
      opravaNarxi: "",
      opravaTuri: "",
    });
  };

  const totalAmount = (parseFloat(form.oynaNarxi) || 0) + (parseFloat(form.opravaNarxi) || 0);

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "dd-MM-yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > new Date()}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[180px]">
            <Label htmlFor="mijoz">{t("form.clientName")}</Label>
            <Input
              id="mijoz"
              value={form.mijoz}
              onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
              required
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <Label htmlFor="telefon">{t("form.phone")}</Label>
            <Input
              id="telefon"
              type="tel"
              value={form.telefon}
              onChange={(e) => setForm({ ...form, telefon: formatPhoneNumber(e.target.value) })}
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="flex-1 min-w-[100px]">
            <Label htmlFor="od" className="text-xs">{t("form.rightEye")}</Label>
            <Input
              id="od"
              value={form.od}
              onChange={(e) => handleOdOsChange('od', e.target.value)}
              onBlur={(e) => handleOdOsBlur('od', e.target.value)}
              className="text-center h-10"
              maxLength={15}
            />
          </div>

          <div className="flex-1 min-w-[100px]">
            <Label htmlFor="os" className="text-xs">{t("form.leftEye")}</Label>
            <Input
              id="os"
              value={form.os}
              onChange={(e) => handleOdOsChange('os', e.target.value)}
              onBlur={(e) => handleOdOsBlur('os', e.target.value)}
              className="text-center h-10"
              maxLength={15}
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="oynaTuri" className="text-sm">{t("form.lensType")}</Label>
            <SelectWithOther
              id="oynaTuri"
              value={form.oynaTuri}
              onChange={(value) => setForm({ ...form, oynaTuri: value })}
              options={[
                { value: "3B1 jigarrang", label: t("lens.3b1Brown") },
                { value: "3B1 qora", label: t("lens.3b1Black") },
                { value: "4B1", label: t("lens.4b1") },
                { value: "420", label: t("lens.420") },
                { value: "SR", label: t("lens.sr") },
              ]}
              placeholder={t("form.select")}
              otherLabel={t("form.other")}
              customInputLabel={t("form.enterCustomValue")}
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="oynaNarxi" className="text-sm">{t("form.lensPrice")}</Label>
            <PriceInput
              id="oynaNarxi"
              value={form.oynaNarxi}
              onChange={(value) => setForm({ ...form, oynaNarxi: value })}
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="opravaTuri" className="text-sm">{t("form.frameType")}</Label>
            <SelectWithOther
              id="opravaTuri"
              value={form.opravaTuri}
              onChange={(value) => setForm({ ...form, opravaTuri: value })}
              options={[
                { value: "dumaloq", label: t("frame.round") },
                { value: "fabritsio", label: t("frame.fabritsio") },
                { value: "alaniye", label: t("frame.alaniye") },
                { value: "titanik", label: t("frame.titanik") },
              ]}
              placeholder={t("form.select")}
              otherLabel={t("form.other")}
              customInputLabel={t("form.enterCustomValue")}
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="opravaNarxi" className="text-sm">{t("form.framePrice")}</Label>
            <PriceInput
              id="opravaNarxi"
              value={form.opravaNarxi}
              onChange={(value) => setForm({ ...form, opravaNarxi: value })}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="text-lg font-semibold">
            {t("orders.totalAmount")}: {formatPrice(totalAmount)} {t("common.currency")}
          </div>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            {t("orders.add")}
          </Button>
        </div>
      </form>
    </Card>
  );
};
