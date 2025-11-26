import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { User, Mail, Save } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Ism kamida 2 ta harfdan iborat bo'lishi kerak").max(100, "Ism 100 ta harfdan oshmasligi kerak"),
});

const Profile = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.full_name) {
      setFullName(data.full_name);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = profileSchema.parse({ full_name: fullName });
      setLoading(true);

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: validated.full_name })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success(t("profile.saveSuccess"));
    } catch (error: any) {
      if (error.errors) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(t("toast.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {t("profile.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("profile.subtitle")}
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{t("profile.personalInfo")}</CardTitle>
              <CardDescription>{t("profile.updateInfo")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                {t("profile.email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                {t("profile.emailNote")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                {t("profile.fullName")}
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("profile.fullNamePlaceholder")}
                required
                maxLength={100}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? t("common.saving") : t("profile.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
