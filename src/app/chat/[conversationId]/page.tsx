'use client';

import { useState, useEffect } from 'react';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { Message } from '@/types/database';

export default function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversationMessages = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/conversations/${params.conversationId}`);
        const data = await res.json();
        if (data.success && data.data?.messages) {
          setMessages(data.data.messages);
        }
      } catch {
        // Ignored
      } finally {
        setLoading(false);
      }
    };

    fetchConversationMessages();
  }, [params.conversationId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
        Loading conversation...
      </div>
    );
  }

  return (
    <ChatLayout
      activeConversationId={params.conversationId}
      initialMessages={messages}
    />
  );
}
