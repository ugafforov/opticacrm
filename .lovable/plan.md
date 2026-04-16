

# Chiqindilar sahifasida summa ko'rsatish

## Maqsad
Har bir o'chirilgan element kartasida uning summasi (jami_summa yoki summa) ko'rinib turishi kerak, shuningdek sahifa yuqorisida umumiy summa ko'rsatilishi kerak.

## Reja

### 1. Har bir kartada summa ko'rsatish
Chiqindilar sahifasidagi har bir Card elementiga `data.jami_summa` yoki `data.summa` qiymatini ko'rsatuvchi qator qo'shiladi. Jadval turiga qarab to'g'ri maydon tanlanadi:
- `buyurtmalar`, `tekshiruvlar` — `jami_summa`
- `tayyorKozoynaklar`, `linzaSotuvlari`, `xarajatlar` — `summa`

### 2. Umumiy summa statistikasi
Sahifa yuqorisida (sarlavha va elementlar orasida) umumiy o'chirilgan summani ko'rsatuvchi statistik karta qo'shiladi. Barcha trashItems ustida aylanib, summalarni jamlab ko'rsatadi.

### Texnik tafsilotlar
- **Fayl:** `src/pages/Chiqindilar.tsx`
- Summani formatlash uchun mavjud `formatUzbekistanTimestamp` yonida `Number().toLocaleString()` ishlatiladi
- Yangi komponent kerak emas — faqat mavjud sahifaga qo'shimcha qatorlar

