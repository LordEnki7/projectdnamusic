# Project DNA Music LLC

## Overview

Project DNA Music LLC is a futuristic music and e-commerce platform for artist Shakim and Project DNA. It serves as a digital storefront for music sales, merchandise, beat licensing, and video content. The platform integrates a modern tech stack with an aesthetic inspired by cosmic energy, DNA helixes, and sacred geometry, offering music streaming, shopping cart functionality, producer services, member-exclusive content, and fan donation features. The project aims to provide a comprehensive and immersive experience for fans while facilitating direct artist-to-fan commerce.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React 18 and TypeScript, using Vite, Wouter for routing, and TanStack Query for server state management. UI components are styled with Shadcn/ui (Radix UI) and Tailwind CSS, featuring a custom dark mode, Orbitron/Inter fonts, and futuristic visuals. React Three Fiber is used for 3D DNA helix animations.

### Backend

The backend uses Express.js with TypeScript, implementing session-based authentication. RESTful API endpoints are exposed under `/api`. Drizzle ORM with Neon Serverless PostgreSQL handles database interactions, using a schema-first approach. Key tables manage users, songs, cart items, donations, and exclusive content. Data seeding automates initial content and updates.

### Membership System

A comprehensive tier-based membership system with session-based authentication secures member-only routes. It includes Free, VIP, and Ultimate Fan tiers, each offering progressive discounts, early access to music, and exclusive content. Stripe is integrated for managing recurring subscriptions, with webhook handlers for subscription lifecycle management. The system supports tier-based discounts, early access to songs based on release dates, and content gating. Users can also manage their subscriptions via an account page UI.

### Phase 3 Features (October 2025)

#### Lyrics Display
Songs now include **lyrics, song meaning, and artist notes** displayed in a Sheet modal accessed from the audio player's info button. Implementation uses static display without sync scrolling (deferred for future enhancement). Backend stores lyrics/meaning/notes in the `songs` table (text fields: `lyrics`, `songMeaning`, `artistNote`). Frontend component (`LyricsSheet.tsx`) displays content in scrollable sections with cosmic-themed styling.

#### Artist Messages ("Message from Shakim")
Homepage displays **personalized messages from the artist** via `ArtistMessage.tsx` component. Admin can create messages through API endpoints (GET/POST `/api/artist-messages`). Each message supports text content, optional image/video media, and CTA buttons. Database table `artist_messages` stores messages with fields: id, title, content, imageUrl, videoUrl, ctaText, ctaUrl, isActive, createdAt. Only active messages are shown to public; system displays most recent active message on homepage.

#### Listening History & Recently Played
Automatic tracking of song playback with **position saving every 10 seconds** after 5 seconds of initial playback. Backend endpoint POST `/api/listening-history` records playback position, duration, and completion status. GET `/api/listening-history/resume/:songId` retrieves resume position for incomplete tracks. Database table `listening_history` tracks: userId, songId, playbackPosition, duration, completed, lastPlayedAt. Frontend displays "Recently Played" section on music page (last 10 tracks with resume functionality). **Resume behavior**: Completed tracks (playbackPosition >= 45s) start from beginning; incomplete tracks resume from last saved position. Throttling ensures exactly ONE save per 10-second interval to prevent duplicate API calls.

#### Fan Wall
Public fan wall at `/fan-wall` where fans **share messages, dedicate songs, and show support**. Features include: message submission form (500 char limit), optional song dedication dropdown (fetches from `/api/songs`), optional "dedicated to" field for personalization, reaction icon selector using lucide-react icons (Fire, Love, Vibes, Magic, Praise, Perfect). Backend endpoints: GET `/api/fan-wall` (approved messages only), POST `/api/fan-wall` (submit for review), GET `/api/admin/fan-wall` (admin moderation). Database table `fan_wall_messages` stores: userId, username, message, songId, dedicatedTo, reaction, approved (0/1), featured (0/1), createdAt. **Moderation system** requires admin approval before messages appear publicly. UI displays messages in responsive grid (1/2/3 columns) with cosmic card design, gradient borders, and hover effects.

#### Playlist Management
Complete playlist system where **authenticated users create, edit, delete playlists and manage songs**. Accessible via "My Playlists" link in user dropdown menu. Backend endpoints: GET `/api/playlists` (user's playlists), GET `/api/playlists/:id` (playlist with songs), POST `/api/playlists` (create), PATCH `/api/playlists/:id` (update), DELETE `/api/playlists/:id` (delete), POST `/api/playlists/:id/songs` (add songs), DELETE `/api/playlists/:id/songs/:songId` (remove song). Database tables: `playlists` (id, userId, name, description, isPublic, coverImage, createdAt, updatedAt) and `playlist_songs` (id, playlistId, songId, position, addedAt). UI features: playlists list page with create/edit/delete, playlist detail page with song management, multi-song selection dialog, AudioPlayer integration for playback within playlists, responsive grid layout with cosmic theming.

#### Likes & Comments System
Unified engagement system allowing fans to **like and comment on songs and videos**. Login required for both actions. Database tables: `content_likes` (userId, entityType, entityId, createdAt) and `content_comments` (userId, username, entityType, entityId, body, createdAt). entityType is 'song' or 'video'. Backend endpoints: GET/POST `/api/content-likes` (toggle like, returns count + likedByUser), GET/POST `/api/content-comments`, DELETE `/api/content-comments/:id` (owner or admin), GET `/api/admin/content-comments` (admin view). Frontend components: `LikeButton.tsx` (heart icon with count, toggles red fill), `CommentSection.tsx` (expandable comment list with form, 500 char limit, delete for admin/owner). Integrated into `AudioPlayer.tsx` (songs) and `VideoCard.tsx` (videos). Admin dashboard Fan Engagement tab includes Comment Moderation section. Users can also delete their own comments.

### Core Features

*   **Email Notification System**: Professional transactional emails for order confirmations, production inquiries, and customer auto-replies via Resend.
*   **Unified Admin Dashboard**: Comprehensive admin interface accessible at both `/admin` and `/admin/dashboard` with tabbed organization:
    - **Overview Tab**: Revenue stats, order summary, and order recovery tool
    - **Add Content Tab**: Forms to add songs, beats, and merchandise
    - **Orders & Messages Tab**: View all orders and production inquiry messages
    - **Fan Engagement Tab**: Manage artist messages, moderate fan wall submissions, and moderate content comments
    - **AI Agents Tab**: Full AI Command Center powered by OpenAI (via Replit AI Integrations). Six autonomous agents with a persistent proposal inbox system:
      - **Command Center Inbox**: Persistent proposal inbox stored in `agent_proposals` DB table. Proposals from all agents are saved with status (pending/approved/rejected/executed). Admin can Approve, Reject (with note), Execute, Restore, or Delete proposals. Full execution result logging with timestamps.
      - **Strategic Action Advisor**: Scans all platform data (orders, users, catalog) and generates ranked business opportunity proposals saved to inbox. Returns health score + overall summary.
      - **Development Architect Agent**: Analyzes platform features, UX gaps, and integration opportunities. Generates feature improvement proposals (type="dev_architect") saved to inbox.
      - **Marketing Agent**: Social media content per product
      - **Sales Intelligence**: DB-driven revenue analysis
      - **Email Campaigns**: Draft + bulk send to all users via Resend
      - **Content Strategy**: 7-day calendar, viral ideas, revenue ideas
      - **Playlist Placement Agent**: Analyzes catalog genres (beat genres) to identify Spotify, Apple Music, SubmitHub, and YouTube curator playlist targets. Saves 4 proposals (type="playlist_placement") to inbox. Endpoint: POST `/api/ai-agents/playlist-placement`. Job type: `playlist_scan`.
      - **Licensing Intelligence Agent**: Scans catalog for sync licensing opportunities (TV, film, ads, games, brands). Saves 4 proposals (type="licensing_deal") to inbox. Endpoint: POST `/api/ai-agents/licensing`. Job type: `licensing_scan`.
      - **Influencer Partnership Agent**: Identifies genre-aligned TikTok, YouTube, Instagram influencer types for partnerships. Saves 4 proposals (type="influencer_collab") to inbox. Endpoint: POST `/api/ai-agents/influencer`. Job type: `influencer_scan`.
      - Note: `songs` table has NO `genre` column — only `beats` table has genre. All agents use beat genres for catalog analysis.
      - Backend routes in `server/aiAgents.ts`; frontend component `client/src/components/AdminAgentHub.tsx`. CRUD routes: GET/PATCH/DELETE `/api/agent-proposals`. All routes require session authentication.
      - **Agent Job System**: Every scan creates a job record tracked through pending→running→completed/failed lifecycle. Table: `agent_jobs`. Routes: GET `/api/agents/jobs`. Jobs Monitor panel in UI (collapsible) shows history with duration, status, and trigger source (user vs system).
      - **Agent Memory System**: Rejecting a proposal writes a `rejection` memory entry; executing writes an `outcome` memory. After execution, admin can report real-world outcomes (success/partial/failed + notes) via "Report How It Went" button on executed proposal cards. Outcome feedback is written to `agent_memory` with structured SUCCESS/PARTIAL/FAILED labels. All agent prompts now inject memory in structured sections (WHAT WORKED, WHAT FAILED, ADMIN REJECTED) and follow explicit LEARNING RULES — building on successes, avoiding failures, refining partials. `agentProposals` table now has `outcomeStatus`, `outcomeNotes`, `outcomeAt` columns. Outcome API: PATCH `/api/agent-proposals/:id/outcome`. Table: `agent_memory`. Routes: GET `/api/agents/memory`. Memory Panel in UI (collapsible) shows entries with type badges.
      - **AI Quality Score**: All 5 agents (Advisor, Architect, Playlist, Licensing, Influencer) now self-rate each proposal `qualityScore` (1–10) based on specificity, feasibility, and actionable ROI. Stored in `agentProposals.qualityScore`. Displayed as a star-icon badge on proposal cards: green (8-10 = High Quality), yellow (5-7 = Solid), red (1-4 = Needs Work). Helps admin prioritize what to approve at a glance.
      - **AI Execution Reports**: When a proposal is executed (via "Execute Now"), the system calls OpenAI to generate a full structured completion report with 7 sections: EXECUTION SUMMARY, ACTION LOG, TIME LOG, ASSETS NEEDED, QUALITY REVIEW, EXPECTED RESULTS, RECOMMENDED NEXT STEPS. Stored in `agentProposals.executionResult` and `agentRuns.resultSummary`. Endpoint: `POST /api/ai-agents/execution-report`. The Execution Log renders these reports with color-coded section headers, numbered steps, key-value pairs, and bullet points — parsed and displayed via `ExecutionReportView` component.
      - **Agent Approvals Audit Log**: Every approve/reject decision is logged to `agent_approvals` table for full audit trail.
      - **Agent Runs Log**: Every executed proposal creates an `agent_runs` record with timing and output.
      - **Daily Auto-Scan**: Server runs `runAdvisorScanJob("system")` automatically 5 minutes after startup, then every 24 hours. Checks DB first to avoid re-running same day. Last auto-scan time shown in Command Center header.
*   **Secure Download Tracking**: Implements secure delivery for digital products with payment verification, a 2-download limit per item, and a recovery page for purchased items. Supports individual and ZIP album downloads.
*   **Album Cover Downloads**: Registered members can download high-quality album artwork via a dedicated gallery page, requiring authentication.

### UI/UX Decisions

The design features a futuristic, sci-fi aesthetic with cosmic energy, DNA strands, and sacred geometry motifs. The color palette uses Deep Space backgrounds with Cosmic Purple/Electric Cyan accents, and Orbitron/Inter typography. Branding includes a 3D glassy bevel logo effect. Animated video elements for the hero background, logos, and merchandise items enhance interactivity and visual engagement.

## External Dependencies

*   **Payment Processing**: **Stripe** for checkout flows, donations, and recurring subscriptions. Utilizes webhooks (`payment_intent.succeeded`) for reliable order creation and subscription management.
*   **Email Service**: **Resend** for all transactional email communications.
*   **Asset Storage**: **Replit Object Storage** for all media files (audio, images, videos), using the `@replit/object-storage SDK` for efficient streaming and build optimization.
*   **Third-Party Libraries**: Radix UI for accessible components, React Three Fiber & Drei for 3D graphics, Lucide React for icons, React Hook Form + Zod for form handling, and Embla Carousel for sliders.
*   **Development Tools**: Drizzle Kit for database migrations, TSX for TypeScript execution.