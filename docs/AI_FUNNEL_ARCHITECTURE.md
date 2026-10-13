# HARDINKAAM AI Funnel Architecture

## Overview
The AI Funnel Automation module is an intelligent lead-to-conversion engine integrated directly into the HARDINKAAM Admin Panel. It orchestrates marketing leads (`marketing_leads`), user accounts (`users`), and conversion events into automated, stage-based funnels.

## Firestore Collections
1. **`ai_funnels`**: Defines campaign funnels, target audience, district/city, and trade criteria.
2. **`ai_funnel_steps`**: Stores sequence stages and delay/action rules.
3. **`ai_funnel_runs`**: Tracks lead progression through funnel stages, attempt counts, and next actions.
4. **`ai_funnel_events`**: Audit trail of conversion events and stage transitions.

## Key Capabilities
- **Lead Scoring**: Deterministic and AI-assisted scoring (0-100) evaluating service fit, location, and interaction history.
- **Deduplication**: Automatic matching against existing user profiles and marketing leads to prevent duplicate outreach.
- **Outbound Safety**: `requiresHumanApproval = true` by default to ensure all AI-generated WhatsApp/SMS drafts are reviewed by an administrator before dispatch.
- **Multilingual Support**: Fully localized in Hindi, English, and Hinglish.
