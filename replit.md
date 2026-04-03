# Project DNA Music LLC

## Overview

Project DNA Music LLC is a futuristic music and e-commerce platform designed for artist Shakim and Project DNA. It serves as a digital storefront for music sales, merchandise, beat licensing, and video content, aiming to provide an immersive experience for fans and facilitate direct artist-to-fan commerce. Key capabilities include music streaming, a shopping cart, producer services, member-exclusive content, and fan donation features. The project seeks to blend a modern tech stack with an aesthetic inspired by cosmic energy, DNA helixes, and sacred geometry.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend uses React 18, TypeScript, Vite, Wouter for routing, and TanStack Query for server state management. UI components are styled with Shadcn/ui (Radix UI) and Tailwind CSS, featuring a custom dark mode, Orbitron/Inter fonts, and futuristic visuals. React Three Fiber is employed for 3D DNA helix animations.

### Backend

The backend is built with Express.js and TypeScript, using session-based authentication. RESTful API endpoints are exposed under `/api`. Drizzle ORM with Neon Serverless PostgreSQL handles database interactions, following a schema-first approach for managing users, songs, cart items, donations, and exclusive content.

### Membership System

A tier-based membership system with Free, VIP, and Ultimate Fan tiers offers progressive discounts, early access, and exclusive content, secured by session-based authentication. Stripe is integrated for managing recurring subscriptions, with webhook handlers for subscription lifecycle management. Users can manage subscriptions via a dedicated UI.

### Core Features

*   **Lyrics Display**: Songs include lyrics, song meaning, and artist notes displayed in a Sheet modal from the audio player.
*   **Artist Messages**: Homepage displays personalized, active messages from the artist, managed by admins.
*   **Listening History**: Automatic tracking of song playback with position saving every 10 seconds, enabling "Recently Played" and resume functionality.
*   **Fan Wall**: A public platform for fans to share messages, dedicate songs, and show support, with admin moderation required for public display.
*   **Playlist Management**: Authenticated users can create, edit, and delete playlists, and manage songs within them.
*   **Likes & Comments System**: A unified engagement system allowing logged-in users to like and comment on songs and videos.
*   **Email Notification System**: Professional transactional emails for various platform interactions via Resend.
*   **Unified Admin Dashboard**: A comprehensive admin interface for managing content, orders, fan engagement, and an AI Command Center.
    *   **AI Command Center**: Features six autonomous AI agents (Strategic Action Advisor, Development Architect, Marketing, Sales, Email Campaigns, Content Strategy, Playlist Placement, Licensing Intelligence, Influencer Partnership) with a persistent proposal inbox system.
    *   **Agent Features**: Includes a job system for tracking scans, a memory system for learning from past outcomes (rejections/executions), a self-assigned quality score for proposals, and detailed execution reports. An audit log tracks admin decisions, and a daily auto-scan runs advisor jobs.
*   **Secure Download Tracking**: Secure delivery for digital products with payment verification, a 2-download limit, and a recovery page.
*   **Album Cover Downloads**: Registered members can download high-quality album artwork.

### Fan Onboarding Sequence

Conversational onboarding flow triggered immediately after signup. Adapts the N1M message sequence to a web-native chat experience.

**Flow** (`/welcome` page):
1. User signs up → redirected to `/welcome` instead of `/exclusive`
2. Chat-style UI appears with Shakim's avatar — messages appear with typing animation
3. **Step 1**: "Appreciate you rocking with my music for real. What city you listening from?" → free text input → saved to `users.city`
4. **Step 2**: "What kind of tracks from me hit you the hardest?" → 4 vibe buttons (Smooth / Deep / Soulful / Straight Energy) → saved to `users.musicVibe`
5. **Step 3**: Personalized response based on their vibe → completion cards (Catalog, Exclusive Content, Merch) → personalized email sent via Resend mentioning their city and music vibe
6. If user already completed onboarding (`onboardingStep >= 3`), redirect to `/exclusive` immediately

**Database**: `users.city` (text), `users.musicVibe` (text), `users.onboardingStep` (integer 0–3)
**API**: `PATCH /api/auth/onboarding` — saves fields, sends completion email at step 3
**Auth shape**: `city`, `musicVibe`, `onboardingStep` now included in all auth responses (signup, login, checkAuth)

### DNA Radio & My Station

A two-layer radio system:
*   **DNA Radio**: A public, synchronized radio experience where all visitors hear the same song at the same moment, determined by a server-side clock.
*   **My Station**: For signed-in users, allowing continuous, looping playback of any selected playlist in a radio mode with a full-screen UI.

### UI/UX Decisions

The design adopts a futuristic, sci-fi aesthetic with cosmic energy, DNA strands, and sacred geometry motifs. The color palette utilizes Deep Space backgrounds with Cosmic Purple/Electric Cyan accents, and Orbitron/Inter typography. Branding includes a 3D glassy bevel logo effect, with animated video elements enhancing interactivity and visual engagement.

## External Dependencies

*   **Payment Processing**: Stripe for checkout, donations, and recurring subscriptions, utilizing webhooks for order and subscription management.
*   **Email Service**: Resend for all transactional email communications.
*   **Asset Storage**: Replit Object Storage for all media files (audio, images, videos), using the `@replit/object-storage SDK`.
*   **Third-Party Libraries**: Radix UI, React Three Fiber & Drei, Lucide React, React Hook Form + Zod, Embla Carousel.
*   **Development Tools**: Drizzle Kit, TSX.