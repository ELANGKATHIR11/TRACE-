import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api-client';
import {
  Sparkles,
  AlertTriangle,
  UserCheck,
  Clock,
  RefreshCw,
  TrendingUp,
  Info,
  ChevronRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReviewPilotQueueViewProps {
  onSelectApplication: (applicationId: string) => void;
  selectedAppId?: string;
}

export const ReviewPilotQueueView: React.FC<ReviewPilotQueueViewProps> = ({
  onSelectApplication,
  selectedAppId,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [scoringMethodology, setScoringMethodology] = useState<string>('');

  const loadPrioritizedQueue = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPrioritizedReviewQueue();
      setQueueItems(res.items || []);
      setScoringMethodology(res.scoringMethodology || '');
    } catch (err: any) {
      console.warn('ReviewPilot load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrioritizedQueue();
  }, []);

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-blue-700 font-bold">
              Feature 5 · ReviewPilot
            </span>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
              Explainable Prioritization Service
            </span>
          </div>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            Multi-Factor Deterministic Review Queue Ranking
          </h3>
          <p className="mt-0.5 text-slate-500 text-[11px]">
            Scores applications based on unresolved deficiencies, contradiction severity, OCR uncertainty, and deadlines. Ranks explainably with fair workload assignment.
          </p>
        </div>

        <button
          onClick={loadPrioritizedQueue}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Recalculating Ranks...' : 'Refresh ReviewPilot'}
        </button>
      </div>

      {/* Epistemic Transparency Notice */}
      <div className="rounded border border-blue-200 bg-blue-50/50 p-2.5 text-[11px] text-blue-900 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong>Deterministic Explanations, Not Black-Box Predictions:</strong> ReviewPilot calculates priorities through audited regulatory scoring policies. It never attempts to predict institutional wrongdoing or probability of approval.
        </div>
      </div>

      {/* Prioritized Applications List */}
      <div className="space-y-3">
        {queueItems.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            {isLoading ? 'Calculating queue priorities...' : 'No applications in active review queue.'}
          </div>
        ) : (
          queueItems.map((item) => {
            const isSelected = item.applicationId === selectedAppId;
            return (
              <div
                key={item.applicationId}
                onClick={() => onSelectApplication(item.applicationId)}
                className={`cursor-pointer rounded-lg border p-4 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-mono text-xs font-bold text-blue-800">
                      #{item.rank}
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {item.applicationCode}
                    </span>
                    <span className="text-slate-600">· {item.programName}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span
                      className={`rounded px-2 py-0.5 font-bold ${
                        item.urgencyBand === 'Immediate'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : item.urgencyBand === 'High'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      Urgency: {item.urgencyBand}
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 font-bold text-blue-800 border border-blue-200">
                      Score: {item.priorityScore} / 100
                    </span>
                  </div>
                </div>

                {/* Explanation Text */}
                <div className="mt-2.5 text-[11px] text-slate-800 font-sans leading-relaxed">
                  <strong>Priority Reason:</strong> {item.explanationText}
                </div>

                {/* Factor Contribution Breakdown */}
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                  <div className="rounded border border-slate-100 bg-slate-50 p-2">
                    <div className="text-slate-400">Finding Severity</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {item.scoringFactors?.findingSeverity?.score || 0} pts
                    </div>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 p-2">
                    <div className="text-slate-400">Contradictions</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {item.scoringFactors?.contradictionImpact?.score || 0} pts
                    </div>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 p-2">
                    <div className="text-slate-400">OCR Uncertainty</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {item.scoringFactors?.extractionUncertainty?.score || 0} pts
                    </div>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 p-2">
                    <div className="text-slate-400">Deadline Proximity</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {item.scoringFactors?.deadlineProximity?.score || 0} pts
                    </div>
                  </div>
                </div>

                {/* Reviewer Assignment Context */}
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500 font-mono">
                  <span>
                    Fair Assigned Reviewer:{' '}
                    <strong className="text-slate-800">{item.assignedReviewerName || 'Unassigned'}</strong> (
                    active queue load: {item.reviewerWorkload})
                  </span>
                  <span className="text-blue-700 font-semibold flex items-center gap-0.5">
                    Click to Open Dossier <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
