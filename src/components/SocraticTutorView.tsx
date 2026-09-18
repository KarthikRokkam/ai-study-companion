import React, { useState } from 'react';
import { PlayCircle, Target, Send, User, ChevronRight, CheckCircle, Info } from 'lucide-react';
import { Citation } from '../types.js';

interface SocraticTutorViewProps {
  projectId: string;
  initialTopic?: string;
  onViewCitation: (citation: Citation) => void;
}

export const SocraticTutorView: React.FC<SocraticTutorViewProps> = ({ projectId, initialTopic, onViewCitation }) => {
  const [messages, setMessages] = useState<{ role: 'tutor' | 'user'; content: string; citations?: Citation[] }[]>([]);
  const [input, setInput] = useState(initialTopic || '');
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState<string | null>(null);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/socratic/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      
      let combinedContent = data.aiQuestion;
      if (data.evaluationFeedback) {
        combinedContent = `${data.evaluationFeedback}\n\n${data.aiQuestion}`;
      }

      if (data.identifiedGoal && !goal) {
        setGoal(data.identifiedGoal);
      }

      setMessages(prev => [...prev, { 
        role: 'tutor', 
        content: combinedContent,
        citations: data.citations 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'tutor', content: 'Connection failed.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm max-w-4xl mx-auto">
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-stone-900 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-sky-600" /> Socratic Mode
          </h2>
          <p className="text-xs text-stone-500">I will guide you to the answer with questions, not answers.</p>
        </div>
        {goal && (
          <div className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1">
            <Target className="w-3 h-3" /> Goal: {goal}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-stone-500 space-y-4">
            <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center">
              <PlayCircle className="w-8 h-8 text-sky-300" />
            </div>
            <div className="max-w-xs">
              <p className="text-sm font-medium text-stone-700">What concept are you struggling with?</p>
              <p className="text-xs mt-1">Start by describing a problem or concept. I'll ask questions to help you figure it out.</p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'tutor' && (
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0 mt-1">
                <PlayCircle className="w-4 h-4 text-sky-700" />
              </div>
            )}
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-xs ${
              m.role === 'user' ? 'bg-stone-900 text-white rounded-tr-sm' : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                  {m.citations.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => onViewCitation(c)}
                      className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-[10px] font-semibold transition-colors flex items-center gap-1"
                    >
                      <Info className="w-3 h-3" />
                      {c.docTitle || c.docId.slice(0, 8)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-stone-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
              <PlayCircle className="w-4 h-4 text-sky-700" />
            </div>
            <div className="p-4 rounded-2xl max-w-[85%] text-sm bg-white border border-stone-200 text-stone-500 animate-pulse rounded-tl-sm">
              Thinking of a question...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-stone-200 bg-stone-50">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer or explain what you're thinking..."
            className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 pr-12 shadow-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 p-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-stone-300 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
