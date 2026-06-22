'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  X, Sparkles, CheckCircle2, ArrowRight, Tag, MessageSquare,
  Clock, Phone, Loader2, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

interface CallDetailPanelProps {
  call: any;
  onClose: () => void;
}

const sentimentColor: Record<string, string> = {
  Positive: 'bg-green-100 text-green-700',
  Neutral:  'bg-slate-100 text-slate-600',
  Negative: 'bg-red-100 text-red-600',
};

const dispositionColor: Record<string, string> = {
  'Interested':          'bg-blue-100 text-blue-700',
  'Converted':           'bg-green-100 text-green-700',
  'Needs Follow-up':     'bg-amber-100 text-amber-700',
  'Callback Requested':  'bg-purple-100 text-purple-700',
  'Not Interested':      'bg-red-100 text-red-600',
  'Escalated':           'bg-orange-100 text-orange-700',
  'No Action Required':  'bg-slate-100 text-slate-600',
  'Wrong Number':        'bg-gray-100 text-gray-500',
};

function formatDuration(secs?: number) {
  if (!secs) return '—';
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export function CallDetailPanel({ call, onClose }: CallDetailPanelProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.fetch(
          `/calls.analyze?input=${encodeURIComponent(JSON.stringify({ json: { id: call.id } }))}`,
          { method: 'GET' }
        );
        setAnalysis(res?.result?.data?.json);
      } catch (e: any) {
        setError(e.message || 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [call.id]);

  const isWebCall = call.type === 'webCall';
  const customerLabel = isWebCall
    ? 'Web Call'
    : call.customer?.name || call.customerDisplay?.masked || call.customer?.number || 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <p className="font-semibold text-slate-900 text-base">{customerLabel}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(call.duration)}</span>
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{call.assistant?.name || '—'}</span>
              <span>{call.startedAt ? new Date(call.startedAt).toLocaleString() : '—'}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-anturon-500" />
              <p className="text-sm text-slate-400">Analyzing call with AI...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          ) : (
            <>
              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                {analysis?.sentiment && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sentimentColor[analysis.sentiment] || 'bg-slate-100 text-slate-600'}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {analysis.sentiment}
                  </span>
                )}
                {analysis?.disposition && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${dispositionColor[analysis.disposition] || 'bg-slate-100 text-slate-600'}`}>
                    <Tag className="h-3 w-3" />
                    {analysis.disposition}
                  </span>
                )}
              </div>

              {/* Summary */}
              {analysis?.summary && (
                <div className="bg-anturon-50 border border-anturon-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-anturon-600" />
                    <p className="text-xs font-semibold text-anturon-700 uppercase tracking-wide">AI Summary</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
                </div>
              )}

              {/* Key Points */}
              {analysis?.keyPoints?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-700">Key Discussion Points</p>
                  </div>
                  <ul className="space-y-2">
                    {analysis.keyPoints.map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-600 leading-snug">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Actions */}
              {analysis?.nextActions?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-700">Recommended Next Actions</p>
                  </div>
                  <ul className="space-y-2">
                    {analysis.nextActions.map((action: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600 leading-snug">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* No analysis available */}
              {!analysis?.summary && !analysis?.keyPoints?.length && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Sparkles className="h-10 w-10 text-slate-200" />
                  <p className="text-sm text-slate-400">No transcript available for this call yet.</p>
                  <p className="text-xs text-slate-300">Analysis runs once the call transcript is ready.</p>
                </div>
              )}

              {/* Transcript toggle */}
              {call.transcript && (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setTranscriptOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Full Transcript
                    </span>
                    {transcriptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {transcriptOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-500 leading-relaxed whitespace-pre-wrap bg-slate-50 border-t border-slate-100 max-h-64 overflow-y-auto">
                      {call.transcript}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
