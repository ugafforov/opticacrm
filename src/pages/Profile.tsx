import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { User, Mail, Save, Upload, Loader2 } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Ism kamida 2 ta harfdan iborat bo'lishi kerak").max(100, "Ism 100 ta harfdan oshmasligi kerak"),
});

const Profile = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      if (data.full_name) setFullName(data.full_name);
      if (data.avatar_url) setAvatarUrl(data.avatar_url);
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

  // Validate file magic bytes to ensure actual image content
  const validateImageMagicBytes = async (file: File): Promise<boolean> => {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check for common image magic bytes
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
    // BMP: 42 4D
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) return true;
    
    return false;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Whitelist allowed extensions (no SVG to prevent XSS)
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      toast.error("Faqat rasm formatlarini yuklash mumkin (JPG, PNG, GIF, WebP)");
      return;
    }

    // Validate MIME type (client-side check)
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      toast.error("Faqat rasm fayllarini yuklash mumkin (SVG ruxsat etilmagan)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Rasm hajmi 2MB dan oshmasligi kerak");
      return;
    }

    // Validate magic bytes to ensure actual image content
    const isValidImage = await validateImageMagicBytes(file);
    if (!isValidImage) {
      toast.error("Fayl formati noto'g'ri yoki buzilgan");
      return;
    }

    try {
      setUploading(true);

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("avatars")
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Avatar yangilandi!");
    } catch (error: any) {
      toast.error(t("toast.error"));
      console.error("Avatar upload error:", error);
    } finally {
      setUploading(false);
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
            <div className="relative group">
              <Avatar className="h-20 w-20 border-4 border-primary/20 cursor-pointer transition-all group-hover:border-primary/40">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={fullName || "Avatar"} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-2xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-white" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
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
