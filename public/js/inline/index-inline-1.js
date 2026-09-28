(function(){
  'use strict';

  var container=document.getElementById('heroPosts');
  if(!container)return;

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function buildPost(post){
    var author=post.author||{};
    var name=author.displayName || [author.firstName,author.lastName].filter(Boolean).join(' ') || 'User';
    var role=author.role || author.userType || 'User';
    var initials=name.split(/\\s+/).filter(Boolean).slice(0,2).map(function(part){return part.charAt(0);}).join('').toUpperCase() || 'U';
    var el=document.createElement('div');
    el.className='preview-post';
    el.innerHTML='<div class="mp-top"><div class="mp-av">'+escapeHtml(initials)+'</div><div><div class="mp-name">'+escapeHtml(name)+'</div><div class="mp-role">'+escapeHtml(role)+'</div></div></div>'+
      '<div class="mp-body">'+escapeHtml(post.content || '')+'</div>'+
      '<div class="mp-actions"><div class="mp-action"><i class="fa-solid fa-heart"></i> '+Number(post.likesCount||post.likes||0)+'</div><div class="mp-action"><i class="fa-regular fa-comment"></i> '+Number(post.commentsCount||post.comments||0)+'</div></div>';
    return el;
  }

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
