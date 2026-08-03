import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import './SmsTemplate.css';

export default function SmsTemplate() {
  const [chatTitle, setChatTitle] = useState('FarEye');
  const [chatSubtitle, setChatSubtitle] = useState('');
  const [chatAvatar, setChatAvatar] = useState('F');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'FarEye',
      content: 'TP ID 1-3-1781993 Vehicle no GJ45667777 has been penalised for Rs 10000 against breach of undue stoppages in red zones or suspected areas on 2026-01-20 13:11:41 FarEye',
      timestamp: '1:11 pm',
      showAvatar: false,
    },
    {
      id: 2,
      sender: 'FarEye',
      content: 'Penalty of Rs. 5000 is applied for Unavailabe Labour persons unavailable 5 on 2026-01-20 12:33:45 godown DAKOR FarEye',
      timestamp: '12:33 pm',
      showAvatar: true,
    }
  ]);

  const handleUpdate = (id, field, value) => {
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const addMessage = () => {
    setMessages([...messages, {
      id: Date.now(),
      sender: 'FarEye',
      content: 'New message content here...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      showAvatar: true,
    }]);
  };

  const deleteMessage = (id) => {
    setMessages(msgs => msgs.filter(m => m.id !== id));
  };

  // Helper to format text manually marked with [link]...[/link] or automatically matched
  const formatContent = (text) => {
    // We split by our custom [link]...[/link] tags
    const parts = text.split(/(\[link\].*?\[\/link\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[link]') && part.endsWith('[/link]')) {
        const innerText = part.slice(6, -7);
        return <span key={i} style={{ color: '#0066cc', textDecoration: 'underline' }}>{innerText}</span>;
      }
      // Fallback for the old auto-regex just in case they didn't manually select it
      const subParts = part.split(/(TP ID \d+-\d+-\d+|DC No\. \d+)/g);
      return subParts.map((subPart, j) => {
        if (subPart.match(/TP ID \d+-\d+-\d+|DC No\. \d+/)) {
          return <span key={`${i}-${j}`} style={{ color: '#0066cc', textDecoration: 'underline' }}>{subPart}</span>;
        }
        return subPart;
      });
    });
  };

  const handleMakeLink = (msgId) => {
    const textarea = document.getElementById(`textarea-${msgId}`);
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    if (start === end) {
      alert("Please select some text first with your cursor!");
      return; 
    }

    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + `[link]${selectedText}[/link]` + text.substring(end);
    
    handleUpdate(msgId, 'content', newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 6, start + 6 + selectedText.length);
    }, 0);
  };

  const mockupRef = useRef(null);

  const takeScreenshot = async () => {
    if (!mockupRef.current) return;
    try {
      const canvas = await html2canvas(mockupRef.current, {
        scale: 2, // High resolution for PPT
        backgroundColor: null,
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Mobile-Mockup-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to take screenshot", err);
      alert("Failed to take screenshot. Please try again.");
    }
  };

  return (
    <div className="sms-template-wrapper">
      <div className="app-container">
        <div className="editor-panel">
          <div className="header-title">
            <h2>SMS Template Editor</h2>
            <span className="badge">Real-time</span>
          </div>
          <p className="subtitle">Customize mobile SMS notifications</p>

          <div className="edit-card" style={{marginBottom: '1.5rem'}}>
            <div className="form-row">
              <div className="form-group">
                <label>Chat Title</label>
                <input type="text" value={chatTitle} onChange={(e) => setChatTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Status / Subtitle</label>
                <input type="text" value={chatSubtitle} onChange={(e) => setChatSubtitle(e.target.value)} placeholder="e.g. 123 Subscribers (optional)" />
              </div>
              <div className="form-group" style={{maxWidth: '80px'}}>
                <label>Avatar</label>
                <input type="text" value={chatAvatar} onChange={(e) => setChatAvatar(e.target.value)} maxLength={2} style={{textAlign: 'center'}} />
              </div>
            </div>
          </div>
          
          <div className="message-list-editor">
            {messages.map((msg, index) => (
              <div key={msg.id} className="edit-card">
                <div className="edit-card-header">
                  <h3>Message {index + 1}</h3>
                  <button className="delete-btn" onClick={() => deleteMessage(msg.id)}>Delete</button>
                </div>
                
                <div className="form-group">
                  <label>Sender Name</label>
                  <input 
                    type="text" 
                    value={msg.sender} 
                    onChange={(e) => handleUpdate(msg.id, 'sender', e.target.value)}
                    placeholder="e.g. VM-FarEye-S"
                  />
                </div>

                <div className="form-group">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <label>Content</label>
                    <button 
                      type="button"
                      onClick={() => handleMakeLink(msg.id)}
                      style={{
                        background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px',
                        padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', color: '#0066cc', textDecoration: 'underline'
                      }}
                      title="Select text in the box below and click this to make it a blue link"
                    >
                      Make Selected Text Blue Link
                    </button>
                  </div>
                  <textarea 
                    id={`textarea-${msg.id}`}
                    value={msg.content} 
                    onChange={(e) => handleUpdate(msg.id, 'content', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Timestamp</label>
                    <input 
                      type="text" 
                      value={msg.timestamp} 
                      onChange={(e) => handleUpdate(msg.id, 'timestamp', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        checked={msg.showAvatar} 
                        onChange={(e) => handleUpdate(msg.id, 'showAvatar', e.target.checked)}
                      />
                      Show Avatar Icon
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button className="add-btn" onClick={addMessage}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Message
            </button>
          </div>
        </div>

        <div className="preview-panel" style={{position: 'relative'}}>
          <button 
            onClick={takeScreenshot}
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: '#0066cc', color: 'white', border: 'none', borderRadius: '8px',
              padding: '10px 16px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download for PPT
          </button>
          <div className="mobile-mockup" ref={mockupRef}>
            <div className="mobile-header">
              <div className="notch"></div>
              <div className="header-info">
                <span>9:41</span>
                <div className="header-icons">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect><line x1="22" y1="11" x2="22" y2="13"></line></svg>
                </div>
              </div>
              <div className="chat-header">
                <div className="back-btn">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </div>
                <div className="chat-title">
                  <div className="avatar-small">{chatAvatar}</div>
                  <div className="chat-title-text">
                    <span>{chatTitle}</span>
                    {chatSubtitle && <span className="status">{chatSubtitle}</span>}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mobile-body">
              <div className="date-divider">Today</div>
              {messages.map((msg) => (
                <div key={msg.id} className="message-row">
                  {msg.showAvatar && (
                    <div className="message-avatar">
                       <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                    </div>
                  )}
                  <div className={`message-bubble ${!msg.showAvatar ? 'no-avatar' : ''}`}>
                    {!msg.showAvatar && <div className="message-sender">{msg.sender}</div>}
                    <div className="message-content">{formatContent(msg.content)}</div>
                    <div className="message-time">{msg.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mobile-footer">
              <div className="input-bar">
                <div className="input-plus">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <div className="input-field">Text Message</div>
                <div className="input-mic">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
