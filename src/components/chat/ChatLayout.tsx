'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChatWindow } from './ChatWindow';
import { Conversation, Document, Message } from '@/types/database';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  FileText, 
  Menu, 
  X, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface ChatLayoutProps {
  activeConversationId?: string;
  initialMessages?: Message[];
}

export function ChatLayout({
  activeConversationId,
  initialMessages = [],
}: ChatLayoutProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [convsRes, docsRes] = await Promise.all([
        fetch('/api/conversations'),
        fetch('/api/documents?limit=50'),
      ]);

      const convsData = await convsRes.json();
      const docsData = await docsRes.json();

      if (convsData.success) {
        setConversations(convsData.data || []);
      }
      if (docsData.success) {
        setDocuments(docsData.data.documents || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewChat = async (docId?: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Conversation',
          documentId: docId || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        setConversations((prev) => [data.data, ...prev]);
        router.push(`/chat/${data.data.id}`);
      }
    } catch {
      // Ignored
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Delete this conversation?')) return;

    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          router.push('/chat');
        }
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 space-y-4 flex-shrink-0">
        <button
          onClick={() => handleCreateNewChat()}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
            Recent Chats
          </div>
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-3">No conversations yet</p>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConversationId === conv.id;
              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/60'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 group-hover:text-indigo-500" />
                    <span className="truncate">{conv.title}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Link>
              );
            })
          )}

          <div className="pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
            Library Documents
          </div>
          {documents.length === 0 ? (
            <Link
              href="/documents"
              className="text-xs text-indigo-500 px-2 py-2 block hover:underline"
            >
              + Upload documents
            </Link>
          ) : (
            documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleCreateNewChat(doc.id)}
                className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span className="truncate">{doc.original_filename}</span>
                </div>
                <span className="text-[10px] text-slate-400">Chat</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-2 sm:p-4 min-w-0 bg-slate-100/40 dark:bg-slate-950">
        <div className="md:hidden flex items-center justify-between pb-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex items-center space-x-1.5"
          >
            <Menu className="w-4 h-4" />
            <span>Chats & Docs</span>
          </button>
          <button
            onClick={() => handleCreateNewChat()}
            className="p-2 rounded-lg bg-indigo-600 text-white text-xs flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <ChatWindow
          conversationId={activeConversationId}
          initialMessages={initialMessages}
          documents={documents}
          onConversationCreated={(newId) => {
            router.push(`/chat/${newId}`);
            fetchInitialData();
          }}
        />
      </div>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-950 h-full p-4 flex flex-col z-10 border-r border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-sm">Conversations</span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setSidebarOpen(false);
                handleCreateNewChat();
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>

            <div className="flex-1 overflow-y-auto space-y-1">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className="block px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-900 truncate"
                >
                  {conv.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
