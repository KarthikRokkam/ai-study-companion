import React, { useState, useEffect } from 'react';
import { Target, Clock, ShieldCheck, AlertCircle, Sparkles, ArrowRight, PlayCircle, BookOpen, Layers, Image as ImageIcon, Volume2 } from 'lucide-react';
import { DailyStudyPlan, LearnerAnalyticsDashboardData } from '../types.js';

interface DashboardViewProps {
  projectId: string;
  projectName: string;
  onNavigateToTutor: (topic?: string) => void;
  onNavigateToQuiz: (topic?: string) => void;
  onNavigateToCoach: () => void;
  onNavigateToExam: () => void;
  onNavigateToExplorer: () => void;
  onNavigateToMastery: () => void;
  onNavigateToSocratic: (topic?: string) => void;
  onNavigateToMaterials?: () => void;
  onNavigateToTutorWithMedia?: (mediaId?: string, topic?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projectId,
  projectName,
  onNavigateToTutor,
  onNavigateToQuiz,
  onNavigateToCoach,
  onNavigateToExam,
  onNavigateToExplorer,
  onNavigateToMastery,
  onNavigateToSocratic,
  onNavigateToMaterials,
  onNavigateToTutorWithMedia,
}) => {
  const [dashboardData, setDashboardData] = useState<LearnerAnalyticsDashboardData | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyStudyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashRes, planRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/learner/dashboard`),
          fetch(`/api/projects/${projectId}/learner/plan`)
        ]);

        if (dashRes.ok) {
          const dashJson = await dashRes.json();
          setDashboardData(dashJson.dashboard);
        }
        if (planRes.ok) {
          const planJson = await planRes.json();
          setDailyPlan(planJson.plan);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return <div className="p-8 text-center text-stone-500 animate-pulse">Loading intelligence...</div>;
  }

  const nextAction = dashboardData?.recommendedActions?.[0];

  return (
    <div className="space-y-6 text-stone-800 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Top Banner: Core Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-700 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold tracking-tight">Your Next Best Action</span>
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">
              {nextAction ? nextAction.action.replace(/_/g, ' ') : 'Explore Materials'}
            </h3>
            <p className="text-sm text-stone-700 font-medium mb-4">
              {nextAction ? nextAction.reason : 'Start by reading or asking questions about your study materials.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (nextAction?.mediaAssetId && onNavigateToTutorWithMedia) {
                  onNavigateToTutorWithMedia(nextAction.mediaAssetId, nextAction.conceptName);
                } else if (nextAction?.action === 'REVIEW_DIAGRAM' || nextAction?.action === 'EXPLAIN_CONCEPT_VISUALLY') {
                  onNavigateToTutor(nextAction?.conceptName);
                } else {
                  onNavigateToQuiz(nextAction?.conceptName);
                }
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              {nextAction?.action === 'REVIEW_DIAGRAM' ? 'Inspect Diagram' : nextAction?.action === 'EXPLAIN_CONCEPT_VISUALLY' ? 'Visual Explanation' : 'Start Action'} <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateToCoach}
              className="px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              Ask Coach
            </button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-stone-600 mb-2">
              <BookOpen className="w-5 h-5" />
              <span className="font-bold tracking-tight">Today's Study Plan</span>
            </div>
            <div className="space-y-3 mt-4">
              {dailyPlan?.items.slice(0, 3).map((item, idx) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-500">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900">{item.type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-stone-500">{item.conceptName} • {item.estimatedMinutes} min</div>
                  </div>
                </div>
              ))}
              {(!dailyPlan || dailyPlan.items.length === 0) && (
                <div className="text-sm text-stone-500">No active plan today. Start exploring to generate one!</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Multimodal Knowledge Grounding (Phase 6) */}
      <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">Multimodal Adaptive Intelligence</h4>
              <p className="text-xs text-stone-500">Grounded visual diagrams, OCR architectures & audio lecture comprehension</p>
            </div>
          </div>
          {onNavigateToMaterials && (
            <button
              onClick={onNavigateToMaterials}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
            >
              Manage Media Assets <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-stone-500 font-medium">Visual Concepts</div>
              <div className="text-lg font-black text-stone-900">
                {dashboardData?.multimodalActivity?.visualConceptsCount ?? 0}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-stone-500 font-medium">Audio Concepts</div>
              <div className="text-lg font-black text-stone-900">
                {dashboardData?.multimodalActivity?.audioConceptsCount ?? 0}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-stone-500 font-medium">Diagram Interactions</div>
              <div className="text-lg font-black text-stone-900">
                {dashboardData?.multimodalActivity?.diagramsPracticedCount ?? 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:border-stone-300 transition-colors" onClick={onNavigateToMastery}>
          <div className="flex items-center gap-2 text-stone-500 mb-1.5">
            <Target className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-xs">Overall Mastery</span>
          </div>
          <span className="text-2xl font-black text-stone-900">
            {dashboardData ? Math.round(dashboardData.overallMastery * 100) : 0}%
          </span>
        </div>
        
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:border-stone-300 transition-colors" onClick={onNavigateToMastery}>
          <div className="flex items-center gap-2 text-stone-500 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span className="font-semibold text-xs">Avg Confidence</span>
          </div>
          <span className="text-2xl font-black text-stone-900">
            {dashboardData ? Math.round(dashboardData.overallConfidence * 100) : 0}%
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:border-stone-300 transition-colors" onClick={onNavigateToMastery}>
          <div className="flex items-center gap-2 text-stone-500 mb-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span className="font-semibold text-xs">Active Mistakes</span>
          </div>
          <span className="text-2xl font-black text-stone-900">
            {dashboardData?.activeMistakes.length || 0}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:border-stone-300 transition-colors" onClick={onNavigateToMastery}>
          <div className="flex items-center gap-2 text-stone-500 mb-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-xs">Retention Risk</span>
          </div>
          <span className="text-2xl font-black text-stone-900">
            {dashboardData?.retentionRiskConcepts.length || 0}
          </span>
        </div>
      </div>

      {/* Modes Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <button onClick={() => onNavigateToSocratic()} className="p-5 text-left bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center mb-3 group-hover:bg-sky-200 transition-colors">
            <PlayCircle className="w-5 h-5 text-sky-700" />
          </div>
          <h4 className="font-bold text-stone-900">Socratic Tutor</h4>
          <p className="text-xs text-stone-500 mt-1">Progressive hints and guided questioning to help you find the answer yourself.</p>
        </button>

        <button onClick={onNavigateToExam} className="p-5 text-left bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center mb-3 group-hover:bg-rose-200 transition-colors">
            <Target className="w-5 h-5 text-rose-700" />
          </div>
          <h4 className="font-bold text-stone-900">Exam Mode</h4>
          <p className="text-xs text-stone-500 mt-1">Take a balanced assessment across all concepts to measure true mastery.</p>
        </button>

        <button onClick={onNavigateToExplorer} className="p-5 text-left bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
            <Layers className="w-5 h-5 text-indigo-700" />
          </div>
          <h4 className="font-bold text-stone-900">Concept Explorer</h4>
          <p className="text-xs text-stone-500 mt-1">Visualize concept prerequisites and knowledge gaps in your material.</p>
        </button>
      </div>
    </div>
  );
};
