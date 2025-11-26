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
    "orders.client": "Мижоз",
    "orders.phone": "Телефон",
    "orders.frameType": "Рамка тури",
    "orders.lensType": "Линза тури",
    "orders.totalAmount": "Жами нарх",
    "orders.paid": "Тўланган",
    "orders.debt": "Қарз",
    "orders.date": "Сана",
    "orders.number": "№",
    "orders.add": "Қўшиш",
    "orders.addSuccess": "Буюртма қўшилди!",
    "orders.deleteSuccess": "Ўчирилди",
    "orders.search": "Қидириш...",
    "orders.lensPrice": "Ойна нархи",
    "orders.framePrice": "Оправа нархи",
    "orders.vision": "Зрения",
    "orders.sunProtection": "Қуёшдан ҳимоя",
    "orders.chameleon": "Хамелеон",
    "orders.computer": "Компютер",
    
    // Lens lists
    "lens.title": "Линза рўйхатлари",
    "lens.subtitle": "Кўзга текшириш маълумотлари",
    "lens.list": "Линза рўйхати",
    "lens.number": "№",
    "lens.date": "Сана",
    "lens.client": "Мижоз",
    "lens.phone": "Телефон",
    "lens.lensType": "Линза тури",
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
    "lens.noResults": "Қидирув бўйича натижа топилмади",
    "lens.empty": "Ҳозирча рўйхат бўш",
    "lens.patientCard": "Бемор картаси",
    "lens.currentData": "Ҳозирги маълумотлар",
    "lens.lastVisit": "Охирги ташриф",
    "lens.changeHistory": "Ўзгаришлар тарихи",
    "lens.noHistory": "Таrix мавжуд эмас",
    "lens.visit": "Ташриф",
    "lens.viewHistory": "Таrixни кўриш",
    "lens.updateSuccess": "Бемор маълумотлари янгиланди!",
    "lens.firstVisit": "Биринчи ташриф",
    "lens.addNewRecord": "Янги текшируv қўшиш",
    "common.loading": "Юкланмоқда...",
    
    // Examination
    "exam.title": "Кўз текшируви",
    "exam.subtitle": "Тиббий кўз текширувлари",
    "exam.list": "Текширувлар рўйхати",
    "exam.patient": "Мижоз",
    "exam.refractometry": "Рефраксияметрия — 50,000 сўм",
    "exam.tonometry": "Танометрия — 15,000 сўм",
    "exam.services": "Хизматлар",
    "exam.examType": "Текширув тури",
    "exam.examinations": "Текширувлар",
    "exam.refractometryShort": "Рефраксияметрия",
    "exam.tonometryShort": "Танометрия",
    "exam.refractometryAbbr": "Рефр.",
    "exam.tonometryAbbr": "Тано.",
    "exam.total": "Жами",
    "exam.number": "№",
    "exam.date": "Сана",
    "exam.amount": "Нарх",
    "exam.add": "Қўшиш",
    "exam.addSuccess": "Текширув қўшилди!",
    "exam.deleteSuccess": "Ўчирилди",
    "exam.search": "Қидириш...",
    "exam.noResults": "Қидирув бўйича натижа топилмади",
    "exam.empty": "Ҳозирча текширувлар йўқ",
    
    // Ready glasses
    "ready.title": "Тайёр кўзойнаклар",
    "ready.subtitle": "Тайёр кўзойнаклар сотуви",
    "ready.list": "Кўзойнаклар рўйхати",
    "ready.client": "Мижоз",
    "ready.type": "Кўзойнак тури",
    "ready.amount": "Нарх",
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
    "lensSale.client": "Мижоз",
    "lensSale.type": "Линза тури",
    "lensSale.amount": "Нарх",
    "lensSale.add": "Қўшиш",
    "lensSale.addSuccess": "Сотув қўшилди!",
    "lensSale.deleteSuccess": "Ўчирилди",
    "lensSale.search": "Қидириш...",
    "lensSale.american": "Американский",
    "lensSale.korean": "Корейский",
    "lensSale.astigmatic": "Астигматик",
    "lensSale.coloredVision": "Ранgli зрения",
    "lensSale.beauty": "Чирой учун",
    "lensSale.solution": "Линза суви",
    "lensSale.container": "Линза контейнери",
    "lensSale.select": "Танланг",
    
    // Reports
    "reports.title": "Ҳисоботлар",
    "reports.subtitle": "Тушум ва харажатлар статистикаси",
    "reports.daily": "Бугун",
    "reports.weekly": "Бу ҳафта",
    "reports.monthly": "Бу ой",
    "reports.totalIncome": "Жами тушум",
    "reports.income": "Тушум",
    "reports.bySection": "Бўлимлар бўйича тушум",
    "reports.recordCount": "та ёзув",
    "reports.dateRange": "Сана оралиғи",
    "reports.reset": "Қайта тиклаш",
    "reports.selectDate": "Санани танланг",
    "reports.compare": "Таққослаш",
    "reports.compareTooltip": "Таққослаш учун сана оралиғини танланг",
    "reports.productServiceType": "Маҳсулот/Хизмат тури",
    "reports.exportByPeriod": "Давр бўйича",
    "reports.exportBySection": "Бўлим бўйича",
    "reports.exportDetailed": "Батафсил",
    "reports.currentPeriod": "Жорий давр",
    "reports.previousPeriod": "Олдинги давр",
    "reports.change": "Ўзгариш",
    "reports.previous": "Олдинги:",
    "reports.records": "та ёзув",
    
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
    "common.saving": "Сақланмоқда...",
    "common.cancel": "Бекор қилиш",
    "common.from": "дан",
    "common.to": "гача",
    "common.exportedBy": "Экспорт қилган:",
    "common.dateAndTime": "Сана ва вақт:",
    "common.currency": "сўм",
    
    // Form labels - Orders
    "form.clientName": "Мижоз фамилияси ва исми",
    "form.phone": "Телефон рақами",
    "form.rightEye": "OD",
    "form.leftEye": "OS",
    "form.lensType": "Ойна тури",
    "form.lensPrice": "Ойна нархи (сўм)",
    "form.frameType": "Оправа (рамка) тури",
    "form.framePrice": "Оправа нархи (сўм)",
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
    "form.clientNameSale": "Мижоз",
    "form.lensTypeSale": "Линза тури",
    
    // Trash
    "trash.title": "Чиқиндилар",
    "trash.subtitle": "Ўчирилган маълумотларни бошқариш",
    "trash.empty": "Чиқиндилар бўш",
    "trash.restore": "Тиклаш",
    "trash.deletePermanent": "Бутунлай ўчириш",
    "trash.clearAll": "Барчасини тозалаш",
    "trash.restored": "Тикланди!",
    "trash.permanentDeleted": "Бутунлай ўчирилди!",
    "trash.clearedAll": "Чиқиндилар тозаланди!",
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
    "trash.confirmClearAll": "Барча чиқиндиларни тозалашми?",
    "trash.confirmClearAllDesc": "Барча ўчирилган маълумотлар бутунлай йўқ қилинади.",
    
    // Delete confirmation
    "delete.confirm": "Ўчиришни тасдиқлаш",
    "delete.confirmDesc": "Бу маълумотни чиқиндиларга ўтказмоқчимисиз?",
    
    // Edit dialog
    "edit.title": "Таҳрирлаш",
    "edit.success": "Сақланди!",
    
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
    "auth.passwordHint": "(камида 8 та белги)",
    "auth.rememberMe": "Эсда сақлаш",
    "auth.forgotPassword": "Паролни унутдингизми?",
    "auth.resetPassword": "Паролни тиклаш",
    "auth.resetPasswordDesc": "Электрон почтангизга тиклаш хабари юборамиз",
    "auth.sendResetLink": "Тиклаш хабарини юбориш",
    "auth.resetLinkSent": "Тиклаш хабари юборилди!",
    "auth.backToLogin": "Кириш саҳифасига қайтиш",
    "auth.welcome": "Хуш келибсиз",
    "auth.welcomeDesc": "Тизимга кириш учун маълумотларингизни киритинг",
    "auth.user": "Фойдаланувчи",
    "auth.contactForCRM": "CRM тизимини сотиб олиш учун боғланинг",
    "auth.developer": "Дастурчи",

    // Profile
    "profile.title": "Профил",
    "profile.subtitle": "Шахсий маълумотларингизни бошқаринг",
    "profile.personalInfo": "Шахсий маълумотлар",
    "profile.updateInfo": "Маълумотларни янгилаш",
    "profile.email": "Электрон почта",
    "profile.emailNote": "Электрон почтани ўзгартириб бўлмайди",
    "profile.fullName": "Толиқ исм",
    "profile.fullNamePlaceholder": "Толиқ исмингизни киритинг",
    "profile.save": "Сақлаш",
    "profile.saveSuccess": "Профил янгиланди!",

    // Admin page
    "admin.title": "Фойдаланувчилар бошқаруви",
    "admin.subtitle": "Тизимга янги фойдаланувчилар қўшинг",
    "admin.addUser": "Фойдаланувчи қўшиш",
    "admin.email": "Электрон почта",
    "admin.fullName": "Тўлиқ исм",
    "admin.role": "Рол",
    "admin.roleUser": "Фойдаланувчи",
    "admin.roleAdmin": "Админ",
    "admin.addedDate": "Қўшилган сана",
    "admin.deleteTitle": "Фойдаланувчини ўчириш",
    "admin.deleteDesc": "Бу фойдаланувчи ва унинг барча маълумотлари ўчирилади. Давом етасизми?",

    // Nav additional
    "nav.users": "Фойдаланувчилар",

    // Toast messages
    "toast.loadError": "Маълумотларни юклашда хатолик юз берди",
    "toast.loginRequired": "Илтимос, тизимга киринг",
    "toast.saveError": "Маълумотни сақлашда хатолик юз берди",
    "toast.deleteError": "Маълумотни ўчиришда хатолик юз берди",
    "toast.updateError": "Маълумотни янгилашда хатолик юз берди",
    "toast.excelSuccess": "Excel файл юклаб олинди",
    "toast.pdfSuccess": "PDF файл юклаб олинди",
    "toast.printError": "Чоп этишда хатолик юз берди",
    "toast.printTableNotFound": "Чоп этиш учун жадвал топилмади",
    "toast.exportError": "Экспорт қилишда хатолик юз берди",
    "toast.userAdded": "Фойдаланувчи муваффақиятли қўшилди",
    "toast.userDeleted": "Фойдаланувчи ўчирилди",
    "toast.userAddError": "Фойдаланувчи қўшишда хатолик юз берди",
    "toast.userDeleteError": "Фойдаланувчини ўчиришда хатолик юз берди",
    "toast.authError": "Тизимга киришда хатолик юз берди",
    "toast.invalidType": "Нотўғри маълумот тури",

    // Export
    "export.exportedBy": "Экспорт қилган",
    "export.dateTime": "Сана ва вақт",
    "export.totalSum": "Жами сумма",
    "export.unknown": "Номаълум",
    "export.info": "Маълумот",
    "export.value": "Қиймат",

    // Common additional
    "common.add": "Қўшиш",
    "common.error": "Хатолик юз берди",
    "common.updateSuccess": "Янгиланди!",
    "common.sheet": "Маълумотлар",
    "common.metadata": "Маълумот",
    
    // Toast messages
    "toast.error": "Хатолик юз берди",
    
    // Date filters
    "dateFilter.all": "Барчаси",
    "dateFilter.today": "Бугун",
    "dateFilter.yesterday": "Кеча",
    "dateFilter.thisWeek": "Ҳозирги ҳафта",
    "dateFilter.lastWeek": "Ўтган ҳафта",
    "dateFilter.thisMonth": "Ҳозирги ой",
    "dateFilter.lastMonth": "Ўтган ой",

    // Footer
    "footer.developedBy": "Ишлаб чиқувчи:",
    "footer.contactForPurchase": "CRM тизимини сотиб олиш учун боғланинг",
    "footer.allRightsReserved": "Барча ҳуқуқлар ҳимояланган",
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
    "orders.client": "Mijoz",
    "orders.phone": "Telefon",
    "orders.frameType": "Ramka turi",
    "orders.lensType": "Linza turi",
    "orders.totalAmount": "Jami narx",
    "orders.paid": "To'langan",
    "orders.debt": "Qarz",
    "orders.date": "Sana",
    "orders.number": "№",
    "orders.add": "Qo'shish",
    "orders.addSuccess": "Buyurtma qo'shildi!",
    "orders.deleteSuccess": "O'chirildi",
    "orders.search": "Qidirish...",
    "orders.lensPrice": "Oyna narxi",
    "orders.framePrice": "Oprava narxi",
    "orders.vision": "Zreniya",
    "orders.sunProtection": "Quyoshdan himoya",
    "orders.chameleon": "Hameleon",
    "orders.computer": "Kompyuter",
    
    // Lens lists
    "lens.title": "Linza ro'yxatlari",
    "lens.subtitle": "Ko'zga tekshirish ma'lumotlari",
    "lens.list": "Linza ro'yxati",
    "lens.number": "№",
    "lens.date": "Sana",
    "lens.client": "Mijoz",
    "lens.phone": "Telefon",
    "lens.lensType": "Linza turi",
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
    "lens.noResults": "Qidiruv bo'yicha natija topilmadi",
    "lens.empty": "Hozircha ro'yxat bo'sh",
    "lens.patientCard": "Bemor kartasi",
    "lens.currentData": "Hozirgi ma'lumotlar",
    "lens.lastVisit": "Oxirgi tashrif",
    "lens.changeHistory": "O'zgarishlar tarixi",
    "lens.noHistory": "Tarix mavjud emas",
    "lens.visit": "Tashrif",
    "lens.viewHistory": "Tarixni ko'rish",
    "lens.updateSuccess": "Bemor ma'lumotlari yangilandi!",
    "lens.firstVisit": "Birinchi tashrif",
    "lens.addNewRecord": "Yangi tekshiruv qo'shish",
    "common.loading": "Yuklanmoqda...",
    
    // Examination
    "exam.title": "Ko'z tekshiruvi",
    "exam.subtitle": "Tibbiy ko'z tekshiruvlari",
    "exam.list": "Tekshiruvlar ro'yxati",
    "exam.patient": "Mijoz",
    "exam.refractometry": "Refraksiyametriya — 50,000 so'm",
    "exam.tonometry": "Tanometriya — 15,000 so'm",
    "exam.services": "Xizmatlar",
    "exam.examType": "Tekshiruv turi",
    "exam.examinations": "Tekshiruvlar",
    "exam.refractometryShort": "Refraksiyametriya",
    "exam.tonometryShort": "Tanometriya",
    "exam.refractometryAbbr": "Refr.",
    "exam.tonometryAbbr": "Tano.",
    "exam.total": "Jami",
    "exam.number": "№",
    "exam.date": "Sana",
    "exam.amount": "Narx",
    "exam.add": "Qo'shish",
    "exam.addSuccess": "Tekshiruv qo'shildi!",
    "exam.deleteSuccess": "O'chirildi",
    "exam.search": "Qidirish...",
    "exam.noResults": "Qidiruv bo'yicha natija topilmadi",
    "exam.empty": "Hozircha tekshiruvlar yo'q",
    
    // Ready glasses
    "ready.title": "Tayyor ko'zoynaklar",
    "ready.subtitle": "Tayyor ko'zoynaklar sotuvi",
    "ready.list": "Ko'zoynaklar ro'yxati",
    "ready.client": "Mijoz",
    "ready.type": "Ko'zoynak turi",
    "ready.amount": "Narx",
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
    "lensSale.client": "Mijoz",
    "lensSale.type": "Linza turi",
    "lensSale.amount": "Narx",
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
    "reports.daily": "Bugun",
    "reports.weekly": "Bu hafta",
    "reports.monthly": "Bu oy",
    "reports.totalIncome": "Jami tushum",
    "reports.income": "Tushum",
    "reports.bySection": "Bo'limlar bo'yicha tushum",
    "reports.recordCount": "ta yozuv",
    "reports.export": "Export",
    "reports.exportExcel": "Excel formatida export",
    "reports.exportPDF": "PDF formatida export",
    "reports.dateRange": "Sana oraliği",
    "reports.reset": "Qayta tiklash",
    "reports.selectDate": "Sanani tanlang",
    "reports.compare": "Taqqoslash",
    "reports.compareTooltip": "Taqqoslash uchun sana oralig'ini tanlang",
    "reports.productServiceType": "Mahsulot/Xizmat turi",
    "reports.exportByPeriod": "Davr bo'yicha",
    "reports.exportBySection": "Bo'lim bo'yicha",
    "reports.exportDetailed": "Batafsil",
    "reports.currentPeriod": "Joriy davr",
    "reports.previousPeriod": "Oldingi davr",
    "reports.change": "O'zgarish",
    "reports.previous": "Oldingi:",
    "reports.records": "ta yozuv",
    
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
    "common.saving": "Saqlanmoqda...",
    "common.cancel": "Bekor qilish",
    "common.from": "dan",
    "common.to": "gacha",
    "common.exportedBy": "Eksport qilgan:",
    "common.dateAndTime": "Sana va vaqt:",
    "common.currency": "so'm",
    
    // Form labels - Orders
    "form.clientName": "Mijoz familiyasi va ismi",
    "form.phone": "Telefon raqami",
    "form.rightEye": "OD",
    "form.leftEye": "OS",
    "form.lensType": "Oyna turi",
    "form.lensPrice": "Oyna narxi (so'm)",
    "form.frameType": "Oprava (ramka) turi",
    "form.framePrice": "Oprava narxi (so'm)",
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
    "form.amount": "Narx (so'm)",
    
    // Form labels - Lens Sale
    "form.clientNameSale": "Mijoz",
    "form.lensTypeSale": "Linza turi",
    
    // Trash
    "trash.title": "Chiqindilar",
    "trash.subtitle": "O'chirilgan ma'lumotlarni boshqarish",
    "trash.empty": "Chiqindilar bo'sh",
    "trash.restore": "Tiklash",
    "trash.deletePermanent": "Butunlay o'chirish",
    "trash.clearAll": "Barchasini tozalash",
    "trash.restored": "Tiklandi!",
    "trash.permanentDeleted": "Butunlay o'chirildi!",
    "trash.clearedAll": "Chiqindilar tozalandi!",
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
    "trash.confirmClearAll": "Barcha chiqindilarni tozalashmi?",
    "trash.confirmClearAllDesc": "Barcha o'chirilgan ma'lumotlar butunlay yo'q qilinadi.",
    
    // Delete confirmation
    "delete.confirm": "O'chirishni tasdiqlash",
    "delete.confirmDesc": "Bu ma'lumotni chiqindilarga o'tkazmoqchimisiz?",
    // Edit dialog
    "edit.title": "Tahrirlash",
    "edit.success": "Saqlandi!",
    
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
    "auth.passwordHint": "(kamida 8 ta belgi)",
    "auth.rememberMe": "Esda saqlash",
    "auth.forgotPassword": "Parolni unutdingizmi?",
    "auth.resetPassword": "Parolni tiklash",
    "auth.resetPasswordDesc": "Elektron pochtangizga tiklash xabari yuboramiz",
    "auth.sendResetLink": "Tiklash xabarini yuborish",
    "auth.resetLinkSent": "Tiklash xabari yuborildi!",
    "auth.backToLogin": "Kirish sahifasiga qaytish",
    "auth.welcome": "Xush kelibsiz",
    "auth.welcomeDesc": "Tizimga kirish uchun ma'lumotlaringizni kiriting",
    "auth.user": "Foydalanuvchi",
    "auth.contactForCRM": "CRM tizimini sotib olish uchun bog'laning",
    "auth.developer": "Dasturchi",

    // Profile
    "profile.title": "Profil",
    "profile.subtitle": "Shaxsiy ma'lumotlaringizni boshqaring",
    "profile.personalInfo": "Shaxsiy ma'lumotlar",
    "profile.updateInfo": "Ma'lumotlarni yangilash",
    "profile.email": "Elektron pochta",
    "profile.emailNote": "Elektron pochtani o'zgartirib bo'lmaydi",
    "profile.fullName": "To'liq ism",
    "profile.fullNamePlaceholder": "To'liq ismingizni kiriting",
    "profile.save": "Saqlash",
    "profile.saveSuccess": "Profil yangilandi!",

    // Admin page
    "admin.title": "Foydalanuvchilar boshqaruvi",
    "admin.subtitle": "Tizimga yangi foydalanuvchilar qo'shing",
    "admin.addUser": "Foydalanuvchi qo'shish",
    "admin.email": "Elektron pochta",
    "admin.fullName": "To'liq ism",
    "admin.role": "Rol",
    "admin.roleUser": "Foydalanuvchi",
    "admin.roleAdmin": "Admin",
    "admin.addedDate": "Qo'shilgan sana",
    "admin.deleteTitle": "Foydalanuvchini o'chirish",
    "admin.deleteDesc": "Bu foydalanuvchi va uning barcha ma'lumotlari o'chiriladi. Davom etasizmi?",

    // Nav additional
    "nav.users": "Foydalanuvchilar",

    // Toast messages
    "toast.loadError": "Ma'lumotlarni yuklashda xatolik yuz berdi",
    "toast.loginRequired": "Iltimos, tizimga kiring",
    "toast.saveError": "Ma'lumotni saqlashda xatolik yuz berdi",
    "toast.deleteError": "Ma'lumotni o'chirishda xatolik yuz berdi",
    "toast.updateError": "Ma'lumotni yangilashda xatolik yuz berdi",
    "toast.excelSuccess": "Excel fayl yuklab olindi",
    "toast.pdfSuccess": "PDF fayl yuklab olindi",
    "toast.printError": "Chop etishda xatolik yuz berdi",
    "toast.printTableNotFound": "Chop etish uchun jadval topilmadi",
    "toast.exportError": "Eksport qilishda xatolik yuz berdi",
    "toast.userAdded": "Foydalanuvchi muvaffaqiyatli qo'shildi",
    "toast.userDeleted": "Foydalanuvchi o'chirildi",
    "toast.userAddError": "Foydalanuvchi qo'shishda xatolik yuz berdi",
    "toast.userDeleteError": "Foydalanuvchini o'chirishda xatolik yuz berdi",
    "toast.authError": "Tizimga kirishda xatolik yuz berdi",
    "toast.invalidType": "Noto'g'ri ma'lumot turi",

    // Export
    "export.exportedBy": "Eksport qilgan",
    "export.dateTime": "Sana va vaqt",
    "export.totalSum": "Jami summa",
    "export.unknown": "Noma'lum",
    "export.info": "Ma'lumot",
    "export.value": "Qiymat",

    // Common additional
    "common.add": "Qo'shish",
    "common.error": "Xatolik yuz berdi",
    "common.updateSuccess": "Yangilandi!",
    "common.sheet": "Ma'lumotlar",
    "common.metadata": "Ma'lumot",
    
    // Toast messages
    "toast.error": "Xatolik yuz berdi",
    
    // Date filters
    "dateFilter.all": "Barchasi",
    "dateFilter.today": "Bugun",
    "dateFilter.yesterday": "Kecha",
    "dateFilter.thisWeek": "Hozirgi hafta",
    "dateFilter.lastWeek": "O'tgan hafta",
    "dateFilter.thisMonth": "Hozirgi oy",
    "dateFilter.lastMonth": "O'tgan oy",

    // Footer
    "footer.developedBy": "Ishlab chiquvchi:",
    "footer.contactForPurchase": "CRM tizimini sotib olish uchun bog'laning",
    "footer.allRightsReserved": "Barcha huquqlar himoyalangan",
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
