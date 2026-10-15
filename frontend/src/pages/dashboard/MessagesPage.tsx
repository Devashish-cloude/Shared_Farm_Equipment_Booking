import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockStore } from '../../services/mockStore';
import { Conversation, ChatMessage } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  MessageSquare,
  Send,
  User,
  Paperclip,
  CheckCheck,
  Search,
  Phone
} from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(mockStore.getConversations());
  const [activeConvId, setActiveConvId] = useState<string>(conversations[0]?.id || '');
  const [messageText, setMessageText] = useState('');

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConvId ? mockStore.getMessages(activeConvId) : [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConvId) return;

    mockStore.sendMessage(activeConvId, messageText.trim());
    setMessageText('');
    setConversations(mockStore.getConversations());
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#E2E7DE]">
        <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
          Farmer Messages
        </h1>
        <p className="text-xs text-[#526058] mt-1">
          Coordinate machinery pickups, operator arrival, and field readiness directly with equipment owners &amp; renters
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-[#E2E7DE] shadow-sm overflow-hidden h-[620px] grid grid-cols-1 md:grid-cols-12">
        {/* Left Column: Conversations List */}
        <div className="md:col-span-4 border-r border-[#E2E7DE] flex flex-col h-full bg-[#F7F8F2]/40">
          <div className="p-3.5 border-b border-[#E2E7DE]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#7C8C83] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-white rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-1 focus:ring-[#164B35]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E2E7DE]/60">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors ${
                    isActive ? 'bg-white shadow-xs border-l-4 border-l-[#164B35]' : 'hover:bg-white/60'
                  }`}
                >
                  <img
                    src={conv.participantAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80'}
                    alt={conv.participantName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-[#CBD5C7]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#25312A] truncate">
                        {conv.participantName}
                      </h4>
                      <span className="text-[10px] text-[#7C8C83]">{conv.lastMessageTimestamp}</span>
                    </div>
                    {conv.equipmentTitle && (
                      <span className="text-[10px] font-semibold text-[#347653] block truncate">
                        {conv.equipmentTitle}
                      </span>
                    )}
                    <p className="text-[11px] text-[#526058] truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[#E2E7DE] flex items-center justify-between bg-[#F7F8F2]/60">
                <div className="flex items-center gap-3">
                  <img
                    src={activeConv.participantAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80'}
                    alt={activeConv.participantName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-[#B8D96B]"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-[#25312A] font-heading">
                      {activeConv.participantName}
                    </h3>
                    <p className="text-[10px] text-[#526058]">
                      Subject: <strong>{activeConv.equipmentTitle}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Verified Farmer Chat
                  </span>
                </div>
              </div>

              {/* Chat Messages scroll area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F8F2]/30">
                {messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl text-xs space-y-1 shadow-xs ${
                          isMe
                            ? 'bg-[#164B35] text-white rounded-br-xs'
                            : 'bg-white text-[#25312A] border border-[#E2E7DE] rounded-bl-xs'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.message}</p>
                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] ${
                            isMe ? 'text-[#DCE8E2]' : 'text-[#7C8C83]'
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {isMe && <CheckCheck className="w-3 h-3 text-[#B8D96B]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E2E7DE] flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message (e.g. Can we hook the trailer at 7 AM?)..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
                />
                <Button type="submit" variant="primary" size="sm" className="rounded-xl px-4">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#7C8C83]">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
