import { Service, Category } from '../types';
import { INITIAL_SERVICES, INITIAL_CATEGORIES } from '../firebase/seed';
import { GEMINI_CANONICAL_MODEL } from '../config/aiConfig';

export interface AssistantAnalysisResult {
  diagnosisSummary: string;
  category: string;
  categoryId: string;
  subcategory: string;
  problemType: string;
  urgency: 'immediate' | 'within_2_days' | 'this_week' | 'flexible';
  serviceRequirement: string;
  matchedService?: Service;
  suggestedQuestions: string[];
  isLargeCustomProject: boolean; // e.g. painting, renovation, waterproofing, civil
}

/**
 * AI Service Assistant Processor using server-side Gemini 3.8 Flash (/api/ai/diagnose-service)
 * Processes text, voice transcript, photo, or video to diagnose home service issues
 * and connect to real HARDINKAAM database services with real prices (no fabrication).
 */
export async function analyzeCustomerServiceInput(
  input: {
    text?: string;
    imageBase64?: string;
    mimeType?: string;
    audioTranscript?: string;
  },
  availableServices: Service[] = INITIAL_SERVICES,
  availableCategories: Category[] = INITIAL_CATEGORIES
): Promise<AssistantAnalysisResult> {
  try {
    const res = await fetch('/api/ai/diagnose-service', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        availableServices: availableServices.slice(0, 30),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        const parsed = data.data;
        const matched = availableServices.find((s) => s.id === parsed.matchedServiceId) || availableServices[0];
        return {
          diagnosisSummary: parsed.diagnosisSummary || 'Service issue analyzed successfully.',
          category: parsed.categoryName || 'Home Service',
          categoryId: parsed.categoryId || 'cat_electrician',
          subcategory: parsed.subcategory || 'General Repair',
          problemType: parsed.problemType || 'Maintenance',
          urgency: parsed.urgency || 'within_2_days',
          serviceRequirement: parsed.serviceRequirement || parsed.diagnosisSummary,
          matchedService: matched,
          suggestedQuestions: parsed.suggestedQuestions || ['Are there any unusual sounds?', 'When was the last servicing?'],
          isLargeCustomProject: !!parsed.isLargeCustomProject,
        };
      }
    }
  } catch (err) {
    console.warn('[AiServiceAssistant] Server diagnosis request notice (using local rule synthesis):', err);
  }

  // Fallback Rule-Based Analysis
  const txt = (input.text || input.audioTranscript || '').toLowerCase();
  let categoryId = 'cat_electrician';
  let categoryName = 'Electrician & Wiring';
  let isLarge = false;

  if (txt.includes('ac') || txt.includes('cool') || txt.includes('fridge')) {
    categoryId = 'cat_ac_appliance';
    categoryName = 'AC & Appliance';
  } else if (txt.includes('plumb') || txt.includes('pipe') || txt.includes('leak') || txt.includes('tap')) {
    categoryId = 'cat_plumber';
    categoryName = 'Plumbing & Sanitary';
  } else if (txt.includes('paint') || txt.includes('rangai') || txt.includes('putty')) {
    categoryId = 'cat_painting';
    categoryName = 'Painting & Waterproofing';
    isLarge = true;
  } else if (txt.includes('renovat') || txt.includes('civil') || txt.includes('modular') || txt.includes('interior')) {
    categoryId = 'cat_renovation';
    categoryName = 'Renovation & Civil Work';
    isLarge = true;
  }

  const matched = availableServices.find((s) => s.categoryId === categoryId) || availableServices[0];

  return {
    diagnosisSummary: `Issue analyzed: "${input.text || 'Home Service Requirement'}". Identified as ${categoryName}.`,
    category: categoryName,
    categoryId,
    subcategory: 'Standard Inspection & Repair',
    problemType: 'Functional Issue',
    urgency: 'within_2_days',
    serviceRequirement: input.text || 'Standard service requirement',
    matchedService: matched,
    suggestedQuestions: [
      'What is the exact brand or model?',
      'Is the issue intermittent or continuous?',
      'Preferred time slot for technician visit?',
    ],
    isLargeCustomProject: isLarge,
  };
}
