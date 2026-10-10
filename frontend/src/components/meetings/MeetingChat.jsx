import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { chatService } from '../../services/chatService';
import { formatTimeOnly, getInitials } from '../../utils/formatters';

const MeetingChat = ({
  isOpen,
  onClose,
  meetingId,
  currentUser,
}) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch previous messages on load
  useEffect(() => {
    if (!meetingId) return;

    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await chatService.getMeetingMessages(meetingId);
        if (data.success) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('[Load Chat Error]', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [meetingId]);

  // Listen for socket real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('chat:message', handleNewMessage);

    return () => {
      socket.off('chat:message', handleNewMessage);
    };
  }, [socket]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const msgData = {
      meetingId,
      text: inputText.trim(),
      user: {
        id: currentUser?.id || currentUser?._id,
        name: currentUser?.name || 'Attendee',
        avatar: currentUser?.avatar || '',
      },
    };

    // Emit via socket
    if (socket) {
      socket.emit('chat:send', msgData);
    } else {
      // REST fallback
      chatService.sendMeetingMessage(meetingId, { text: inputText.trim() });
    }

    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 sm:w-96 h-full bg-[#111827] border-l border-slate-800 flex flex-col shrink-0 z-20">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Meeting Chat</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {loading && (
          <div className="text-center text-xs text-slate-500 py-4">
            Loading chat messages...
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="text-center text-xs text-slate-500 py-8">
            No messages yet. Say hello to everyone!
          </div>
        )}

        {messages.map((m, idx) => {
          if (m.type === 'system') {
            return (
              <div key={m._id || idx} className="text-center my-2">
                <span className="text-[11px] bg-slate-800/80 text-slate-400 px-3 py-1 rounded-full border border-slate-700/50">
                  {m.text}
                </span>
              </div>
            );
          }

          const isSelf =
            m.sender?._id === currentUser?.id ||
            m.sender?._id === currentUser?._id ||
            m.sender?.id === currentUser?.id;

          return (
            <div
              key={m._id || idx}
              className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-400">
                  {isSelf ? 'You' : m.sender?.name || 'Attendee'}
                </span>
                <span>&bull;</span>
                <span>{formatTimeOnly(m.createdAt)}</span>
              </div>

              <div
                className={`px-3.5 py-2.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                  isSelf
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700/60'
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message to participants..."
          className="flex-1 bg-[#151d30] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

export default MeetingChat;
