import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  availableLanguages: { code: string; name: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<string>(() => {
    const stored = localStorage.getItem("portal-language");
    console.log('Initial language from localStorage:', stored);
    return stored || "en";
  });

  const availableLanguages = [
    { code: "en", name: "English" },
    { code: "de", name: "Deutsch" },
    { code: "fr", name: "Français" },
    { code: "es", name: "Español" },
    { code: "it", name: "Italiano" },
    { code: "nl", name: "Nederlands" },
    { code: "pt", name: "Português" },
  ];

  useEffect(() => {
    console.log('Language changed to:', language);
  }, [language]);

  const setLanguage = (lang: string) => {
    console.log('Setting language to:', lang);
    setLanguageState(lang);
    localStorage.setItem("portal-language", lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
