'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { api } from '@/lib/api';
import {
  Mic, MicOff, PhoneOff, Loader2, X, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestAgentModalProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
}

type CallStatus = 'idle' | 'connecting' | 'active' | 'ending' | 'ended';

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

export function TestAgentModal({ agentId, agentName, onClose }: TestAgentModalProps) {
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<CallStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const startCall = useCallback(async () => {
    setError('');
    setStatus('connecting');
    setMessages([]);
    setDuration(0);

    try {
      const res = await api.fetch('/agents.getPublicKey', { method: 'GET' });
      const publicKey = res?.result?.data?.json?.publicKey;
      if (!publicKey) throw new Error('VAPI public key not configured. Add VAPI_PUBLIC_KEY to the API .env');

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on('call-start', () => setStatus('active'));
      vapi.on('call-end', () => {
        setStatus('ended');
        vapiRef.current = null;
      });
      vapi.on('speech-start', () => setIsSpeaking(true));
      vapi.on('speech-end', () => setIsSpeaking(false));
      vapi.on('message', (msg: any) => {
        if (msg.type === 'transcript' && msg.transcriptType === 'final') {
          setMessages(prev => [...prev, { role: msg.role, text: msg.transcript }]);
        }
      });
      vapi.on('error', (e: any) => {
        setError(e?.message || 'Call error occurred');
        setStatus('ended');
      });

      await vapi.start(agentId);
    } catch (e: any) {
      setError(e.message || 'Failed to start call');
      setStatus('idle');
    }
  }, [agentId]);

  const endCall = useCallback(() => {
    setStatus('ending');
    vapiRef.current?.stop();
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const newMuted = !isMuted;
    vapiRef.current.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-anturon-100 flex items-center justify-center">
              <Bot className="h-5 w-5 text-anturon-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{agentName}</p>
              <p className="text-xs text-slate-400">
                {status === 'idle' && 'Ready to test'}
                {status === 'connecting' && 'Connecting...'}
                {status === 'active' && `Live · ${formatDuration(duration)}`}
                {status === 'ending' && 'Ending...'}
                {status === 'ended' && 'Call ended'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visualiser / Status Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {status === 'idle' || status === 'ended' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="h-20 w-20 rounded-full bg-anturon-50 border-4 border-anturon-100 flex items-center justify-center">
                <Bot className="h-10 w-10 text-anturon-400" />
              </div>
              {status === 'ended' ? (
                <>
                  <p className="text-slate-700 font-medium">Call ended · {formatDuration(duration)}</p>
                  <p className="text-sm text-slate-400 text-center">{messages.length} messages exchanged</p>
                </>
              ) : (
                <>
                  <p className="text-slate-700 font-medium">Test your agent</p>
                  <p className="text-sm text-slate-400 text-center">Start a live browser conversation with <strong>{agentName}</strong> using your microphone.</p>
                </>
              )}
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full text-center">{error}</p>}
            </div>
          ) : (
            <>
              {/* Live indicator */}
              <div className="flex items-center justify-center gap-3 py-4 border-b border-slate-50">
                {status === 'connecting' ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Connecting to agent...
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {/* Agent speaking indicator */}
                    <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      isSpeaking ? 'bg-anturon-100 text-anturon-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${isSpeaking ? 'bg-anturon-500 animate-pulse' : 'bg-slate-300'}`} />
                      Agent {isSpeaking ? 'speaking' : 'listening'}
                    </div>
                    {isMuted && (
                      <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-red-100 text-red-600">
                        <MicOff className="h-3 w-3" /> Muted
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && status === 'active' && (
                  <p className="text-center text-xs text-slate-400 py-4">Conversation will appear here...</p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-anturon-500 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-center gap-3">
          {status === 'idle' || status === 'ended' ? (
            <Button onClick={startCall} className="gap-2 bg-anturon-500 hover:bg-anturon-600 px-8">
              <Mic className="h-4 w-4" />
              {status === 'ended' ? 'Call Again' : 'Start Test Call'}
            </Button>
          ) : status === 'connecting' ? (
            <Button disabled className="gap-2 px-8">
              <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
            </Button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isMuted
                    ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                onClick={endCall}
                disabled={status === 'ending'}
                className="h-12 w-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {status === 'ending' ? <Loader2 className="h-5 w-5 animate-spin" /> : <PhoneOff className="h-5 w-5" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
