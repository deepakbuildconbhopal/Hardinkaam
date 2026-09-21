import React from 'react';
import { Booking } from '../../types';
import { MessageInterface } from '../common/MessageInterface';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const ChatModal: React.FC<Props> = ({ isOpen, onClose, booking }) => {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="max-w-lg w-full">
        <MessageInterface booking={booking} onClose={onClose} />
      </div>
    </div>
  );
};
