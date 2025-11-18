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
    
    // Common
    "common.sum": "сўм",
    "common.date": "Сана",
    "common.total": "Жами",
    "common.delete": "Ўчириш",
  },
  latin: {
    // Navigation
    "nav.orders": "Buyurtmalar",
    "nav.lensLists": "Linza ro'yxatlari",
    "nav.examination": "Tekshiruv",
    "nav.readyGlasses": "Tayyor ko'zoynaklar",
    "nav.lensSales": "Linza sotuvi",
    "nav.reports": "Hisobotlar",
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
    
    // Common
    "common.sum": "so'm",
    "common.date": "Sana",
    "common.total": "Jami",
    "common.delete": "O'chirish",
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
