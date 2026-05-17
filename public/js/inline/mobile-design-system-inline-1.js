const screens=[
"Splash","Onboarding","Feed (TikTok)","Create Post","Profile","Search","Messages","Notifications","Post Detail","Connections","Articles","AI Agent","Reels","Ads","Edit Profile","Public Profile","Followers","Club Page","Analytics","Sponsor Dashboard","Admin","Moderation"
];

document.write(screens.map((s,i)=>`<div class='card'><h3>${i+1}. ${s}</h3><div class='screen'>${s} UI Preview</div></div>`).join(''));
