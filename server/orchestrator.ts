import { db } from './db.js';
import {
  Project,
  LearnerModel,
  AdaptiveNextAction,
  DailyStudyPlan,
  StudyPlanItem,
  StudyPlanActionType
} from '../src/types.js';
import { LearnerIntelligenceEngine } from './learner-intelligence.js';

export class LearningOrchestrator {
  
  static generateDailyPlan(projectId: string, learnerId: string): DailyStudyPlan {
    const today = new Date().toISOString().split('T')[0];
    const planId = `${learnerId}_${projectId}_${today}`;
    
    // Check if we already have a plan for today
    // In our simple DB, let's just make an ad-hoc collection or regenerate it if not requested
    // Since we don't have db.dailyPlans, let's create it in db.ts, or just compute dynamically.
    // Let's compute it dynamically for now and return it.
    
    const dashboard = LearnerIntelligenceEngine.getDashboardData(learnerId, projectId);
    
    const items: StudyPlanItem[] = [];
    let priority = 1;

    // 1. Retention Risks (Spaced Repetition)
    for (const concept of dashboard.retentionRiskConcepts.slice(0, 2)) {
      items.push({
        id: `plan_item_${Date.now()}_${items.length}`,
        type: 'REVIEW_CONCEPT',
        conceptId: concept.conceptId,
        conceptName: concept.conceptName,
        reason: `Memory retention has dropped below optimal levels. Review now to reset the forgetting curve.`,
        estimatedMinutes: 10,
        completed: false,
        priority: priority++
      });
    }

    // 2. High Priority Next Actions
    for (const action of dashboard.recommendedActions.slice(0, 3)) {
      let type: StudyPlanActionType = 'PRACTICE_QUIZ';
      if (action.action === 'REVIEW_CONCEPT') type = 'REVIEW_PREREQUISITE';
      if (action.action === 'REVIEW_MISTAKE') type = 'REVIEW_MISTAKE';
      if (action.action === 'ASK_TUTOR') type = 'ASK_TUTOR';

      items.push({
        id: `plan_item_${Date.now()}_${items.length}`,
        type,
        conceptId: action.conceptId,
        conceptName: action.conceptName,
        reason: action.reason,
        estimatedMinutes: 15,
        completed: false,
        priority: priority++
      });
    }

    // 3. Weak Concepts (if we have room)
    if (items.length < 5) {
      const weakConcepts = dashboard.weakConcepts.slice(0, 5 - items.length);
      for (const concept of weakConcepts) {
        items.push({
          id: `plan_item_${Date.now()}_${items.length}`,
          type: 'PRACTICE_QUIZ',
          conceptId: concept.conceptId,
          conceptName: concept.conceptName,
          reason: `Your mastery is currently at ${Math.round(concept.mastery * 100)}%. Targeted practice will build confidence.`,
          estimatedMinutes: 10,
          completed: false,
          priority: priority++
        });
      }
    }

    const plan: DailyStudyPlan = {
      id: planId,
      projectId,
      learnerId,
      dateStr: today,
      items,
      createdAt: Date.now()
    };

    return plan;
  }
}
