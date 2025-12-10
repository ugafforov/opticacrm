import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { authSchema } from "@/lib/validation";
import { Eye, EyeOff, Lock, Mail, Sparkles, Phone, Send, Facebook, Instagram } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

const Auth = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setFormData((prev) => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = authSchema.parse(formData);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", validatedData.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      toast.success(t("auth.loginSuccess"));
      navigate("/");
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        toast.error(error.errors[0].message);
      } else {
        toast.error(t("toast.authError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error(t("auth.email"));
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success(t("auth.resetLinkSent"));
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error) {
      toast.error(t("toast.authError"));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Language Switcher - Top Right */}
      <div className="absolute top-6 right-6 z-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <LanguageSwitcher />
      </div>
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/80 border-2 shadow-2xl animate-scale-in">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg hover-scale">
                <Sparkles className="w-8 h-8 text-primary-foreground animate-pulse" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("auth.welcome")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("auth.welcomeDesc")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Label htmlFor="email" className="text-sm font-medium">
                {t("auth.email")}
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-primary/60 z-10 pointer-events-none transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  placeholder="pochta@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Label htmlFor="password" className="text-sm font-medium">
                {t("auth.password")}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-primary/60 z-10 pointer-events-none transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="pl-10 pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 z-10 text-primary/60 hover:text-primary transition-all duration-200 hover:scale-110 p-1"
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="transition-transform hover:scale-110"
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer transition-colors hover:text-primary"
                >
                  {t("auth.rememberMe")}
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-all duration-200 hover:scale-105"
              >
                {t("auth.forgotPassword")}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] animate-fade-in"
              style={{ animationDelay: '0.5s' }}
              disabled={loading}
            >
              {loading ? t("auth.loading") : t("auth.login")}
            </Button>
          </form>

          {/* Contact info */}
          <div className="pt-6 mt-6 border-t border-border/50 text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <p className="text-sm text-muted-foreground">
              {t("auth.contactForCRM")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="tel:+998940715559"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-green-500 transition-all duration-300 hover:scale-110"
              >
                <Phone className="w-4 h-4" />
                <span>+998 94 071 55 59</span>
              </a>
              <a
                href="https://t.me/u_gafforov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[#0088cc] transition-all duration-300 hover:scale-110"
                aria-label="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com/u.gafforov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[#1877f2] transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://x.com/Usmonj0n"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110"
                aria-label="X (Twitter)"
              >
                <FaXTwitter className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/usmonjon_gafforov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[#e4405f] transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground/70">
              {t("auth.developer")}: <span className="font-medium text-primary">Usmonjon G'afforov</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md animate-scale-in">
          <DialogHeader className="animate-fade-in">
            <DialogTitle className="text-2xl">{t("auth.resetPassword")}</DialogTitle>
            <DialogDescription className="text-base">
              {t("auth.resetPasswordDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <Label htmlFor="reset-email">{t("auth.email")}</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-primary/60 z-10 pointer-events-none transition-colors group-focus-within:text-primary" />
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  placeholder="pochta@example.com"
                />
              </div>
            </div>
            <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Button
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 transition-all duration-200 hover:scale-105"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="flex-1 transition-all duration-200 hover:scale-105"
              >
                {resetLoading ? t("auth.loading") : t("auth.sendResetLink")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
