import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';

interface StudyCoachViewProps {
  projectId: string;
}

export const StudyCoachView: React.FC<StudyCoachViewProps> = ({ projectId }) => {
  const [messages, setMessages] = useState<{ role: 'coach' | 'user'; content: string }[]>([
    { role: 'coach', content: 'Hi! I am your Study Coach. I can help you plan your study session, explain your mastery stats, and recommend what to do next based on your recent activity. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'coach', content: data.message }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'coach', content: 'Sorry, I encountered an error connecting to the intelligence engine.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm max-w-4xl mx-auto">
      <div className="p-4 border-b border-stone-200 bg-stone-50">
        <h2 className="font-bold text-stone-900 flex items-center gap-2">
          <Bot className="w-5 h-5 text-amber-600" /> Study Coach
        </h2>
        <p className="text-xs text-stone-500">Ask about your learning health, daily plan, or next steps.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'coach' && (
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-amber-700" />
              </div>
            )}
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${
              m.role === 'user' ? 'bg-stone-900 text-white rounded-tr-sm' : 'bg-stone-100 text-stone-800 rounded-tl-sm'
            }`}>
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-stone-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-700" />
            </div>
            <div className="p-3 rounded-2xl max-w-[80%] text-sm bg-stone-100 text-stone-500 animate-pulse rounded-tl-sm">
              Analyzing learner state...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-stone-200 bg-white">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g., What should I study today? Why?"
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 pr-12"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 p-1.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
