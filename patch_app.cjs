const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
code = code.replace(
  "import { MasteryView } from './components/MasteryView.js';",
  "import { MasteryView } from './components/MasteryView.js';\nimport { DashboardView } from './components/DashboardView.js';\nimport { StudyCoachView } from './components/StudyCoachView.js';\nimport { SocraticTutorView } from './components/SocraticTutorView.js';\nimport { ExamView } from './components/ExamView.js';\nimport { ConceptExplorerView } from './components/ConceptExplorerView.js';"
);

// TabType
code = code.replace(
  "type TabType = 'tutor' | 'materials' | 'quiz' | 'mastery';",
  "type TabType = 'dashboard' | 'tutor' | 'socratic' | 'materials' | 'quiz' | 'mastery' | 'coach' | 'exam' | 'explorer';"
);

// Default Tab
code = code.replace(
  "const [activeTab, setActiveTab] = useState<TabType>('tutor');",
  "const [activeTab, setActiveTab] = useState<TabType>('dashboard');"
);

// Navigation UI
const oldNav = `<button
                onClick={() => setActiveTab('tutor')}
                className={\`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer \${
                  activeTab === 'tutor'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }\`}
              >
                Tutor
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={\`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer \${
                  activeTab === 'materials'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }\`}
              >
                Materials
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={\`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer \${
                  activeTab === 'quiz'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }\`}
              >
                Quiz
              </button>
              <button
                onClick={() => setActiveTab('mastery')}
                className={\`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer \${
                  activeTab === 'mastery'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }\`}
              >
                Mastery
              </button>`;

const newNav = `
              <button onClick={() => setActiveTab('dashboard')} className={\`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer \${activeTab === 'dashboard' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}\`}>Dashboard</button>
              <button onClick={() => setActiveTab('tutor')} className={\`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer \${activeTab === 'tutor' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}\`}>Tutor</button>
              <button onClick={() => setActiveTab('quiz')} className={\`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer \${activeTab === 'quiz' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}\`}>Quiz</button>
              <button onClick={() => setActiveTab('materials')} className={\`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer \${activeTab === 'materials' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}\`}>Materials</button>
`;
code = code.replace(oldNav, newNav);

// Content UI
const oldContent = `{activeTab === 'mastery' && (
            <MasteryView
              projectId={selectedProjectId}
              learnerModel={learnerModel}
              projectName={currentProject?.name || 'Current Project'}
              onNavigateToTutor={() => setActiveTab('tutor')}
              onNavigateToQuiz={() => setActiveTab('quiz')}
            />
          )}`;

const newContent = `
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
`;

code = code.replace(oldContent, newContent);

fs.writeFileSync('src/App.tsx', code);
