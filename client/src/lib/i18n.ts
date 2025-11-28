// Internationalization support for STEELIQ
import { useState, useEffect, useCallback } from 'react';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

interface Translations {
  [key: string]: {
    [lang in Language]?: string;
  };
}

// Common translations across the application
const translations: Translations = {
  // Navigation
  'nav.dashboard': {
    en: 'Dashboard',
    es: 'Tablero',
    fr: 'Tableau de bord',
    de: 'Dashboard',
    zh: '仪表板',
    ja: 'ダッシュボード'
  },
  'nav.time_payroll': {
    en: 'Time & Payroll',
    es: 'Tiempo y Nómina',
    fr: 'Temps et Paie',
    de: 'Zeit & Gehalt',
    zh: '时间和工资',
    ja: '勤怠・給与'
  },
  'nav.jobs': {
    en: 'Jobs',
    es: 'Trabajos',
    fr: 'Emplois',
    de: 'Aufträge',
    zh: '工作',
    ja: 'ジョブ'
  },
  
  // Time & Payroll
  'time.clock_in': {
    en: 'Clock In',
    es: 'Entrada',
    fr: 'Pointage Entrée',
    de: 'Einstempeln',
    zh: '上班打卡',
    ja: '出勤'
  },
  'time.clock_out': {
    en: 'Clock Out',
    es: 'Salida',
    fr: 'Pointage Sortie',
    de: 'Ausstempeln',
    zh: '下班打卡',
    ja: '退勤'
  },
  'time.break_start': {
    en: 'Start Break',
    es: 'Iniciar Descanso',
    fr: 'Début Pause',
    de: 'Pause Beginnen',
    zh: '开始休息',
    ja: '休憩開始'
  },
  'time.break_end': {
    en: 'End Break',
    es: 'Terminar Descanso',
    fr: 'Fin Pause',
    de: 'Pause Beenden',
    zh: '结束休息',
    ja: '休憩終了'
  },
  'time.total_hours': {
    en: 'Total Hours',
    es: 'Horas Totales',
    fr: 'Heures Totales',
    de: 'Gesamtstunden',
    zh: '总小时数',
    ja: '合計時間'
  },
  'time.overtime': {
    en: 'Overtime',
    es: 'Horas Extra',
    fr: 'Heures Supplémentaires',
    de: 'Überstunden',
    zh: '加班',
    ja: '残業'
  },
  
  // Common Actions
  'action.save': {
    en: 'Save',
    es: 'Guardar',
    fr: 'Enregistrer',
    de: 'Speichern',
    zh: '保存',
    ja: '保存'
  },
  'action.cancel': {
    en: 'Cancel',
    es: 'Cancelar',
    fr: 'Annuler',
    de: 'Abbrechen',
    zh: '取消',
    ja: 'キャンセル'
  },
  'action.submit': {
    en: 'Submit',
    es: 'Enviar',
    fr: 'Soumettre',
    de: 'Einreichen',
    zh: '提交',
    ja: '送信'
  },
  'action.approve': {
    en: 'Approve',
    es: 'Aprobar',
    fr: 'Approuver',
    de: 'Genehmigen',
    zh: '批准',
    ja: '承認'
  },
  'action.reject': {
    en: 'Reject',
    es: 'Rechazar',
    fr: 'Rejeter',
    de: 'Ablehnen',
    zh: '拒绝',
    ja: '却下'
  },
  'action.delete': {
    en: 'Delete',
    es: 'Eliminar',
    fr: 'Supprimer',
    de: 'Löschen',
    zh: '删除',
    ja: '削除'
  },
  'action.edit': {
    en: 'Edit',
    es: 'Editar',
    fr: 'Modifier',
    de: 'Bearbeiten',
    zh: '编辑',
    ja: '編集'
  },
  
  // Status Messages
  'status.loading': {
    en: 'Loading...',
    es: 'Cargando...',
    fr: 'Chargement...',
    de: 'Laden...',
    zh: '加载中...',
    ja: '読み込み中...'
  },
  'status.success': {
    en: 'Success',
    es: 'Éxito',
    fr: 'Succès',
    de: 'Erfolg',
    zh: '成功',
    ja: '成功'
  },
  'status.error': {
    en: 'Error',
    es: 'Error',
    fr: 'Erreur',
    de: 'Fehler',
    zh: '错误',
    ja: 'エラー'
  },
  'status.pending': {
    en: 'Pending',
    es: 'Pendiente',
    fr: 'En Attente',
    de: 'Ausstehend',
    zh: '待处理',
    ja: '保留中'
  },
  'status.approved': {
    en: 'Approved',
    es: 'Aprobado',
    fr: 'Approuvé',
    de: 'Genehmigt',
    zh: '已批准',
    ja: '承認済み'
  },
  'status.rejected': {
    en: 'Rejected',
    es: 'Rechazado',
    fr: 'Rejeté',
    de: 'Abgelehnt',
    zh: '已拒绝',
    ja: '却下済み'
  },
  
  // Forms
  'form.required': {
    en: 'Required',
    es: 'Requerido',
    fr: 'Requis',
    de: 'Erforderlich',
    zh: '必需',
    ja: '必須'
  },
  'form.optional': {
    en: 'Optional',
    es: 'Opcional',
    fr: 'Optionnel',
    de: 'Optional',
    zh: '可选',
    ja: 'オプション'
  },
  'form.email': {
    en: 'Email',
    es: 'Correo Electrónico',
    fr: 'Email',
    de: 'E-Mail',
    zh: '电子邮件',
    ja: 'メールアドレス'
  },
  'form.password': {
    en: 'Password',
    es: 'Contraseña',
    fr: 'Mot de Passe',
    de: 'Passwort',
    zh: '密码',
    ja: 'パスワード'
  },
  'form.phone': {
    en: 'Phone Number',
    es: 'Número de Teléfono',
    fr: 'Numéro de Téléphone',
    de: 'Telefonnummer',
    zh: '电话号码',
    ja: '電話番号'
  },
  
  // Messages
  'msg.welcome': {
    en: 'Welcome',
    es: 'Bienvenido',
    fr: 'Bienvenue',
    de: 'Willkommen',
    zh: '欢迎',
    ja: 'ようこそ'
  },
  'msg.goodbye': {
    en: 'Goodbye',
    es: 'Adiós',
    fr: 'Au Revoir',
    de: 'Auf Wiedersehen',
    zh: '再见',
    ja: 'さようなら'
  },
  'msg.thank_you': {
    en: 'Thank You',
    es: 'Gracias',
    fr: 'Merci',
    de: 'Danke',
    zh: '谢谢',
    ja: 'ありがとう'
  },
  'msg.confirmation': {
    en: 'Are you sure?',
    es: '¿Estás seguro?',
    fr: 'Êtes-vous sûr?',
    de: 'Sind Sie sicher?',
    zh: '你确定吗？',
    ja: '本当によろしいですか？'
  }
};

// Get browser language preference
function getBrowserLanguage(): Language {
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  const supportedLangs: Language[] = ['en', 'es', 'fr', 'de', 'zh', 'ja'];
  
  if (supportedLangs.includes(browserLang as Language)) {
    return browserLang as Language;
  }
  
  return 'en'; // Default to English
}

// Language context for React
let currentLanguage: Language = getBrowserLanguage();

// Get translated text
export function t(key: string, lang?: Language): string {
  const language = lang || currentLanguage;
  const translation = translations[key];
  
  if (!translation) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }
  
  return translation[language] || translation['en'] || key;
}

// Format date according to locale
export function formatDateLocale(date: Date, lang?: Language): string {
  const language = lang || currentLanguage;
  const localeMap: { [key in Language]: string } = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    zh: 'zh-CN',
    ja: 'ja-JP'
  };
  
  return date.toLocaleDateString(localeMap[language]);
}

// Format currency according to locale
export function formatCurrencyLocale(amount: number, currency = 'USD', lang?: Language): string {
  const language = lang || currentLanguage;
  const localeMap: { [key in Language]: string } = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    zh: 'zh-CN',
    ja: 'ja-JP'
  };
  
  return new Intl.NumberFormat(localeMap[language], {
    style: 'currency',
    currency
  }).format(amount);
}

// React Hook for i18n
export function useI18n() {
  const [language, setLanguage] = useState<Language>(currentLanguage);
  
  useEffect(() => {
    // Load saved language preference
    const savedLang = localStorage.getItem('steeliq-language') as Language;
    if (savedLang) {
      currentLanguage = savedLang;
      setLanguage(savedLang);
    }
  }, []);
  
  const changeLanguage = useCallback((lang: Language) => {
    currentLanguage = lang;
    setLanguage(lang);
    localStorage.setItem('steeliq-language', lang);
    
    // Update HTML lang attribute for accessibility
    document.documentElement.lang = lang;
  }, []);
  
  const translate = useCallback((key: string) => t(key, language), [language]);
  const formatDate = useCallback((date: Date) => formatDateLocale(date, language), [language]);
  const formatCurrency = useCallback((amount: number, currency?: string) => 
    formatCurrencyLocale(amount, currency, language), [language]);
  
  return {
    language,
    changeLanguage,
    t: translate,
    formatDate,
    formatCurrency,
    languages: [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'zh', name: '中文', flag: '🇨🇳' },
      { code: 'ja', name: '日本語', flag: '🇯🇵' }
    ] as const
  };
}