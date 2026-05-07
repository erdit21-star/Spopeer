const ROLE_KEYS = {
  athlete: 'athlete',
  coach: 'coach',
  club: 'club',
  supportive_professional: 'supportive_professional'
};

const PLAN_MATRIX = {
  athlete: [
    {
      code: 'ATH-FREE',
      tier: 'free',
      label: 'Starter',
      features: [
        'Athlete profile',
        'Primary sport selection',
        'Post updates and photos',
        'Follow athletes, coaches and clubs',
        'Basic search visibility'
      ]
    },
    {
      code: 'ATH-GROW',
      tier: 'pro',
      label: 'Growth',
      features: [
        'Everything in Starter',
        'Training progress highlights',
        'Achievement showcase',
        'Video and clip priority display',
        'Profile visitor insights'
      ]
    },
    {
      code: 'ATH-PRO',
      tier: 'pro',
      label: 'Pro Athlete',
      features: [
        'Everything in Growth',
        'Verified athlete request',
        'Recruitment-ready profile',
        'Advanced discovery by sport and level',
        'Priority messaging with coaches and clubs'
      ]
    },
    {
      code: 'ATH-ELITE',
      tier: 'elite',
      label: 'Elite',
      features: [
        'Everything in Pro Athlete',
        'Featured athlete placement',
        'Media-style profile sections',
        'Sponsorship visibility tools',
        'Priority support'
      ]
    }
  ],
  coach: [
    {
      code: 'COA-FREE',
      tier: 'free',
      label: 'Starter',
      features: [
        'Coach profile',
        'Sport and experience fields',
        'Post coaching content',
        'Follow athletes and clubs',
        'Basic search visibility'
      ]
    },
    {
      code: 'COA-GROW',
      tier: 'pro',
      label: 'Growth',
      features: [
        'Everything in Starter',
        'Coaching method posts',
        'Client discovery tools',
        'Profile analytics',
        'Direct messaging tools'
      ]
    },
    {
      code: 'COA-PRO',
      tier: 'pro',
      label: 'Pro Coach',
      features: [
        'Everything in Growth',
        'Verified coach request',
        'Talent search filters',
        'Training service listing',
        'Priority coach discovery'
      ]
    },
    {
      code: 'COA-ACADEMY',
      tier: 'elite',
      label: 'Academy',
      features: [
        'Everything in Pro Coach',
        'Multiple athlete promotion slots',
        'Academy-style profile sections',
        'Event and trial announcements',
        'Priority support'
      ]
    }
  ],
  club: [
    {
      code: 'CLB-FREE',
      tier: 'free',
      label: 'Starter',
      features: [
        'Club profile',
        'Post club news',
        'Follow athletes and coaches',
        'Basic club visibility',
        'Community feed access'
      ]
    },
    {
      code: 'CLB-GROW',
      tier: 'pro',
      label: 'Growth',
      features: [
        'Everything in Starter',
        'Recruitment posts',
        'Event announcements',
        'Club media gallery',
        'Profile analytics'
      ]
    },
    {
      code: 'CLB-PRO',
      tier: 'pro',
      label: 'Pro Club',
      features: [
        'Everything in Growth',
        'Verified club request',
        'Advanced player search',
        'Press-release style posts',
        'Priority placement in discovery'
      ]
    },
    {
      code: 'CLB-ORG',
      tier: 'elite',
      label: 'Organisation',
      features: [
        'Everything in Pro Club',
        'Multiple team sections',
        'Sponsor and partner visibility',
        'Advanced event promotion',
        'Priority support'
      ]
    }
  ],
  supportive_professional: [
    {
      code: 'PRO-FREE',
      tier: 'free',
      label: 'Starter',
      features: [
        'Professional profile',
        'Service category selection',
        'Post educational content',
        'Follow athletes, coaches and clubs',
        'Basic search visibility'
      ]
    },
    {
      code: 'PRO-GROW',
      tier: 'pro',
      label: 'Growth',
      features: [
        'Everything in Starter',
        'Service listing',
        'Client discovery visibility',
        'Profile analytics',
        'Direct messaging tools'
      ]
    },
    {
      code: 'PRO-EXPERT',
      tier: 'pro',
      label: 'Expert',
      features: [
        'Everything in Growth',
        'Verified professional request',
        'Priority service search',
        'Case-study style posts',
        'Marketplace service promotion'
      ]
    },
    {
      code: 'PRO-BUSINESS',
      tier: 'elite',
      label: 'Business',
      features: [
        'Everything in Expert',
        'Business profile sections',
        'Multiple service categories',
        'Featured professional placement',
        'Priority support'
      ]
    }
  ]
};

function normalizeRole(role) {
  const key = String(role || '').trim().toLowerCase();
  return ROLE_KEYS[key] || 'athlete';
}

function getPlansForRole(role) {
  return PLAN_MATRIX[normalizeRole(role)] || PLAN_MATRIX.athlete;
}

function getDefaultPlan(role) {
  const plans = getPlansForRole(role);
  return plans[0];
}

function resolvePlan(role, requestedCode) {
  const plans = getPlansForRole(role);
  const defaultPlan = plans[0];
  const lookupCode = String(requestedCode || '').trim().toUpperCase();

  if (!lookupCode) {
    return {
      isValidRequest: true,
      plan: defaultPlan,
      plans
    };
  }

  const plan = plans.find((item) => item.code === lookupCode);
  return {
    isValidRequest: !!plan,
    plan: plan || defaultPlan,
    plans
  };
}

function parseStoredPlanCode(user) {
  const ext = user && user.extendedProfile && typeof user.extendedProfile === 'object'
    ? user.extendedProfile
    : {};

  const candidate = ext.subscriptionPlanCode || user.subscriptionPlanCode || '';
  return String(candidate || '').trim().toUpperCase();
}

function getEffectivePlan(user, requestedCode) {
  const role = normalizeRole(user && user.role);
  const storedCode = parseStoredPlanCode(user);
  const sourceCode = requestedCode || storedCode;
  const resolved = resolvePlan(role, sourceCode);

  return {
    role,
    code: resolved.plan.code,
    label: resolved.plan.label,
    tier: resolved.plan.tier,
    features: resolved.plan.features,
    plans: resolved.plans,
    isValidRequest: resolved.isValidRequest,
    coarseSubscription: resolved.plan.tier === 'elite' ? 'elite' : (resolved.plan.tier === 'pro' ? 'pro' : 'free')
  };
}

module.exports = {
  normalizeRole,
  getPlansForRole,
  getDefaultPlan,
  resolvePlan,
  getEffectivePlan
};