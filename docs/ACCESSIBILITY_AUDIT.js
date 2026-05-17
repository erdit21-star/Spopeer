/**
 * Accessibility Audit & WCAG 2.1 Compliance Checklist
 * Purpose: Track WCAG 2.1 Level AA compliance across the platform
 * Last Updated: Phase 7.2
 * 
 * Status Values: COMPLETED, IN_PROGRESS, DEFERRED
 */

const ACCESSIBILITY_AUDIT = {
  // ═══════════════════════════════════════════════════════════════════════
  // PILLAR 1: PERCEIVABLE
  // ═══════════════════════════════════════════════════════════════════════
  PERCEIVABLE: {
    text_alternatives: {
      "images.alt-text": { status: "COMPLETED", note: "All decorative images have alt=\"\" or role=\"presentation\"" },
      "form.labels": { status: "COMPLETED", note: "All inputs have associated <label>" },
      "icons.aria-labels": { status: "IN_PROGRESS", note: "Icon-only buttons have aria-label or title" },
      "media.captions": { status: "DEFERRED", note: "Audio/video content has captions and transcripts" }
    },
    adaptable: {
      "html.semantic": { status: "IN_PROGRESS", note: "Use <header>, <nav>, <main>, <footer>, <article>, <section>" },
      "headings.hierarchy": { status: "IN_PROGRESS", note: "h1-h6 follows logical order (no skipping levels)" },
      "lists.semantic": { status: "COMPLETED", note: "Use <ul>, <ol>, <dl> appropriately" },
      "forms.fieldsets": { status: "IN_PROGRESS", note: "Fieldsets and legends used for grouped inputs" }
    },
    distinguishable: {
      "color.contrast": { status: "IN_PROGRESS", note: "Text has >=4.5:1 ratio (normal), >=3:1 (large)" },
      "text.zoom": { status: "IN_PROGRESS", note: "Page remains usable at 200% zoom" },
      "color.meaning": { status: "COMPLETED", note: "Meaning doesn't rely solely on color" },
      "audio.controls": { status: "COMPLETED", note: "Auto-playing audio has stop/pause controls" }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PILLAR 2: OPERABLE
  // ═══════════════════════════════════════════════════════════════════════
  OPERABLE: {
    keyboard_accessible: {
      "keyboard.accessible": { status: "COMPLETED", note: "All functionality available via keyboard" },
      "keyboard.focus-order": { status: "IN_PROGRESS", note: "Focus order follows logical tab order" },
      "keyboard.shortcuts": { status: "IN_PROGRESS", note: "Keyboard shortcuts have standard conventions" },
      "keyboard.traps": { status: "COMPLETED", note: "No keyboard traps - can tab away from any element" }
    },
    enough_time: {
      "time.limits": { status: "COMPLETED", note: "No time limits or adjustable time limits" },
      "animation.controls": { status: "IN_PROGRESS", note: "Pause/stop controls for animations" },
      "content.auto-scroll": { status: "COMPLETED", note: "No auto-scrolling content" }
    },
    seizures: {
      "flash.rate": { status: "COMPLETED", note: "No content flashes more than 3x per second" },
      "animation.safety": { status: "COMPLETED", note: "No animations that could trigger seizures" }
    },
    navigable: {
      "navigation.skip-links": { status: "DEFERRED", note: "Skip links for main content bypass" },
      "pages.titles": { status: "COMPLETED", note: "Page titles describe topic/purpose" },
      "focus.indicator": { status: "IN_PROGRESS", note: "Focus indicator visible when tabbing" },
      "links.descriptive": { status: "IN_PROGRESS", note: "Link text describes destination (no 'click here')" },
      "navigation.breadcrumbs": { status: "IN_PROGRESS", note: "Breadcrumbs show location in hierarchy" }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PILLAR 3: UNDERSTANDABLE
  // ═══════════════════════════════════════════════════════════════════════
  UNDERSTANDABLE: {
    readable: {
      "language.declared": { status: "COMPLETED", note: "Language of page identified (html lang=\"en\")" },
      "terms.explained": { status: "IN_PROGRESS", note: "Complex words/abbreviations have explanations" },
      "text.clarity": { status: "IN_PROGRESS", note: "Text is concise and easy to understand" },
      "reading.level": { status: "COMPLETED", note: "Reading level appropriate for audience" }
    },
    predictable: {
      "navigation.consistency": { status: "COMPLETED", note: "Navigation is consistent across pages" },
      "components.consistency": { status: "IN_PROGRESS", note: "Components behave consistently" },
      "context.changes": { status: "IN_PROGRESS", note: "No unexpected context changes (new windows/tabs)" },
      "forms.confirmation": { status: "IN_PROGRESS", note: "Form submission confirmed before action" }
    },
    input_assistance: {
      "errors.clear": { status: "COMPLETED", note: "Error messages clearly describe problem" },
      "errors.location": { status: "COMPLETED", note: "Error messages appear near problematic input" },
      "labels.format": { status: "IN_PROGRESS", note: "Form labels describe required format" },
      "confirmation.actions": { status: "COMPLETED", note: "Confirmation before major actions" },
      "forms.tab-accessible": { status: "COMPLETED", note: "Form fields accessible via tabbing" }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PILLAR 4: ROBUST
  // ═══════════════════════════════════════════════════════════════════════
  ROBUST: {
    compatible: {
      "html.valid": { status: "COMPLETED", note: "Valid HTML (no parsing errors)" },
      "aria.valid": { status: "COMPLETED", note: "ARIA attributes used correctly" },
      "ids.unique": { status: "COMPLETED", note: "No duplicate IDs" },
      "html.nested": { status: "COMPLETED", note: "Proper nesting of elements" },
      "role.state.property": { status: "COMPLETED", note: "Role, state, property info conveyed to assistive tech" }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // HIGH-IMPACT IMPROVEMENTS (Priority Order)
  // ═══════════════════════════════════════════════════════════════════════
  HIGH_IMPACT: [
    { rank: 1, item: "Add skip-to-main-content link", impact: "Bypass repetitive navigation", effort: "1-2 hrs" },
    { rank: 2, item: "Ensure 44px touch targets", impact: "Mobile accessibility", effort: "2-3 hrs" },
    { rank: 3, item: "Visible focus indicators", impact: "Keyboard navigation", effort: "2-3 hrs" },
    { rank: 4, item: "Semantic HTML structure", impact: "Screen reader support", effort: "2-3 days" },
    { rank: 5, item: "Color contrast fixes", impact: "Low-vision access", effort: "1-2 days" },
    { rank: 6, item: "ARIA labels for icons", impact: "Button clarity", effort: "4-6 hrs" },
    { rank: 7, item: "Heading hierarchy", impact: "Navigation by headings", effort: "1-2 days" },
    { rank: 8, item: "Form labels & validation", impact: "Form usability", effort: "1-2 days" },
    { rank: 9, item: "prefers-reduced-motion", impact: "Motion sensitivity", effort: "4-6 hrs" },
    { rank: 10, item: "Keyboard shortcuts", impact: "Power user support", effort: "1-2 hrs" }
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // IMPLEMENTATION ROADMAP
  // ═══════════════════════════════════════════════════════════════════════
  ROADMAP: {
    phase1: { title: "Focus & Keyboard", effort: "3-5 days", priority: "HIGH" },
    phase2: { title: "Semantic HTML & ARIA", effort: "5-7 days", priority: "HIGH" },
    phase3: { title: "Color & Readability", effort: "3-4 days", priority: "MEDIUM" },
    phase4: { title: "Form Accessibility", effort: "2-3 days", priority: "MEDIUM" },
    phase5: { title: "AT Testing", effort: "4-6 days", priority: "MEDIUM" }
  }
};

module.exports = ACCESSIBILITY_AUDIT;
