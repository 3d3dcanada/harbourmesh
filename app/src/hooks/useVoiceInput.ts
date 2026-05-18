import { useCallback, useRef, useState } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error';

interface UseVoiceInputReturn {
  status: VoiceStatus;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

export function useVoiceInput(onResult?: (text: string) => void): UseVoiceInputReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SpeechRecognition = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

  const isSupported = Boolean(SpeechRecognition);

  const stop = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setStatus('idle');
    setInterimTranscript('');
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => setStatus('listening');

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => {
          const full = (prev + ' ' + final).trim();
          return full;
        });
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        setStatus('processing');
        recognition.stop();
        recognitionRef.current = null;

        setTranscript((prev) => {
          const finalText = prev.trim();
          if (finalText) onResult?.(finalText);
          return finalText;
        });
        setStatus('idle');
      }, 3000);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return;
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please allow microphone in browser settings.',
        'network': 'Network error. Speech recognition requires an internet connection.',
        'aborted': 'Speech recognition was cancelled.',
      };
      setError(messages[event.error] ?? `Speech recognition error: ${event.error}`);
      setStatus('error');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (status === 'listening') {
        setStatus('idle');
      }
    };

    recognition.start();
  }, [SpeechRecognition, onResult, status]);

  const toggle = useCallback(() => {
    if (status === 'listening') {
      stop();
    } else {
      start();
    }
  }, [status, start, stop]);

  return { status, transcript, interimTranscript, error, isSupported, start, stop, toggle };
}
