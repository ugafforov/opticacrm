import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trash2, UserPlus, Save, Pencil, ShieldCheck, ShieldX } from "lucide-react";
import { EditDialog } from "@/components/EditDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface AllowedUser {
  id: string;
  label: string | null;
  telegram_chat_id: number | null;
  phone: string | null;
  created_at: string;
}

interface Subscriber {
  chat_id: number;
  phone: string | null;
  first_name: string | null;
  username: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email?: string;
}

const AdminTelegram = () => {
  const [allowed, setAllowed] = useState<AllowedUser[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sourceUserId, setSourceUserId] = useState<string>("");
  const [savingSource, setSavingSource] = useState(false);

  // Form
  const [newLabel, setNewLabel] = useState("");
  const [newChatId, setNewChatId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit subscriber
  const [editSub, setEditSub] = useState<Subscriber | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (s: Subscriber) => {
    setEditSub(s);
    setEditFirstName(s.first_name || "");
    setEditUsername(s.username || "");
    setEditPhone(s.phone || "");
  };

  const handleSaveSubscriber = async () => {
    if (!editSub) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        first_name: editFirstName || null,
        username: editUsername || null,
        phone: editPhone ? normPhone(editPhone) : null,
      };
      const { error } = await supabase.from("telegram_subscribers")
        .update(payload).eq("chat_id", editSub.chat_id);
      if (error) throw error;
      toast.success("Saqlandi");
      setEditSub(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Xatolik");
    } finally {
      setSavingEdit(false);
    }
  };

  const load = async () => {
    const [a, s, p, settings] = await Promise.all([
      supabase.from("telegram_allowed_users").select("*").order("created_at", { ascending: false }),
      supabase.from("telegram_subscribers").select("chat_id, phone, first_name, username, created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("telegram_settings").select("source_user_id").eq("id", 1).maybeSingle(),
    ]);
    setAllowed((a.data as any) || []);
    setSubscribers((s.data as any) || []);
    setProfiles((p.data as any) || []);
    setSourceUserId(settings.data?.source_user_id || "");
  };

  useEffect(() => { load(); }, []);

  const normPhone = (s: string): string => {
    let d = s.replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    if (d.length === 9) d = "998" + d;
    return "+" + d;
  };

  const handleAdd = async () => {
    if (!newChatId && !newPhone) {
      toast.error("Profil ID yoki telefon raqamni kiriting");
      return;
    }
    setAdding(true);
    try {
      const payload: any = { label: newLabel || null };
      if (newChatId) {
        const cid = Number(newChatId.replace(/\D/g, ""));
        if (!cid) throw new Error("Profil ID noto'g'ri");
        payload.telegram_chat_id = cid;
      }
      if (newPhone) payload.phone = normPhone(newPhone);
      const { error } = await supabase.from("telegram_allowed_users").insert(payload);
      if (error) throw error;
      toast.success("Foydalanuvchi qo'shildi");
      setNewLabel(""); setNewChatId(""); setNewPhone("");
      await load();
    } catch (e: any) {
      logger.error("add allowed err:", e);
      toast.error(e?.message || "Xatolik");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirilsinmi?")) return;
    const { error } = await supabase.from("telegram_allowed_users").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("O'chirildi");
    await load();
  };

  const handleRemoveSubscriber = async (chatId: number) => {
    if (!confirm("Botdan obunani bekor qilamizmi?")) return;
    const { error } = await supabase.from("telegram_subscribers").delete().eq("chat_id", chatId);
    if (error) { toast.error(error.message); return; }
    toast.success("Obunadan chiqarildi");
    await load();
  };

  const handleSaveSource = async () => {
    setSavingSource(true);
    try {
      const { error } = await supabase.from("telegram_settings")
        .update({ source_user_id: sourceUserId, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
      toast.success("Manba foydalanuvchi saqlandi");
    } catch (e: any) {
      toast.error(e?.message || "Xatolik");
    } finally {
      setSavingSource(false);
    }
  };

  return (
    <main className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/hisobotlar"><ArrowLeft className="h-4 w-4 mr-1" />Orqaga</Link>
        </Button>
        <h1 className="text-2xl font-bold">Telegram boshqaruvi</h1>
      </div>

      {/* Manba foydalanuvchi */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Hisobot manbasi</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Botda yuboriladigan ma'lumotlar qaysi profil hisobidan olinishini tanlang.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1 w-full">
            <Label>Profil</Label>
            <Select value={sourceUserId} onValueChange={setSourceUserId}>
              <SelectTrigger><SelectValue placeholder="Profilni tanlang" /></SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || p.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveSource} disabled={savingSource || !sourceUserId}>
            <Save className="h-4 w-4 mr-2" />Saqlash
          </Button>
        </div>
      </Card>

      {/* Ruxsat berilganlar */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Ruxsat berilgan foydalanuvchilar</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Telegram <b>Profil ID</b> (foydalanuvchi botga /start berganda chat ID si ko'rinadi) yoki <b>telefon raqam</b> orqali ruxsat bering. Foydalanuvchi botga telefonini yuborganda yoki Profil ID i bo'yicha avtomatik tasdiqlanadi.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
          <div>
            <Label>Izoh (ixtiyoriy)</Label>
            <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Ism" />
          </div>
          <div>
            <Label>Profil ID</Label>
            <Input value={newChatId} onChange={e => setNewChatId(e.target.value)} placeholder="123456789" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+998901234567" />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} disabled={adding} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />Qo'shish
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Izoh</TableHead>
                <TableHead>Profil ID</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowed.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Hech kim qo'shilmagan</TableCell></TableRow>
              )}
              {allowed.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.label || "-"}</TableCell>
                  <TableCell><code>{u.telegram_chat_id || "-"}</code></TableCell>
                  <TableCell>{u.phone || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString("uz-UZ")}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(u.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Faol obunachilar */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Faol obunachilar (botga ulangan)</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Profil ID</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead className="w-24">Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Hozircha obunachi yo'q</TableCell></TableRow>
              )}
              {subscribers.map(s => (
                <TableRow key={s.chat_id}>
                  <TableCell>{s.first_name || "-"}</TableCell>
                  <TableCell>{s.username ? "@" + s.username : "-"}</TableCell>
                  <TableCell><code>{s.chat_id}</code></TableCell>
                  <TableCell>{s.phone || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("uz-UZ")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveSubscriber(s.chat_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <EditDialog open={!!editSub} onOpenChange={(o) => !o && setEditSub(null)} title="Obunachini tahrirlash">
        <div className="space-y-3">
          <div>
            <Label>Ism</Label>
            <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="username (without @)" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+998901234567" />
          </div>
          {editSub && (
            <div className="text-xs text-muted-foreground">Profil ID: <code>{editSub.chat_id}</code></div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditSub(null)}>Bekor qilish</Button>
            <Button onClick={handleSaveSubscriber} disabled={savingEdit}>
              <Save className="h-4 w-4 mr-2" />Saqlash
            </Button>
          </div>
        </div>
      </EditDialog>
    </main>
  );
};

export default AdminTelegram;
