---
name: GBSA Enterprise Support System
colors:
  surface: '#faf8ff'
  surface-dim: '#dad9e0'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3fa'
  surface-container: '#eeedf4'
  surface-container-high: '#e8e7ee'
  surface-container-highest: '#e2e2e9'
  on-surface: '#1a1b20'
  on-surface-variant: '#434651'
  inverse-surface: '#2f3036'
  inverse-on-surface: '#f1f0f7'
  outline: '#747782'
  outline-variant: '#c4c6d3'
  surface-tint: '#365ca8'
  primary: '#002f72'
  on-primary: '#ffffff'
  primary-container: '#1c4691'
  on-primary-container: '#9ab7ff'
  inverse-primary: '#b0c6ff'
  secondary: '#2759bc'
  on-secondary: '#ffffff'
  secondary-container: '#6d98fe'
  on-secondary-container: '#002e76'
  tertiary: '#562400'
  on-tertiary: '#ffffff'
  tertiary-container: '#793500'
  on-tertiary-container: '#ffa169'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001944'
  on-primary-fixed-variant: '#18438e'
  secondary-fixed: '#dae2ff'
  secondary-fixed-dim: '#b1c5ff'
  on-secondary-fixed: '#001947'
  on-secondary-fixed-variant: '#00419f'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68d'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#763300'
  background: '#faf8ff'
  on-background: '#1a1b20'
  surface-variant: '#e2e2e9'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  sidebar-width: 260px
  stack-gap: 12px
  section-gap: 32px
---

## Brand & Style

The design system is engineered for a high-stakes B2B enterprise environment, specifically for the Gyeonggido Business & Science Accelerator. The brand personality is **authoritative, systematic, and precise**. It aims to evoke a sense of security and institutional trust, ensuring that users feel confident while navigating complex datasets to identify support duplicates.

The design style is **Corporate / Modern**, leaning into high-utility layouts and a structured information hierarchy. It prioritizes clarity over ornamentation, utilizing a clean grid, generous white space for data legibility, and a sophisticated color palette that reinforces the GBSA corporate identity. The interface remains functional and unobtrusive, allowing the critical status indicators (Risk, Warning, Safe) to command attention where necessary.

## Colors

This design system utilizes a structured hierarchy of color to guide the user's eye through the audit process. 

- **Primary (GBSA Blue):** Used for primary actions, navigation accents, and progress indicators to reinforce the institutional brand.
- **Secondary:** Applied to hover states and active interactive elements to provide clear visual feedback.
- **Surface & Background:** A clean, neutral background (#F8F9FA) provides contrast for pure white (#FFFFFF) cards and panels, creating a clear "layered" depth.
- **Semantic Palette:** This is the most critical layer for this system. 
    - **Exact Match (Risk):** High-urgency Red for immediate attention.
    - **Similar Match (Warning):** Orange for manual review required.
    - **No Match (Safe):** Green for cleared applications.

## Typography

The system uses **Inter** for its exceptional legibility in data-heavy environments and its neutral, professional tone. 

- **Hierarchy:** Bold weights are reserved for page headers and table titles. 
- **Data Density:** `body-sm` and `mono-data` are the primary workhorses for the dashboard, allowing for high information density without sacrificing readability.
- **Labels:** Uppercase styling is used sparingly for labels and category headers to provide structural distinction in the sidebar and table headers.

## Layout & Spacing

The design system employs a **Fluid Grid** model with fixed sidebar constraints. 

- **Sidebar:** A fixed 260px width ensures the navigation remains accessible at all times.
- **Main Content:** A flexible 12-column grid that reflows based on screen width. 
- **Data Tables:** These should utilize a horizontal scroll mechanism on smaller viewports rather than collapsing, to maintain row-level context for comparison.
- **Spacing Rhythm:** Based on a 4px baseline. Components generally use 16px (4 units) or 24px (6 units) of internal padding to maintain a spacious, professional feel.

## Elevation & Depth

To maintain a clean, enterprise-grade look, the system uses **Tonal Layering** combined with **Ambient Shadows**.

- **Level 0 (Background):** The base layer (#F8F9FA).
- **Level 1 (Cards/Panels):** Pure white surfaces with a subtle, 4px blur shadow (6% opacity) to provide a gentle lift.
- **Level 2 (Modals/Popovers):** Elevated with a more pronounced 12px blur shadow (10% opacity) and a 1px soft border (#E2E8F0) to ensure separation from the background content.
- **Comparison Focus:** During comparison, the "active" or "highlighted" panel should use a 2px primary-colored border rather than a shadow to denote focus.

## Shapes

The shape language is consistent with modern SaaS standards, using a **Rounded (8px)** base. This softens the industrial nature of the data without appearing overly casual.

- **Primary Components:** Buttons, input fields, and cards utilize the standard 8px radius.
- **Status Badges:** Use a fully rounded (pill-shaped) radius to differentiate them as status indicators rather than interactive buttons.
- **Data Tables:** The top corners of the table container should follow the 8px radius, while internal row cells remain sharp to maximize horizontal space.

## Components

### Side Navigation
The sidebar uses a dark-on-light or GBSA Blue theme. Active states are indicated by a 4px vertical bar on the left edge and a subtle blue background tint (Primary 10% opacity).

### Search Bar & Inputs
Search bars feature GBSA Blue icons. Input fields use a 1px border (#CBD5E0) that transitions to GBSA Blue on focus.

### File Upload Zone
The drag-and-drop area utilizes a dashed border in GBSA Blue with a light blue background tint. The icon and primary text are centered, providing clear affordance for interaction.

### Data Tables
Headers use a light gray background (#F1F5F9) with bolded labels. Rows should have a subtle hover effect (#F8F9FA). Comparison highlighting within cells uses a high-contrast background (e.g., light blue tint) to point out specific duplicate text strings.

### Status Badges
Badges use a "soft" color treatment: a background with 15% opacity of the status color and a 100% opacity foreground text color for maximum legibility. 

### Comparison Modals
Split-pane view. Left side shows the "Current Application," right side shows the "Suspected Duplicate." Differences are highlighted using the primary blue color as a high-contrast text background.

### Progress Bars
Progress bars use a thick 8px track in a light gray, with the active progress rendered in a solid GBSA Blue. For long-running search tasks, a pulsed animation is applied to the blue fill.