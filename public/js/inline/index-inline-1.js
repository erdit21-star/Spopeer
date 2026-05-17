(function(){
  var POSTS=[
    {av:'AP',cls:'a1',name:'Alex Petrov',role:'Athlete � Football',tag:'fa-futbol','tagTxt':'Transfer',body:'FC Spartans just sent me a connection request. Big opportunity � let\'s see where this goes! ??',likes:87,comments:31,live:false},
    {av:'MC',cls:'a2',name:'Maria Chen',role:'Athlete � Swimming',tag:'fa-microphone','tagTxt':'Live Interview',body:'?? LIVE NOW � I\'m being interviewed by Sports Weekly. Join the session and ask me anything!',likes:214,comments:68,live:true},
    {av:'UH',cls:'a3',name:'United Hawks FC',role:'Club � Football',tag:'fa-shield-halved','tagTxt':'Club News',body:'We\'re in early talks with Coach Daniel Moreira for our head-coaching role next season. Exciting times ahead.',likes:142,comments:44,live:false},
    {av:'BW',cls:'a1',name:'Coach Brian Walsh',role:'Coach � Football',tag:'fa-whistle','tagTxt':'Opportunity',body:'Had a very productive first meeting with River United FC today. A fascinating project � details soon.',likes:76,comments:19,live:false},
    {av:'LB',cls:'a2',name:'Lucas Bianchi',role:'Athlete � Basketball',tag:'fa-basketball','tagTxt':'Transfer',body:'Real Madrid Baloncesto just sent me a trial offer. This is what I\'ve been working for my whole career ???',likes:531,comments:127,live:false},
    {av:'NS',cls:'a3',name:'Nordic Ski Club',role:'Club � Skiing',tag:'fa-person-skiing','tagTxt':'Scouting',body:'We\'ve opened dialogue with three promising junior athletes from the national championships. Scouting underway.',likes:64,comments:18,live:false},
    {av:'AT',cls:'a1',name:'Ava Torres',role:'Athlete � Tennis',tag:'fa-microphone','tagTxt':'Live Interview',body:'?? LIVE � Tennis Channel is interviewing me about the upcoming season. Watch and drop your questions!',likes:309,comments:92,live:true},
    {av:'SM',cls:'a2',name:'Coach Sandra Melo',role:'Coach � Athletics',tag:'fa-stopwatch','tagTxt':'Coaching Win',body:'My athlete just ran a new 400m PB � 47.83! Months of specific track work finally coming together ??',likes:188,comments:53,live:false},
    {av:'JO',cls:'a3',name:'James Okafor',role:'Athlete � Football',tag:'fa-pen-nib','tagTxt':'Signed',body:'Signed my first professional contract today ??? Grateful for every coach, club, and person who believed in me.',likes:894,comments:241,live:false},
    {av:'EP',cls:'a1',name:'Dr. Emma Park',role:'Professional � Sports Medicine',tag:'fa-heart-pulse','tagTxt':'Sports Science',body:'Pre-season physicals completed for the full squad � everyone cleared to begin full training. Great group! ??',likes:112,comments:27,live:false},
    {av:'HR',cls:'a2',name:'Horizon RFC',role:'Club � Rugby',tag:'fa-shield-halved','tagTxt':'Recruitment',body:'?? Seeking a wing forward with top-level speed and experience. Apply now via the Spopeer Marketplace.',likes:58,comments:14,live:false},
    {av:'MS',cls:'a3',name:'Marco Silva',role:'Athlete � Cycling',tag:'fa-bicycle','tagTxt':'Opportunity',body:'The team director from ProCycling Ventures just messaged me. Something big could be on the horizon ?????',likes:143,comments:38,live:false},
    {av:'KN',cls:'a1',name:'Keita Ndiaye',role:'Athlete � Basketball',tag:'fa-basketball','tagTxt':'Training',body:'Back-to-back triple-doubles in scrimmage this week. The new offence scheme is clicking perfectly ??',likes:267,comments:74,live:false},
    {av:'CF',cls:'a2',name:'City Futsal FC',role:'Club � Futsal',tag:'fa-futbol','tagTxt':'Club Update',body:'Our new training facility opens next Monday. Huge step forward for youth development in our region.',likes:195,comments:62,live:false},
    {av:'RL',cls:'a3',name:'Coach Rosa Lima',role:'Coach � Athletics',tag:'fa-whistle','tagTxt':'Tactics',body:'Shared a full sprint mechanics breakdown in my community group. Free to read � link in bio ??',likes:334,comments:89,live:false}
  ];

  var colMap={a1:'linear-gradient(135deg,#001233,#1a5cff)',a2:'linear-gradient(135deg,#12a150,#00c17a)',a3:'linear-gradient(135deg,#f59e0b,#ff7c00)'};
  var idx=0;
  var container=document.getElementById('heroPosts');
  if(!container)return;

  function buildPost(p){
    var el=document.createElement('div');
    el.className='preview-post';
    el.style.animation='none';
    el.innerHTML=
      '<div class="mp-top">'+
        '<div class="mp-av" style="background:'+colMap[p.cls]+'">'+p.av+'</div>'+
        '<div><div class="mp-name">'+p.name+'</div><div class="mp-role">'+p.role+'</div></div>'+
      '</div>'+
      (p.live?'<div class="mp-tag" style="background:#fee2e2;color:#dc2626"><i class="fa-solid fa-circle" style="font-size:7px;animation:heroBlink 1s step-start infinite"></i> LIVE</div>':
              '<div class="mp-tag"><i class="fa-solid '+p.tag+'" style="font-size:9px"></i> '+p.tagTxt+'</div>')+
      '<div class="mp-body">'+p.body+'</div>'+
      '<div class="mp-actions">'+
        '<div class="mp-action liked"><i class="fa-solid fa-heart"></i> '+p.likes+'</div>'+
        '<div class="mp-action"><i class="fa-regular fa-comment"></i> '+p.comments+'</div>'+
        '<div class="mp-action"><i class="fa-regular fa-share-from-square"></i></div>'+
      '</div>';
    return el;
  }

  // seed with first 3
  function seed(){
    container.innerHTML='';
    for(var i=0;i<3;i++){
      container.appendChild(buildPost(POSTS[(idx+i)%POSTS.length]));
    }
    idx=(idx+3)%POSTS.length;
  }
  seed();

  // every 6 s swap top post � fade only, no translate so left column never shifts
  setInterval(function(){
    var newPost=buildPost(POSTS[idx%POSTS.length]);
    idx=(idx+1)%POSTS.length;
    newPost.style.opacity='0';
    newPost.style.transition='opacity .5s ease';
    container.insertBefore(newPost,container.firstChild);
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        newPost.style.opacity='1';
      });
    });
    var children=container.children;
    if(children.length>3){
      var last=children[children.length-1];
      last.style.transition='opacity .4s ease';
      last.style.opacity='0';
      setTimeout(function(){last.remove();},420);
    }
  },6000);
})();
