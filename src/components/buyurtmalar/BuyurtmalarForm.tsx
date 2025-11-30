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
import { formatPhoneNumber, formatPrice } from "@/lib/utils";
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

        <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
          <div className="col-span-2 md:col-span-3">
            <Label htmlFor="mijoz">{t("form.clientName")}</Label>
            <Input
              id="mijoz"
              value={form.mijoz}
              onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
              required
            />
          </div>

          <div className="col-span-2 md:col-span-2">
            <Label htmlFor="telefon">{t("form.phone")}</Label>
            <Input
              id="telefon"
              type="tel"
              value={form.telefon}
              onChange={(e) => setForm({ ...form, telefon: formatPhoneNumber(e.target.value) })}
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="col-span-1">
            <Label htmlFor="od">{t("form.rightEye")}</Label>
            <Input
              id="od"
              value={form.od}
              onChange={(e) => setForm({ ...form, od: e.target.value })}
              className="text-center"
            />
          </div>

          <div className="col-span-1">
            <Label htmlFor="os">{t("form.leftEye")}</Label>
            <Input
              id="os"
              value={form.os}
              onChange={(e) => setForm({ ...form, os: e.target.value })}
              className="text-center"
            />
          </div>

          <div className="col-span-2 md:col-span-2">
            <Label htmlFor="oynaTuri">{t("form.lensType")}</Label>
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

          <div className="col-span-1 md:col-span-1">
            <Label htmlFor="oynaNarxi">{t("form.lensPrice")}</Label>
            <PriceInput
              id="oynaNarxi"
              value={form.oynaNarxi}
              onChange={(value) => setForm({ ...form, oynaNarxi: value })}
              required
            />
          </div>

          <div className="col-span-2 md:col-span-2">
            <Label htmlFor="opravaTuri">{t("form.frameType")}</Label>
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

          <div className="col-span-1 md:col-span-1">
            <Label htmlFor="opravaNarxi">{t("form.framePrice")}</Label>
            <PriceInput
              id="opravaNarxi"
              value={form.opravaNarxi}
              onChange={(value) => setForm({ ...form, opravaNarxi: value })}
              required
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
