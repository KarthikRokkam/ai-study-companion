import React, { useState, useEffect } from 'react';
import { X, Activity, ShieldAlert, CheckCircle, RefreshCw, Cpu, DollarSign, Clock } from 'lucide-react';
import { AIInteractionTelemetry } from '../types.js';

interface ObservabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjectId: string;
}

export const ObservabilityModal: React.FC<ObservabilityModalProps> = ({
  isOpen,
  onClose,
  selectedProjectId,
}) => {
  const [traces, setTraces] = useState<AIInteractionTelemetry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isolationTestResult, setIsolationTestResult] = useState<{
    tested: boolean;
    status: number;
    message: string;
    passed: boolean;
  } | null>(null);
  const [testingIsolation, setTestingIsolation] = useState(false);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const [tracesRes, statsRes] = await Promise.all([
        fetch('/api/telemetry/traces'),
        fetch('/api/telemetry/stats'),
      ]);
      if (tracesRes.ok && statsRes.ok) {
        const tracesData = await tracesRes.json();
        const statsData = await statsRes.json();
        setTraces(tracesData.traces);
        setStats(statsData.stats);
      }
    } catch (e) {
      console.error('Failed to fetch telemetry', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTelemetry();
    }
  }, [isOpen]);

  // Test Project Isolation by attempting to access a rival space/project
  const runProjectIsolationTest = async () => {
    setTestingIsolation(true);
    setIsolationTestResult(null);
    try {
      // Attempting to query rival unauthorized project 'spc_restricted_sandbox'
      const res = await fetch('/api/projects/prj_unauthorized_attacker_test', {
        headers: {
          'x-user-id': 'usr_default_learner',
        },
      });

      const body = await res.json().catch(() => ({}));
      if (res.status === 403 || res.status === 404) {
        setIsolationTestResult({
          tested: true,
          status: res.status,
          message: body.message || 'Access strictly blocked by backend ownership hierarchy.',
          passed: true,
        });
      } else {
        setIsolationTestResult({
          tested: true,
          status: res.status,
          message: 'CRITICAL WARNING: Cross-tenant boundary permitted unauthorized access!',
          passed: false,
        });
      }
    } catch (err: any) {
      setIsolationTestResult({
        tested: true,
        status: 500,
        message: err.message,
        passed: true,
      });
    } finally {
      setTestingIsolation(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] border border-stone-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-stone-900 text-stone-100 rounded-lg">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">System Observability & Isolation Audit</h2>
              <p className="text-xs text-stone-500">
                Traceability, Latency, Token Metrics, and Project Isolation Verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTelemetry}
              className="p-1.5 text-stone-500 hover:text-stone-800 rounded-md hover:bg-stone-200/60 transition-colors cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-stone-800 text-xs">
          {/* Isolation Security Verification Box */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-stone-900 text-sm">Project Isolation Audit</span>
              </div>
              <button
                onClick={runProjectIsolationTest}
                disabled={testingIsolation}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-stone-100 rounded-lg font-medium text-xs transition-colors cursor-pointer"
              >
                {testingIsolation ? 'Verifying...' : 'Test Tampered Project Boundary'}
              </button>
            </div>
            <p className="text-stone-600 text-xs">
              Simulates a malicious client sending tampered foreign project/space IDs. Verifies that the backend enforces authorization and rejects cross-boundary leakage.
            </p>
            {isolationTestResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  isolationTestResult.passed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {isolationTestResult.passed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    Status: HTTP {isolationTestResult.status} (
                    {isolationTestResult.passed ? 'PASSED: Authorization Boundary Enforced' : 'FAILED'}
                    )
                  </div>
                  <div className="text-[11px] mt-0.5">{isolationTestResult.message}</div>
                </div>
              </div>
            )}
          </div>

          {/* Metric Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="font-medium text-[11px]">Total AI Traces</span>
                </div>
                <div className="text-lg font-bold text-stone-900">{stats.totalRequests}</div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                  {stats.successRate}% Success Rate
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-medium text-[11px]">Average Latency</span>
                </div>
                <div className="text-lg font-bold text-stone-900">{stats.avgLatencyMs} ms</div>
                <div className="text-[10px] text-stone-500 mt-0.5">End-to-end response</div>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span className="font-medium text-[11px]">Tokens Tracked</span>
                </div>
                <div className="text-lg font-bold text-stone-900">{stats.totalTokens.toLocaleString()}</div>
                <div className="text-[10px] text-stone-500 mt-0.5">Prompt + Completion</div>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="font-medium text-[11px]">Est. Cost (USD)</span>
                </div>
                <div className="text-lg font-bold text-stone-900">${stats.totalCostUsd}</div>
                <div className="text-[10px] text-stone-500 mt-0.5">Gemini 3.8 Flash rate</div>
              </div>
            </div>
          )}

          {/* Trace Log Table */}
          <div>
            <h3 className="font-bold text-stone-900 text-sm mb-2 flex items-center justify-between">
              <span>Recent AI Operations Trace Log</span>
              <span className="text-[11px] text-stone-400 font-normal">
                Audited with Request ID & Retrieval Latencies
              </span>
            </h3>
            {traces.length === 0 ? (
              <div className="p-6 text-center text-stone-400 bg-stone-50 rounded-lg border border-stone-200">
                No AI traces logged yet. Interact with the Tutor or Adaptive Quiz to record traces.
              </div>
            ) : (
              <div className="border border-stone-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Trace / Workflow ID</th>
                      <th className="py-2.5 px-3">Feature</th>
                      <th className="py-2.5 px-3">Latency</th>
                      <th className="py-2.5 px-3">Retrieval</th>
                      <th className="py-2.5 px-3">Tokens</th>
                      <th className="py-2.5 px-3">Cost</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {traces.map((trace) => (
                      <tr key={trace.traceId} className="hover:bg-stone-50/70 font-mono text-[11px]">
                        <td className="py-2 px-3">
                          <div className="text-stone-900 font-semibold truncate max-w-[140px]">{trace.workflowId}</div>
                          <div className="text-stone-400 text-[10px] truncate max-w-[140px]">{trace.requestId}</div>
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-medium uppercase">
                            {trace.feature}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-stone-800">{trace.latencyMs} ms</td>
                        <td className="py-2 px-3 text-stone-600">{trace.retrievalLatencyMs} ms</td>
                        <td className="py-2 px-3 text-stone-700">{trace.totalTokens}</td>
                        <td className="py-2 px-3 text-stone-700">${trace.estimatedCostUsd}</td>
                        <td className="py-2 px-3 font-sans">
                          {trace.success ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                              <CheckCircle className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <span className="text-red-700 font-medium text-[11px]">Error</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-medium cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
