(function(){
  'use strict';

  var container=document.getElementById('heroPosts');
  if(!container)return;

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function getPostComments(postId, list){
    list.innerHTML='<div class="mp-comment-loading">Loading comments...</div>';
    return window.SpopeerAPI.getPostComments(postId).then(function(result){
      var comments=Array.isArray(result && result.data) ? result.data : [];
      if(!comments.length){
        list.innerHTML='<div class="mp-comment-empty">No comments yet. Be the first to comment.</div>';
        return;
      }
      list.innerHTML=comments.map(function(comment){
        var author=comment.author||{};
        var name=author.displayName || [author.firstName,author.lastName].filter(Boolean).join(' ') || 'User';
        return '<div class="mp-comment"><strong>'+escapeHtml(name)+'</strong><span>'+escapeHtml(comment.content||'')+'</span></div>';
      }).join('');
    });
  }

  function buildPost(post){
    var author=post.author||{};
    var name=author.displayName || [author.firstName,author.lastName].filter(Boolean).join(' ') || 'User';
    var role=author.role || author.userType || 'User';
    var initials=name.split(/\\s+/).filter(Boolean).slice(0,2).map(function(part){return part.charAt(0);}).join('').toUpperCase() || 'U';
    var liked=post.liked===true;
    var likes=Number(post.likesCount||post.likes||0);
    var comments=Number(post.commentsCount||post.comments||0);
    var el=document.createElement('div');
    el.className='preview-post';
    el.dataset.postId=String(post.id);
    el.innerHTML='<div class="mp-top"><div class="mp-av">'+escapeHtml(initials)+'</div><div><div class="mp-name">'+escapeHtml(name)+'</div><div class="mp-role">'+escapeHtml(role)+'</div></div></div>'+
      '<div class="mp-body">'+escapeHtml(post.content || '')+'</div>'+
      '<div class="mp-actions">'+
        '<button type="button" class="mp-action mp-like-btn '+(liked?'liked':'')+'" data-action="like"><i class="fa-'+(liked?'solid':'regular')+' fa-heart"></i> <span class="mp-like-label">'+(liked?'Liked':'Like')+'</span> <span class="mp-like-count">'+likes+'</span></button>'+
        '<button type="button" class="mp-action mp-comment-btn" data-action="comments"><i class="fa-regular fa-comment"></i> <span>Comment</span> <span class="mp-comment-count">'+comments+'</span></button>'+
      '</div>'+
      '<div class="mp-comments" hidden>'+
        '<div class="mp-comment-list"></div>'+
        '<div class="mp-comment-form"><input type="text" maxlength="500" placeholder="Write a comment..." aria-label="Write a comment"><button type="button" data-action="send-comment">Post</button></div>'+
      '</div>';
    return el;
  }

  function bindInteractions(){
    container.addEventListener('click',function(event){
      var button=event.target.closest('button[data-action]');
      if(!button || !container.contains(button))return;
      var card=button.closest('.preview-post');
      if(!card)return;
      var postId=Number(card.dataset.postId);
      if(!Number.isFinite(postId))return;

      if(button.dataset.action==='like'){
        event.preventDefault();
        if(button.disabled)return;
        button.disabled=true;
        var wasLiked=button.classList.contains('liked');
        window.SpopeerAPI.togglePostLike(postId).then(function(result){
          var data=result && result.data ? result.data : result;
          var liked=!!(data && data.liked);
          var count=Number(data && data.likesCount);
          if(!Number.isFinite(count))count=Number(card.querySelector('.mp-like-count').textContent||0)+(liked&&!wasLiked?1:(!liked&&wasLiked?-1:0));
          button.classList.toggle('liked',liked);
          button.querySelector('i').className='fa-'+(liked?'solid':'regular')+' fa-heart';
          button.querySelector('.mp-like-label').textContent=liked?'Liked':'Like';
          button.querySelector('.mp-like-count').textContent=String(Math.max(0,count));
        }).catch(function(error){
          console.error('Home like failed:',error);
          if(window.SpopeerAPI.showNotification)window.SpopeerAPI.showNotification(error.message||'Could not like post.','error');
        }).finally(function(){button.disabled=false;});
        return;
      }

      if(button.dataset.action==='comments'){
        event.preventDefault();
        var panel=card.querySelector('.mp-comments');
        if(panel.hidden){
          panel.hidden=false;
          getPostComments(postId,card.querySelector('.mp-comment-list')).catch(function(error){
            console.error('Home comments failed:',error);
            card.querySelector('.mp-comment-list').innerHTML='<div class="mp-comment-empty">Could not load comments.</div>';
          });
        }else{
          panel.hidden=true;
        }
        return;
      }

      if(button.dataset.action==='send-comment'){
        event.preventDefault();
        var form=button.closest('.mp-comment-form');
        var input=form && form.querySelector('input');
        var value=input ? input.value.trim() : '';
        if(!value || button.disabled)return;
        button.disabled=true;
        window.SpopeerAPI.addPostComment(postId,value).then(function(){
          input.value='';
          var countEl=card.querySelector('.mp-comment-count');
          countEl.textContent=String(Number(countEl.textContent||0)+1);
          return getPostComments(postId,card.querySelector('.mp-comment-list'));
        }).catch(function(error){
          console.error('Home comment failed:',error);
          if(window.SpopeerAPI.showNotification)window.SpopeerAPI.showNotification(error.message||'Could not add comment.','error');
        }).finally(function(){button.disabled=false;});
      }
    });

    container.addEventListener('keydown',function(event){
      if(event.key!=='Enter' || !event.target.matches('.mp-comment-form input'))return;
      event.preventDefault();
      var button=event.target.closest('.mp-comment-form').querySelector('[data-action="send-comment"]');
      if(button)button.click();
    });
  }

  bindInteractions();

  fetch('/api/posts?page=1&limit=3',{credentials:'include'})
    .then(function(res){ if(!res.ok) throw new Error('Failed to load posts'); return res.json(); })
    .then(function(json){
      var posts=Array.isArray(json.data) ? json.data : (Array.isArray(json.posts) ? json.posts : []);
      container.innerHTML='';
      posts.slice(0,3).forEach(function(post){ container.appendChild(buildPost(post)); });
      if(!posts.length) container.style.display='none';
    })
    .catch(function(){
      container.innerHTML='';
      container.style.display='none';
    });
})();
