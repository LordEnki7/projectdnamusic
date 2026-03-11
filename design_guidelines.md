# Project DNA Music LLC - Design Guidelines

## Design Approach
**Selected Approach:** Custom Reference-Based with Futuristic/Sci-Fi Aesthetics  
Drawing inspiration from futuristic music platforms like Spotify's immersive artist experiences, combined with the visual drama of Cyberpunk 2077's neon aesthetics and the organic flow of Awwwards-winning interactive sites. The DNA strand becomes the central visual metaphor threading through every experience.

## Core Design Principles
- **Organic Technology:** Blend biological DNA imagery with digital futuristic elements
- **Energy & Light:** Glowing effects, particle systems, and radiant gradients convey life force
- **Mystical Depth:** Egyptian-inspired geometry and sacred patterns add spiritual dimension
- **Responsive Flow:** Seamless adaptation from desktop to mobile without losing impact

## Color Palette

**Dark Mode Primary (Main Interface):**
- Deep Space: 240 25% 8% (background)
- Cosmic Purple: 270 80% 60% (primary brand)
- Electric Cyan: 180 100% 50% (secondary/accent)
- DNA Helix: 290 70% 55% (tertiary purple-pink)
- Radiant Gold: 45 95% 60% (Egyptian accent - use sparingly for highlights)

**Light Mode (If needed):**
- Clean White: 0 0% 98%
- Soft Lavender: 270 30% 92%
- Deep Purple: 270 60% 25% (text)

**Energy Glow Effects:**
- Purple Glow: 270 100% 70% with 50% opacity blur
- Cyan Pulse: 180 100% 60% with 40% opacity blur

## Typography

**Primary Font:** 'Orbitron' (Google Fonts) - Futuristic, geometric, sci-fi aesthetic  
**Secondary Font:** 'Inter' (Google Fonts) - Clean, readable body text  

**Scale:**
- Hero Titles: text-6xl to text-8xl font-bold (Orbitron)
- Section Headers: text-4xl to text-5xl font-semibold (Orbitron)
- Subheadings: text-xl to text-2xl font-medium (Inter)
- Body Text: text-base to text-lg (Inter)
- Captions: text-sm (Inter)

## Layout System

**Spacing Primitives:** Tailwind units of 4, 8, 12, 16, 20, 24, 32  
- Component padding: p-8 to p-12
- Section spacing: py-20 to py-32
- Card gaps: gap-8 to gap-12

**Grid System:**
- Desktop: 3-4 column grids for songs/merch (grid-cols-3 lg:grid-cols-4)
- Tablet: 2 columns (md:grid-cols-2)
- Mobile: Single column (grid-cols-1)
- Max container width: max-w-7xl

## Component Library

### Navigation
- Sticky header with glass-morphism effect (backdrop-blur-xl bg-opacity-80)
- Logo placement: Left-aligned with DNA strand integration
- Nav links: Orbitron font with cyan underline hover effect
- Mobile: Hamburger menu with slide-in drawer featuring DNA particle animation

### Hero Section (Landing)
- Full viewport height with 3D DNA strand as centerpiece (Three.js implementation)
- Animated particle field background with purple/cyan gradients
- Centered headline: "Project DNA Music LLC" in massive Orbitron type
- Tagline: "Energy • Light • Love Through Sound" with glowing separator dots
- Dual CTAs: "Explore Music" (filled cyan) and "Shop Merch" (outlined with blur)

### Music Player Cards
- Album artwork with holographic overlay on hover
- 45-second preview waveform visualization in cyan
- Price display: "$0.99" in gold with Egyptian-style border ornament
- Play button: Circular with pulsing glow ring
- Add to cart: Icon button with smooth scale animation

### Product Cards (Merchandise)
- Image with diagonal gradient overlay on hover
- Product name in Orbitron medium
- Pricing prominent with Egyptian hieroglyphic-style divider
- Size/variant selector: Pill-style buttons with active glow
- CTA: "Add to Cart" button with energetic hover state

### Cart/Checkout
- Slide-out drawer from right with glass-morphism
- Line items with thumbnail, name, price in structured rows
- Stripe integration UI with futuristic input styling
- Secure badge with DNA helix icon and "Encrypted" text
- Total with glowing emphasis border

### Footer
- Multi-column layout: About, Quick Links, Social, Newsletter
- DNA strand divider line at top with animated pulse
- Egyptian pattern watermark at 5% opacity
- Social icons with cyan glow on hover
- Copyright with small DNA helix icon

## Visual Effects & Animations

**3D DNA Strand:**
- Double helix structure with glowing nodes at connection points
- Slow rotation (15-second full cycle)
- Pulsing energy effect traveling along the strand
- Particle emissions from helix creating mystical aura
- Color gradient: Purple to cyan along strand length

**Micro-interactions:**
- Button hover: Scale 1.05 + glow intensification
- Card hover: Lift with shadow-2xl + border glow
- Link hover: Cyan underline slide-in from left
- Input focus: Cyan border pulse + label lift

**Page Transitions:**
- Fade + slight vertical slide (100ms)
- DNA strand morphs/rotates during navigation

## Images

**Hero Section:** Use the provided DNA_Strand5 image as a textured overlay at 30% opacity behind the 3D DNA element, creating depth and reinforcement of the brand concept

**About Page:** Feature the logo_Real prominently at top, then incorporate DNA strand imagery as section dividers with Egyptian geometric patterns

**Music Page:** Album artwork for each song, fallback to DNA-themed placeholder with track number

**Merch Page:** Product photography on transparent backgrounds with DNA strand watermark at 10% opacity

**Throughout Site:** Use DNA strand imagery as decorative elements in headers, dividers, and background patterns - never as filler but as intentional brand reinforcement

## Accessibility

- WCAG AA contrast ratios maintained with dark backgrounds
- All interactive elements minimum 44x44px touch target
- Focus indicators: 2px cyan ring with 4px offset
- Screen reader labels for all icon-only buttons
- Reduced motion alternatives for all animations

## Mobile Optimization

- Touch-friendly 56px minimum button height
- Simplified 3D DNA (lower polygon count for performance)
- Collapsible sections for discography/tracklist
- Swipeable product galleries
- Fixed bottom CTA bar on product/song pages