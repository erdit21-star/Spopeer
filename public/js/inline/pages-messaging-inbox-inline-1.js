(function(){
  var messagingRuntime = (window.Spopeer && window.Spopeer.messaging && window.Spopeer.messaging.runtime) || {};
  var messagingUtils = (window.Spopeer && window.Spopeer.messaging && window.Spopeer.messaging.utils) || {};
  var messagingApi = (window.Spopeer && window.Spopeer.messaging && window.Spopeer.messaging.api) || {};
  var messagingState = (window.Spopeer && window.Spopeer.messaging && window.Spopeer.messaging.state) || {};
  var messagingUi = (window.Spopeer && window.Spopeer.messaging && window.Spopeer.messaging.ui) || {};
  var messagingSocket = (window.Spopeer && window.Spopeer.messaging && window.Spopeer.messaging.socket) || {};

  function normalizeUser(user) {
    if (typeof messagingRuntime.normalizeUser === 'function') return messagingRuntime.normalizeUser(user || {});
    return user || {};
  }

  function getCurrentUserFromStore() {
    if (typeof messagingRuntime.getCurrentUser === 'function') return messagingRuntime.getCurrentUser() || null;
    return null;
  }

  function listFromResponse(data) {
    if (typeof messagingRuntime.listFromResponse === 'function') return messagingRuntime.listFromResponse(data);
    return Array.isArray(data) ? data : [];
  }

  /* ── User hydration ── */
  var ud = getCurrentUserFromStore();

  var _loggedIn = (window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function') ? window.CurrentUserStore.isLoggedIn() : (localStorage.getItem('spopeer_loggedIn') === 'true');
  let currentConversation=null;
  let currentConversationId=null;
  let myInitials='??';
  let allConvs=[];
  let messagingEnabled=true;
  let typingTimer=null;
  let stopTypingTimer=null;
  let socket=null;
  let currentTypingUserId='';
  let openConversationSeq=0;
  let sendInFlight=false;
  let currentMessageList=[];
  let conversationHasMore=false;
  let conversationOldestAt='';
  let loadingOlder=false;
  let deleteMenuMessageId='';
  const CHAT_THEME_STORAGE_KEY='spopeer_chat_theme';
  const BACKEND_DISABLED_MSG='Messaging will be available after backend activation.';

  /* ── Helper: Escape HTML ── */
  function escHtml(t){
    if (typeof messagingUtils.escHtml === 'function') return messagingUtils.escHtml(t);
    const d=document.createElement('div');d.textContent=t;return d.innerHTML;
  }

  /* get current user id from store/local cache */
  function getMe(){
    var latest = getCurrentUserFromStore();
    if(!latest)return null;
    ud = latest;
    return String(latest.id||latest.userId||latest.email||'');
  }
  const initialMe=getMe();
  if(initialMe){myInitials=(initialMe.slice(0,2).toUpperCase());}
  if(ud){
    const _dn2 = ud.displayName || [ud.firstName, ud.lastName].filter(Boolean).join(' ') || ud.name || '';
    myInitials=_dn2.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  }

  /* ── Avatar initials helper ── */
  function initFor(id){
    if (typeof messagingUtils.initFor === 'function') return messagingUtils.initFor(id);
    return String(id||'?').slice(0,2).toUpperCase();
  }

  function getAuthHeaders(extra){
    var headers = Object.assign({}, extra || {});
    return headers;
  }

  function parsePayload(data){
    if (typeof messagingUtils.parsePayload === 'function') return messagingUtils.parsePayload(data);
    return data;
  }

  function parseAttachmentPayload(content){
    if (typeof messagingUtils.parseAttachmentPayload === 'function') {
      return messagingUtils.parseAttachmentPayload(content);
    }
    return null;
  }

  function buildAttachmentMessage(payload){
    if (typeof messagingUtils.buildAttachmentMessage === 'function') {
      return messagingUtils.buildAttachmentMessage(payload);
    }
    return 'ATTACHMENT::' + JSON.stringify(payload || {});
  }

  function renderBubbleContent(content){
    if (typeof messagingUtils.renderBubbleContent === 'function') {
      return messagingUtils.renderBubbleContent(content);
    }
    return escHtml(content || '');
  }

  async function markCurrentConversationRead(){
    if(!currentConversationId) return;
    try {
      if (typeof messagingApi.markConversationRead === 'function') {
        await messagingApi.markConversationRead(currentConversationId);
      } else {
        await window.SpopeerAPI.markConversationRead(currentConversationId);
      }
    } catch (e) {
      console.warn('markConversationRead failed:', e && e.message ? e.message : e);
    }
  }

  function applyChatTheme(theme){
    if (typeof messagingUi.applyChatTheme === 'function') {
      messagingUi.applyChatTheme(theme, { toggleId: 'chatThemeToggle' });
      return;
    }
    var isDark = String(theme || '').toLowerCase() === 'dark';
    document.body.classList.toggle('pulsechat-dark', isDark);
    var btn = document.getElementById('chatThemeToggle');
    if(btn){
      btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      btn.title = isDark ? 'Use light theme' : 'Use dark theme';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  function initChatTheme(){
    if (typeof messagingUi.initChatTheme === 'function') {
      messagingUi.initChatTheme({
        storageKey: CHAT_THEME_STORAGE_KEY,
        toggleId: 'chatThemeToggle'
      });
      return;
    }
    var saved = localStorage.getItem(CHAT_THEME_STORAGE_KEY);
    if(!saved){
      saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    applyChatTheme(saved);
    var toggle = document.getElementById('chatThemeToggle');
    if(toggle){
      toggle.addEventListener('click', function(){
        var next = document.body.classList.contains('pulsechat-dark') ? 'light' : 'dark';
        localStorage.setItem(CHAT_THEME_STORAGE_KEY, next);
        applyChatTheme(next);
      });
    }
  }

  function setMessagingAvailability(enabled){
    messagingEnabled = !!enabled;
    if (typeof messagingUi.setMessagingAvailability === 'function') {
      messagingUi.setMessagingAvailability({
        enabled: messagingEnabled,
        sendBtnId: 'sendBtn',
        messageInputId: 'messageText',
        disabledMessage: BACKEND_DISABLED_MSG
      });
      return;
    }
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = !messagingEnabled || !document.getElementById('messageText').value.trim();
    const messageText = document.getElementById('messageText');
    if (messageText) {
      messageText.placeholder = messagingEnabled ? 'Write a message…' : BACKEND_DISABLED_MSG;
      messageText.disabled = !messagingEnabled;
    }
    if (!messagingEnabled && window.SpopeerToast) {
      window.SpopeerToast.info(BACKEND_DISABLED_MSG);
    }
  }

  /* ── Get user name from profiles ── */
  function getOtherUserName(email){
    if(!email) return 'User';
    const profiles = JSON.parse(localStorage.getItem('spopeer_profiles')||'{}');
    const profile = profiles[email];
    if(profile && profile.firstName){
      return profile.firstName + ' ' + (profile.lastName || '');
    }
    return 'User ' + (String(email).substring(0,2).toUpperCase());
  }

  /* ── Format time ── */
  function fmtTime(iso){
    if (typeof messagingUtils.fmtTime === 'function') return messagingUtils.fmtTime(iso);
    const d=new Date(iso);const now=new Date();
    const diff=(now-d)/1000;
    if(diff<60)return 'now';
    if(diff<3600)return Math.floor(diff/60)+'m';
    if(diff<86400)return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString([],{month:'short',day:'numeric'});
  }

  /* ── Render conversation list ── */
  function renderConvList(convs){
    const list=document.getElementById('conversationsList');
    if (typeof messagingUi.renderConversationList === 'function') {
      messagingUi.renderConversationList({
        listEl: list,
        conversations: convs,
        currentConversation: currentConversation,
        initFor: initFor,
        fmtTime: fmtTime,
        escHtml: escHtml,
        onOpen: function (otherId, conversationId) {
          openConversation(otherId, conversationId);
        }
      });
      return;
    }
    if(!convs||!convs.length){
      list.innerHTML='<div class="conv-empty"><i class="fa-regular fa-comment-slash"></i><div style="margin-top:8px">No conversations yet</div><div style="font-size:12px;margin-top:4px;color:var(--muted-2)">Start a new message to connect</div></div>';
      return;
    }
    list.innerHTML='';
    convs.forEach(c=>{
      const div=document.createElement('div');
      div.className='conv-item'+(currentConversation&&currentConversation===String(c.otherId||c.id)?' active':'');
      div.dataset.other=c.otherId||c.id;
      const unread=c.unread&&c.unread>0;
      const fallbackName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
      const name = c.otherName || fallbackName || ('User ' + (c.otherId || c.id));
      div.innerHTML=`
        <div class="conv-av">${initFor(c.otherId||c.id)}${(c.online||Math.random()>0.7)?'<span class="online-dot"></span>':''}</div>
        <div class="conv-info">
          <div class="conv-name">${name}</div>
          <div class="conv-preview ${unread?'unread-preview':''}">${c.lastMessage?escHtml(c.lastMessage.slice(0,60)):''}</div>
        </div>
        <div class="conv-right">
          <div class="conv-time">${c.lastAt?fmtTime(c.lastAt):''}</div>
          ${unread?`<div class="unread-badge">${c.unread}</div>`:''}
        </div>`;
      div.addEventListener('click',()=>openConversation(c.otherId||c.id||c.email,c.id||null));
      list.appendChild(div);
    });
  }

  /* ── Load conversations ── */
  async function loadConversations(){
    if(!_loggedIn&&!ud){renderConvList([]);return;}
    
    const userEmail = ud?.email || 'user@example.com';
    
    try{
      // Prefer SpopeerAPI to ensure cookie + CSRF handling is consistent.
      allConvs = (typeof messagingApi.listConversations === 'function')
        ? await messagingApi.listConversations()
        : listFromResponse(await window.SpopeerAPI.listConversations());
      setMessagingAvailability(true);
      renderConvList(allConvs);
      return;
    }catch(e){
      console.error('Failed to load conversations:', e);
      if (e && (e.status === 404 || e.status === 501 || e.status === 503)) {
        setMessagingAvailability(false);
      }
    }

    renderConvList([]);
  }

  /* ── Open conversation ── */
  async function openConversation(otherId, conversationId){
    const seq = ++openConversationSeq;
    var me = getMe();
    if(!me){if (window.SpopeerToast) window.SpopeerToast.warning('Please log in to use messaging');return;}
    if(!messagingEnabled){if (window.SpopeerToast) window.SpopeerToast.info(BACKEND_DISABLED_MSG);return;}
    currentConversation=String(otherId);
    currentConversationId=conversationId?String(conversationId):null;

    /* update list active state */
    document.querySelectorAll('.conv-item').forEach(i=>{i.classList.toggle('active',i.dataset.other===String(otherId));});

    /* show chat panel */
    document.getElementById('chatEmpty').style.display='none';
    const ca=document.getElementById('chatActive');ca.style.display='flex';ca.style.flexDirection='column';ca.style.flex='1';ca.style.overflow='hidden';

    /* header */
    const selected = allConvs.find(c => String(c.otherId || c.id) === String(otherId));
    const otherName = (selected && selected.otherName) || getOtherUserName(otherId);
    document.getElementById('chatHeadAv').textContent=initFor(otherId);
    document.getElementById('chatHeadName').textContent=otherName;

    /* enable send */
    document.getElementById('sendBtn').disabled=!messagingEnabled;

    /* load messages */
    try{
      if(!currentConversationId){
        const createdData = (typeof messagingApi.createConversation === 'function')
          ? await messagingApi.createConversation(String(otherId))
          : parsePayload(await window.SpopeerAPI.createConversation(String(otherId)));
        currentConversationId = String(createdData && createdData.id ? createdData.id : '');
        if(!currentConversationId){
          throw new Error('Could not create conversation — no id returned.');
        }
      }

      if(currentConversationId){
        const data = (typeof messagingApi.getConversation === 'function')
          ? await messagingApi.getConversation(currentConversationId, { limit: 50 })
          : parsePayload(await window.SpopeerAPI.getConversation(currentConversationId, { limit: 50 }));
        if (seq !== openConversationSeq) return;
        currentMessageList=(data&&data.messages)||[];
        conversationHasMore=!!(data&&data.hasMore);
        conversationOldestAt=(data&&data.oldestAt)?String(data.oldestAt):'';
        renderMessages(currentMessageList,String(me));
        await markCurrentConversationRead();
        document.getElementById('typingIndicator').style.display='none';
        return;
      }
    }catch(e){
      console.error('Failed to load conversation:', e);
      const errMsg = (e && e.response && e.response.message) || (e && e.message) || 'Could not open conversation.';
      currentMessageList=[];
      conversationHasMore=false;
      conversationOldestAt='';
      renderMessages([],String(me));
      const box = document.getElementById('messages');
      if(box) box.innerHTML='<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#dc2626;font-size:13px;padding:32px;text-align:center">'+escHtml(errMsg)+' Please try again or use the New Message button.</div>';
      document.getElementById('sendBtn').disabled=true;
      return;
    }

    renderMessages([],String(me));
  }

  async function loadOlderMessages(){
    if(!currentConversationId || !conversationHasMore || loadingOlder || !conversationOldestAt) return;
    try {
      loadingOlder=true;
      renderMessages(currentMessageList, String(getMe() || ''), true);
      const box=document.getElementById('messages');
      const prevHeight=box.scrollHeight;
      const prevTop=box.scrollTop;
      const data = (typeof messagingApi.getConversation === 'function')
        ? await messagingApi.getConversation(currentConversationId, {
            limit: 50,
            before: conversationOldestAt
          })
        : parsePayload(await window.SpopeerAPI.getConversation(currentConversationId, {
            limit: 50,
            before: conversationOldestAt
          }));
      var older=(data&&data.messages)||[];
      if (typeof messagingState.mergeOlderMessages === 'function') {
        currentMessageList = messagingState.mergeOlderMessages(currentMessageList, older);
      } else {
        var seen=new Set(currentMessageList.map(function(m){ return String(m.id||''); }));
        older=older.filter(function(m){
          var id=String(m.id||'');
          if(!id) return true;
          return !seen.has(id);
        });
        currentMessageList=older.concat(currentMessageList);
      }
      conversationHasMore=!!(data&&data.hasMore);
      conversationOldestAt=(data&&data.oldestAt)?String(data.oldestAt):conversationOldestAt;
      renderMessages(currentMessageList, String(getMe() || ''), true);
      box.scrollTop = prevTop + (box.scrollHeight - prevHeight);
    } catch (e) {
      console.error('Failed to load older messages:', e);
      if (window.SpopeerToast) window.SpopeerToast.error('Could not load older messages.');
    } finally {
      loadingOlder=false;
      renderMessages(currentMessageList, String(getMe() || ''), true);
    }
  }

  function isDeletedMessage(msg){
    if (typeof messagingState.isDeletedMessage === 'function') {
      return messagingState.isDeletedMessage(msg);
    }
    if (!msg) return false;
    if (msg.deletedAt) return true;
    var text = String(msg.body || msg.text || msg.content || '').trim();
    return text === '[Message deleted]';
  }

  function renderLoadOlderButton(box){
    if(!conversationHasMore) return;
    var wrap=document.createElement('div');
    wrap.style.display='flex';
    wrap.style.justifyContent='center';
    wrap.style.padding='10px 8px 2px';
    var btn=document.createElement('button');
    btn.id='loadOlderBtn';
    btn.type='button';
    btn.textContent=loadingOlder?'Loading...':'Load older messages';
    btn.disabled=loadingOlder;
    btn.style.border='1px solid var(--border)';
    btn.style.background='var(--white)';
    btn.style.borderRadius='999px';
    btn.style.padding='6px 12px';
    btn.style.fontSize='12px';
    btn.style.cursor=loadingOlder?'not-allowed':'pointer';
    wrap.appendChild(btn);
    box.appendChild(wrap);
  }

  function createMessageRow(m,myId){
    const sender = m.senderId || m.fromId || m.sender;
    const content = m.body || m.text || m.content;
    const createdAt = m.createdAt || m.timestamp || new Date().toISOString();
    const isMe=String(sender)===myId||String(sender)===String(myId).split('@')[0];
    const deleted=isDeletedMessage(m);
    const row=document.createElement('div');
    row.className='msg-row '+(isMe?'mine':'theirs');
    if(m.id) row.dataset.messageId=String(m.id);
    if(isMe && m.id && !deleted) row.dataset.deletable='1';
    const unread = m.read === 0 || m.read === false;
    const readMeta = deleted
      ? ' · deleted'
      : (isMe ? (unread ? ' · sent' : ' · read') : (unread ? ' · <span class="unread-mark">unread</span>' : ''));
    const meta=new Date(createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) + readMeta;
    const bubbleHtml = renderBubbleContent(content || '');
    const bubbleClass = deleted ? 'bubble deleted-bubble' : 'bubble';
    if(!isMe){
      row.innerHTML=`<div class="msg-av-sm">${initFor(sender)}</div><div><div class="${bubbleClass}">${bubbleHtml}</div><div class="bubble-meta">${meta}</div></div>`;
    }else{
      row.innerHTML=`<div><div class="${bubbleClass}" title="Right-click for options">${bubbleHtml}</div><div class="bubble-meta">${meta}</div></div>`;
    }
    return { row, createdAt };
  }

  /* ── Render messages ── */
  function renderMessages(msgs,myId,keepScroll){
    const box=document.getElementById('messages');
    var prevHeight=box.scrollHeight;
    var prevTop=box.scrollTop;
    box.innerHTML='';

    if(!msgs||!msgs.length){
      box.innerHTML='<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;padding:32px;text-align:center" data-placeholder="1">No messages yet. Say hello!</div>';
      return;
    }

    renderLoadOlderButton(box);

    let lastDate='';
    msgs.forEach(m=>{
      const createdAt = m.createdAt || m.timestamp || new Date().toISOString();
      const mDate=new Date(createdAt).toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});
      if(mDate!==lastDate){
        const sep=document.createElement('div');
        sep.className='date-sep';
        sep.innerHTML=`<span>${mDate}</span>`;
        box.appendChild(sep);
        lastDate=mDate;
      }
      const rendered = createMessageRow(m,myId);
      box.appendChild(rendered.row);
    });

    if(keepScroll){
      box.scrollTop = prevTop + (box.scrollHeight - prevHeight);
    } else {
      box.scrollTop=box.scrollHeight;
    }
  }

  function upsertMessageInState(msg){
    if (typeof messagingState.upsertMessage === 'function') {
      currentMessageList = messagingState.upsertMessage(currentMessageList, msg);
      return;
    }
    if (!msg) return;
    var id = msg.id ? String(msg.id) : '';
    if (id) {
      var idx = currentMessageList.findIndex(function (m) { return String(m.id || '') === id; });
      if (idx >= 0) {
        currentMessageList[idx] = Object.assign({}, currentMessageList[idx], msg);
      } else {
        currentMessageList.push(msg);
      }
    } else {
      currentMessageList.push(msg);
    }
  }

  function updateMessageDeletedState(messageId, deletedAt){
    if (typeof messagingState.markMessageDeleted === 'function') {
      currentMessageList = messagingState.markMessageDeleted(currentMessageList, messageId, deletedAt);
      renderMessages(currentMessageList, String(getMe() || ''));
      return;
    }
    var id = String(messageId || '');
    if (!id) return;
    var idx = currentMessageList.findIndex(function (m) { return String(m.id || '') === id; });
    if (idx < 0) return;
    currentMessageList[idx] = Object.assign({}, currentMessageList[idx], {
      body: '[Message deleted]',
      content: '[Message deleted]',
      text: '[Message deleted]',
      deletedAt: deletedAt || new Date().toISOString()
    });
    renderMessages(currentMessageList, String(getMe() || ''));
  }

  /* ── PHASE 1 STEP 2: Append single message to DOM (no full reload) ── */
  function appendMessage(msg){
    upsertMessageInState(msg);
    renderMessages(currentMessageList, String(getMe() || ''));
  }

  /* ── PHASE 2 STEP 3: Send message with optimistic UI ── */
  async function sendMessage(forcedText){
    if(!currentConversation||!messagingEnabled)return;
    if(sendInFlight)return;
    const input = document.getElementById('messageText');
    const sendBtn = document.getElementById('sendBtn');
    const text=(forcedText || input.value || '').trim();
    if(!text)return;
    if(text.length>5000){
      if(window.SpopeerToast) window.SpopeerToast.warning('Message is too long (max 5000 characters).');
      return;
    }

    // OPTIMISTIC: Show message immediately
    var optimisticMsg={
      senderId:getMe(),
      body:text,
      createdAt:new Date().toISOString(),
      read:false
    };
    appendMessage(optimisticMsg);

    // Clear input right away (feels instant)
    if(!forcedText){
      input.value='';
      if(sendBtn) sendBtn.disabled=true;
    }

    try{
      sendInFlight=true;
      if(sendBtn){
        sendBtn.setAttribute('aria-busy','true');
      }
      if(!currentConversationId){
        const createdData = (typeof messagingApi.createConversation === 'function')
          ? await messagingApi.createConversation(String(currentConversation))
          : parsePayload(await window.SpopeerAPI.createConversation(String(currentConversation)));
        currentConversationId=String(createdData&&createdData.id?createdData.id:'');
        if(!currentConversationId){
          throw new Error('Could not create conversation.');
        }
      }

      if(currentConversationId){
        if (typeof messagingApi.sendConversationMessage === 'function') {
          await messagingApi.sendConversationMessage(currentConversationId, text);
        } else {
          await window.SpopeerAPI.sendConversationMessage(currentConversationId, text);
        }
        if(socket){
          var _r=parseInt(currentConversation,10);
          if(!isNaN(_r)&&_r>0){
            socket.emit('stop_typing',{receiverId:_r});
          }
        }
        // Refresh conversation list in background (no full reload)
        loadConversations();
        return;
      }

    }catch(e){
      console.error('Failed to send message:',e);
      if(window.SpopeerToast) window.SpopeerToast.error('Failed to send. Please try again.');
    }finally{
      sendInFlight=false;
      if(sendBtn){
        sendBtn.removeAttribute('aria-busy');
        sendBtn.disabled=!messagingEnabled||!document.getElementById('messageText').value.trim();
      }
    }
  }

  document.getElementById('sendBtn').addEventListener('click',function(){ sendMessage(); });
  document.getElementById('messageText').addEventListener('keydown',function(e){
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}
  });
  document.getElementById('messageText').addEventListener('input',function(){
    document.getElementById('sendBtn').disabled=!messagingEnabled||!this.value.trim();
    this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px';
    if(!socket || !currentConversation) return;
    // PHASE 2 STEP 4: Fix typing indicator — validate numeric receiverId
    var _receiverId=parseInt(currentConversation,10);
    if(!isNaN(_receiverId)&&_receiverId>0){
      socket.emit('typing',{receiverId:_receiverId});
    }
    clearTimeout(stopTypingTimer);
    stopTypingTimer=setTimeout(function(){
      if(socket && currentConversation){
        var _r=parseInt(currentConversation,10);
        if(!isNaN(_r)&&_r>0){
          socket.emit('stop_typing',{receiverId:_r});
        }
      }
    },800);
  });

  // PHASE 2 STEP 4: Stop typing on blur
  document.getElementById('messageText').addEventListener('blur',function(){
    if(!socket||!currentConversation)return;
    var _r=parseInt(currentConversation,10);
    if(!isNaN(_r)&&_r>0){
      socket.emit('stop_typing',{receiverId:_r});
    }
  });

  document.getElementById('messages').addEventListener('click', function(e){
    var target = e.target;
    if(target && target.id==='loadOlderBtn'){
      e.preventDefault();
      loadOlderMessages();
      return;
    }
    var menu=document.getElementById('messageContextMenu');
    if(menu) menu.style.display='none';
  });

  document.getElementById('messages').addEventListener('contextmenu', function(e){
    var bubble=e.target.closest('.msg-row.mine[data-deletable="1"] .bubble');
    if(!bubble) return;
    e.preventDefault();
    var row=bubble.closest('.msg-row');
    var messageId=row && row.dataset ? row.dataset.messageId : '';
    if(!messageId) return;
    deleteMenuMessageId=String(messageId);
    var menu=document.getElementById('messageContextMenu');
    if(!menu) return;
    menu.style.display='block';
    menu.style.left=e.clientX+'px';
    menu.style.top=e.clientY+'px';
  });

  document.getElementById('deleteMessageAction').addEventListener('click', async function(){
    var messageId=deleteMenuMessageId;
    var menu=document.getElementById('messageContextMenu');
    if(menu) menu.style.display='none';
    deleteMenuMessageId='';
    if(!messageId) return;
    if(!window.confirm('Delete this message?')) return;
    try {
      var resp = (typeof messagingApi.deleteConversationMessage === 'function')
        ? await messagingApi.deleteConversationMessage(messageId)
        : parsePayload(await window.SpopeerAPI.deleteConversationMessage(messageId));
      updateMessageDeletedState(messageId, resp && resp.deletedAt);
    } catch (e) {
      console.error('Failed to delete message:', e);
      if(window.SpopeerToast) window.SpopeerToast.error('Could not delete message.');
    }
  });

  document.addEventListener('click', function(e){
    var menu=document.getElementById('messageContextMenu');
    if(!menu || menu.style.display==='none') return;
    if(!menu.contains(e.target)){
      menu.style.display='none';
      deleteMenuMessageId='';
    }
  });

  document.getElementById('attachFileBtn').addEventListener('click', function(e){
    e.preventDefault();
    if(!currentConversation){
      if (window.SpopeerToast) window.SpopeerToast.info('Select a conversation first.');
      return;
    }
    document.getElementById('chatAttachmentInput').click();
  });

  document.getElementById('chatAttachmentInput').addEventListener('change', async function(){
    var file = this.files && this.files[0];
    if(!file) return;
    try {
      var uploaded = (typeof messagingApi.uploadChatAttachment === 'function')
        ? await messagingApi.uploadChatAttachment(file)
        : (parsePayload(await window.SpopeerAPI.uploadChatAttachment(file)) || {});
      var payload = {
        url: uploaded.url || (uploaded.payload && uploaded.payload.url),
        name: file.name,
        mimeType: file.type || (uploaded.payload && uploaded.payload.mimeType) || ''
      };
      if(!payload.url){
        throw new Error('Attachment upload failed.');
      }
      await sendMessage(buildAttachmentMessage(payload));
      if (window.SpopeerToast) window.SpopeerToast.success('Attachment sent.');
    } catch (e) {
      console.error('Attachment upload/send failed:', e);
      if (window.SpopeerToast) window.SpopeerToast.error('Failed to send attachment.');
    } finally {
      this.value = '';
    }
  });

  /* ── New message modal ── */
  document.getElementById('newMsgBtn').addEventListener('click',()=>document.getElementById('newMsgModal').classList.add('open'));
  document.getElementById('newMsgModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});
  let searchResults = [];
  document.getElementById('newMsgTo').addEventListener('input', async function(){
    const query = this.value.trim();
    const resultsList = document.getElementById('userSearchList');
    const resultsContainer = document.getElementById('userSearchResults');
    const errorDiv = document.getElementById('userSearchError');
    
    errorDiv.style.display = 'none';
    
    if (query.length < 2) {
      resultsContainer.style.display = 'none';
      searchResults = [];
      return;
    }
    
    try {
      const response = (typeof messagingApi.searchUsers === 'function')
        ? await messagingApi.searchUsers({ query, limit: 5 })
        : listFromResponse(await window.SpopeerAPI.searchUsers({ query, limit: 5 }));
      searchResults = listFromResponse(response).map(function (u) { return normalizeUser(u); });
      
      if (!Array.isArray(searchResults)) searchResults = [];
      
      if (searchResults.length === 0) {
        resultsList.innerHTML = '<div style="padding:12px;color:var(--muted);text-align:center;font-size:13px;">No users found</div>';
        resultsContainer.style.display = 'block';
        return;
      }
      
      resultsList.innerHTML = searchResults.map(u => {
        const user = normalizeUser(u);
        const name = user.displayName || 'User';
        const displayId = user.email || user.id;
        const safeId = escHtml(String(user.id || ''));
        const safeName = escHtml(name);
        const safeDisplayId = escHtml(String(displayId || ''));
        return '<div class="usr-result" data-userid="' + safeId + '" data-username="' + safeName + '" style="padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;transition:.15s;"><div style="font-weight:600;color:var(--ink);font-size:13px;">' + safeName + '</div><div style="font-size:11px;color:var(--muted);">' + safeDisplayId + '</div></div>';
      }).join('');
      resultsContainer.style.display = 'block';
      resultsList.querySelectorAll('.usr-result').forEach(function(item){
        item.addEventListener('mouseover', function(){ this.style.background = 'var(--surface)'; });
        item.addEventListener('mouseout', function(){ this.style.background = ''; });
        item.addEventListener('click', function(){ setSelectedUser(this.dataset.userid, this.dataset.username); });
      });
    } catch (e) {
      console.error('Search failed:', e);
      errorDiv.textContent = 'Search failed. Try entering a user ID or email.';
      errorDiv.style.display = 'block';
      resultsContainer.style.display = 'none';
    }
  });
  
  window.setSelectedUser = function(userId, userName){
    document.getElementById('newMsgTo').value = userId;
    document.getElementById('userSearchResults').style.display = 'none';
  };
  
  document.getElementById('startConvBtn').addEventListener('click',async function(){
    const otherId=document.getElementById('newMsgTo').value.trim();
    const firstMsg=document.getElementById('newMsgFirstMsg').value.trim();
    const errorDiv = document.getElementById('userSearchError');
    
    errorDiv.style.display = 'none';
    
    if(!otherId){
      errorDiv.textContent = 'Please enter or select a user to message';
      errorDiv.style.display = 'block';
      if (window.SpopeerToast) window.SpopeerToast.warning('Please select a recipient');
      return;
    }

    if(firstMsg && firstMsg.length>5000){
      errorDiv.textContent = 'First message exceeds 5000 characters.';
      errorDiv.style.display = 'block';
      if (window.SpopeerToast) window.SpopeerToast.warning('Message is too long (max 5000 characters).');
      return;
    }
    
    try {
      document.getElementById('startConvBtn').disabled = true;
      
      const created = (typeof messagingApi.createConversation === 'function')
        ? await messagingApi.createConversation(String(otherId))
        : parsePayload(await window.SpopeerAPI.createConversation(String(otherId)));
      const createdId = created && created.id ? String(created.id) : '';
      
      if (!createdId) {
        errorDiv.textContent = 'Could not create conversation. Please try again.';
        errorDiv.style.display = 'block';
        if (window.SpopeerToast) window.SpopeerToast.error('Failed to start conversation');
        return;
      }
      
      if(firstMsg){
        if (typeof messagingApi.sendConversationMessage === 'function') {
          await messagingApi.sendConversationMessage(createdId, firstMsg);
        } else {
          await window.SpopeerAPI.sendConversationMessage(createdId, firstMsg);
        }
      }
      
      document.getElementById('newMsgModal').classList.remove('open');
      document.getElementById('newMsgTo').value='';
      document.getElementById('newMsgFirstMsg').value='';
      
      if (window.SpopeerToast) window.SpopeerToast.success('Conversation started!');
      loadConversations();
      openConversation(otherId, createdId);
    } catch (e) {
      console.error('Failed to start conversation:', e);
      const msg = e && e.message ? e.message : 'Could not create conversation';
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
      if (window.SpopeerToast) window.SpopeerToast.error(msg);
    } finally {
      document.getElementById('startConvBtn').disabled = false;
    }
  });

  /* ── Search filter ── */
  document.getElementById('convSearch').addEventListener('input',function(){
    const q=this.value.toLowerCase();
    document.querySelectorAll('.conv-item').forEach(item=>{
      const name=item.querySelector('.conv-name')?.textContent.toLowerCase()||'';
      const preview=item.querySelector('.conv-preview')?.textContent.toLowerCase()||'';
      item.style.display=(name.includes(q)||preview.includes(q))?'':'none';
    });
  });

  /* ── View profile helper ── */
  window.viewProfile=function(){if(currentConversation)window.location.href='../../pages/profiles/public-profile.html?userId='+encodeURIComponent(currentConversation);};

  /* ── PHASE 1 STEP 5: Polling fallback when socket is disconnected ── */
  var pollingController = (typeof messagingSocket.createPollingController === 'function')
    ? messagingSocket.createPollingController({
      intervalMs: 5000,
      shouldPoll: function(){
        return !!currentConversationId && (!socket || !socket.connected);
      },
      poll: function(){
        var requester = (typeof messagingApi.getConversation === 'function')
          ? messagingApi.getConversation(currentConversationId, { limit: 50 })
          : window.SpopeerAPI.getConversation(currentConversationId, { limit: 50 });
        return requester.then(function(data){
          var msgs=parsePayload(data);
          var me=getMe();
          if(msgs&&msgs.messages){
            currentMessageList=msgs.messages;
            conversationHasMore=!!msgs.hasMore;
            conversationOldestAt=msgs.oldestAt?String(msgs.oldestAt):'';
            renderMessages(currentMessageList,String(me));
          }
        });
      }
    })
    : null;

  function startPolling(){
    if(pollingController && typeof pollingController.start === 'function'){
      pollingController.start();
      return;
    }
  }

  function stopPolling(){
    if(pollingController && typeof pollingController.stop === 'function'){
      pollingController.stop();
      return;
    }
  }

  function connectRealtime(){
    if(!window.io) return;
    try{
      socket = io({
        withCredentials: true,
        auth: {},
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000
      });
      if(typeof messagingSocket.attachInboxSocketHandlers === 'function'){
        messagingSocket.attachInboxSocketHandlers(socket, {
          onNewMessage: function(msg){
            var senderId=String(msg.fromId||msg.senderId||'');
            var convId=String(msg.conversationId||'');
            var isCurrentConv=currentConversationId&&convId===String(currentConversationId);
            var isFromCurrentOther=currentConversation&&senderId===String(currentConversation);

            if(isCurrentConv||isFromCurrentOther){
              appendMessage(msg);
              markCurrentConversationRead();
            }
            loadConversations();
          },
          onUserTyping: function(payload){
            var senderId = String(payload && payload.userId || '');
            if(!senderId || !currentConversation || senderId !== String(currentConversation)) return;
            currentTypingUserId = senderId;
            var indicator=document.getElementById('typingIndicator');
            indicator.textContent='Typing…';
            indicator.style.display='block';
            clearTimeout(typingTimer);
            typingTimer=setTimeout(function(){
              if(currentTypingUserId===senderId){
                indicator.style.display='none';
              }
            }, 1200);
          },
          onUserStopTyping: function(payload){
            var senderId = String(payload && payload.userId || '');
            if(senderId && senderId===currentTypingUserId){
              document.getElementById('typingIndicator').style.display='none';
            }
          },
          onConversationRead: function(payload){
            if(!payload || String(payload.conversationId||'') !== String(currentConversationId||'')) return;
            openConversation(currentConversation, currentConversationId);
          },
          onMessagesRead: function(){
            if(currentConversation){
              openConversation(currentConversation, currentConversationId);
            }
          },
          onMessageDeleted: function(payload){
            var convId=String(payload&&payload.conversationId||'');
            if(!convId || convId!==String(currentConversationId||'')) return;
            updateMessageDeletedState(payload.id, payload.deletedAt);
          },
          onConnect: function(){
            stopPolling();
            console.log('Socket connected.');
          },
          onDisconnect: function(){
            startPolling();
            console.warn('Socket disconnected. Polling fallback active.');
          },
          onConnectError: function(err){
            startPolling();
            console.warn('Socket connect error:', err && err.message ? err.message : err);
          },
          onUserOnline: function(payload){
            var uid=String(payload&&payload.userId||'');
            if(!uid)return;
            if (typeof messagingUi.markUserOnline === 'function') {
              messagingUi.markUserOnline(uid);
              return;
            }
            var item=document.querySelector('.conv-item[data-other="'+uid+'"]');
            if(item){
              var av=item.querySelector('.conv-av');
              if(av&&!av.querySelector('.online-dot')){
                var dot=document.createElement('div');
                dot.className='online-dot';
                av.appendChild(dot);
              }
            }
          },
          onUserOffline: function(payload){
            var uid=String(payload&&payload.userId||'');
            if(!uid)return;
            if (typeof messagingUi.markUserOffline === 'function') {
              messagingUi.markUserOffline(uid);
              return;
            }
            var item=document.querySelector('.conv-item[data-other="'+uid+'"]');
            if(item){
              var dot=item.querySelector('.online-dot');
              if(dot)dot.remove();
            }
          }
        });
      }

    }catch(e){
      console.warn('Socket init failed:', e && e.message ? e.message : e);
      startPolling();
    }
  }

  /* ── Escape HTML ── */
  window.escHtml = function(t){
    if (!t) return '';
    const d=document.createElement('div');
    d.textContent=String(t);
    return d.innerHTML;
  };

  async function resolveRecipientFromUrl(rawValue) {
    var value = String(rawValue || '').trim();
    if (!value) return '';

    // If value is a plain numeric ID, use it directly — no search needed
    if (/^\d+$/.test(value)) return value;

    // Check existing conversations first
    var exact = (allConvs || []).find(function (c) {
      var candidates = [c.otherId, c.otherUserId, c.email, c.otherEmail, c.username, c.id];
      return candidates.some(function (candidate) {
        return String(candidate || '').toLowerCase() === value.toLowerCase();
      });
    });
    if (exact && (exact.otherId || exact.otherUserId || exact.id)) {
      return String(exact.otherId || exact.otherUserId || exact.id);
    }

    // Fall back to user search
    try {
      var searchResp = (typeof messagingApi.searchUsers === 'function')
        ? await messagingApi.searchUsers({ query: value, limit: 6 })
        : await window.SpopeerAPI.searchUsers({ query: value, limit: 6 });
      var users = (searchResp && searchResp.data) || searchResp || [];
      if (Array.isArray(users) && users.length) {
        var match = users.find(function (u) {
          var keys = [u.id, u.userId, u.email, u.username];
          return keys.some(function (key) { return String(key || '').toLowerCase() === value.toLowerCase(); });
        }) || users[0];
        if (match && (match.id || match.userId)) {
          return String(match.id || match.userId);
        }
      }
    } catch (e) {
      console.warn('Could not resolve URL recipient via search:', e);
    }

    return value;
  }

  async function openConversationFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var urlOther = params.get('userId') || params.get('otherId');
    if (!urlOther) return;

    // Wait for user data to be available (handles auth refresh race condition)
    var me = getMe();
    if (!me) {
      await new Promise(function(resolve) {
        var timeout = setTimeout(resolve, 3000);
        window.addEventListener('currentUserChanged', function handler() {
          clearTimeout(timeout);
          window.removeEventListener('currentUserChanged', handler);
          resolve();
        }, { once: true });
      });
    }

    var resolvedOther = await resolveRecipientFromUrl(urlOther);
    if (!resolvedOther) return;

    // Retry a few times to absorb eventual consistency/user-store timing issues.
    for (var attempt = 0; attempt < 3; attempt++) {
      var beforeConversationId = currentConversationId;
      await openConversation(resolvedOther);
      if (currentConversationId || beforeConversationId !== currentConversationId) {
        return;
      }
      await new Promise(function(resolve){ setTimeout(resolve, 250); });
    }
  }

  initChatTheme();
  connectRealtime();

  /* ── Init ── */
  loadConversations().then(openConversationFromUrl).catch(function () {
    openConversationFromUrl();
  });

  // PHASE 1 STEP 5: Start polling fallback if socket doesn't connect
  setTimeout(function(){
    if(!socket||!socket.connected){
      startPolling();
    }
  },4000);

})();
