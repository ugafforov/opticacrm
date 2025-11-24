import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Noto'g'ri email format").max(255, "Email juda uzun"),
  password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
});

export const adminUserSchema = z.object({
  email: z.string().email("Noto'g'ri email format").max(255, "Email juda uzun"),
  password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
  fullName: z.string().min(2, "Ism juda qisqa").max(100, "Ism juda uzun"),
  role: z.enum(["admin", "user"]),
});

export const buyurtmaSchema = z.object({
  mijoz: z.string().min(2, "Mijoz ismi juda qisqa").max(100, "Mijoz ismi juda uzun"),
  opravaTuri: z.string().min(1, "Oprava turini tanlang").max(100),
  oynaTuri: z.string().min(1, "Oyna turini tanlang").max(100),
  od: z.string().min(1, "OD maydonini to'ldiring").max(50),
  os: z.string().min(1, "OS maydonini to'ldiring").max(50),
  opravaNarxi: z.number().min(0, "Narx manfiy bo'lishi mumkin emas").max(999999999, "Narx juda katta"),
  oynaNarxi: z.number().min(0, "Narx manfiy bo'lishi mumkin emas").max(999999999, "Narx juda katta"),
  sana: z.string().min(1, "Sanani tanlang"),
});

export const linzaRoyxatSchema = z.object({
  mijoz: z.string().min(2, "Mijoz ismi juda qisqa").max(100, "Mijoz ismi juda uzun"),
  telefon: z.string().min(9, "Telefon raqam juda qisqa").max(20, "Telefon raqam juda uzun"),
  linzaTuri: z.string().min(1, "Linza turini tanlang").max(100),
  od: z.string().min(1, "OD maydonini to'ldiring").max(50),
  os: z.string().min(1, "OS maydonini to'ldiring").max(50),
  sana: z.string().min(1, "Sanani tanlang"),
});

export const linzaSotuvSchema = z.object({
  kliyent: z.string().min(2, "Kliyent ismi juda qisqa").max(100, "Kliyent ismi juda uzun"),
  linzaTuri: z.string().min(1, "Linza turini tanlang").max(100),
  summa: z.number().min(0, "Summa manfiy bo'lishi mumkin emas").max(999999999, "Summa juda katta"),
  sana: z.string().min(1, "Sanani tanlang"),
});

export const tayyorKozoynakSchema = z.object({
  kliyent: z.string().min(2, "Kliyent ismi juda qisqa").max(100, "Kliyent ismi juda uzun"),
  kozoynakTuri: z.string().min(1, "Ko'zoynak turini tanlang").max(100),
  summa: z.number().min(0, "Summa manfiy bo'lishi mumkin emas").max(999999999, "Summa juda katta"),
  tartibRaqam: z.number().min(1, "Tartib raqam 1 dan katta bo'lishi kerak"),
  sana: z.string().min(1, "Sanani tanlang"),
});

export const tekshiruvSchema = z.object({
  mijoz: z.string().min(2, "Mijoz ismi juda qisqa").max(100, "Mijoz ismi juda uzun"),
  tartibRaqam: z.number().min(1, "Tartib raqam 1 dan katta bo'lishi kerak"),
  refraksiyametriya: z.boolean(),
  tanometriya: z.boolean(),
  sana: z.string().min(1, "Sanani tanlang"),
});
