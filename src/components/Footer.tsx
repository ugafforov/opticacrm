import { useLanguage } from "@/contexts/LanguageContext";
import { Phone } from "lucide-react";
import { FaTelegramPlane, FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";

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
      icon: FaTwitter,
      href: "https://www.facebook.com/u.gafforov",
      label: "Twitter",
      color: "hover:text-[#1da1f2]"
    },
    {
      icon: FaInstagram,
      href: "https://www.instagram.com/usmonjon_gafforov/",
      label: "Instagram",
      color: "hover:text-[#e4405f]"
    }
  ];

  return (
    <footer className="border-t border-primary/20 bg-primary/10 backdrop-blur-sm mt-auto animate-fade-in">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-6">
          {/* Developer info */}
          <div className="text-center space-y-2">
            <p className="text-base font-medium text-foreground">
              {t("footer.developer")}:{" "}
              <a 
                href="https://t.me/u_gafforov"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary hover:text-primary/80 transition-all duration-300 hover:scale-105 inline-block"
              >
                Usmonjon G'afforov
              </a>
            </p>
            <p className="text-sm text-foreground/80">
              {t("footer.contactForPurchase")}
            </p>
          </div>

          {/* Contact links */}
          <div className="flex items-center justify-center gap-6">
            {contactLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-foreground transition-all duration-300 hover:scale-125 ${link.color}`}
                  title={link.label}
                >
                  <Icon className="w-6 h-6" />
                </a>
              );
            })}
          </div>

          {/* Copyright */}
          <p className="text-sm text-foreground/60">
            © {new Date().getFullYear()} {t("footer.allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
