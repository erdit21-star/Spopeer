ProfileSyncService.init();

    let currentUserId = JSON.parse(localStorage.getItem('spopeer_user') || '{}').id;
    let currentConversation = null;

    // Load inquiries/conversations on page load
    async function loadConversations() {
      try {
        const [received, sent] = await Promise.all([
          fetch('/api/marketplace/inquiries/received', {
            credentials: 'include'
          }).then(r => r.json()),
          fetch('/api/marketplace/inquiries/sent', {
            credentials: 'include'
          }).then(r => r.json())
        ]);

        const all = [...(received || []), ...(sent || [])].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        const list = document.getElementById('conversationsList');
        list.innerHTML = '';

        if (all.length === 0) {
          list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted); font-size: 13px;">No messages yet</div>';
          return;
        }

        for (const inquiry of all) {
          // Fetch listing and user info
          const [listing, otherUser] = await Promise.all([
            fetch(`/api/marketplace/listings/${inquiry.listing_id}`).then(r => r.json()),
            fetch(`/api/profiles/${inquiry.buyer_id === currentUserId ? inquiry.seller_id : inquiry.buyer_id}`).then(r => r.json())
          ]);

          // Skip if data not available
          if (!listing || !otherUser) continue;

          const otherName = otherUser.firstName ? `${otherUser.firstName} ${otherUser.lastName}` : otherUser.email;
          const initials = otherName.split(' ').map(n => n[0]).join('').toUpperCase();
          const isBuyer = inquiry.buyer_id === currentUserId;

          const item = document.createElement('div');
          item.className = 'conversation-item';
          item.innerHTML = `
            <div class="conversation-avatar">${initials}</div>
            <div class="conversation-info">
              <div class="conversation-name">${otherName} ${isBuyer ? '<span style="font-size: 10px; color: var(--muted);">(seller)</span>' : '<span style="font-size: 10px; color: var(--muted);">(buyer)</span>'}</div>
              <div class="conversation-listing">${listing.title}</div>
            </div>
            ${inquiry.status === 'open' ? '<div class="conversation-unread"></div>' : ''}
          `;

          item.onclick = () => openConversation(inquiry, listing, otherUser, isBuyer);
          list.appendChild(item);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }

    async function openConversation(inquiry, listing, otherUser, isBuyer) {
      currentConversation = inquiry;
      const otherName = otherUser.firstName ? `${otherUser.firstName} ${otherUser.lastName}` : otherUser.email;

      // Fetch messages for this conversation
      const messages = await fetch(`/api/messages/conversation/${inquiry.seller_id}/${inquiry.buyer_id}`, {
        credentials: 'include'
      }).then(r => r.json());

      // Render conversation
      const panel = document.getElementById('conversationPanel');
      panel.innerHTML = `
        <div class="conversation-header">
          <div class="conversation-header-left">
            <div>
              <div class="conversation-title">${otherName}</div>
              <div class="conversation-listing-title">${listing.title}</div>
            </div>
          </div>
          <div style="display: flex; gap: 12px;">
            <select id="statusSelect" style="padding: 8px 12px; border: 1.5px solid var(--border); border-radius: var(--r); font-size: 12px; cursor: pointer;" ${isBuyer ? 'disabled' : ''}>
              <option value="open" ${inquiry.status === 'open' ? 'selected' : ''}>Open</option>
              <option value="accepted" ${inquiry.status === 'accepted' ? 'selected' : ''}>Accepted</option>
              <option value="declined" ${inquiry.status === 'declined' ? 'selected' : ''}>Declined</option>
              <option value="completed" ${inquiry.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>
        </div>
        <div class="messages-container" id="messagesContainer"></div>
        <div class="message-input-section">
          <div class="message-input-wrapper">
            <textarea class="message-input" id="messageInput" placeholder="Type a message..." rows="1"></textarea>
          </div>
          <button class="btn-send" id="sendBtn">Send</button>
        </div>
      `;

      // Render messages
      const container = document.getElementById('messagesContainer');
      if (messages.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--muted);">No messages yet. Be the first to message!</div>';
      } else {
        container.innerHTML = '';
        messages.forEach(msg => {
          const isSent = msg.fromId === currentUserId;
          const time = new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const msgEl = document.createElement('div');
          msgEl.className = `message ${isSent ? 'sent' : 'received'}`;
          msgEl.innerHTML = `
            <div>
              <div class="message-bubble">${msg.text}</div>
              <div class="message-time">${time}</div>
            </div>
          `;
          container.appendChild(msgEl);
        });
      }

      // Handle status change (seller only)
      if (!isBuyer) {
        document.getElementById('statusSelect').onchange = async (e) => {
          const newStatus = e.target.value;
          try {
            await fetch(`/api/marketplace/inquiries/${inquiry.id}/status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({ status: newStatus })
            });
            inquiry.status = newStatus;
          } catch (error) {
            console.error('Error updating status:', error);
          }
        };
      }

      // Send message
      document.getElementById('sendBtn').onclick = async () => {
        const text = document.getElementById('messageInput').value.trim();
        if (!text) return;

        try {
          const msg = await fetch('/api/messages/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              toId: isBuyer ? inquiry.seller_id : inquiry.buyer_id,
              text: text
            })
          }).then(r => r.json());

          document.getElementById('messageInput').value = '';

          // Add message to container
          const msgEl = document.createElement('div');
          msgEl.className = 'message sent';
          const time = new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          msgEl.innerHTML = `
            <div>
              <div class="message-bubble">${msg.text}</div>
              <div class="message-time">${time}</div>
            </div>
          `;
          container.appendChild(msgEl);
          container.scrollTop = container.scrollHeight;
        } catch (error) {
          console.error('Error sending message:', error);
          if (window.SpopeerToast) window.SpopeerToast.error('Failed to send message');
        }
      };

      // Auto-focus on input
      setTimeout(() => document.getElementById('messageInput')?.focus(), 100);
    }

    // Setup keyboard shortcut for send
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey && document.getElementById('sendBtn')) {
        document.getElementById('sendBtn').click();
      }
    });

    loadConversations();
