/**
 * Spopeer Design System & Component Styling Guide
 * Version: 1.0
 * Purpose: Ensure visual consistency across the platform
 */

// ═══════════════════════════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Primary Colors
  primary: '#1a6bff',
  primaryDark: '#0052a3',
  primaryLight: '#e3f2fd',
  
  // Secondary Colors
  secondary: '#7d3c98',
  secondaryDark: '#5a2670',
  secondaryLight: '#f3e5f5',
  
  // Status Colors
  success: '#2e7d32',
  successLight: '#e8f5e9',
  warning: '#f57c00',
  warningLight: '#fff3e0',
  error: '#d32f2f',
  errorLight: '#ffebee',
  info: '#01579b',
  infoLight: '#e0f2f1',
  
  // Neutral Colors
  text: '#222222',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDisabled: '#cccccc',
  
  background: '#ffffff',
  backgroundSecondary: '#f5f5f5',
  backgroundTertiary: '#eeeeee',
  
  border: '#dddddd',
  borderLight: '#eeeeee',
  
  // Special
  link: '#1a6bff',
  linkVisited: '#7d3c98',
  linkHover: '#004fb8'
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════

const TYPOGRAPHY = {
  // Font families
  fontFamily: {
    base: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Courier New', monospace"
  },
  
  // Font sizes (px, scales from 12px to 48px)
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px'
  },
  
  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2
  },
  
  // Letter spacing
  letterSpacing: {
    tight: '-0.5px',
    normal: '0px',
    wide: '0.5px',
    wider: '1px'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT SPECIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

const COMPONENTS = {
  // BUTTONS
  button: {
    padding: '10px 20px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px', // Touch target
    minWidth: '44px',
    
    variants: {
      primary: {
        background: COLORS.primary,
        color: '#ffffff',
        hover: { background: COLORS.primaryDark },
        focus: { outline: `3px solid ${COLORS.primary}` }
      },
      secondary: {
        background: COLORS.secondary,
        color: '#ffffff',
        hover: { background: COLORS.secondaryDark }
      },
      outlined: {
        background: 'transparent',
        color: COLORS.primary,
        border: `2px solid ${COLORS.primary}`,
        hover: { background: COLORS.primaryLight }
      },
      ghost: {
        background: 'transparent',
        color: COLORS.text,
        hover: { background: COLORS.backgroundSecondary }
      },
      disabled: {
        background: COLORS.textDisabled,
        color: COLORS.textTertiary,
        cursor: 'not-allowed',
        opacity: 0.6
      }
    }
  },
  
  // INPUT FIELDS
  input: {
    padding: '10px 12px',
    fontSize: '16px', // Prevents zoom on mobile
    borderRadius: '4px',
    border: `2px solid ${COLORS.border}`,
    lineHeight: 1.5,
    
    focus: {
      borderColor: COLORS.primary,
      outline: 'none',
      boxShadow: `0 0 0 3px ${COLORS.primaryLight}`
    },
    
    disabled: {
      background: COLORS.backgroundSecondary,
      color: COLORS.textDisabled,
      cursor: 'not-allowed'
    },
    
    error: {
      borderColor: COLORS.error,
      boxShadow: `0 0 0 3px ${COLORS.errorLight}`
    }
  },
  
  // LABELS
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: COLORS.text,
    marginBottom: '8px',
    display: 'block'
  },
  
  // CARDS
  card: {
    background: COLORS.background,
    borderRadius: '8px',
    border: `1px solid ${COLORS.borderLight}`,
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.2s ease',
    
    hover: {
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
    }
  },
  
  // MODALS & DIALOGS
  modal: {
    background: COLORS.background,
    borderRadius: '8px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: '500px',
    padding: '24px',
    
    backdrop: {
      background: 'rgba(0,0,0,0.5)',
      zIndex: 50
    }
  },
  
  // ALERTS & MESSAGES
  alert: {
    padding: '12px 16px',
    borderRadius: '4px',
    borderLeft: '4px solid',
    fontSize: '14px',
    marginBottom: '16px',
    
    variants: {
      success: {
        background: COLORS.successLight,
        color: COLORS.success,
        borderColor: COLORS.success
      },
      warning: {
        background: COLORS.warningLight,
        color: COLORS.warning,
        borderColor: COLORS.warning
      },
      error: {
        background: COLORS.errorLight,
        color: COLORS.error,
        borderColor: COLORS.error
      },
      info: {
        background: COLORS.infoLight,
        color: COLORS.info,
        borderColor: COLORS.info
      }
    }
  },
  
  // BADGES
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-block',
    
    variants: {
      primary: {
        background: COLORS.primaryLight,
        color: COLORS.primary
      },
      success: {
        background: COLORS.successLight,
        color: COLORS.success
      },
      warning: {
        background: COLORS.warningLight,
        color: COLORS.warning
      },
      error: {
        background: COLORS.errorLight,
        color: COLORS.error
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SPACING SYSTEM (8px base)
// ═══════════════════════════════════════════════════════════════════════════

const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px'
};

// ═══════════════════════════════════════════════════════════════════════════
// BREAKPOINTS (Mobile First)
// ═══════════════════════════════════════════════════════════════════════════

const BREAKPOINTS = {
  mobile: '320px',
  tablet: '768px',
  laptop: '1024px',
  desktop: '1280px',
  wide: '1920px'
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSISTENCY GUIDELINES
// ═══════════════════════════════════════════════════════════════════════════

const GUIDELINES = {
  // Button Usage
  buttons: {
    primary: 'Use for main actions (Submit, Save, Send)',
    secondary: 'Use for alternate actions',
    outlined: 'Use for less prominent actions',
    ghost: 'Use for cancel, close, or minimal actions',
    sizes: 'Small (32px), Medium (44px), Large (56px) - always ≥44px'
  },
  
  // Color Usage
  colors: {
    primary: 'Main actions, links, focus indicators',
    secondary: 'Alternate accent color',
    success: 'Success states, confirmations, checkmarks',
    warning: 'Warnings, cautions, important notices',
    error: 'Errors, deletions, critical states',
    info: 'Information, help text, tooltips'
  },
  
  // Spacing
  spacing: 'Use 8px base grid (4, 8, 16, 24, 32, 48, 64px)',
  
  // Typography
  typography: {
    headings: 'h1-h6 should follow logical hierarchy',
    body: 'Default 16px font size for readability',
    labels: 'Use 14px, 500 weight for form labels'
  },
  
  // Interactions
  interactions: {
    hover: 'Provide visual feedback on hover',
    focus: 'Clear focus indicator (3px outline)',
    active: 'Distinguish active/selected states',
    disabled: 'Gray out and prevent interaction'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════

/*
□ Apply consistent button styling across all pages
□ Standardize form input styling and validation
□ Ensure consistent card layouts and spacing
□ Implement modal/dialog styling standards
□ Standardize alert/message styling
□ Create badge component variants
□ Apply focus indicators to all interactive elements
□ Test spacing consistency with 8px grid
□ Verify color contrast ratios (WCAG AA)
□ Document custom component styling
□ Create reusable CSS component classes
□ Update all existing components to follow guidelines
*/

module.exports = {
  COLORS,
  TYPOGRAPHY,
  COMPONENTS,
  SPACING,
  BREAKPOINTS,
  GUIDELINES
};
