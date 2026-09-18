import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  FileText,
  TrendingUp,
  Brain,
  Award,
} from 'lucide-react';
import {
  QuizQuestion,
  QuizSubmissionResult,
  BloomTaxonomyLevel,
  QuizDifficulty,
  Citation,
  LearnerModel,
} from '../types.js';

interface QuizViewProps {
  projectId: string;
  projectName: string;
  learnerModel: LearnerModel | null;
  onOpenCitation: (citation: Citation) => void;
  onRefreshLearnerModel: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  projectId,
  projectName,
  learnerModel,
  onOpenCitation,
  onRefreshLearnerModel,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generation Controls
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedBloom, setSelectedBloom] = useState<BloomTaxonomyLevel>('application');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty>('intermediate');

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/quiz/questions`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
        if (data.questions.length > 0 && !selectedTopic) {
          setSelectedTopic(data.questions[0].topic);
        }
      }
    } catch (err) {
      console.error('Failed to load questions', err);
    }
  };

  useEffect(() => {
    fetchQuestions();
    setSubmissionResult(null);
    setSelectedOption(null);
  }, [projectId]);

  const currentQuestion = questions[activeQuestionIndex];

  const handleGenerateAdaptive = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setSubmissionResult(null);
    setSelectedOption(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic || 'Consensus Quorums and State Invariants',
          bloomLevel: selectedBloom,
          difficulty: selectedDifficulty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuestions((prev) => [...prev, data.question]);
        setActiveQuestionIndex(questions.length); // Point to newly generated question
      }
    } catch (err) {
      console.error('Failed to generate adaptive question', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !currentQuestion || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionIndex: selectedOption,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionResult(data.evaluation);
        onRefreshLearnerModel();
      }
    } catch (err) {
      console.error('Failed to submit answer', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setSubmissionResult(null);
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else {
      handleGenerateAdaptive();
    }
  };

  return (
    <div className="space-y-6 text-stone-800 text-xs">
      {/* Top Banner & Adaptive Generator Controls */}
      <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Brain className="w-4 h-4 text-amber-600" />
              <span>Adaptive Quiz & Cognitive Assessment</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Calibrated to Bloom's Cognitive Taxonomy. Every attempt updates your Bayesian mastery model.
            </p>
          </div>

          <button
            onClick={handleGenerateAdaptive}
            disabled={isGenerating}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isGenerating ? 'Generating...' : 'Generate Adaptive Challenge'}</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-stone-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Focus Topic
            </label>
            <input
              type="text"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              placeholder="e.g. Leader Election, Quorum Safety"
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Bloom's Taxonomy Level
            </label>
            <select
              value={selectedBloom}
              onChange={(e) => setSelectedBloom(e.target.value as BloomTaxonomyLevel)}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 cursor-pointer focus:bg-white focus:outline-none"
            >
              <option value="recall">Recall (Basic definitions)</option>
              <option value="comprehension">Comprehension (Conceptual grasp)</option>
              <option value="application">Application (Scenario problem-solving)</option>
              <option value="analysis">Analysis (Edge-case invariants)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Difficulty
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value as QuizDifficulty)}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 cursor-pointer focus:bg-white focus:outline-none"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion ? (
        <div className="p-6 bg-white rounded-xl border border-stone-200 shadow-xs space-y-5">
          {/* Question Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold text-xs uppercase">
                Question {activeQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-stone-400 font-medium">|</span>
              <span className="font-semibold text-stone-900">{currentQuestion.topic}</span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium capitalize">
                {currentQuestion.bloomLevel}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium capitalize">
                {currentQuestion.difficulty}
              </span>
            </div>
          </div>

          {/* Question Prompt */}
          <div className="text-sm font-semibold text-stone-900 leading-relaxed">
            {currentQuestion.prompt}
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              let optionStyle = 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800';

              if (submissionResult) {
                if (idx === currentQuestion.correctOptionIndex) {
                  optionStyle = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium';
                } else if (isSelected && !submissionResult.isCorrect) {
                  optionStyle = 'bg-red-50 border-red-300 text-red-950';
                } else {
                  optionStyle = 'bg-stone-50 opacity-60 border-stone-200 text-stone-500';
                }
              } else if (isSelected) {
                optionStyle = 'bg-stone-900 text-stone-100 border-stone-900';
              }

              return (
                <button
                  key={idx}
                  onClick={() => !submissionResult && setSelectedOption(idx)}
                  disabled={submissionResult !== null}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 text-xs cursor-pointer ${optionStyle}`}
                >
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                      isSelected && !submissionResult
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-200/80 text-stone-700'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 leading-relaxed">{option}</span>
                  {submissionResult && idx === currentQuestion.correctOptionIndex && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  {submissionResult && isSelected && !submissionResult.isCorrect && (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Submission Result / Feedback Card */}
          {submissionResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-3 animate-in fade-in duration-200 ${
                submissionResult.isCorrect
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {submissionResult.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="font-bold text-sm">
                    {submissionResult.isCorrect ? 'Correct!' : 'Incorrect Choice'}
                  </span>
                </div>

                <div className="flex items-center gap-1 font-semibold text-xs px-2.5 py-1 rounded-md bg-white border border-stone-200">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Mastery {submissionResult.masteryDelta >= 0 ? '+' : ''}
                    {submissionResult.masteryDelta}%
                  </span>
                </div>
              </div>

              <p className="leading-relaxed text-stone-800">{submissionResult.explanation}</p>

              {/* Source Citation for Learning Reinforcement */}
              {submissionResult.sourceCitation && (
                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-stone-700">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    <span className="font-semibold text-[11px]">
                      Source Anchor: {submissionResult.sourceCitation.section}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenCitation(submissionResult.sourceCitation!)}
                    className="text-amber-900 font-semibold text-[11px] underline cursor-pointer"
                  >
                    Inspect Source Evidence
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <div className="flex items-center gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveQuestionIndex(i);
                    setSelectedOption(null);
                    setSubmissionResult(null);
                  }}
                  className={`w-6 h-6 rounded-md text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                    i === activeQuestionIndex
                      ? 'bg-stone-900 text-stone-100'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div>
              {!submissionResult ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null || isSubmitting}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-stone-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Evaluating...' : 'Submit & Assess'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Next Challenge</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-stone-400 bg-white rounded-xl border border-stone-200">
          No questions available yet. Click "Generate Adaptive Challenge" above to test your understanding.
        </div>
      )}
    </div>
  );
};
