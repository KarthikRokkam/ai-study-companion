import React, { useState, useEffect } from 'react';
import { Layers, GitCommit, Target, AlertCircle } from 'lucide-react';

interface ConceptExplorerProps {
  projectId: string;
}

export const ConceptExplorerView: React.FC<ConceptExplorerProps> = ({ projectId }) => {
  const [concepts, setConcepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConcepts = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/concepts`);
        if (res.ok) {
          const data = await res.json();
          setConcepts(data.concepts);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConcepts();
  }, [projectId]);

  if (loading) {
    return <div className="p-8 text-center text-stone-500 animate-pulse">Loading Concept Graph...</div>;
  }

  if (concepts.length === 0) {
    return (
      <div className="p-8 text-center text-stone-500">
        No concepts extracted yet. Upload materials or wait for processing to finish.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Layers className="w-5 h-5 text-indigo-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">Concept Explorer</h2>
          <p className="text-sm text-stone-500">Visual mapping of knowledge nodes and their dependencies.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {concepts.map(concept => (
          <div key={concept.id} className="p-5 bg-white rounded-xl border border-stone-200 shadow-sm">
            <h3 className="font-bold text-stone-900 mb-1">{concept.name}</h3>
            <p className="text-xs text-stone-500 mb-4 line-clamp-2">{concept.description}</p>
            
            <div className="space-y-2 border-t border-stone-100 pt-3">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Related Context</div>
              <div className="flex flex-wrap gap-1.5">
                {concept.relatedConceptIds.length > 0 ? (
                  concept.relatedConceptIds.map((rid: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px] flex items-center gap-1">
                      <GitCommit className="w-3 h-3" /> {rid}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-stone-400">Root Node</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
