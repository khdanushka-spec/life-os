# AURA OS — Product Vision

**Tagline:** Your life. Beautifully organized. Intelligently guided.

## Vision

Build a next-generation AI-powered personal operating system that helps manage every aspect of life in one place.

This is not a productivity app. This is not a note-taking app. This is not a calendar.

It is a personal digital headquarters — a place where AI understands goals, routines, knowledge, and priorities, helping make better decisions every day.

The experience should feel calm, premium, intuitive, and effortless.

## Design Philosophy

Inspired by: Apple Human Interface Guidelines, Nothing OS, Arc Browser, Linear, Notion, Craft, Raycast, iOS 26, visionOS.

**Core principles:** calm technology, minimal distractions, beautiful typography, spacious layouts, smooth animations, AI-first interactions, fast performance, emotional design, mobile-first, desktop excellence.

## Home Screen

Never feels crowded. Answers: *What should I do now? What deserves my attention? What can wait?*

- **Morning Briefing** — greeting, weather, time, calendar overview, energy suggestion, AI daily summary
- **Today's Focus** — AI-selected top 3 priorities, upcoming deadlines, important reminders
- **Smart Timeline** — visual timeline of the day: Current / Next / Later / Completed
- **Daily Momentum** — circular progress across Tasks, Health, Learning, Finance, Habits
- **AI Suggestions** — e.g. "You have a free 90-minute focus block.", "You've skipped exercise for two days.", "You usually review finances on Fridays.", "You have three unfinished projects."

## AI Brain

Knows: goals, projects, documents, notes, habits, calendar, finances, health, learning, journal, travel, reading. Answers naturally, e.g. "What should I work on next?", "When was my last doctor's appointment?", "Show all notes about investing.", "What did I learn this month?", "Summarize this week's achievements."

## Life Areas

- **Personal** — journal, diary, mood, reflection, dreams, gratitude
- **Work** — projects, meetings, clients, tasks, deadlines, documents
- **Health** — exercise, nutrition, sleep, water, weight, medical records, mental wellbeing
- **Finance** — income, expenses, savings, subscriptions, investments, budget, bills, goals
- **Learning** — courses, books, research, skills, certificates, reading progress, flashcards
- **Family** — birthdays, events, shared reminders, gift ideas, photos, important documents
- **Travel** — trips, flights, hotels, packing, countries, wishlist, travel memories

## Knowledge Vault (Second Brain)

Everything stored and searchable by AI: notes, PDFs, images, videos, bookmarks, voice notes, meeting recordings.

## AI Features

Daily/weekly/monthly planning, life coaching, habit analysis, goal recommendations, time optimization, decision support, writing assistant, research assistant, meal suggestions, workout suggestions, financial insights, document summaries, voice conversations, natural language search.

## Smart Automation

Rule-based triggers, e.g. "If rain is forecast tomorrow, remind me to take an umbrella.", "When I arrive at work, show today's work tasks.", "When I arrive home, show personal tasks.", "If I miss a habit for three days, remind me.", "When my passport expires in six months, notify me.", "When a subscription renews, remind me."

## Universal Search

Instant search across tasks, notes, documents, people, calendar, goals, habits, projects, journal, voice notes, photos.

## Widgets

Resizable and rearrangeable: Today's Focus, Calendar, Habits, Weather, Countdowns, Music, Water intake, Finances, Health, Journal, AI Chat, Quick Notes.

## Mobile Experience

Feels like a native iPhone app — offline support, widgets, quick actions, Face ID, push notifications, voice input, camera scanning, document OCR.

## Desktop Experience

Keyboard-first — Command Palette, split-screen, multi-window, drag and drop, quick capture, keyboard shortcuts.

## Visual Style

Glassmorphism (used sparingly), soft gradients, rounded corners, floating cards, elegant typography, subtle shadows, dark mode, light mode, smooth transitions. Motion that enhances usability, not decoration.

## Technical Stack

- Next.js 16 (spec requested 15; 16 was current stable at scaffold time — see [README](../README.md#note-on-next-16))
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Framer Motion
- PostgreSQL
- Prisma ORM 7
- Supabase Authentication
- AI SDK (OpenAI + Anthropic models)
- PWA support, offline-first architecture
- Vercel deployment

## Final Objective

Create a world-class personal operating system that is beautiful, intelligent, secure, and fast. Every feature should reduce mental load, helping focus on what matters instead of managing information. AI should act as a thoughtful assistant that anticipates needs, organizes knowledge, and helps achieve long-term goals while keeping the interface calm and enjoyable to use.

Build in modular phases with clean architecture, reusable components, comprehensive documentation, and production-ready code. Each phase should be fully functional before moving to the next.
