import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from '../utils/socket.js';
import { API_BASE, getAuthHeaders } from '../utils/api.js';

const OrderChat = ({ orderId, onClose }) => {
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('kisanmitr_user')) || {};
    } catch (error) {
      return {};
    }
  }, []);

  const isDemo = currentUser.demo === true;
  const socket = useMemo(() => (isDemo ? null : getSocket()), [isDemo]);

  const fetchChat = async () => {
    const response = await fetch(`${API_BASE}/api/chats/order/${orderId}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || 'Unable to load chat');
      return;
    }
    setRoom(data.room);
    setMessages(data.messages || []);
  };

  useEffect(() => {
    if (isDemo) {
      setRoom({ _id: `demo-room-${orderId}`, isGroup: false, isDisabled: false });
      setMessages([
        {
          _id: `demo-message-${orderId}-1`,
          senderId: 'demo-farmer',
          senderRole: 'farmer',
          senderName: 'Demo Farmer',
          content: 'Thanks for your order. I can prepare this produce for pickup or delivery.',
          createdAt: new Date().toISOString(),
          readBy: []
        },
        {
          _id: `demo-message-${orderId}-2`,
          senderId: 'demo-buyer',
          senderRole: 'buyer',
          senderName: 'Demo Buyer',
          content: 'Great, please confirm when it is ready.',
          createdAt: new Date().toISOString(),
          readBy: []
        }
      ]);
      return undefined;
    }

    fetchChat();
    socket.emit('join_order', { orderId });

    socket.on('new_message', (message) => {
      if (message.orderId === orderId) {
        setMessages((prev) => [...prev, message]);
        if (message.senderId !== currentUser.id) {
          socket.emit('mark_read', { orderId, messageId: message._id });
        }
      }
    });

    return () => {
      socket.off('new_message');
    };
  }, [orderId, room?._id, isDemo]);

  useEffect(() => {
    if (!socket) return;
    messages.forEach((msg) => {
      if (msg.senderId !== currentUser.id && !msg.readBy?.includes(currentUser.id)) {
        socket.emit('mark_read', { orderId, messageId: msg._id });
      }
    });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || room?.isDisabled) return;
    if (isDemo) {
      setMessages((previous) => [...previous, {
        _id: `demo-message-${Date.now()}`,
        senderId: currentUser.id,
        senderRole: currentUser.role,
        senderName: currentUser.name,
        content: input.trim(),
        createdAt: new Date().toISOString(),
        readBy: [currentUser.id]
      }]);
      setInput('');
      return;
    }
    socket.emit('send_message', { orderId, content: input.trim() });
    setInput('');
  };

  const reportMessage = async (messageId) => {
    if (isDemo) return;
    await fetch(`${API_BASE}/api/chats/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ messageId })
    });
  };

  if (!room) {
    return (
      <div className="chat-modal">
        <div className="chat-panel">
          <p>{error || 'Loading...'}</p>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-modal">
      <div className="chat-panel">
        <div className="chat-header">
          <div>
            <strong>Order Chat</strong>
            {room.isGroup && <span className="badge" style={{ marginLeft: '0.5rem' }}>Group</span>}
            {room.isDisabled && <span className="badge" style={{ marginLeft: '0.5rem' }}>Disabled</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg._id} className={`chat-bubble ${msg.senderRole === 'buyer' ? 'user' : 'assistant'}`}>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                {msg.senderName || msg.senderRole || 'System'} • {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
              <div>{msg.content}</div>
              {msg.type !== 'system' && msg.readBy?.length > 1 && (
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Read</div>
              )}
              {msg.type !== 'system' && (
                <button className="btn btn-secondary" onClick={() => reportMessage(msg._id)} style={{ marginTop: '0.25rem' }}>
                  Report
                </button>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {error && <p className="form-error">{error}</p>}

        {!room.isDisabled && (
          <div className="chat-input">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your message"
              onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
            />
            <button className="btn btn-primary" onClick={sendMessage}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderChat;
