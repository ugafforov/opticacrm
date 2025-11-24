import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, UserPlus } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { adminUserSchema } from "@/lib/validation";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

const AdminUsers = () => {
  const { t } = useLanguage();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "user",
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    loadUsers();
  }, [isAdmin, navigate]);

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Tizimga kirish talab qilinadi");
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-list-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setUsers(data.users);
    } catch (error: any) {
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = adminUserSchema.parse(formData);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Tizimga kirish talab qilinadi");
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: validatedData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Foydalanuvchi muvaffaqiyatli qo'shildi");
      setFormData({ email: "", password: "", fullName: "", role: "user" });
      setShowAddUser(false);
      loadUsers();
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        toast.error(error.errors[0].message);
      } else {
        toast.error("Foydalanuvchi qo'shishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Tizimga kirish talab qilinadi");
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: deleteUserId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Foydalanuvchi o'chirildi");
      setDeleteUserId(null);
      loadUsers();
    } catch (error: any) {
      toast.error("Foydalanuvchini o'chirishda xatolik yuz berdi");
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Foydalanuvchilar boshqaruvi
          </h2>
          <p className="text-muted-foreground">
            Tizimga yangi foydalanuvchilar qo'shing
          </p>
        </div>
        <Button onClick={() => setShowAddUser(!showAddUser)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Foydalanuvchi qo'shish
        </Button>
      </div>

      {showAddUser && (
        <Card className="p-6">
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="fullName">To'liq ism</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Parol (kamida 8 ta belgi)</Label>
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

              <div>
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="user">Foydalanuvchi</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddUser(false)}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={loading}>
                Qo'shish
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">To'liq ism</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Qo'shilgan sana</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((usr) => (
                <tr key={usr.id} className="border-b border-border">
                  <td className="px-4 py-2">{usr.email}</td>
                  <td className="px-4 py-2">{usr.full_name || "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        usr.role === "admin"
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {usr.role === "admin" ? "Admin" : "Foydalanuvchi"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {new Date(usr.created_at).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="px-4 py-2">
                    {usr.id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteUserId(usr.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        onConfirm={handleDeleteUser}
        title="Foydalanuvchini o'chirish"
        description="Bu foydalanuvchi va uning barcha ma'lumotlari o'chiriladi. Davom etasizmi?"
        confirmText="O'chirish"
        cancelText="Bekor qilish"
      />
    </div>
  );
};

export default AdminUsers;
