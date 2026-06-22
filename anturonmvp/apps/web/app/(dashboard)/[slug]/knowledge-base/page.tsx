'use client';

import { DashboardHeader } from '@/components/dashboard/header';
import { BookOpen, Upload, Bot, FileText, Sparkles } from 'lucide-react';

interface KnowledgeBasePageProps {
  params: { slug: string };
}

export default function KnowledgeBasePage({ params }: KnowledgeBasePageProps) {
  return (
    <>
      <DashboardHeader organizationSlug={params.slug} title="Knowledge Base" />

      <div className="flex-1 overflow-auto p-6">

        {/* Coming Soon Hero */}
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-6">

          {/* Icon stack */}
          <div className="relative">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-anturon-100 to-anturon-200 flex items-center justify-center shadow-lg shadow-anturon-200/50">
              <BookOpen className="h-12 w-12 text-anturon-600" />
            </div>
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
          </div>

          {/* Heading */}
          <div>
            <div className="inline-flex items-center gap-2 bg-anturon-50 border border-anturon-200 rounded-full px-4 py-1.5 text-xs font-semibold text-anturon-700 mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Coming Soon
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Knowledge Base</h1>
            <p className="text-slate-500 max-w-md leading-relaxed">
              Upload documents, PDFs, and text files to build a knowledge base. Assign files to specific agents so they can answer questions accurately from your content.
            </p>
          </div>

          {/* Feature preview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full max-w-2xl">
            {[
              {
                icon: Upload,
                title: 'Upload Files',
                desc: 'PDF, DOCX, TXT, CSV and more',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                icon: Bot,
                title: 'Assign to Agents',
                desc: 'Link documents to specific voice agents',
                color: 'bg-anturon-50 text-anturon-600',
              },
              {
                icon: FileText,
                title: 'Smart Retrieval',
                desc: 'Agents answer from your own content',
                color: 'bg-purple-50 text-purple-600',
              },
            ].map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left opacity-60">
                  <div className={`h-10 w-10 rounded-xl ${f.color} flex items-center justify-center mb-3`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm mb-1">{f.title}</p>
                  <p className="text-xs text-slate-400">{f.desc}</p>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 mt-2">We'll notify you when this feature is ready.</p>
        </div>

      </div>
    </>
  );
}
