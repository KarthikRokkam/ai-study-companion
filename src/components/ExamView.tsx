import React, { useState } from 'react';
import { Target, CheckCircle, AlertCircle, PlayCircle, BarChart3, ChevronRight } from 'lucide-react';
import { ExamQuestion, ExamResult } from '../types.js';

interface ExamViewProps {
  projectId: string;
  onNavigateToDashboard: () => void;
}

export const ExamView: React.FC<ExamViewProps> = ({ projectId, onNavigateToDashboard }) => {
  const [examId, setExamId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startExam = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/exam/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numQuestions: 5 })
      });
      const data = await res.json();
      setExamId(data.examId);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setResponses({});
      setResult(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitExam = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/exam/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, responses })
      });
      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptionSelect = (idx: number) => {
    const q = questions[currentIndex];
    setResponses(prev => ({ ...prev, [q.id]: idx }));
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      submitExam();
    }
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 text-stone-800 animate-in fade-in duration-500">
        <div className="p-8 bg-white rounded-2xl border border-stone-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-stone-900">Exam Complete</h2>
          <p className="text-stone-500 mt-2">Your learning state has been updated based on your performance.</p>
          
          <div className="mt-8 flex justify-center gap-8">
            <div className="text-center">
              <div className="text-4xl font-black text-stone-900">{Math.round((result.score / result.totalQuestions) * 100)}%</div>
              <div className="text-xs font-bold text-stone-500 uppercase mt-1">Score</div>
            </div>
            <div className="w-px bg-stone-200"></div>
            <div className="text-center">
              <div className="text-4xl font-black text-emerald-600">{result.score}</div>
              <div className="text-xs font-bold text-stone-500 uppercase mt-1">Correct</div>
            </div>
            <div className="w-px bg-stone-200"></div>
            <div className="text-center">
              <div className="text-4xl font-black text-rose-600">{result.totalQuestions - result.score}</div>
              <div className="text-xs font-bold text-stone-500 uppercase mt-1">Incorrect</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm">
            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Recommended Next Action
            </h3>
            {result.recommendations && result.recommendations.length > 0 ? (
              <>
                <p className="text-sm font-bold text-stone-900">{result.recommendations[0].action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-stone-700 mt-1">{result.recommendations[0].reason}</p>
              </>
            ) : (
              <p className="text-xs text-stone-700">Continue exploring your materials.</p>
            )}
            <button onClick={onNavigateToDashboard} className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
              Return to Dashboard <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || submitting) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-stone-500 space-y-4">
        <Target className="w-8 h-8 animate-pulse text-stone-400" />
        <p>{loading ? 'Generating adaptive assessment...' : 'Evaluating answers and updating learner model...'}</p>
      </div>
    );
  }

  if (!examId || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl border border-stone-200 shadow-sm text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Adaptive Exam Mode</h2>
        <p className="text-stone-500 mb-8">Test your mastery across multiple concepts. This assessment will formally update your learning profile, retention metrics, and mistake trackers.</p>
        <button onClick={startExam} className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-colors">
          Start Assessment
        </button>
      </div>
    );
  }

  const q = questions[currentIndex];
  const hasSelected = responses[q.id] !== undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-rose-600" />
          <span className="font-bold text-stone-900">Question {currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`w-8 h-2 rounded-full ${i < currentIndex ? 'bg-rose-600' : i === currentIndex ? 'bg-rose-300' : 'bg-stone-200'}`} />
          ))}
        </div>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
        <div className="mb-4">
          <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-bold uppercase tracking-wider">{q.topic}</span>
        </div>
        <h3 className="text-lg font-bold text-stone-900 leading-relaxed mb-6">{q.prompt}</h3>
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            const isSelected = responses[q.id] === idx;
            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  isSelected ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex shrink-0 items-center justify-center ${isSelected ? 'border-stone-900' : 'border-stone-300'}`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-stone-900" />}
                </div>
                <span className={`text-sm ${isSelected ? 'font-medium text-stone-900' : 'text-stone-700'}`}>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={nextQuestion}
          disabled={!hasSelected}
          className="px-6 py-3 bg-stone-900 disabled:bg-stone-300 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
        >
          {currentIndex === questions.length - 1 ? 'Submit Assessment' : 'Next Question'} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
