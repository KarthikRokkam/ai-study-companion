import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  FileSpreadsheet,
  BrainCircuit,
  TrendingUp,
  Layers,
  Sparkles,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { User, Space, Project, LearnerModel, Citation } from './types.js';
import { Header } from './components/Header.js';
import { TutorView } from './components/TutorView.js';
import { MaterialsView } from './components/MaterialsView.js';
import { QuizView } from './components/QuizView.js';
import { MasteryView } from './components/MasteryView.js';
import { DashboardView } from './components/DashboardView.js';
import { StudyCoachView } from './components/StudyCoachView.js';
import { SocraticTutorView } from './components/SocraticTutorView.js';
import { ExamView } from './components/ExamView.js';
import { ConceptExplorerView } from './components/ConceptExplorerView.js';
import { ObservabilityModal } from './components/ObservabilityModal.js';
import { CitationModal } from './components/CitationModal.js';

type TabType = 'dashboard' | 'tutor' | 'socratic' | 'materials' | 'quiz' | 'mastery' | 'coach' | 'exam' | 'explorer';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('spc_distributed_systems');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('prj_raft_consensus');
  const [learnerModel, setLearnerModel] = useState<LearnerModel | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isObservabilityOpen, setIsObservabilityOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Initial Load: User and Spaces
  useEffect(() => {
    const initApp = async () => {
      try {
        const [meRes, spacesRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/spaces'),
        ]);

        if (meRes.ok && spacesRes.ok) {
          const meData = await meRes.json();
          const spacesData = await spacesRes.json();
          setUser(meData.user);
          setSpaces(spacesData.spaces);

          if (spacesData.spaces.length > 0) {
            const firstSpace = spacesData.spaces[0];
            setSelectedSpaceId(firstSpace.id);
            fetchProjectsForSpace(firstSpace.id);
          }
        }
      } catch (err) {
        console.error('Failed to initialize app', err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // 2. Fetch projects when space changes
  const fetchProjectsForSpace = async (spaceId: string) => {
    try {
      const res = await fetch(`/api/spaces/${spaceId}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        if (data.projects.length > 0) {
          setSelectedProjectId(data.projects[0].id);
          fetchLearnerModel(data.projects[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  // 3. Fetch Learner Model for active project
  const fetchLearnerModel = async (projId: string) => {
    try {
      const res = await fetch(`/api/projects/${projId}/learner-model`);
      if (res.ok) {
        const data = await res.json();
        setLearnerModel(data.learnerModel);
      }
    } catch (err) {
      console.error('Failed to fetch learner model', err);
    }
  };

  const handleSelectSpace = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    fetchProjectsForSpace(spaceId);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    fetchLearnerModel(projectId);
  };

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 text-xs font-semibold text-stone-600">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span>Initializing AI Study Companion...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans antialiased">
      {/* Top Header & Isolation Enforcer */}
      <Header
        user={user}
        spaces={spaces}
        projects={projects}
        selectedSpaceId={selectedSpaceId}
        selectedProjectId={selectedProjectId}
        onSelectSpace={handleSelectSpace}
        onSelectProject={handleSelectProject}
        onOpenObservability={() => setIsObservabilityOpen(true)}
        overallMastery={learnerModel?.overallMastery || 0}
      />

      {/* Main Learning Loop Navigation Tabs */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
            <button
              onClick={() => setActiveTab('tutor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tutor'
                  ? 'bg-stone-900 text-stone-100 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Grounded Tutor</span>
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'materials'
                  ? 'bg-stone-900 text-stone-100 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Materials & Chunks</span>
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-stone-900 text-stone-100 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Adaptive Quiz</span>
            </button>

            <button
              onClick={() => setActiveTab('mastery')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'mastery'
                  ? 'bg-stone-900 text-stone-100 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Mastery & Growth</span>
            </button>
          </div>

          <div className="text-[11px] text-stone-500 hidden md:flex items-center gap-1.5">
            <span className="font-semibold text-stone-700">Loop:</span>
            <span>Space</span>
            <span>→</span>
            <span>Project</span>
            <span>→</span>
            <span>Material</span>
            <span>→</span>
            <span>Knowledge</span>
            <span>→</span>
            <span className="font-semibold text-amber-700">AI Tutor</span>
            <span>→</span>
            <span>Quiz</span>
            <span>→</span>
            <span>Mastery</span>
          </div>
        </div>

        {/* Tab Views */}
        <div className="animate-in fade-in duration-150">
          {activeTab === 'tutor' && (
            <TutorView
              projectId={selectedProjectId}
              projectName={currentProject?.name || 'Current Project'}
              learnerModel={learnerModel}
              onOpenCitation={(cite) => setActiveCitation(cite)}
              onNavigateToQuiz={() => setActiveTab('quiz')}
            />
          )}

          {activeTab === 'materials' && (
            <MaterialsView
              projectId={selectedProjectId}
              projectName={currentProject?.name || 'Current Project'}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizView
              projectId={selectedProjectId}
              projectName={currentProject?.name || 'Current Project'}
              learnerModel={learnerModel}
              onOpenCitation={(cite) => setActiveCitation(cite)}
              onRefreshLearnerModel={() => fetchLearnerModel(selectedProjectId)}
            />
          )}

          
          {activeTab === 'dashboard' && (
            <DashboardView
              projectId={selectedProjectId}
              projectName={currentProject?.name || 'Current Project'}
              onNavigateToTutor={() => setActiveTab('tutor')}
              onNavigateToQuiz={() => setActiveTab('quiz')}
              onNavigateToCoach={() => setActiveTab('coach')}
              onNavigateToExam={() => setActiveTab('exam')}
              onNavigateToExplorer={() => setActiveTab('explorer')}
              onNavigateToMastery={() => setActiveTab('mastery')}
              onNavigateToSocratic={() => setActiveTab('socratic')}
            />
          )}
          {activeTab === 'mastery' && (
            <MasteryView
              projectId={selectedProjectId}
              learnerModel={learnerModel}
              projectName={currentProject?.name || 'Current Project'}
              onNavigateToTutor={() => setActiveTab('tutor')}
              onNavigateToQuiz={() => setActiveTab('quiz')}
            />
          )}
          {activeTab === 'coach' && (
            <StudyCoachView projectId={selectedProjectId} />
          )}
          {activeTab === 'socratic' && (
            <SocraticTutorView 
              projectId={selectedProjectId} 
              onViewCitation={(c) => setActiveCitation(c)} 
            />
          )}
          {activeTab === 'exam' && (
            <ExamView 
              projectId={selectedProjectId} 
              onNavigateToDashboard={() => setActiveTab('dashboard')} 
            />
          )}
          {activeTab === 'explorer' && (
            <ConceptExplorerView projectId={selectedProjectId} />
          )}

        </div>
      </main>

      {/* Verified Citation Inspector Modal */}
      <CitationModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />

      {/* System Observability & Telemetry Modal */}
      <ObservabilityModal
        isOpen={isObservabilityOpen}
        onClose={() => setIsObservabilityOpen(false)}
        selectedProjectId={selectedProjectId}
      />
    </div>
  );
}
