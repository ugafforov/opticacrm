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
      <div className="container mx-auto px-4 py-4">
        <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8">
          {/* Developer info and contact */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p className="text-sm font-medium">
              <span className="text-white/70">{t("footer.developer")}:</span>{" "}
              <a 
                href="https://t.me/u_gafforov"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-white/80 transition-colors duration-300"
              >
                Usmonjon G'afforov
              </a>
            </p>
            <span className="hidden sm:inline text-white/40">|</span>
            <p className="text-sm text-white/90">
              {t("footer.contactForPurchase")}: <a href="tel:+998940715559" className="font-semibold hover:text-white transition-colors">+998 94 071 55 59</a>
            </p>
          </div>

          {/* Contact links */}
          <div className="flex items-center gap-4">
            {contactLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-white/90 transition-all duration-300 hover:scale-125 ${link.color}`}
                  title={link.label}
                >
                  <Icon className="w-5 h-5" />
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
