import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { TutorMessage, Citation, LearnerModel } from '../types.js';

interface TutorViewProps {
  projectId: string;
  projectName: string;
  learnerModel: LearnerModel | null;
  onOpenCitation: (citation: Citation) => void;
  onNavigateToQuiz: (topic?: string) => void;
}

export const TutorView: React.FC<TutorViewProps> = ({
  projectId,
  projectName,
  learnerModel,
  onOpenCitation,
  onNavigateToQuiz,
}) => {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial history
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tutor/history`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.history && data.history.length > 0) {
              setMessages(data.history);
            } else {
              // Initial welcome message grounded in project
              setMessages([
                {
                  id: 'init_msg',
                  sessionId: `ses_${projectId}`,
                  projectId,
                  role: 'assistant',
                  content: `Welcome to **${projectName}**. I am your grounded AI Study Companion.\n\nI answer queries using **only verified project materials**, citing exact source sections. Ask me to break down complex protocols, compare architectural mechanisms, or test your comprehension.`,
                  citations: [],
                  groundingStatus: 'grounded',
                  timestamp: new Date().toISOString(),
                },
              ]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load tutor history', err);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [projectId, projectName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    setInputQuery('');
    const tempUserMsg: TutorMessage = {
      id: `temp_${Date.now()}`,
      sessionId: `ses_${projectId}`,
      projectId,
      role: 'user',
      content: query,
      citations: [],
      groundingStatus: 'grounded',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/tutor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.tutorResponse]);
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sessionId: `ses_${projectId}`,
            projectId,
            role: 'assistant',
            content: `**Error**: ${errData.message || 'Failed to complete grounded tutor request.'}`,
            citations: [],
            groundingStatus: 'insufficient_evidence',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sessionId: `ses_${projectId}`,
          projectId,
          role: 'assistant',
          content: `**Network Error**: ${err.message}`,
          citations: [],
          groundingStatus: 'insufficient_evidence',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Extract recommended prompts from weak areas
  const weakTopics = learnerModel
    ? Object.values(learnerModel.conceptMastery)
        .filter((c) => c.masteryScore < 70)
        .map((c) => c.topic)
    : [];

  const suggestedPrompts = [
    ...(weakTopics.length > 0
      ? [`Can you explain ${weakTopics[0]} step-by-step using project material?`]
      : []),
    'How do randomized election timeouts prevent split votes in Raft?',
    'What safety invariant guarantees that uncommitted log entries are never treated as final?',
    'What happens during a network partition where the cluster splits into 2 and 3 nodes?',
  ].slice(0, 3);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Tutor Header / Status Bar */}
      <div className="px-5 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center font-bold text-xs">
            <Bot className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-900 leading-tight">AI Study Companion</div>
            <div className="text-[11px] text-stone-500">Context Isolated to {projectName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Zero-Hallucination Grounding
          </span>
          <button
            onClick={() => onNavigateToQuiz()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
          >
            <span>Take Quiz on This</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 p-5 overflow-y-auto space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto justify-end' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Bot className="w-4 h-4 text-amber-400" />
              </div>
            )}

            <div className="space-y-2 max-w-2xl">
              {/* Message Bubble */}
              <div
                className={`p-4 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-stone-900 text-stone-100 rounded-tr-xs'
                    : 'bg-stone-50 border border-stone-200 text-stone-800 rounded-tl-xs shadow-2xs'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-xs max-w-none text-stone-800">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Citations & Grounding Status (Only on Assistant Messages) */}
              {msg.role === 'assistant' && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {msg.groundingStatus === 'insufficient_evidence' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Insufficient Project Evidence</span>
                    </div>
                  )}

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-stone-400 font-medium mr-0.5">Sources:</span>
                      {msg.citations.map((cite, i) => (
                        <button
                          key={cite.chunkId || i}
                          onClick={() => onOpenCitation(cite)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 hover:border-stone-300 transition-colors cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3 h-3 text-amber-600" />
                          <span className="truncate max-w-[120px]">{cite.section || cite.docTitle}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.telemetry && (
                    <span className="text-[10px] text-stone-400 ml-auto flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {msg.telemetry.latencyMs}ms ({msg.telemetry.totalTokens} tokens)
                    </span>
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-2xl">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl rounded-tl-xs text-xs text-stone-500 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Retrieving grounded project chunks and synthesizing response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Banner */}
      {messages.length < 3 && (
        <div className="px-5 py-2.5 bg-stone-50/80 border-t border-stone-100 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] font-semibold text-stone-500 shrink-0">Suggested:</span>
          {suggestedPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(p)}
              className="text-[11px] text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200 whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3.5 border-t border-stone-200 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a conceptual question about this project's material..."
            disabled={loading}
            className="flex-1 bg-stone-50 border border-stone-200 focus:border-stone-400 focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-lg text-xs text-stone-900 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
