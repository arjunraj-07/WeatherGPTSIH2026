import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Check,
  Clipboard,
  CloudRain,
  Leaf,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { ChatMessage } from '../../types/models';
import { mockAlerts, mockAdvisories, mockForecastData, mockWeatherData } from '../../data/mockData';
import WeatherIcon from '../../components/WeatherIcon';
import { usePreferences } from '../../hooks/usePreferences';
import { celsiusToDisplay, cn, severityClass, temperatureSuffix } from '../../lib/weather';

const SUGGESTIONS = [
  'Will it rain tomorrow?',
  'Is there any cyclone warning?',
  'Should I irrigate my crops?',
  'Show me the current weather',
];

interface RecognitionResultEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface RecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function welcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content: 'Hello. I am WeatherGPT in demo mode. Ask about the simulated Chennai weather, forecast, alerts or sector advisories.',
    timestamp: timestamp(),
    type: 'text',
  };
}

function mockReply(prompt: string, temperatureUnit: 'c' | 'f'): ChatMessage {
  const query = prompt.toLowerCase();
  const suffix = temperatureSuffix(temperatureUnit);
  if (query.includes('rain tomorrow') || query.includes('forecast')) {
    const forecastDay = mockForecastData.daily[1] ?? mockForecastData.daily[0];
    return {
      id: generateId(), role: 'assistant', timestamp: timestamp(), type: 'forecast_card', data: forecastDay,
      content: `The demonstration forecast shows rain as possible tomorrow, with a high of ${celsiusToDisplay(forecastDay?.maxTemp ?? 32, temperatureUnit)}${suffix}.`,
    };
  }
  if (query.includes('cyclone') || query.includes('warning') || query.includes('alert')) {
    return {
      id: generateId(), role: 'assistant', timestamp: timestamp(), type: 'alert_card', data: mockAlerts[0],
      content: 'The demo record contains an active severe weather alert for Chennai and nearby monitored areas.',
    };
  }
  if (query.includes('irrigate') || query.includes('crop') || query.includes('agriculture')) {
    return {
      id: generateId(), role: 'assistant', timestamp: timestamp(), type: 'advisory_card', data: mockAdvisories[0],
      content: 'The demonstration agriculture advisory suggests postponing irrigation because heavier rainfall is expected later.',
    };
  }
  if (query.includes('weather') || query.includes('current') || query.includes('chennai')) {
    return {
      id: generateId(), role: 'assistant', timestamp: timestamp(), type: 'weather_card', data: mockWeatherData,
      content: `Chennai is represented as ${celsiusToDisplay(mockWeatherData.currentTemp, temperatureUnit)}${suffix} and partly cloudy in this self-contained demonstration.`,
    };
  }
  return {
    id: generateId(), role: 'assistant', timestamp: timestamp(), type: 'text',
    content: 'I am operating in demo mode and can answer questions about the simulated Chennai weather, forecast, alerts and advisories.',
  };
}

function StructuredResponse({ message }: { message: ChatMessage }) {
  const { temperatureUnit } = usePreferences();
  const suffix = temperatureSuffix(temperatureUnit);
  if (message.type === 'weather_card') {
    const weather = message.data ?? mockWeatherData;
    return (
      <div className="chat-data-card chat-data-card--weather">
        <span className="chat-data-card__icon"><WeatherIcon icon={weather.icon} condition={weather.condition} className="h-7 w-7" /></span>
        <span><small>Current · Demo data</small><strong>{celsiusToDisplay(weather.currentTemp, temperatureUnit)}{suffix} · {weather.condition}</strong><p>{weather.location.city}, {weather.location.state} · Feels like {celsiusToDisplay(weather.feelsLike, temperatureUnit)}{suffix}</p></span>
      </div>
    );
  }
  if (message.type === 'forecast_card') {
    const day = message.data ?? mockForecastData.daily[0];
    return (
      <div className="chat-data-card chat-data-card--forecast">
        <span className="chat-data-card__icon"><CloudRain className="h-7 w-7" /></span>
        <span><small>{day?.day ?? 'Tomorrow'} · Demo forecast</small><strong>{celsiusToDisplay(day?.minTemp ?? 27, temperatureUnit)}—{celsiusToDisplay(day?.maxTemp ?? 32, temperatureUnit)}{suffix} · {day?.condition ?? 'Rain showers'}</strong><p>{day?.precipitationProb ?? 30}% precipitation probability</p></span>
      </div>
    );
  }
  if (message.type === 'alert_card') {
    const alert = message.data ?? mockAlerts[0];
    return (
      <div className={cn('chat-data-card chat-data-card--alert', severityClass(alert?.severity ?? 'Severe'))}>
        <span className="chat-data-card__icon"><AlertTriangle className="h-7 w-7" /></span>
        <span><small>{alert?.severity ?? 'Severe'} alert · Demo record</small><strong>{alert?.type ?? 'Heavy rainfall'}</strong><p>{alert?.location ?? 'Chennai and Kanchipuram Districts'}</p></span>
      </div>
    );
  }
  if (message.type === 'advisory_card') {
    const advisory = message.data ?? mockAdvisories[0];
    return (
      <div className="chat-data-card chat-data-card--advisory">
        <span className="chat-data-card__icon"><Leaf className="h-7 w-7" /></span>
        <span><small>{advisory?.category ?? 'Agriculture'} · Demo guidance</small><strong>{advisory?.title ?? 'Crop irrigation advisory'}</strong><p>{advisory?.location ?? 'Chennai District'}</p></span>
      </div>
    );
  }
  return null;
}

export default function ChatView() {
  const { t, i18n } = useTranslation();
  const { temperatureUnit } = usePreferences();
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking]);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      recognitionRef.current = null;
      return undefined;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'ta' ? 'ta-IN' : 'en-US';
    recognition.onresult = (event) => {
      setInput(event.results[0]?.[0]?.transcript ?? '');
      setStatus('Voice input captured. Review it before sending.');
      setIsListening(false);
    };
    recognition.onerror = (event) => {
      setStatus(`Voice input stopped: ${event.error}. You can continue by typing.`);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [i18n.language]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    window.speechSynthesis?.cancel();
  }, []);

  function toggleListen() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setStatus('Speech recognition is not supported in this browser. The text composer remains available.');
      return;
    }
    if (isListening) recognition.stop();
    else {
      setStatus('Listening for a weather question…');
      setIsListening(true);
      recognition.start();
    }
  }

  function speak(text: string) {
    if (speechMuted) return;
    if (!('speechSynthesis' in window)) {
      setStatus('Speech playback is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'ta' ? 'ta-IN' : 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatus('Speech playback could not be completed.');
    };
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }

  function sendMessage(text = input) {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;
    const userMessage: ChatMessage = { id: generateId(), role: 'user', content: trimmed, timestamp: timestamp(), type: 'text' };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setStatus(null);
    setIsThinking(true);

    const timer = window.setTimeout(() => {
      const reply = mockReply(trimmed, temperatureUnit);
      setMessages((current) => [...current, reply]);
      setIsThinking(false);
      speak(reply.content);
      timersRef.current = timersRef.current.filter((item) => item !== timer);
    }, 650);
    timersRef.current.push(timer);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
  }

  async function copyMessage(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      setStatus('Response copied to the clipboard.');
      const timer = window.setTimeout(() => {
        setCopiedId((current) => current === message.id ? null : current);
        timersRef.current = timersRef.current.filter((item) => item !== timer);
      }, 1600);
      timersRef.current.push(timer);
    } catch {
      setStatus('Clipboard access is unavailable in this browser.');
    }
  }

  function clearChat() {
    stopSpeaking();
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setMessages([welcomeMessage()]);
    setIsThinking(false);
    setStatus('Conversation cleared.');
  }

  return (
    <section className="chat-workspace" aria-labelledby="chat-title">
      <header className="chat-header">
        <div className="chat-header__identity">
          <span className="chat-orb"><Sparkles className="h-5 w-5" /></span>
          <div><span className="eyebrow">Calm weather assistance</span><h1 id="chat-title">Ask WeatherGPT</h1></div>
        </div>
        <div className="chat-header__actions">
          <span className="chat-demo-badge"><i />Demo mode</span>
          {isSpeaking && <button type="button" className="icon-button" onClick={stopSpeaking} aria-label="Stop speaking" title="Stop speaking"><X className="h-5 w-5" /></button>}
          <button type="button" className="icon-button" onClick={() => { setSpeechMuted((value) => !value); stopSpeaking(); }} aria-label={speechMuted ? 'Enable spoken responses' : 'Mute spoken responses'} title={speechMuted ? 'Enable spoken responses' : 'Mute spoken responses'}>
            {speechMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <button type="button" className="icon-button" onClick={clearChat} aria-label="Clear conversation" title="Clear conversation"><Trash2 className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="chat-context-strip" role="note"><WeatherIcon icon={mockWeatherData.icon} condition={mockWeatherData.condition} className="h-5 w-5" /><span><strong>{mockWeatherData.location.city} · {mockWeatherData.currentTemp}°C</strong>{mockWeatherData.condition} · Simulated context</span></div>

      <div className="chat-history" aria-live="polite" aria-busy={isThinking}>
        {messages.map((message) => (
          <article key={message.id} className={cn('chat-message', message.role === 'user' && 'chat-message--user')}>
            <div className="chat-message__bubble">
              <p>{message.content}</p>
              <StructuredResponse message={message} />
              <footer><time>{message.timestamp}</time>{message.role === 'assistant' && <button type="button" onClick={() => void copyMessage(message)} aria-label="Copy response">{copiedId === message.id ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}{copiedId === message.id ? 'Copied' : 'Copy'}</button>}</footer>
            </div>
          </article>
        ))}
        {isThinking && <div className="chat-thinking" role="status"><span /><span /><span /><small>WeatherGPT is considering the demo records</small></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-composer">
        <div className="chat-suggestions" aria-label="Suggested weather questions">
          {SUGGESTIONS.map((suggestion) => <button type="button" key={suggestion} onClick={() => sendMessage(suggestion)} disabled={isThinking}>{suggestion}</button>)}
        </div>
        {status && <div className="chat-status" role="status"><span>{status}</span><button type="button" onClick={() => setStatus(null)} aria-label="Dismiss status"><X className="h-4 w-4" /></button></div>}
        <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="chat-composer__form">
          <button type="button" className={cn('chat-mic', isListening && 'chat-mic--active')} onClick={toggleListen} aria-label={isListening ? 'Stop listening' : 'Start voice input'} title={isListening ? 'Stop listening' : 'Start voice input'}>
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <label className="sr-only" htmlFor="weather-question">Weather question</label>
          <input id="weather-question" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleInputKeyDown} placeholder={isListening ? `${t('listening')}…` : 'Ask about weather, alerts or advisories…'} autoComplete="off" />
          <button type="submit" className="chat-send" disabled={!input.trim() || isThinking} aria-label="Send weather question"><Send className="h-5 w-5" /></button>
        </form>
        <p>Responses use local intent matching and simulated records. No live AI model or stream is connected.</p>
      </div>
    </section>
  );
}
