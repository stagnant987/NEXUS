import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../api/client';
import { Message, User } from '../types';
import { useAuthStore } from '../store/auth';

let socket: Socket | null = null;

export default function MessagesPage() {
  const { userId } = useParams<{ userId?: string }>();
  const { user: me, token } = useAuthStore();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery<Message[]>({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then(r => r.data)
  });

  const { data: chatUser } = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/users/${userId}`).then(r => r.data),
    enabled: !!userId
  });

  const { data: searchUsers = [] } = useQuery<User[]>({
    queryKey: ['search', search],
    queryFn: () => api.get(`/users/search?q=${search}`).then(r => r.data),
    enabled: search.length >= 2
  });

  useEffect(() => {
    if (!token) return;
    socket = io('http://localhost:3001', { auth: { token } });
    socket.on('new_message', (data: { senderId: string; content: string; messageId: string }) => {
      if (data.senderId === userId) {
        setMessages(m => [...m, {
          id: data.messageId,
          content: data.content,
          senderId: data.senderId,
          read: false,
          createdAt: new Date().toISOString(),
          sender: { id: data.senderId, username: '', displayName: 'Inconnu', avatar: '' }
        }]);
      }
    });
    socket.on('typing', (data: { senderId: string }) => {
      if (data.senderId === userId) setTyping(true);
    });
    socket.on('stop_typing', (data: { senderId: string }) => {
      if (data.senderId === userId) setTyping(false);
    });
    return () => { socket?.disconnect(); socket = null; };
  }, [token, userId]);

  useEffect(() => {
    if (!userId) return;
    api.get<Message[]>(`/messages/${userId}`).then(r => setMessages(r.data));
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userId) return;
    const { data } = await api.post<Message>(`/messages/${userId}`, { content: input });
    socket?.emit('send_message', { receiverId: userId, content: input, messageId: data.id });
    setMessages(m => [...m, data]);
    setInput('');
    socket?.emit('stop_typing', { receiverId: userId });
  };

  const handleTyping = (val: string) => {
    setInput(val);
    if (userId) socket?.emit('typing', { receiverId: userId });
  };

  const getOtherUser = (msg: Message) => {
    return msg.senderId === me?.id ? msg.receiver : msg.sender;
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar conversations */}
      <div className="w-80 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold mb-3">Messages</h2>
          <input
            className="input text-sm"
            placeholder="Nouvelle conversation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {search.length >= 2 ? (
            searchUsers.map(u => (
              <button
                key={u.id}
                onClick={() => { navigate(`/messages/${u.username}`); setSearch(''); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-nexus-600 flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
                  {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.displayName[0]}
                </div>
                <div>
                  <p className="font-semibold text-sm">{u.displayName}</p>
                  <p className="text-gray-500 text-xs">@{u.username}</p>
                </div>
              </button>
            ))
          ) : (
            conversations.map(msg => {
              const other = getOtherUser(msg);
              if (!other) return null;
              return (
                <button
                  key={msg.id}
                  onClick={() => navigate(`/messages/${other.username}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left ${userId === other.username ? 'bg-gray-800' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-nexus-600 flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
                    {other.avatar ? <img src={other.avatar} alt="" className="w-full h-full object-cover" /> : other.displayName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{other.displayName}</p>
                    <p className="text-gray-500 text-xs truncate">{msg.content}</p>
                  </div>
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(msg.createdAt), { locale: fr })}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      {userId ? (
        <div className="flex-1 flex flex-col">
          {chatUser && (
            <div className="p-4 border-b border-gray-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-nexus-600 flex items-center justify-center font-bold overflow-hidden">
                {chatUser.avatar ? <img src={chatUser.avatar} alt="" className="w-full h-full object-cover" /> : chatUser.displayName[0]}
              </div>
              <div>
                <p className="font-semibold">{chatUser.displayName}</p>
                <p className="text-gray-500 text-sm">@{chatUser.username}</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderId === me?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${msg.senderId === me?.id ? 'bg-nexus-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-100 rounded-bl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-sm text-gray-400 text-sm">
                  En train d'écrire...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-gray-800 flex gap-3">
            <input
              className="input"
              placeholder="Votre message..."
              value={input}
              onChange={e => handleTyping(e.target.value)}
            />
            <button type="submit" className="btn-primary px-5" disabled={!input.trim()}>
              ➤
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-gray-400 font-medium">Sélectionnez une conversation</p>
            <p className="text-gray-600 text-sm mt-1">Ou recherchez quelqu'un pour démarrer</p>
          </div>
        </div>
      )}
    </div>
  );
}
