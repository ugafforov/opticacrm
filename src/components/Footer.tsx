import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Send, Facebook, Instagram } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

const Footer = () => {
  const { t } = useLanguage();

  const contactLinks = [
    {
      icon: Phone,
      href: "tel:+998940715559",
      label: "+998 94 071 55 59",
      color: "hover:text-green-500"
    },
    {
      icon: Send,
      href: "https://t.me/u_gafforov",
      label: "Telegram",
      color: "hover:text-blue-500"
    },
    {
      icon: Facebook,
      href: "https://www.facebook.com/u.gafforov",
      label: "Facebook",
      color: "hover:text-blue-600"
    },
    {
      icon: FaXTwitter,
      href: "https://www.facebook.com/u.gafforov",
      label: "X",
      color: "hover:text-foreground",
      isCustomIcon: true
    },
    {
      icon: Instagram,
      href: "https://www.instagram.com/usmonjon_gafforov/",
      label: "Instagram",
      color: "hover:text-pink-500"
    }
  ];

  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          {/* Developer info */}
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">
              {t("footer.developedBy")} <span className="font-semibold text-primary">Usmonjon G'afforov</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t("footer.contactForPurchase")}
            </p>
          </div>

          {/* Contact links */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {contactLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-sm text-muted-foreground transition-all duration-300 hover:scale-110 ${link.color}`}
                  title={link.label}
                >
                  {link.isCustomIcon ? (
                    <Icon className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{link.label}</span>
                </a>
              );
            })}
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} {t("footer.allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
