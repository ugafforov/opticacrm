import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { authSchema } from "@/lib/validation";

const Auth = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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

      toast.success(t("auth.loginSuccess"));
      navigate("/");
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        toast.error(error.errors[0].message);
      } else {
        toast.error("Tizimga kirishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-foreground mb-6 text-center">
          {t("auth.login")}
        </h1>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="password">{t("auth.password")} (kamida 8 ta belgi)</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              minLength={8}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.loading") : t("auth.login")}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
