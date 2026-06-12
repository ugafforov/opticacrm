import { useLanguage } from "@/contexts/LanguageContext";
import { Phone } from "lucide-react";
import { FaTelegramPlane, FaFacebookF, FaInstagram } from "react-icons/fa";
import { SiX } from "react-icons/si";

const Footer = () => {
  const { t } = useLanguage();

  const contactLinks = [
    {
      icon: Phone,
      href: "tel:+998940715559",
      label: "Phone",
      color: "hover:text-green-400"
    },
    {
      icon: FaTelegramPlane,
      href: "https://t.me/u_gafforov",
      label: "Telegram",
      color: "hover:text-[#0088cc]"
    },
    {
      icon: FaFacebookF,
      href: "https://www.facebook.com/u.gafforov",
      label: "Facebook",
      color: "hover:text-[#1877f2]"
    },
    {
      icon: SiX,
      href: "https://x.com/Usmonj0n",
      label: "X",
      color: "hover:text-foreground"
    },
    {
      icon: FaInstagram,
      href: "https://www.instagram.com/usmonjon_gafforov/",
      label: "Instagram",
      color: "hover:text-[#e4405f]"
    }
  ];

  return (
    <footer className="border-t border-primary/20 gradient-primary mt-auto animate-fade-in">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Developer info */}
          <p className="text-sm text-white/90">
            {t("footer.developer")}:{" "}
            <a 
              href="https://t.me/u_gafforov"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:text-white/70 transition-colors"
            >
              {t("footer.developerName")}
            </a>
          </p>

          {/* CRM Purchase info */}
          <p className="text-sm text-white/90">
            {t("footer.contactForPurchase")}:{" "}
            <a 
              href="tel:+998940715559"
              className="font-semibold text-white hover:text-white/70 transition-colors"
            >
              +998 94 071 55 59
            </a>
          </p>

          {/* Contact links */}
          <div className="flex items-center gap-3">
            {contactLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className={`text-white/90 transition-all duration-300 hover:scale-110 ${link.color}`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
