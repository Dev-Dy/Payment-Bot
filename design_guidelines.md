# Telegram Payment Bot Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from modern fintech and messaging apps like Stripe Dashboard, Telegram Web, and Linear for clean, professional interfaces that prioritize clarity and trust in payment flows.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Brand Blue: 220 85% 60% (professional, trustworthy)
- Success Green: 140 70% 45% (payment confirmations)
- Warning Orange: 35 85% 55% (alerts, pending states)

**Dark Mode:**
- Background: 220 15% 8%
- Surface: 220 10% 12%
- Text Primary: 0 0% 95%

**Light Mode:**
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Text Primary: 220 15% 25%

### Typography
- **Primary Font**: Inter via Google Fonts
- **Accent Font**: JetBrains Mono for order IDs, amounts
- **Hierarchy**: Large headings (2xl), body text (base), small labels (sm)

### Layout System
**Spacing Units**: Consistent use of Tailwind units 2, 4, 6, and 8
- Micro spacing: p-2, gap-2
- Standard spacing: p-4, m-4, gap-4
- Section spacing: p-6, mb-6
- Large spacing: p-8, mt-8

### Component Library

**Navigation & Layout:**
- Clean sidebar with bot status indicator
- Breadcrumb navigation for order flows
- Sticky header with current balance/stats

**Data Display:**
- Transaction cards with clear status badges
- Order timeline with step indicators
- Payment amount displays with currency formatting
- Status indicators (pending, completed, failed)

**Forms & Interactions:**
- Rounded input fields with subtle borders
- Primary buttons for payment actions
- Secondary buttons for navigation
- Inline validation messages

**Payment-Specific Components:**
- Product selection cards with pricing
- Checkout summary panels
- Payment method selectors
- Receipt/confirmation displays

**Bot Interface Elements:**
- Message bubbles (user vs bot styling)
- Inline keyboard button grids
- Command suggestions
- Typing indicators

### Visual Hierarchy
- Payment amounts: Large, bold typography
- Status indicators: Color-coded badges
- Action buttons: High contrast, accessible
- Secondary info: Muted text treatment

### Trust & Security Indicators
- SSL/security badges
- Stripe branding integration
- Clear refund policies
- Order confirmation numbers

This design prioritizes user trust, payment clarity, and seamless bot interactions while maintaining professional fintech aesthetics.