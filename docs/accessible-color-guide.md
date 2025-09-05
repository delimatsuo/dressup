# Accessible Color Usage Guide - DressUp AI

## Quick Reference for Developers

### Text Color Classes (WCAG AA Compliant)

#### Primary Text (High Contrast)
```css
/* Use for headings and important text */
.text-gray-900    /* 15.3:1 ratio - Primary text */
.text-gray-800    /* 12.6:1 ratio - Strong secondary text */
```

#### Secondary Text (Good Contrast)
```css
/* Use for body text and descriptions */
.text-gray-700    /* 8.8:1 ratio - Main body text */
.text-gray-600    /* 6.8:1 ratio - Secondary information */
```

#### Status Text Colors
```css
/* Success states */
.text-green-800   /* 7.1:1 ratio - Success messages */
.text-green-700   /* 5.9:1 ratio - Success actions */

/* Error states */
.text-red-800     /* 6.9:1 ratio - Error messages */
.text-red-700     /* 5.4:1 ratio - Error actions */

/* Warning states */
.text-amber-800   /* 6.4:1 ratio - Warning messages */
.text-yellow-800  /* 5.8:1 ratio - Warning actions */

/* Info states */
.text-blue-800    /* 6.6:1 ratio - Info messages */
.text-blue-900    /* 8.9:1 ratio - Strong info text */
```

### Background + Text Combinations

#### Safe Combinations (4.5:1+ ratio)
```jsx
// White backgrounds
<div className="bg-white text-gray-900">Excellent contrast (15.3:1)</div>
<div className="bg-white text-gray-700">Good contrast (8.8:1)</div>
<div className="bg-white text-gray-600">Minimum compliance (6.8:1)</div>

// Light backgrounds
<div className="bg-gray-50 text-gray-900">Excellent contrast</div>
<div className="bg-gray-50 text-gray-800">Very good contrast</div>

// Status backgrounds
<div className="bg-red-50 text-red-800">Error message</div>
<div className="bg-green-50 text-green-800">Success message</div>
<div className="bg-blue-50 text-blue-800">Info message</div>
<div className="bg-yellow-50 text-yellow-800">Warning message</div>
```

#### ❌ Avoid These Combinations
```css
/* These fail WCAG AA requirements */
.bg-white .text-gray-500     /* Only 4.7:1 - borderline */
.bg-white .text-gray-400     /* Only 3.8:1 - FAILS */
.bg-gray-100 .text-gray-500  /* Only 3.9:1 - FAILS */
.bg-blue-50 .text-blue-600   /* Only 3.2:1 - FAILS */
```

### Focus Indicators

#### Enhanced Focus Styles (3:1+ contrast)
```css
/* Use these for focus-visible states */
.focus-visible:outline-3 outline-blue-600    /* 4.5:1 contrast */
.focus-visible:ring-3 ring-blue-600          /* High visibility */
.focus-visible:ring-offset-2 ring-offset-white /* Clear separation */
```

### CSS Custom Properties (Available in globals.css)

```css
/* Use these variables for consistency */
var(--color-text-primary)     /* #111827 - Highest contrast */
var(--color-text-secondary)   /* #374151 - Standard body text */
var(--color-text-tertiary)    /* #4b5563 - Secondary info */
var(--color-text-muted)       /* #6b7280 - Minimum compliant */

var(--color-success-text)     /* #065f46 - Success messages */
var(--color-error-text)       /* #991b1b - Error messages */
var(--color-warning-text)     /* #92400e - Warning messages */
var(--color-info-text)        /* #1e40af - Info messages */

var(--color-focus-ring)       /* #2563eb - Focus indicators */
```

## Testing Your Colors

### Browser DevTools
1. Open Chrome DevTools
2. Select element
3. Look for contrast ratio in Styles panel
4. Ensure ratio shows ✅ AA compliant

### Online Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

### Quick Formula
```javascript
// Luminance calculation (0-1 scale)
const getLuminance = (hex) => {
  // Convert hex to RGB, apply gamma correction
  // Return relative luminance
}

// Contrast ratio (1:1 to 21:1 scale)
const getContrastRatio = (color1, color2) => {
  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}
```

## Component-Specific Guidelines

### Error States
```jsx
// ✅ Good error styling
<div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg">
  <strong>Error:</strong> Please fix the following issues.
</div>

// ❌ Avoid low contrast
<div className="bg-red-50 text-red-600"> // Only 3.8:1 ratio
```

### Success States
```jsx
// ✅ Good success styling
<div className="bg-green-50 border border-green-300 text-green-800 p-4 rounded-lg">
  <strong>Success:</strong> Your changes have been saved.
</div>
```

### Interactive Elements
```jsx
// ✅ Good button contrast
<button className="bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-3 focus-visible:ring-blue-600">
  Submit
</button>

// ✅ Good secondary button
<button className="bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:ring-3 focus-visible:ring-blue-600">
  Cancel
</button>
```

## Dark Mode Support

All color custom properties automatically adapt for dark mode. No additional changes needed when using the CSS variables.

```css
/* Automatically handles dark mode */
.my-text {
  color: var(--color-text-primary); /* White in dark mode, black in light mode */
}
```

## Checklist for New Components

- [ ] Text has minimum 4.5:1 contrast ratio
- [ ] Focus indicators are visible (3:1+ contrast)
- [ ] Error states use red-800 or stronger
- [ ] Success states use green-800 or stronger  
- [ ] Interactive elements have clear hover/focus states
- [ ] Colors work in both light and dark modes
- [ ] Tested with browser contrast checker

## Need Help?

1. **Check the audit report**: `/docs/accessibility-color-contrast-audit.md`
2. **Use browser DevTools**: Inspect element → Styles → Contrast info
3. **Test online**: WebAIM Contrast Checker
4. **Ask questions**: Reference this guide in code reviews

Remember: When in doubt, go darker for text colors and ensure sufficient contrast!