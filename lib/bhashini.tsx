import React, { createContext, useContext } from 'react';

// Bhashini Mock Translation Provider
const BhashiniContext = createContext<{
  language: 'en' | 'hi';
  t: (key: string) => string;
}>({
  language: 'en',
  t: (key) => key,
});

const DICTIONARY: Record<string, { hi: string }> = {
  // Navigation & chrome
  "Dashboard": { hi: "डैशबोर्ड" },
  "Field Node": { hi: "फील्ड नोड" },
  "Alerts": { hi: "अलर्ट" },
  "Settings": { hi: "सेटिंग्स" },
  "Station": { hi: "स्टेशन" },
  "Readings": { hi: "रिडिंग्स" },
  "Diagnostics": { hi: "निदान" },
  "Language": { hi: "भाषा" },
  "Loading": { hi: "लोड हो रहा है" },

  // Measurements
  "Temperature": { hi: "तापमान" },
  "Pressure": { hi: "दबाव" },
  "Humidity": { hi: "नमी" },

  // Actions
  "Submit Fix": { hi: "समाधान जमा करें" },
  // The toggle names the language it switches *to*, so the Hindi label says
  // "translate to English" — a fixed pair, not a pair of identity mappings.
  "Translate to Hindi": { hi: "अनुवाद (English)" },
  "Translate to English": { hi: "अनुवाद (हिंदी)" },

  // Field node
  "DigiLocker Auth": { hi: "डिजिलॉकर प्रमाणीकरण" },
  "Verify you are a certified IMD technician to unlock this node.": {
    hi: "इस नोड को अनलॉक करने के लिए सत्यापित करें कि आप IMD तकनीशियन हैं।",
  },
  "Aadhaar Number": { hi: "आधार नंबर" },
  "Send OTP": { hi: "OTP भेजें" },
  "Enter OTP sent to mobile": { hi: "मोबाइल पर भेजा गया OTP दर्ज करें" },
  "Verify Identity": { hi: "पहचान सत्यापित करें" },
  "Change Aadhaar Number": { hi: "आधार नंबर बदलें" },
  "Technician Verified": { hi: "तकनीशियन सत्यापित" },
  "Unlocking IMD Node...": { hi: "IMD नोड अनलॉक हो रहा है..." },
};

export function BhashiniProvider({ children, initialLanguage = 'en' }: { children: React.ReactNode, initialLanguage?: 'en' | 'hi' }) {
  // The language is owned one level up — the route holds it and hands it to the shell —
  // so the provider reads the prop directly. Mirroring it into state here would add a
  // cascading render per toggle and let the context lag the prop by one render.
  const language = initialLanguage;

  const t = (key: string) => {
    if (language === 'hi' && DICTIONARY[key]?.hi) {
      return DICTIONARY[key].hi;
    }
    return key;
  };

  return (
    <BhashiniContext.Provider value={{ language, t }}>
      {children}
    </BhashiniContext.Provider>
  );
}

export function useBhashini() {
  return useContext(BhashiniContext);
}
