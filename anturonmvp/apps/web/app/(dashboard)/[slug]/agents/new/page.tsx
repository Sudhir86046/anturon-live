'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface NewAgentPageProps {
  params: { slug: string };
}

const VOICE_PROVIDERS: Record<string, { id: string; name: string }[]> = {
  '11labs': [
    { id: 'rachel', name: 'Rachel (Female, US)' },
    { id: 'bella', name: 'Bella (Female, US)' },
    { id: 'elli', name: 'Elli (Female, US)' },
    { id: 'domi', name: 'Domi (Female, US)' },
    { id: 'adam', name: 'Adam (Male, US)' },
    { id: 'josh', name: 'Josh (Male, US)' },
    { id: 'arnold', name: 'Arnold (Male, US)' },
    { id: 'sam', name: 'Sam (Male, US)' },
    { id: 'callum', name: 'Callum (Male, UK)' },
    { id: 'fin', name: 'Fin (Male, Irish)' },
    { id: 'freya', name: 'Freya (Female, UK)' },
  ],
  'deepgram': [
    { id: 'luna', name: 'Luna (Female)' },
    { id: 'stella', name: 'Stella (Female)' },
    { id: 'asteria', name: 'Asteria (Female)' },
    { id: 'zeus', name: 'Zeus (Male)' },
    { id: 'orion', name: 'Orion (Male)' },
    { id: 'angus', name: 'Angus (Male)' },
  ],
  'openai': [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male)' },
    { id: 'fable', name: 'Fable (Male)' },
    { id: 'onyx', name: 'Onyx (Male)' },
    { id: 'nova', name: 'Nova (Female)' },
    { id: 'shimmer', name: 'Shimmer (Female)' },
  ],
  'azure': [
    { id: 'en-US-JennyNeural', name: 'Jenny (Female, US)' },
    { id: 'en-US-GuyNeural', name: 'Guy (Male, US)' },
    { id: 'en-US-AriaNeural', name: 'Aria (Female, US)' },
    { id: 'en-GB-SoniaNeural', name: 'Sonia (Female, UK)' },
    { id: 'en-IN-NeerjaNeural', name: 'Neerja (Female, India)' },
    { id: 'ar-AE-FatimaNeural', name: 'Fatima (Female, UAE Arabic)' },
    { id: 'hi-IN-SwaraNeural', name: 'Swara (Female, Hindi)' },
  ],
  'lmnt': [
    { id: 'lily', name: 'Lily (Female)' },
    { id: 'daniel', name: 'Daniel (Male)' },
  ],
};

type FirstMessageMode = 'assistant-speaks-first' | 'assistant-waits-for-user' | 'assistant-speaks-first-with-model-generated-message';

const FIRST_MESSAGE_MODES: { value: FirstMessageMode; label: string; description: string }[] = [
  {
    value: 'assistant-speaks-first',
    label: 'Assistant speaks first',
    description: 'Assistant greets the user immediately using the First Message',
  },
  {
    value: 'assistant-waits-for-user',
    label: 'User speaks first',
    description: 'Assistant waits silently for the user to speak first',
  },
  {
    value: 'assistant-speaks-first-with-model-generated-message',
    label: 'Assistant speaks first (AI generated)',
    description: 'Assistant generates its own opening message based on the system prompt',
  },
];

const VOICE_PROVIDER_LABELS: Record<string, string> = {
  '11labs': 'ElevenLabs',
  'deepgram': 'Deepgram Aura',
  'openai': 'OpenAI TTS',
  'azure': 'Azure Neural',
  'lmnt': 'LMNT',
};

const TRANSCRIBER_OPTIONS: { provider: string; label: string; models: { id: string; name: string }[] }[] = [
  {
    provider: 'deepgram',
    label: 'Deepgram',
    models: [
      { id: 'nova-2', name: 'Nova 2 (Best accuracy)' },
      { id: 'nova-2-general', name: 'Nova 2 General' },
      { id: 'nova-2-phonecall', name: 'Nova 2 Phone Call' },
      { id: 'nova-2-medical', name: 'Nova 2 Medical' },
      { id: 'enhanced', name: 'Enhanced' },
      { id: 'base', name: 'Base' },
    ],
  },
  {
    provider: 'talkscriber',
    label: 'Talkscriber',
    models: [{ id: 'whisper', name: 'Whisper' }],
  },
  {
    provider: 'gladia',
    label: 'Gladia',
    models: [
      { id: 'fast', name: 'Fast' },
      { id: 'accurate', name: 'Accurate' },
    ],
  },
];

const TRANSCRIBER_LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'ar', name: 'Arabic' },
  { id: 'hi', name: 'Hindi' },
  { id: 'fr', name: 'French' },
  { id: 'de', name: 'German' },
  { id: 'es', name: 'Spanish' },
  { id: 'pt', name: 'Portuguese' },
  { id: 'zh', name: 'Chinese' },
  { id: 'ja', name: 'Japanese' },
  { id: 'ko', name: 'Korean' },
  { id: 'ur', name: 'Urdu' },
  { id: 'ta', name: 'Tamil' },
];

const MODEL_OPTIONS = [
  { provider: 'openai', model: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
  { provider: 'openai', model: 'gpt-4o', label: 'GPT-4o (Smart)' },
  { provider: 'openai', model: 'gpt-4.1', label: 'GPT-4.1' },
  { provider: 'openai', model: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { provider: 'openai', model: 'gpt-4.5-preview', label: 'GPT-4.5 Preview' },
  { provider: 'openai', model: 'o3-mini', label: 'o3 Mini' },
  { provider: 'openai', model: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { provider: 'openai', model: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Cheapest)' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { provider: 'anthropic', model: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
  { provider: 'anthropic', model: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fast)' },
  { provider: 'google', model: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { provider: 'google', model: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { provider: 'google', model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

export default function NewAgentPage({ params }: NewAgentPageProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [firstMessageMode, setFirstMessageMode] = useState<FirstMessageMode>('assistant-speaks-first');
  const [transcriberProvider, setTranscriberProvider] = useState('deepgram');
  const [transcriberModel, setTranscriberModel] = useState('nova-2');
  const [transcriberLanguage, setTranscriberLanguage] = useState('en');
  const [voiceProvider, setVoiceProvider] = useState('11labs');
  const [voiceId, setVoiceId] = useState('rachel');
  const [modelProvider, setModelProvider] = useState('openai');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [maxDuration, setMaxDuration] = useState(600);
  const [recordingEnabled, setRecordingEnabled] = useState(true);

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    try {
      await api.fetch('/agents.create', {
        method: 'POST',
        body: JSON.stringify({
          json: {
            name,
            firstMessage,
            firstMessageMode,
            transcriber: { provider: transcriberProvider, model: transcriberModel, language: transcriberLanguage },
            systemPrompt,
            voice: voiceId ? { provider: voiceProvider, voiceId } : undefined,
            model: { provider: modelProvider, model: modelName },
            maxDurationSeconds: maxDuration,
            recordingEnabled,
          },
        }),
      });
      router.push(`/${params.slug}/agents`);
    } catch (e: any) {
      setError(e.message || 'Failed to create agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader organizationSlug={params.slug} title="Create Agent" />

      <div className="flex-1 overflow-auto p-6 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <Link href={`/${params.slug}/agents`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Back to Agents
          </Link>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          {/* Basic Info */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name <span className="text-red-500">*</span></label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sales Assistant" className="h-11" />
              </div>
              {/* Who speaks first */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Who speaks first?</label>
                <div className="space-y-2">
                  {FIRST_MESSAGE_MODES.map(mode => (
                    <label key={mode.value} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      firstMessageMode === mode.value ? 'border-anturon-500 bg-anturon-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="firstMessageMode"
                        value={mode.value}
                        checked={firstMessageMode === mode.value}
                        onChange={() => setFirstMessageMode(mode.value)}
                        className="mt-0.5 accent-anturon-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{mode.label}</p>
                        <p className="text-xs text-slate-500">{mode.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Message
                  {firstMessageMode === 'assistant-waits-for-user' && (
                    <span className="ml-2 text-xs text-slate-400 font-normal">(not used — user speaks first)</span>
                  )}
                  {firstMessageMode === 'assistant-speaks-first-with-model-generated-message' && (
                    <span className="ml-2 text-xs text-slate-400 font-normal">(not used — AI will generate it)</span>
                  )}
                </label>
                <Input
                  value={firstMessage}
                  onChange={e => setFirstMessage(e.target.value)}
                  placeholder="Hi! How can I help you today?"
                  className="h-11"
                  disabled={firstMessageMode !== 'assistant-speaks-first'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Transcriber */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transcriber</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                <select
                  value={transcriberProvider}
                  onChange={e => {
                    setTranscriberProvider(e.target.value);
                    setTranscriberModel(TRANSCRIBER_OPTIONS.find(t => t.provider === e.target.value)?.models[0]?.id || '');
                  }}
                  className="w-full h-11 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-anturon-500"
                >
                  {TRANSCRIBER_OPTIONS.map(t => (
                    <option key={t.provider} value={t.provider}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                <select
                  value={transcriberModel}
                  onChange={e => setTranscriberModel(e.target.value)}
                  className="w-full h-11 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-anturon-500"
                >
                  {(TRANSCRIBER_OPTIONS.find(t => t.provider === transcriberProvider)?.models || []).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                <select
                  value={transcriberLanguage}
                  onChange={e => setTranscriberLanguage(e.target.value)}
                  className="w-full h-11 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-anturon-500"
                >
                  {TRANSCRIBER_LANGUAGES.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* System Prompt */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">System Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={6}
                placeholder="You are a helpful assistant for..."
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-anturon-500 resize-none"
              />
            </CardContent>
          </Card>

          {/* Voice & Model */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Voice & Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Voice Provider</label>
                <select
                  value={voiceProvider}
                  onChange={e => { setVoiceProvider(e.target.value); setVoiceId(''); }}
                  className="w-full h-11 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-anturon-500"
                >
                  {Object.keys(VOICE_PROVIDERS).map(p => (
                    <option key={p} value={p}>{VOICE_PROVIDER_LABELS[p] || p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Voice</label>
                <select
                  value={voiceId}
                  onChange={e => setVoiceId(e.target.value)}
                  className="w-full h-11 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-anturon-500"
                >
                  <option value="">— Select voice —</option>
                  {(VOICE_PROVIDERS[voiceProvider] || []).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">AI Model</label>
                <select
                  value={`${modelProvider}/${modelName}`}
                  onChange={e => {
                    const parts = e.target.value.split('/');
                    setModelProvider(parts[0]);
                    setModelName(parts.slice(1).join('/'));
                  }}
                  className="w-full h-11 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-anturon-500"
                >
                  {MODEL_OPTIONS.map(o => (
                    <option key={`${o.provider}/${o.model}`} value={`${o.provider}/${o.model}`}>{o.label}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Duration: <span className="text-anturon-600">{Math.floor(maxDuration / 60)}m {maxDuration % 60}s</span>
                </label>
                <input
                  type="range" min={60} max={3600} step={60}
                  value={maxDuration}
                  onChange={e => setMaxDuration(Number(e.target.value))}
                  className="w-full accent-anturon-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1 min</span><span>60 min</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox" id="recording"
                  checked={recordingEnabled}
                  onChange={e => setRecordingEnabled(e.target.checked)}
                  className="h-4 w-4 accent-anturon-500"
                />
                <label htmlFor="recording" className="text-sm font-medium text-slate-700">Enable call recording</label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pb-8">
            <Button variant="outline" onClick={() => router.push(`/${params.slug}/agents`)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !name.trim()} className="flex-1 bg-anturon-500 hover:bg-anturon-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {saving ? 'Creating...' : 'Create Agent'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
