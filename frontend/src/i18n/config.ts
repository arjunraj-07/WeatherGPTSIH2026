import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      currentWeather: 'Current Weather',
      forecast: 'Forecast',
      alerts: 'Alerts',
      maps: 'Maps',
      aviation: 'Aviation',
      climate: 'Climate Trends',
      advisories: 'Advisories',
      settings: 'Settings',
      search: 'Search',
      currentLocation: 'Current Location',
      send: 'Send',
      listening: 'Listening',
      noActiveWarnings: 'No active warnings',
      chat: 'Chat',
      askWeather: 'Ask WeatherGPT',
      home: 'Home',
      more: 'More',
      languageSelection: 'Language Selection',
    },
  },
  hi: {
    translation: {
      currentWeather: 'वर्तमान मौसम',
      forecast: 'पूर्वानुमान',
      alerts: 'अलर्ट',
      maps: 'नक्शे',
      aviation: 'विमानन',
      climate: 'जलवायु रुझान',
      advisories: 'सलाह',
      settings: 'सेटिंग्स',
      search: 'खोजें',
      currentLocation: 'वर्तमान स्थान',
      send: 'भेजें',
      listening: 'सुन रहा है',
      noActiveWarnings: 'कोई सक्रिय चेतावनी नहीं',
      chat: 'चैट',
      askWeather: 'WeatherGPT से पूछें',
      home: 'होम',
      more: 'अधिक',
      languageSelection: 'भाषा चयन',
    },
  },
  ta: {
    translation: {
      currentWeather: 'தற்போதைய வானிலை',
      forecast: 'முன்னறிவிப்பு',
      alerts: 'எச்சரிக்கைகள்',
      maps: 'வரைபடங்கள்',
      aviation: 'விமான வானிலை',
      climate: 'காலநிலை போக்குகள்',
      advisories: 'ஆலோசனைகள்',
      settings: 'அமைப்புகள்',
      search: 'தேடு',
      currentLocation: 'தற்போதைய இடம்',
      send: 'அனுப்பு',
      listening: 'கேட்கிறது',
      noActiveWarnings: 'எச்சரிக்கைகள் ஏதுமில்லை',
      chat: 'அரட்டை',
      askWeather: 'WeatherGPT-ஐ கேளுங்கள்',
      home: 'முகப்பு',
      more: 'மேலும்',
      languageSelection: 'மொழி தேர்வு',
    },
  },
};

const savedLanguage = typeof window === 'undefined' ? 'en' : localStorage.getItem('language');
const initialLanguage = savedLanguage && ['en', 'hi', 'ta'].includes(savedLanguage) ? savedLanguage : 'en';

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'ta'],
    interpolation: { escapeValue: false },
  });

export default i18n;
