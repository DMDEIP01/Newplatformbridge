import { useLanguage } from "./useLanguage";
import { translations, TranslationKey, Language } from "@/lib/translations";

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: TranslationKey): string => {
    const lang = language as Language;
    return translations[lang]?.[key] || translations.en[key] || key;
  };

  return { t };
}
