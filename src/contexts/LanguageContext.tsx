import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Script = "cyrillic" | "latin";

interface LanguageContextType {
  script: Script;
  toggleScript: () => void;
  t: (key: string) => string;
}

const translations = {
  cyrillic: {
    // Navigation
    "nav.orders": "Буюртмалар",
    "nav.lensLists": "Линза рўйхатлари",
    "nav.examination": "Текширув",
    "nav.readyGlasses": "Тайёр кўзойнаклар",
    "nav.lensSales": "Линза сотуви",
    "nav.reports": "Ҳисоботлар",
    "nav.trash": "Чиқиндилар",
    "app.title": "Оптика CRM",
    
    // Orders page
    "orders.title": "Буюртмалар",
    "orders.subtitle": "Кўзойнак буюртмаларини бошқариш",
    "orders.list": "Буюртмалар рўйхати",
    "orders.total": "Жами",
    "orders.client": "Клиент",
    "orders.phone": "Телефон",
    "orders.frameType": "Рамка тури",
    "orders.lensType": "Линза тури",
    "orders.totalAmount": "Жами сумма",
    "orders.paid": "Тўланган",
    "orders.debt": "Қарз",
    "orders.date": "Сана",
    "orders.number": "№",
    "orders.add": "Қўшиш",
    "orders.addSuccess": "Буюртма қўшилди!",
    "orders.deleteSuccess": "Ўчирилди",
    "orders.search": "Қидириш...",
    
    // Lens lists
    "lens.title": "Линза рўйхатлари",
    "lens.subtitle": "Кўзга текшириш маълумотлари",
    "lens.list": "Линза рўйхати",
    "lens.rightEye": "Ўнг кўз",
    "lens.leftEye": "Чап кўз",
    "lens.sphere": "Сфера",
    "lens.cylinder": "Цилиндр",
    "lens.axis": "Ўқ",
    "lens.pd": "Мп",
    "lens.add": "Қўшиш",
    "lens.addSuccess": "Линза қўшилди!",
    "lens.deleteSuccess": "Ўчирилди",
    "lens.search": "Қидириш...",
    
    // Examination
    "exam.title": "Кўз текшируви",
    "exam.subtitle": "Тиббий кўз текширувлари",
    "exam.list": "Текширувлар рўйхати",
    "exam.patient": "Мижоз",
    "exam.refractometry": "Рефраксияметрия — 50,000 сўм",
    "exam.tonometry": "Танометрия — 15,000 сўм",
    "exam.services": "Хизматлар",
    "exam.add": "Қўшиш",
    "exam.addSuccess": "Текширув қўшилди!",
    "exam.deleteSuccess": "Ўчирилди",
    "exam.search": "Қидириш...",
    
    // Ready glasses
    "ready.title": "Тайёр кўзойнаклар",
    "ready.subtitle": "Тайёр кўзойнаклар сотуви",
    "ready.list": "Кўзойнаклар рўйхати",
    "ready.client": "Клиент",
    "ready.type": "Кўзойнак тури",
    "ready.amount": "Сумма",
    "ready.add": "Қўшиш",
    "ready.addSuccess": "Кўзойнак қўшилди!",
    "ready.deleteSuccess": "Ўчирилди",
    "ready.search": "Қидириш...",
    "ready.sunProtection": "Қуёшдан ҳимоя",
    "ready.computerChameleon": "Компютер-хамелеон",
    "ready.computer": "Компютер",
    "ready.vision": "Зрения",
    
    // Lens sales
    "lensSale.title": "Линза сотуви",
    "lensSale.subtitle": "Линза ва аксессуарлар сотуви",
    "lensSale.list": "Сотувлар рўйхати",
    "lensSale.client": "Клиент",
    "lensSale.type": "Линза тури",
    "lensSale.amount": "Сумма",
    "lensSale.add": "Қўшиш",
    "lensSale.addSuccess": "Сотув қўшилди!",
    "lensSale.deleteSuccess": "Ўчирилди",
    "lensSale.search": "Қидириш...",
    "lensSale.american": "Американский",
    "lensSale.korean": "Корейский",
    "lensSale.astigmatic": "Астигматик",
    "lensSale.coloredVision": "Ранgli zreniya",
    "lensSale.beauty": "Чирой учун",
    "lensSale.solution": "Линза суви",
    "lensSale.container": "Линза контейнери",
    "lensSale.select": "Танланг",
    
    // Reports
    "reports.title": "Ҳисоботлар",
    "reports.subtitle": "Тушум ва харажатлар статистикаси",
    "reports.daily": "Кунлик",
    "reports.weekly": "Ҳафталик",
    "reports.monthly": "Ойлик",
    "reports.totalIncome": "Жами тушум",
    "reports.income": "Тушум",
    "reports.bySection": "Бўлимлар бўйича тушум",
    "reports.recordCount": "та ёзув",
    
    // Common
    "common.sum": "сўм",
    "common.date": "Сана",
    "common.total": "Жами",
    "common.delete": "Ўчириш",
    "common.actions": "Амаллар",
    "common.yes": "Ҳа",
    "common.no": "Йўқ",
    "common.edit": "Таҳрирлаш",
    "common.save": "Сақлаш",
    "common.cancel": "Бекор қилиш",
    "common.from": "дан",
    "common.to": "гача",
    
    // Form labels - Orders
    "form.clientName": "Мижоз фамилияси ва исми",
    "form.rightEye": "OD (ўнг кўз)",
    "form.leftEye": "OS (чап кўз)",
    "form.lensType": "Ойна тури",
    "form.lensPrice": "Ойна нархи (сўм)",
    "form.frameType": "Оправа (рамка) тури",
    "form.framePrice": "Оправа нархи (сўм)",
    "form.phone": "Телефон рақами",
    "form.select": "Танланг",
    
    // Lens types
    "lens.3b1Brown": "3Б1 жигарранг",
    "lens.3b1Black": "3Б1 қора",
    "lens.4b1": "4Б1",
    "lens.420": "420",
    "lens.sr": "СР",
    
    // Frame types
    "frame.round": "Думалоқ",
    "frame.fabritsio": "Фабрицио",
    "frame.alaniye": "Аланийе",
    "frame.titanik": "Титаник",
    
    // Form labels - Lens Registry
    "form.lensTypeRegistry": "Линза тури",
    
    // Form labels - Examination
    "form.patientName": "Мижоз",
    
    // Form labels - Ready Glasses
    "form.glassesType": "Кўзойнак тури",
    "form.amount": "Сумма (сўм)",
    
    // Form labels - Lens Sale
    "form.clientNameSale": "Клиент",
    "form.lensTypeSale": "Линза тури",
    
    // Trash
    "trash.title": "Чиқиндилар",
    "trash.subtitle": "Ўчирилган маълумотларни бошқариш",
    "trash.empty": "Чиқиндилар бўш",
    "trash.restore": "Тиклаш",
    "trash.deletePermanent": "Бутунлай ўчириш",
    "trash.restored": "Тикланди!",
    "trash.permanentDeleted": "Бутунлай ўчирилди!",
    "trash.deletedAt": "Ўчирилган вақти",
    "trash.noName": "Номсиз",
    "trash.orders": "Буюртма",
    "trash.examinations": "Текширув",
    "trash.readyGlasses": "Тайёр кўзойнак",
    "trash.lensSales": "Линза сотуви",
    "trash.lensLists": "Линза рўйхати",
    "trash.confirmDelete": "Бутунлай ўчириш",
    "trash.confirmDeleteDesc": "Бу маълумот бутунлай ўчирилади ва уни қайта тиклаб бўлмайди.",
    "trash.confirmRestore": "Тиклаш",
    "trash.confirmRestoreDesc": "Бу маълумотни тикламоқчимисиз?",
    
    // Delete confirmation
    "delete.confirm": "Ўчиришни тасдиқлаш",
    "delete.confirmDesc": "Бу маълумотни чиқиндиларга ўтказмоқчимисиз?",
    
    // Edit dialog
    "edit.title": "Таҳрирлаш",
    "edit.success": "Сақланди!",
    
    // Reports (additional)
    "reports.dateRange": "Сана оралиғи",
    "reports.apply": "Қўллаш",
    "reports.reset": "Тозалаш",
    "reports.export": "Экспорт",
    "reports.exportExcel": "Excel форматида экспорт",
    "reports.exportPDF": "PDF форматида экспорт",
    
    // Auth
    "auth.login": "Кириш",
    "auth.signup": "Рўйхатдан ўтиш",
    "auth.email": "Электрон почта",
    "auth.password": "Парол",
    "auth.confirmPassword": "Паролни тасдиқлаш",
    "auth.loading": "Юкланмоқда...",
    "auth.loginSuccess": "Муваффақиятли кирилди!",
    "auth.signupSuccess": "Рўйхатдан ўтилди!",
    "auth.error": "Хатолик юз берди",
    "auth.passwordMismatch": "Паролар мос келмади",
    "auth.noAccount": "Ҳисобингиз йўқми? Рўйхатдан ўтинг",
    "auth.haveAccount": "Ҳисобингиз борми? Киринг",
    "auth.logout": "Чиқиш",
  },
  latin: {
    // Navigation
    "nav.orders": "Buyurtmalar",
    "nav.lensLists": "Linza ro'yxatlari",
    "nav.examination": "Tekshiruv",
    "nav.readyGlasses": "Tayyor ko'zoynaklar",
    "nav.lensSales": "Linza sotuvi",
    "nav.reports": "Hisobotlar",
    "nav.trash": "Chiqindilar",
    "app.title": "Optika CRM",
    
    // Orders page
    "orders.title": "Buyurtmalar",
    "orders.subtitle": "Ko'zoynak buyurtmalarini boshqarish",
    "orders.list": "Buyurtmalar ro'yxati",
    "orders.total": "Jami",
    "orders.client": "Kliyent",
    "orders.phone": "Telefon",
    "orders.frameType": "Ramka turi",
    "orders.lensType": "Linza turi",
    "orders.totalAmount": "Jami summa",
    "orders.paid": "To'langan",
    "orders.debt": "Qarz",
    "orders.date": "Sana",
    "orders.number": "№",
    "orders.add": "Qo'shish",
    "orders.addSuccess": "Buyurtma qo'shildi!",
    "orders.deleteSuccess": "O'chirildi",
    "orders.search": "Qidirish...",
    
    // Lens lists
    "lens.title": "Linza ro'yxatlari",
    "lens.subtitle": "Ko'zga tekshirish ma'lumotlari",
    "lens.list": "Linza ro'yxati",
    "lens.rightEye": "O'ng ko'z",
    "lens.leftEye": "Chap ko'z",
    "lens.sphere": "Sfera",
    "lens.cylinder": "Silindr",
    "lens.axis": "O'q",
    "lens.pd": "Mp",
    "lens.add": "Qo'shish",
    "lens.addSuccess": "Linza qo'shildi!",
    "lens.deleteSuccess": "O'chirildi",
    "lens.search": "Qidirish...",
    
    // Examination
    "exam.title": "Ko'z tekshiruvi",
    "exam.subtitle": "Tibbiy ko'z tekshiruvlari",
    "exam.list": "Tekshiruvlar ro'yxati",
    "exam.patient": "Mijoz",
    "exam.refractometry": "Refraksiyametriya — 50,000 so'm",
    "exam.tonometry": "Tanometriya — 15,000 so'm",
    "exam.services": "Xizmatlar",
    "exam.add": "Qo'shish",
    "exam.addSuccess": "Tekshiruv qo'shildi!",
    "exam.deleteSuccess": "O'chirildi",
    "exam.search": "Qidirish...",
    
    // Ready glasses
    "ready.title": "Tayyor ko'zoynaklar",
    "ready.subtitle": "Tayyor ko'zoynaklar sotuvi",
    "ready.list": "Ko'zoynaklar ro'yxati",
    "ready.client": "Kliyent",
    "ready.type": "Ko'zoynak turi",
    "ready.amount": "Summa",
    "ready.add": "Qo'shish",
    "ready.addSuccess": "Ko'zoynak qo'shildi!",
    "ready.deleteSuccess": "O'chirildi",
    "ready.search": "Qidirish...",
    "ready.sunProtection": "Quyoshdan himoya",
    "ready.computerChameleon": "Kompyuter-hameleon",
    "ready.computer": "Kompyuter",
    "ready.vision": "Zreniya",
    
    // Lens sales
    "lensSale.title": "Linza sotuvi",
    "lensSale.subtitle": "Linza va aksessuarlar sotuvi",
    "lensSale.list": "Sotuvlar ro'yxati",
    "lensSale.client": "Kliyent",
    "lensSale.type": "Linza turi",
    "lensSale.amount": "Summa",
    "lensSale.add": "Qo'shish",
    "lensSale.addSuccess": "Sotuv qo'shildi!",
    "lensSale.deleteSuccess": "O'chirildi",
    "lensSale.search": "Qidirish...",
    "lensSale.american": "Amerikanskiy",
    "lensSale.korean": "Koreyskiy",
    "lensSale.astigmatic": "Astigmatik",
    "lensSale.coloredVision": "Rangli zreniya",
    "lensSale.beauty": "Chiroy uchun",
    "lensSale.solution": "Linza suvi",
    "lensSale.container": "Linza konteyneri",
    "lensSale.select": "Tanlang",
    
    // Reports
    "reports.title": "Hisobotlar",
    "reports.subtitle": "Tushum va xarajatlar statistikasi",
    "reports.daily": "Kunlik",
    "reports.weekly": "Haftalik",
    "reports.monthly": "Oylik",
    "reports.totalIncome": "Jami tushum",
    "reports.income": "Tushum",
    "reports.bySection": "Bo'limlar bo'yicha tushum",
    "reports.recordCount": "ta yozuv",
    "reports.export": "Export",
    "reports.exportExcel": "Excel formatida export",
    "reports.exportPDF": "PDF formatida export",
    
    // Common
    "common.sum": "so'm",
    "common.date": "Sana",
    "common.total": "Jami",
    "common.delete": "O'chirish",
    "common.actions": "Amallar",
    "common.yes": "Ha",
    "common.no": "Yo'q",
    "common.edit": "Tahrirlash",
    "common.save": "Saqlash",
    "common.cancel": "Bekor qilish",
    "common.from": "dan",
    "common.to": "gacha",
    
    // Form labels - Orders
    "form.clientName": "Mijoz familiyasi va ismi",
    "form.rightEye": "OK (o'ng ko'z)",
    "form.leftEye": "ChK (chap ko'z)",
    "form.lensType": "Oyna turi",
    "form.lensPrice": "Oyna narxi (so'm)",
    "form.frameType": "Oprava (ramka) turi",
    "form.framePrice": "Oprava narxi (so'm)",
    "form.phone": "Telefon raqami",
    "form.select": "Tanlang",
    
    // Lens types
    "lens.3b1Brown": "3B1 jigarrang",
    "lens.3b1Black": "3B1 qora",
    "lens.4b1": "4B1",
    "lens.420": "420",
    "lens.sr": "SR",
    
    // Frame types
    "frame.round": "Dumaloq",
    "frame.fabritsio": "Fabritsio",
    "frame.alaniye": "Alaniye",
    "frame.titanik": "Titanik",
    
    // Form labels - Lens Registry
    "form.lensTypeRegistry": "Linza turi",
    
    // Form labels - Examination
    "form.patientName": "Mijoz",
    
    // Form labels - Ready Glasses
    "form.glassesType": "Ko'zoynak turi",
    "form.amount": "Summa (so'm)",
    
    // Form labels - Lens Sale
    "form.clientNameSale": "Kliyent",
    "form.lensTypeSale": "Linza turi",
    
    // Trash
    "trash.title": "Chiqindilar",
    "trash.subtitle": "O'chirilgan ma'lumotlarni boshqarish",
    "trash.empty": "Chiqindilar bo'sh",
    "trash.restore": "Tiklash",
    "trash.deletePermanent": "Butunlay o'chirish",
    "trash.restored": "Tiklandi!",
    "trash.permanentDeleted": "Butunlay o'chirildi!",
    "trash.deletedAt": "O'chirilgan vaqti",
    "trash.noName": "Nomsiz",
    "trash.orders": "Buyurtma",
    "trash.examinations": "Tekshiruv",
    "trash.readyGlasses": "Tayyor ko'zoynak",
    "trash.lensSales": "Linza sotuvi",
    "trash.lensLists": "Linza ro'yxati",
    "trash.confirmDelete": "Butunlay o'chirish",
    "trash.confirmDeleteDesc": "Bu ma'lumot butunlay o'chiriladi va uni qayta tiklab bo'lmaydi.",
    "trash.confirmRestore": "Tiklash",
    "trash.confirmRestoreDesc": "Bu ma'lumotni tiklmoqchimisiz?",
    
    // Delete confirmation
    "delete.confirm": "O'chirishni tasdiqlash",
    "delete.confirmDesc": "Bu ma'lumotni chiqindilarga o'tkazmoqchimisiz?",
    // Edit dialog
    "edit.title": "Tahrirlash",
    "edit.success": "Saqlandi!",
    
    // Reports (additional keys)
    "reports.dateRange": "Sana oraliği",
    "reports.apply": "Qo'llash",
    "reports.reset": "Tozalash",
    
    // Auth
    "auth.login": "Kirish",
    "auth.signup": "Ro'yxatdan o'tish",
    "auth.email": "Elektron pochta",
    "auth.password": "Parol",
    "auth.confirmPassword": "Parolni tasdiqlash",
    "auth.loading": "Yuklanmoqda...",
    "auth.loginSuccess": "Muvaffaqiyatli kirildi!",
    "auth.signupSuccess": "Ro'yxatdan o'tildi!",
    "auth.error": "Xatolik yuz berdi",
    "auth.passwordMismatch": "Parollar mos kelmadi",
    "auth.noAccount": "Hisobingiz yo'qmi? Ro'yxatdan o'ting",
    "auth.haveAccount": "Hisobingiz bormi? Kiring",
    "auth.logout": "Chiqish",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [script, setScript] = useState<Script>(() => {
    const saved = localStorage.getItem("script");
    return (saved as Script) || "cyrillic";
  });

  useEffect(() => {
    localStorage.setItem("script", script);
  }, [script]);

  const toggleScript = () => {
    setScript((prev) => (prev === "cyrillic" ? "latin" : "cyrillic"));
  };

  const t = (key: string): string => {
    return translations[script][key as keyof typeof translations.cyrillic] || key;
  };

  return (
    <LanguageContext.Provider value={{ script, toggleScript, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
