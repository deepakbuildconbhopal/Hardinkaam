import React, { useState, useEffect } from 'react';
import { KaamDostFloatingButton } from './KaamDostFloatingButton';
import { KaamDostChatWindow } from './KaamDostChatWindow';
import { ChatMessage, AssistantLanguage } from './types';
import { getInitialWelcomeMessage } from './assistantLogic';
import { Service, Category, UserRole, ServiceMan, Booking } from '../../types';

interface KaamDostAssistantProps {
  onSelectTab: (tab: string) => void;
  onBookService: (service: Service) => void;
  onOpenAuth: (role?: UserRole) => void;
  onOpenHelp: () => void;
  services: Service[];
  categories: Category[];
  serviceMen?: ServiceMan[];
  bookings?: Booking[];
  isLoggedIn: boolean;
  userName?: string;
  userProfile?: any;
  userId?: string;
  onRegisterCustomer?: (data: any) => Promise<any>;
}

const STORAGE_LANG_KEY = 'hardinkaam_kaamdost_lang';
const STORAGE_HISTORY_KEY = 'hardinkaam_kaamdost_history';

export const KaamDostAssistant: React.FC<KaamDostAssistantProps> = ({
  onSelectTab,
  onBookService,
  onOpenAuth,
  onOpenHelp,
  services,
  categories,
  serviceMen,
  bookings = [],
  isLoggedIn,
  userName,
  userProfile,
  userId,
  onRegisterCustomer,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Default language is Hindi ('hi')
  const [lang, setLang] = useState<AssistantLanguage>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_LANG_KEY);
      if (stored === 'hi' || stored === 'hinglish' || stored === 'en') {
        return stored;
      }
    } catch (e) {
      console.warn('KaamDost lang load notice:', e);
    }
    return 'hi';
  });

  // Conversation messages state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('KaamDost history load notice:', e);
    }
    return [getInitialWelcomeMessage('hi', userName, isLoggedIn, bookings, userProfile?.phone)];
  });

  // Re-sync initial welcome message when user logs in/out or bookings change if only 1 message exists
  useEffect(() => {
    if (messages.length <= 1) {
      setMessages([getInitialWelcomeMessage(lang, userName, isLoggedIn, bookings, userProfile?.phone)]);
    }
  }, [isLoggedIn, userName, userProfile, bookings, lang]);

  // Save language preference
  const handleLanguageChange = (newLang: AssistantLanguage) => {
    setLang(newLang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, newLang);
    } catch (e) {
      console.warn('KaamDost lang save notice:', e);
    }

    // If conversation only has the initial welcome message, refresh it to the new language
    if (messages.length === 1 && messages[0].id === 'welcome_msg') {
      setMessages([getInitialWelcomeMessage(newLang, userName, isLoggedIn, bookings, userProfile?.phone)]);
    }
  };

  // Sync messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('KaamDost history save notice:', e);
    }
  }, [messages]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {/* Floating launcher button */}
      <KaamDostFloatingButton
        isOpen={isOpen}
        onToggle={handleToggle}
        unreadCount={unreadCount}
        lang={lang}
      />

      {/* Interactive Chat Window / Drawer */}
      <KaamDostChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        services={services}
        categories={categories}
        serviceMen={serviceMen}
        bookings={bookings}
        isLoggedIn={isLoggedIn}
        userName={userName}
        userProfile={userProfile}
        userId={userId}
        onRegisterCustomer={onRegisterCustomer}
        onNavigateTab={(tab) => {
          onSelectTab(tab);
          if (window.innerWidth < 640) {
            setIsOpen(false);
          }
        }}
        onBookService={(srv) => {
          onBookService(srv);
          setIsOpen(false);
        }}
        onOpenAuth={(role) => {
          onOpenAuth(role);
          setIsOpen(false);
        }}
        onOpenHelp={() => {
          onOpenHelp();
          setIsOpen(false);
        }}
        messages={messages}
        setMessages={setMessages}
      />
    </>
  );
};
