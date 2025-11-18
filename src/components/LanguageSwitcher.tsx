import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const LanguageSwitcher = () => {
  const { script, toggleScript } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleScript}
      className="font-medium"
    >
      {script === "cyrillic" ? "Ўзб" : "O'zb"}
    </Button>
  );
};

export default LanguageSwitcher;
