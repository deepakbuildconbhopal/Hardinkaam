import { DynamicChatComponent } from './componentTypes';
import { ChatAttachment } from './attachmentTypes';

export * from './componentTypes';
export * from './attachmentTypes';

export type AssistantLanguage = 'hi' | 'hinglish' | 'en';

export interface ActionItem {
  id?: string;
  label: string;
  icon?: string;
  actionType:
    | 'navigate_tab'
    | 'book_service'
    | 'open_auth'
    | 'open_help'
    | 'open_call'
    | 'open_whatsapp'
    | 'send_query'
    | 'trigger_camera'
    | 'trigger_gallery'
    | 'trigger_video'
    | 'trigger_doc';
  payload?: any;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actions?: ActionItem[];
  suggestedChips?: string[];
  dynamicComponent?: DynamicChatComponent;
  attachments?: ChatAttachment[];
}

export interface QuickActionChip {
  id: string;
  label: string;
  query: string;
  icon: string;
}
