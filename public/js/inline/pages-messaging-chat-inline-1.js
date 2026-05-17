(function(){
  /* ── Helpers ── */
  function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
  function fmtTime(iso){return new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
  function fmtDate(iso){return new Date(iso).toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});}
  function initFor(id){return String(id||'?').slice(0,2).toUpperCase();}

  /* ── Render messages ── */
  function renderMessages(data,fromId,toId){
    const box=document.getElementById('messages');
    box.innerHTML='';
    if(!data||!data.length){
      box.innerHTML='<div class="chat-empty"><i class="fa-regular fa-comment-slash"></i><p>No messages yet in this conversation</p></div>';
      return;
    }
    let lastDate='';
    data.forEach(m=>{
      // Support current API shape and legacy message fields.
      const sender = m.fromId || m.sender;
      const content = m.text || m.content;
      const createdAt = m.createdAt || m.timestamp || new Date().toISOString();
      
      const mDate=fmtDate(createdAt);
      if(mDate!==lastDate){
        const sep=document.createElement('div');sep.className='date-sep';sep.innerHTML=`<span>${mDate}</span>`;box.appendChild(sep);
        lastDate=mDate;
      }
      const isMe=String(sender)===fromId;
      const row=document.createElement('div');
      row.className='msg-row '+(isMe?'mine':'theirs');
      const meta=fmtTime(createdAt)+(m.read==0&&!isMe?' · <span class="unread-mark">unread</span>':'');
      if(!isMe){
        row.innerHTML=`<div class="msg-av-sm">${initFor(sender)}</div><div><div class="bubble">${escHtml(content||'')}</div><div class="bubble-meta">${meta}</div></div>`;
      }else{
        row.innerHTML=`<div><div class="bubble">${escHtml(content||'')}</div><div class="bubble-meta">${meta}</div></div>`;
      }
      box.appendChild(row);
    });
    box.scrollTop=box.scrollHeight;
  }

  /* ── Load conversation ── */
  async function loadConversation(a,b){
    document.getElementById('chatHeadAv').textContent=initFor(b);
    document.getElementById('chatHeadName').textContent='User '+b;
    document.getElementById('chatHeadSub').textContent='Conversation with '+b;
    document.getElementById('sendBtn').disabled=false;
    
    try{
      // Try API first
      const r=await fetch('/api/messages/conversation/'+encodeURIComponent(a)+'/'+encodeURIComponent(b));
      if(r.ok){
        const data=await r.json();
        renderMessages(data,String(a),String(b));
        return;
      }
    }catch(e){
      console.error('Failed to load conversation:', e);
    }
    
    document.getElementById('messages').innerHTML='<div class="chat-empty"><i class="fa-solid fa-triangle-exclamation" style="color:#dc2626"></i><p>Error loading messages</p></div>';
  }

  document.getElementById('loadConversation').addEventListener('click',function(){
    const a=document.getElementById('fromId').value.trim();
    const b=document.getElementById('toId').value.trim();
    if(!a||!b){if (window.SpopeerToast) window.SpopeerToast.warning('Enter both From and To user IDs');return;}
    loadConversation(a,b);
  });

  document.getElementById('refreshBtn').addEventListener('click',function(){
    const a=document.getElementById('fromId').value.trim();
    const b=document.getElementById('toId').value.trim();
    if(a&&b)loadConversation(a,b);
  });

  /* ── Send message ── */
  async function sendMessage(){
    const fromId=document.getElementById('fromId').value.trim();
    const toId=document.getElementById('toId').value.trim();
    const text=document.getElementById('messageText').value.trim();
    if(!fromId||!toId||!text){if (window.SpopeerToast) window.SpopeerToast.warning('Fill From ID, To ID, and message');return;}
    
    try{
      const r=await fetch('/api/messages/send',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({toId,text})});
      if(r.ok){
        document.getElementById('messageText').value='';
        document.getElementById('sendBtn').disabled=true;
        loadConversation(fromId,toId);
        return;
      }
    }catch(e){
      console.error('Failed to send message:', e);
    }
    
    if (window.SpopeerToast) window.SpopeerToast.error('Error sending message');
  }

  document.getElementById('sendBtn').addEventListener('click',sendMessage);
  document.getElementById('messageText').addEventListener('keydown',function(e){
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}
  });
  document.getElementById('messageText').addEventListener('input',function(){
    document.getElementById('sendBtn').disabled=!this.value.trim()||!document.getElementById('fromId').value.trim()||!document.getElementById('toId').value.trim();
    this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';
  });
  ['fromId','toId'].forEach(id=>{
    document.getElementById(id).addEventListener('keydown',function(e){
      if(e.key==='Enter'){const a=document.getElementById('fromId').value.trim();const b=document.getElementById('toId').value.trim();if(a&&b)loadConversation(a,b);}
    });
  });

  /* ── Socket.io realtime (preserved from original) ── */
  if(window.io){
    try{
      const socket=io();
      document.getElementById('loadConversation').addEventListener('click',function(){
        const a=document.getElementById('fromId').value.trim();
        if(a)socket.emit('register',a);
      });
      socket.on('new_message',function(msg){
        const fromId=document.getElementById('fromId').value.trim();
        const toId=document.getElementById('toId').value.trim();
        if((String(msg.fromId)===fromId&&String(msg.toId)===toId)||(String(msg.fromId)===toId&&String(msg.toId)===fromId)){
          const box=document.getElementById('messages');
          const row=document.createElement('div');
          const isMe=String(msg.fromId)===fromId;
          row.className='msg-row '+(isMe?'mine':'theirs');
          const time=fmtTime(msg.createdAt);
          if(!isMe){row.innerHTML=`<div class="msg-av-sm">${initFor(msg.fromId)}</div><div><div class="bubble">${escHtml(msg.text||'')}</div><div class="bubble-meta">${time}</div></div>`;}
          else{row.innerHTML=`<div><div class="bubble">${escHtml(msg.text||'')}</div><div class="bubble-meta">${time}</div></div>`;}
          box.appendChild(row);
          box.scrollTop=box.scrollHeight;
        }
      });
    }catch(e){ /* ignore realtime socket init errors */ }
  }
})();
