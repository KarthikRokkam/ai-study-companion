import React, { useState, useEffect } from 'react';
import {
  Brain,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Sparkles,
  Zap,
  Target,
  Clock,
  RotateCcw,
  ShieldCheck,
  Activity,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  LearnerModel,
  ConceptMastery,
  LearningRecommendation,
  LearnerAnalyticsDashboardData,
  LearnerConceptState,
  MistakeRecord,
  AdaptiveNextAction,
  SpacedRepetitionState,
} from '../types.js';

interface MasteryViewProps {
  projectId: string;
  learnerModel: LearnerModel | null;
  projectName: string;
  onNavigateToTutor: (topic?: string) => void;
  onNavigateToQuiz: (topic?: string) => void;
}

export const MasteryView: React.FC<MasteryViewProps> = ({
  projectId,
  learnerModel,
  projectName,
  onNavigateToTutor,
  onNavigateToQuiz,
}) => {
  const [dashboardData, setDashboardData] = useState<LearnerAnalyticsDashboardData | null>(null);
  const [concepts, setConcepts] = useState<LearnerConceptState[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'concepts' | 'mistakes' | 'spaced_review' | 'events'>('concepts');
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);

  const fetchLearnerData = async () => {
    try {
      setLoading(true);
      const [dashRes, conceptsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/learner/dashboard`),
        fetch(`/api/projects/${projectId}/learner/concepts`),
      ]);

      if (dashRes.ok) {
        const dashJson = await dashRes.json();
        setDashboardData(dashJson.dashboard);
      }
      if (conceptsRes.ok) {
        const conceptsJson = await conceptsRes.json();
        setConcepts(conceptsJson.concepts);
      }
    } catch (err) {
      console.error('Failed to load learner intelligence data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearnerData();
  }, [projectId]);

  const handleReviewSubmission = async (conceptId: string, isSuccess: boolean) => {
    try {
      setReviewSubmitting(conceptId);
      const res = await fetch(`/api/projects/${projectId}/learner/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId,
          isSuccess,
          idempotencyKey: `rev_${conceptId}_${Date.now()}`,
        }),
      });

      if (res.ok) {
        await fetchLearnerData();
      }
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setReviewSubmitting(null);
    }
  };

  const nextAction = dashboardData?.recommendedActions?.[0];

  return (
    <div className="space-y-6 text-stone-800 text-xs">
      {/* Top Banner: Bayesian Mastery & Epistemic Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Metric 1: Bayesian Mastery */}
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 mb-1.5">
            <Target className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-xs">Bayesian Mastery (BKT)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-stone-900">
              {dashboardData ? Math.round(dashboardData.overallMastery * 100) : (learnerModel?.overallMastery || 0)}%
            </span>
            <span className="text-[11px] text-stone-500 font-medium">P(L) Posterior</span>
          </div>
          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mt-2.5">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{
                width: `${dashboardData ? Math.round(dashboardData.overallMastery * 100) : (learnerModel?.overallMastery || 0)}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 2: Epistemic Confidence */}
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span className="font-semibold text-xs">Sample Confidence</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-stone-900">
              {dashboardData ? Math.round(dashboardData.overallConfidence * 100) : 0}%
            </span>
            <span className="text-[11px] text-sky-700 font-semibold">C(N) Bound</span>
          </div>
          <p className="text-[10px] text-stone-500 mt-2">
            Increases monotonically with verified practice attempts.
          </p>
        </div>

        {/* Metric 3: Active Mistakes & Misconceptions */}
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 mb-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span className="font-semibold text-xs">Active Misconceptions</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-stone-900">
              {dashboardData?.activeMistakes.length || 0}
            </span>
            <span className="text-[11px] text-rose-700 font-semibold">Tracked Gaps</span>
          </div>
          <p className="text-[10px] text-stone-500 mt-2">
            Categorized into misconceptions, gaps, and prerequisite blocks.
          </p>
        </div>

        {/* Metric 4: Spaced Repetition Due */}
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 mb-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-xs">Memory Retention Risk</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-stone-900">
              {dashboardData?.retentionRiskConcepts.length || 0}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">At Risk</span>
          </div>
          <p className="text-[10px] text-stone-500 mt-2">
            Concepts nearing forgetting threshold requiring spaced review.
          </p>
        </div>
      </div>

      {/* Next Best Action (Traceable Evidence-Backed Recommendation) */}
      {nextAction && (
        <div className="p-5 bg-white rounded-xl border-2 border-amber-500/30 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-stone-900">
                Next Best Action: {nextAction.action.replace(/_/g, ' ')}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900">
              Priority: {Math.round(nextAction.priority * 100)}%
            </span>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed font-medium">
            {nextAction.reason}
          </p>

          <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                Evidence Traceability:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {nextAction.evidence.map((ev, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[10px] border border-stone-200"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigateToTutor(nextAction.conceptName)}
                className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Ask AI Tutor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigateToQuiz(nextAction.conceptName)}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Practice Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveSubTab('concepts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'concepts'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bayesian Concept States ({concepts.length})</span>
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('mistakes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'mistakes'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Mistake Intelligence ({dashboardData?.activeMistakes.length || 0})</span>
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('spaced_review')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'spaced_review'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Spaced Repetition & Decay</span>
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('events')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'events'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>Learning Event Audit Log</span>
          </div>
        </button>
      </div>

      {/* Sub-Tab 1: Concepts Breakdown */}
      {activeSubTab === 'concepts' && (
        <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-stone-700" />
              <span>Calibrated BKT Concept Knowledge States</span>
            </h3>
            <span className="text-[11px] text-stone-400">Strictly Bounded [0.01, 0.99]</span>
          </div>

          {concepts.length === 0 ? (
            <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-lg border border-dashed border-stone-200">
              No concept attempts recorded yet for this project. Take a quiz or chat with the tutor to initialize Bayesian tracking.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {concepts.map((concept) => (
                <div
                  key={concept.conceptId}
                  className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-stone-900 text-xs block">{concept.conceptName}</span>
                      <span className="text-[10px] text-stone-500 font-mono">ID: {concept.conceptId}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        concept.repetitionState === 'MASTERED'
                          ? 'bg-emerald-100 text-emerald-900'
                          : concept.repetitionState === 'AT_RISK'
                          ? 'bg-rose-100 text-rose-900'
                          : concept.repetitionState === 'LEARNING'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-stone-200 text-stone-800'
                      }`}
                    >
                      {concept.repetitionState}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-stone-200/60 text-center">
                    <div>
                      <div className="text-[10px] text-stone-500">Mastery P(L)</div>
                      <div className="font-bold text-stone-900 text-sm">{Math.round(concept.mastery * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500">Confidence</div>
                      <div className="font-bold text-stone-900 text-sm">{Math.round(concept.confidence * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500">Retention</div>
                      <div className="font-bold text-stone-900 text-sm">{Math.round(concept.retentionStrength * 100)}%</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>
                      Attempts: <strong>{concept.correctCount}/{concept.attemptCount}</strong> ({concept.mistakeCount} mistakes)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onNavigateToTutor(concept.conceptName)}
                        className="px-2 py-0.5 bg-white border border-stone-200 rounded text-[10px] font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
                      >
                        Ask Tutor
                      </button>
                      <button
                        onClick={() => onNavigateToQuiz(concept.conceptName)}
                        className="px-2 py-0.5 bg-stone-900 text-white rounded text-[10px] font-medium hover:bg-stone-800 cursor-pointer"
                      >
                        Quiz
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Mistake Intelligence */}
      {activeSubTab === 'mistakes' && (
        <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Structured Mistake Intelligence & Misconception Tracker</span>
            </h3>
            <span className="text-[11px] text-stone-400">Classified by Failure Mode</span>
          </div>

          {!dashboardData?.activeMistakes || dashboardData.activeMistakes.length === 0 ? (
            <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-lg border border-dashed border-stone-200">
              Zero active mistakes recorded! Keep practicing with adaptive quizzes to test edge cases.
            </div>
          ) : (
            <div className="space-y-3">
              {dashboardData.activeMistakes.map((mistake) => (
                <div
                  key={mistake.mistakeId}
                  className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-xs">{mistake.conceptId}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-900">
                        {mistake.mistakeType}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 font-semibold">
                      Occurrences: <strong>{mistake.occurrenceCount}x</strong>
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-stone-200 space-y-1 text-[11px]">
                    <div>
                      <span className="text-stone-500 font-semibold">Learner Answer: </span>
                      <span className="text-rose-700 font-medium">"{mistake.learnerAnswer}"</span>
                    </div>
                    <div>
                      <span className="text-stone-500 font-semibold">Correct Principle: </span>
                      <span className="text-emerald-700 font-medium">"{mistake.correctAnswer}"</span>
                    </div>
                    {mistake.explanation && (
                      <p className="text-stone-600 pt-1 border-t border-stone-100 leading-relaxed">
                        {mistake.explanation}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onNavigateToTutor(mistake.conceptId)}
                      className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[11px] font-semibold text-stone-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Clarify with Tutor</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: Spaced Repetition & Decay */}
      {activeSubTab === 'spaced_review' && (
        <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <span>Memory Stability & Spaced Review Scheduler</span>
            </h3>
            <span className="text-[11px] text-stone-400">R(t) = exp(-t / S)</span>
          </div>

          <div className="space-y-3">
            {concepts.map((concept) => (
              <div
                key={concept.conceptId}
                className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 text-xs">{concept.conceptName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                      Stability: {concept.stabilityHours}h
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Retention: <strong>{Math.round(concept.retentionStrength * 100)}%</strong> • Next Review Due:{' '}
                    {new Date(concept.reviewDueAt).toLocaleDateString()} at{' '}
                    {new Date(concept.reviewDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={reviewSubmitting === concept.conceptId}
                    onClick={() => handleReviewSubmission(concept.conceptId, false)}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Forgot Concept
                  </button>
                  <button
                    disabled={reviewSubmitting === concept.conceptId}
                    onClick={() => handleReviewSubmission(concept.conceptId, true)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Recalled Successfully
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Event Audit Log */}
      {activeSubTab === 'events' && (
        <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-stone-700" />
              <span>Immutable Learning Event Stream</span>
            </h3>
            <span className="text-[11px] text-stone-400">Replay-Protected</span>
          </div>

          {!dashboardData?.recentEvents || dashboardData.recentEvents.length === 0 ? (
            <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-lg border border-dashed border-stone-200">
              No learning events recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {dashboardData.recentEvents.map((event) => (
                <div
                  key={event.eventId}
                  className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-[11px] flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-800">{event.eventType}</span>
                      {event.conceptId && (
                        <span className="text-stone-500 font-mono">[{event.conceptId}]</span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-400">
                      ID: {event.eventId} • {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <pre className="text-[10px] bg-white p-1 rounded border border-stone-200 max-w-xs truncate">
                    {JSON.stringify(event.payload)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
