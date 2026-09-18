import React from 'react';
import { ShieldCheck, BookOpen, Activity, Sparkles, FolderLock } from 'lucide-react';
import { Space, Project, User } from '../types.js';

interface HeaderProps {
  user: User | null;
  spaces: Space[];
  projects: Project[];
  selectedSpaceId: string;
  selectedProjectId: string;
  onSelectSpace: (spaceId: string) => void;
  onSelectProject: (projectId: string) => void;
  onOpenObservability: () => void;
  overallMastery: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  spaces,
  projects,
  selectedSpaceId,
  selectedProjectId,
  onSelectSpace,
  onSelectProject,
  onOpenObservability,
  overallMastery,
}) => {
  const currentSpace = spaces.find((s) => s.id === selectedSpaceId);
  const currentProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center font-semibold text-base shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900 tracking-tight leading-none">
                  AI Study Companion
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Adaptive Intelligence
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden md:block">
                Contextual, Grounded & Measurable Learning
              </p>
            </div>
          </div>

          {/* Space & Project Pickers (Enforcing Strict Scope) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Space Selector */}
            <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs">
              <span className="text-stone-400 font-medium hidden lg:inline">Space:</span>
              <select
                value={selectedSpaceId}
                onChange={(e) => onSelectSpace(e.target.value)}
                className="bg-transparent font-medium text-stone-800 focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[180px] truncate"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Selector */}
            <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs">
              <span className="text-stone-400 font-medium hidden lg:inline">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-transparent font-medium text-stone-800 focus:outline-none cursor-pointer max-w-[160px] sm:max-w-[210px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Ownership Verification Badge */}
            <div
              className="hidden xl:flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-medium"
              title={`Ownership verified: ${user?.name} owns this space and project`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Isolated</span>
            </div>

            {/* Observability Button */}
            <button
              onClick={onOpenObservability}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Telemetry & Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Context & Core Learning Loop Tracker */}
      <div className="bg-stone-50 border-t border-stone-200 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-stone-600 gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-stone-800 shrink-0">Current Goal:</span>
            <span className="truncate text-stone-600">
              {currentProject?.learningGoals?.[0] || currentProject?.description || 'Active Project Scope'}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-stone-500 hidden sm:inline">Project Mastery:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 sm:w-28 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${overallMastery}%` }}
                />
              </div>
              <span className="font-semibold text-stone-800">{overallMastery}%</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
