(function () {
  'use strict';

  var PLAN_MATRIX = {
    athlete: [
      {
        code: 'ATH-FREE',
        tier: 'free',
        label: 'Starter',
        features: [
          { text: 'Athlete profile', route: '/pages/profiles/edit-profile.html' },
          { text: 'Primary sport selection', route: '/pages/profiles/edit-profile.html#section-sports' },
          { text: 'Post updates and photos', route: '/feed.html' },
          { text: 'Follow athletes, coaches and clubs', route: '/search.html' },
          { text: 'Basic search visibility', route: '/search.html' }
        ]
      },
      {
        code: 'ATH-GROW',
        tier: 'pro',
        label: 'Growth',
        features: [
          { text: 'Everything in Starter' },
          { text: 'Training progress highlights', route: '/pages/profiles/user-posts.html' },
          { text: 'Achievement showcase', route: '/pages/profiles/user-posts.html' },
          { text: 'Video and clip priority display', route: '/pages/profiles/edit-profile.html' },
          { text: 'Profile visitor insights', route: '/pages/ads/ads-manager.html' }
        ]
      },
      {
        code: 'ATH-PRO',
        tier: 'pro',
        label: 'Pro Athlete',
        features: [
          { text: 'Everything in Growth' },
          { text: 'Verified athlete request', route: '/pages/dashboard/settings.html' },
          { text: 'Recruitment-ready profile', route: '/pages/profiles/edit-profile.html' },
          { text: 'Advanced discovery by sport and level', route: '/search.html' },
          { text: 'Priority messaging with coaches and clubs', route: '/pages/messaging/inbox.html' }
        ]
      },
      {
        code: 'ATH-ELITE',
        tier: 'elite',
        label: 'Elite',
        features: [
          { text: 'Everything in Pro Athlete' },
          { text: 'Featured athlete placement', route: '/search.html' },
          { text: 'Media-style profile sections', route: '/pages/profiles/edit-profile.html' },
          { text: 'Sponsorship visibility tools', route: '/pages/sponsorship/sponsor.html' },
          { text: 'Priority support', route: '/pages/contact/index.html' }
        ]
      }
    ],
    coach: [
      {
        code: 'COA-FREE',
        tier: 'free',
        label: 'Starter',
        features: [
          { text: 'Coach profile', route: '/pages/profiles/edit-profile.html' },
          { text: 'Sport and experience fields', route: '/pages/profiles/edit-profile.html#section-sports' },
          { text: 'Post coaching content', route: '/feed.html' },
          { text: 'Follow athletes and clubs', route: '/search.html' },
          { text: 'Basic search visibility', route: '/search.html' }
        ]
      },
      {
        code: 'COA-GROW',
        tier: 'pro',
        label: 'Growth',
        features: [
          { text: 'Everything in Starter' },
          { text: 'Coaching method posts', route: '/feed.html' },
          { text: 'Client discovery tools', route: '/search.html' },
          { text: 'Profile analytics', route: '/pages/ads/ads-manager.html' },
          { text: 'Direct messaging tools', route: '/pages/messaging/inbox.html' }
        ]
      },
      {
        code: 'COA-PRO',
        tier: 'pro',
        label: 'Pro Coach',
        features: [
          { text: 'Everything in Growth' },
          { text: 'Verified coach request', route: '/pages/dashboard/settings.html' },
          { text: 'Talent search filters', route: '/search.html' },
          { text: 'Training service listing', route: '/pages/marketplace/marketplace.html' },
          { text: 'Priority coach discovery', route: '/search.html' }
        ]
      },
      {
        code: 'COA-ACADEMY',
        tier: 'elite',
        label: 'Academy',
        features: [
          { text: 'Everything in Pro Coach' },
          { text: 'Multiple athlete promotion slots', route: '/search.html' },
          { text: 'Academy-style profile sections', route: '/pages/profiles/edit-profile.html' },
          { text: 'Event and trial announcements', route: '/pages/events/event.html' },
          { text: 'Priority support', route: '/pages/contact/index.html' }
        ]
      }
    ],
    club: [
      {
        code: 'CLB-FREE',
        tier: 'free',
        label: 'Starter',
        features: [
          { text: 'Club profile', route: '/pages/profiles/edit-profile.html' },
          { text: 'Post club news', route: '/feed.html' },
          { text: 'Follow athletes and coaches', route: '/search.html' },
          { text: 'Basic club visibility', route: '/search.html' },
          { text: 'Community feed access', route: '/pages/community/community.html' }
        ]
      },
      {
        code: 'CLB-GROW',
        tier: 'pro',
        label: 'Growth',
        features: [
          { text: 'Everything in Starter' },
          { text: 'Recruitment posts', route: '/feed.html' },
          { text: 'Event announcements', route: '/pages/events/event.html' },
          { text: 'Club media gallery', route: '/pages/profiles/edit-profile.html' },
          { text: 'Profile analytics', route: '/pages/ads/ads-manager.html' }
        ]
      },
      {
        code: 'CLB-PRO',
        tier: 'pro',
        label: 'Pro Club',
        features: [
          { text: 'Everything in Growth' },
          { text: 'Verified club request', route: '/pages/dashboard/settings.html' },
          { text: 'Advanced player search', route: '/search.html' },
          { text: 'Press-release style posts', route: '/feed.html' },
          { text: 'Priority placement in discovery', route: '/search.html' }
        ]
      },
      {
        code: 'CLB-ORG',
        tier: 'elite',
        label: 'Organisation',
        features: [
          { text: 'Everything in Pro Club' },
          { text: 'Multiple team sections', route: '/pages/profiles/edit-profile.html' },
          { text: 'Sponsor and partner visibility', route: '/pages/sponsorship/sponsor.html' },
          { text: 'Advanced event promotion', route: '/pages/events/event.html' },
          { text: 'Priority support', route: '/pages/contact/index.html' }
        ]
      }
    ],
    supportive_professional: [
      {
        code: 'PRO-FREE',
        tier: 'free',
        label: 'Starter',
        features: [
          { text: 'Professional profile', route: '/pages/profiles/edit-profile.html' },
          { text: 'Service category selection', route: '/pages/profiles/edit-profile.html' },
          { text: 'Post educational content', route: '/feed.html' },
          { text: 'Follow athletes, coaches and clubs', route: '/search.html' },
          { text: 'Basic search visibility', route: '/search.html' }
        ]
      },
      {
        code: 'PRO-GROW',
        tier: 'pro',
        label: 'Growth',
        features: [
          { text: 'Everything in Starter' },
          { text: 'Service listing', route: '/pages/marketplace/marketplace.html' },
          { text: 'Client discovery visibility', route: '/search.html' },
          { text: 'Profile analytics', route: '/pages/ads/ads-manager.html' },
          { text: 'Direct messaging tools', route: '/pages/messaging/inbox.html' }
        ]
      },
      {
        code: 'PRO-EXPERT',
        tier: 'pro',
        label: 'Expert',
        features: [
          { text: 'Everything in Growth' },
          { text: 'Verified professional request', route: '/pages/dashboard/settings.html' },
          { text: 'Priority service search', route: '/search.html' },
          { text: 'Case-study style posts', route: '/feed.html' },
          { text: 'Marketplace service promotion', route: '/pages/marketplace/marketplace.html' }
        ]
      },
      {
        code: 'PRO-BUSINESS',
        tier: 'elite',
        label: 'Business',
        features: [
          { text: 'Everything in Expert' },
          { text: 'Business profile sections', route: '/pages/profiles/edit-profile.html' },
          { text: 'Multiple service categories', route: '/pages/profiles/edit-profile.html' },
          { text: 'Featured professional placement', route: '/search.html' },
          { text: 'Priority support', route: '/pages/contact/index.html' }
        ]
      }
    ]
  };

  function normalizeRole(role) {
    var key = String(role || '').trim().toLowerCase();
    if (key === 'coach' || key === 'club' || key === 'athlete' || key === 'supportive_professional') return key;
    return 'athlete';
  }

  function getPlansForRole(role) {
    return PLAN_MATRIX[normalizeRole(role)] || PLAN_MATRIX.athlete;
  }

  function getDefaultPlan(role) {
    var plans = getPlansForRole(role);
    return plans[0];
  }

  function resolveCurrentPlan(user) {
    var role = normalizeRole(user && user.role);
    var plans = getPlansForRole(role);
    var requestedCode = String(
      (user && (user.subscriptionPlanCode || (user.extendedProfile && user.extendedProfile.subscriptionPlanCode))) || ''
    ).trim().toUpperCase();
    var selected = plans.find(function (plan) { return plan.code === requestedCode; }) || plans[0];

    return {
      role: role,
      plan: selected,
      plans: plans,
      tier: selected.tier,
      code: selected.code,
      label: selected.label,
      features: selected.features
    };
  }

  function getCrossTypeSignals(planInfo) {
    var code = planInfo && planInfo.code ? planInfo.code : '';
    var tier = planInfo && planInfo.tier ? planInfo.tier : 'free';
    return [
      'Posts from this profile are discoverable by all user types.',
      'Search ranking and discovery increase with plan level (' + tier.toUpperCase() + ').',
      'Contact and messaging visibility is shared across athletes, coaches, clubs, and professionals.',
      code ? ('Current plan code: ' + code) : 'Current plan code: role default'
    ];
  }

  window.SubscriptionFeatures = {
    normalizeRole: normalizeRole,
    getPlansForRole: getPlansForRole,
    getDefaultPlan: getDefaultPlan,
    resolveCurrentPlan: resolveCurrentPlan,
    getCrossTypeSignals: getCrossTypeSignals
  };
})();
