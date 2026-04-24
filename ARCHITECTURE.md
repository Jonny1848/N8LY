# N8LY App - Architektur-Dokumentation

## 🎯 Kritische Analyse & Verbesserungsvorschläge

### **Deine Ideen - Was ich gut finde:**

1. **Homepage mit Map** - Hervorragend! Visual Event Discovery ist ein starker USP
2. **Filter per Swipe** - Intuitive UX, ähnlich wie Tinder/Dating-Apps
3. **Bildergalerie in Chats** - Das ist wirklich ein Alleinstellungsmerkmal! Perfekt für Event-Memories
4. **Host-Modus** - Smart, ihr kontrolliert die Event-Qualität

### **Kritische Punkte & meine Empfehlungen:**

#### 🚨 **Seite 4 - "Such- und Posting-Funktion"**

**Problem:** Diese Idee verwässert euren USP und schafft Moderation-Probleme.

**Meine Empfehlung:** 
- **STATTDESSEN:** "Discover"-Seite mit:
  - **Trending Events** (Hot Right Now)
  - **Friends' Activities** (Welche Events besuchen deine Freunde?)
  - **Personalisierte Empfehlungen** (basierend auf Musikgeschmack/Präferenzen)
  - **"Going Solo"** Badge-System (zeigt wer alleine zu Events geht - subtiles Matching)

**Warum besser?**
- Kein Moderation-Aufwand für User-Generated-Posts
- Fokussiert auf Event-Discovery statt Social-Media-Konkurrenz
- Natürliches Kennenlernen über gemeinsame Event-Interessen

#### 💡 **Zusätzliche Feature-Ideen:**

1. **"Squad Mode"** - Freunde können gemeinsam Events planen
2. **Event-Check-In** - QR-Code-System für Anwesenheitsbestätigung
3. **After-Event-Rating** - User bewerten Events (hilft Hosts & anderen Usern)
4. **Favoriten-Locations** - User können Venues folgen
5. **Notification-System** - Push-Benachrichtigungen für:
   - Events in Lieblingslocations
   - Freunde die zum selben Event gehen
   - Last-Minute-Tickets

---

## 🏗️ Technische Architektur

### **Technologie-Stack Empfehlung:**

```
Frontend:
├── React Native + Expo
├── @rnmapbox/maps (für die Map-Ansicht)
├── Expo Router (Navigation)
├── NativeWind (Styling)
├── React Query (State Management + API-Caching)
└── Zustand (Globaler App-State)

Backend:
├── Supabase (Primär)
│   ├── PostgreSQL (Datenbank)
│   ├── Authentication
│   ├── Row Level Security (RLS)
│   ├── Storage (Bilder, Avatare)
│   └── Realtime (Chat)
├── Stripe (Payment-Integration)
├── Supabase Edge Functions (Serverless)
│   ├── Ticket-Verkauf-Logik
│   ├── Payment-Webhooks
│   └── Push-Notifications
└── Optional: Redis (Caching für Performance)

Services:
├── OneSignal/Expo Notifications (Push)
├── Sentry (Error Tracking)
└── Analytics (Mixpanel/PostHog)
```

### **Chat-Infrastruktur Empfehlung:**

**Für euren MVP: Supabase Realtime**
- ✅ Bereits integriert
- ✅ Keine zusätzlichen Kosten
- ✅ Ausreichend für Text + Bilder
- ✅ Einfache Implementierung

**Später upgraden zu Stream Chat**, wenn:
- Ihr >10.000 aktive User habt
- Ihr Video/Voice-Chat wollt
- Ihr advanced Features braucht (Typing-Indicators, Read-Receipts etc.)

---

## 📊 Datenbank-Schema (Supabase PostgreSQL)

### User-Management

```sql
-- USER-MANAGEMENT
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text,
  age integer,
  avatar_url text,
  bio text,
  favorite_city text,
  location_enabled boolean DEFAULT false,
  is_public boolean DEFAULT true,
  is_host boolean DEFAULT false,
  music_genres jsonb DEFAULT '[]'::jsonb,
  party_preferences jsonb DEFAULT '[]'::jsonb,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_age CHECK (age >= 18 AND age <= 120),
  CONSTRAINT valid_username CHECK (length(username) >= 3 AND length(username) <= 30)
);

-- Index für Performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_favorite_city ON profiles(favorite_city);
CREATE INDEX idx_profiles_is_host ON profiles(is_host);
```

### Event-Management

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL, -- 'club', 'rooftop', 'festival', 'bar', 'concert', 'outdoor'
  music_genres jsonb DEFAULT '[]'::jsonb,
  date timestamptz NOT NULL,
  end_date timestamptz,
  location jsonb NOT NULL, -- { lat: number, lng: number, address: string, city: string, venue_name: string }
  image_urls text[] DEFAULT ARRAY[]::text[],
  ticket_price numeric(10,2),
  ticket_available integer,
  ticket_sold integer DEFAULT 0,
  external_ticket_url text,
  is_boosted boolean DEFAULT false,
  boost_expires_at timestamptz,
  status text DEFAULT 'active', -- 'active', 'cancelled', 'ended', 'sold_out'
  min_age integer DEFAULT 18,
  max_capacity integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > date),
  CONSTRAINT valid_price CHECK (ticket_price IS NULL OR ticket_price >= 0),
  CONSTRAINT valid_tickets CHECK (ticket_available IS NULL OR ticket_available >= 0),
  CONSTRAINT valid_status CHECK (status IN ('active', 'cancelled', 'ended', 'sold_out'))
);

-- Indices für Performance
CREATE INDEX idx_events_host_id ON events(host_id);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_location ON events USING gin(location);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_is_boosted ON events(is_boosted) WHERE is_boosted = true;

-- Spatial index für Location-basierte Queries (PostGIS könnte später hinzugefügt werden)
```

### Ticket-Management

```sql
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purchase_date timestamptz DEFAULT now(),
  qr_code text UNIQUE NOT NULL,
  price_paid numeric(10,2) NOT NULL,
  payment_intent_id text UNIQUE, -- Stripe Payment Intent ID
  status text DEFAULT 'valid', -- 'valid', 'used', 'cancelled', 'refunded'
  checked_in_at timestamptz,
  refund_requested_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_price CHECK (price_paid >= 0),
  CONSTRAINT valid_status CHECK (status IN ('valid', 'used', 'cancelled', 'refunded')),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX idx_tickets_payment_intent ON tickets(payment_intent_id);
```

### Social Features

```sql
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'blocked')),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'interested', -- 'interested', 'going', 'attended'
  visibility text DEFAULT 'public', -- 'public', 'friends', 'private'
  going_solo boolean DEFAULT false, -- NEU: "Going Solo" Badge
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('interested', 'going', 'attended')),
  CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'friends', 'private')),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_status ON event_attendees(status);
CREATE INDEX idx_event_attendees_going_solo ON event_attendees(going_solo) WHERE going_solo = true;
```

### Chat-System

```sql
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- 'direct', 'group', 'event'
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  name text,
  image_url text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz,
  
  CONSTRAINT valid_type CHECK (type IN ('direct', 'group', 'event')),
  CONSTRAINT event_chat_has_event CHECK (
    (type = 'event' AND event_id IS NOT NULL) OR 
    (type != 'event' AND event_id IS NULL)
  )
);

CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_event_id ON conversations(event_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE TABLE conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_admin boolean DEFAULT false,
  is_muted boolean DEFAULT false,
  left_at timestamptz,
  
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_participants_active ON conversation_participants(conversation_id, user_id) 
  WHERE left_at IS NULL;

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text,
  type text DEFAULT 'text', -- 'text', 'image', 'system', 'memory_shared'
  metadata jsonb DEFAULT '{}'::jsonb,
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_type CHECK (type IN ('text', 'image', 'system', 'memory_shared')),
  CONSTRAINT has_content CHECK (
    (type = 'text' AND content IS NOT NULL) OR 
    (type != 'text')
  )
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
```

### Event Memories (USP-Feature!)

```sql
CREATE TABLE event_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  thumbnail_url text,
  caption text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  is_public boolean DEFAULT false, -- Nur für Teilnehmer des Chats sichtbar
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_caption CHECK (caption IS NULL OR length(caption) <= 500)
);

CREATE INDEX idx_memories_conversation_id ON event_memories(conversation_id);
CREATE INDEX idx_memories_event_id ON event_memories(event_id);
CREATE INDEX idx_memories_uploaded_by ON event_memories(uploaded_by);
CREATE INDEX idx_memories_created_at ON event_memories(created_at DESC);

CREATE TABLE memory_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES event_memories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(memory_id, user_id)
);

CREATE INDEX idx_memory_likes_memory_id ON memory_likes(memory_id);
CREATE INDEX idx_memory_likes_user_id ON memory_likes(user_id);

CREATE TABLE memory_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES event_memories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_content CHECK (length(content) >= 1 AND length(content) <= 500)
);

CREATE INDEX idx_memory_comments_memory_id ON memory_comments(memory_id);
CREATE INDEX idx_memory_comments_created_at ON memory_comments(created_at DESC);
```

### Venue-Management

```sql
CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location jsonb NOT NULL, -- { lat, lng, address, city, postal_code }
  venue_type text[] DEFAULT ARRAY[]::text[], -- ['club', 'rooftop', 'bar']
  rating numeric(3,2),
  rating_count integer DEFAULT 0,
  images text[] DEFAULT ARRAY[]::text[],
  description text,
  website_url text,
  instagram_handle text,
  phone text,
  capacity integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

CREATE INDEX idx_venues_name ON venues(name);
CREATE INDEX idx_venues_location ON venues USING gin(location);

CREATE TABLE venue_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(venue_id, user_id)
);

CREATE INDEX idx_venue_followers_venue_id ON venue_followers(venue_id);
CREATE INDEX idx_venue_followers_user_id ON venue_followers(user_id);

CREATE TABLE venue_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT valid_comment CHECK (comment IS NULL OR length(comment) <= 1000),
  UNIQUE(venue_id, user_id)
);

CREATE INDEX idx_venue_reviews_venue_id ON venue_reviews(venue_id);
```

### Analytics & Reporting

```sql
CREATE TABLE event_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now(),
  session_id uuid,
  
  -- Tracking-Daten
  source text, -- 'map', 'list', 'discover', 'friend_activity', 'notification'
  device_info jsonb
);

CREATE INDEX idx_event_views_event_id ON event_views(event_id);
CREATE INDEX idx_event_views_user_id ON event_views(user_id);
CREATE INDEX idx_event_views_viewed_at ON event_views(viewed_at DESC);

CREATE TABLE user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'event_view', 'filter_change', 'search', 'chat_sent', 'memory_upload'
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_log_action ON user_activity_log(action);
CREATE INDEX idx_activity_log_created_at ON user_activity_log(created_at DESC);

-- Für Empfehlungs-Algorithmus
CREATE TABLE event_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interaction_type text NOT NULL, -- 'view', 'like', 'share', 'ticket_purchase'
  interaction_score numeric(5,2) DEFAULT 1.0, -- Gewichtung für Algorithmus
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_interaction CHECK (
    interaction_type IN ('view', 'like', 'share', 'ticket_purchase', 'interest', 'going')
  )
);

CREATE INDEX idx_interactions_event_id ON event_interactions(event_id);
CREATE INDEX idx_interactions_user_id ON event_interactions(user_id);
CREATE INDEX idx_interactions_type ON event_interactions(interaction_type);
```

---

## 🗂️ Projekt-Ordnerstruktur

```
/Users/jean-philippenjikenana/Documents/GitHub/N8LY/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx                # Root redirect
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.jsx
│   │   ├── signup.jsx
│   │   └── callback.jsx
│   ├── (onboarding)/
│   │   ├── _layout.tsx
│   │   ├── index.jsx            # Onboarding Start
│   │   ├── username.jsx
│   │   ├── age.jsx
│   │   ├── city.jsx
│   │   ├── location.jsx
│   │   ├── avatar.jsx
│   │   ├── music.jsx
│   │   ├── preferences.jsx
│   │   ├── bio.jsx
│   │   ├── privacy.jsx
│   │   └── complete.jsx
│   ├── (tabs)/                  # ⭐ Neue Tab-Navigation
│   │   ├── _layout.tsx          # Bottom Tab Navigator Config
│   │   ├── home.tsx             # 🏠 Map-Ansicht
│   │   ├── events.tsx           # 📅 Event-Liste
│   │   ├── social.tsx           # 💬 Chat-Übersicht
│   │   ├── discover.tsx         # 🔍 Discover/Empfehlungen
│   │   └── profile.tsx          # 👤 User-Account
│   ├── (modals)/                # Modal-Screens (Stack over Tabs)
│   │   ├── event/[id].tsx       # Event Details
│   │   ├── chat/[id].tsx        # Chat-Conversation
│   │   ├── memories/[conversationId].tsx  # Event Memories Gallery
│   │   ├── filter.tsx           # Filter-Panel (Swipe)
│   │   ├── ticket-purchase/[eventId].tsx
│   │   ├── user/[username].tsx  # Anderer User-Profile
│   │   ├── venue/[id].tsx       # Venue Details
│   │   └── qr-scanner.tsx       # Ticket Check-In
│   └── (host)/                  # Host-spezifische Screens
│       ├── _layout.tsx
│       ├── dashboard.tsx
│       ├── create-event.tsx
│       ├── edit-event/[id].tsx
│       ├── manage-events.tsx
│       ├── boost-event/[id].tsx
│       └── analytics.tsx
├── components/
│   ├── map/
│   │   ├── EventMap.tsx
│   │   ├── EventMarker.tsx
│   │   ├── MapControls.tsx
│   │   ├── UserLocationMarker.tsx
│   │   └── ClusterMarker.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   ├── EventList.tsx
│   │   ├── EventFilter.tsx
│   │   ├── TicketCard.tsx
│   │   ├── EventHeader.tsx
│   │   ├── AttendeesList.tsx
│   │   └── EventActions.tsx
│   ├── chat/
│   │   ├── ChatList.tsx
│   │   ├── ChatListItem.tsx
│   │   ├── ChatBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── EventMemoryGallery.tsx
│   │   ├── MemoryCard.tsx
│   │   └── UploadMemoryButton.tsx
│   ├── social/
│   │   ├── FriendsList.tsx
│   │   ├── FriendRequest.tsx
│   │   ├── UserCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   └── GoingSoloBadge.tsx
│   ├── discover/
│   │   ├── TrendingEvents.tsx
│   │   ├── FriendsActivity.tsx
│   │   ├── PersonalizedRecommendations.tsx
│   │   └── CategorySlider.tsx
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   ├── TicketsList.tsx
│   │   ├── StatisticsCard.tsx
│   │   └── SettingsMenu.tsx
│   ├── shared/
│   │   ├── Avatar.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── Loading.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorBoundary.tsx
│   └── ui/                      # Bestehende Gluestack-UI
│       └── ...
├── lib/
│   ├── supabase.js              # ✅ Bestehend
│   ├── api/
│   │   ├── events.ts
│   │   ├── chat.ts
│   │   ├── tickets.ts
│   │   ├── social.ts
│   │   ├── venues.ts
│   │   └── analytics.ts
│   ├── hooks/
│   │   ├── useEvents.ts
│   │   ├── useEvent.ts
│   │   ├── useChat.ts
│   │   ├── useMessages.ts
│   │   ├── useLocation.ts
│   │   ├── useTickets.ts
│   │   ├── useFriends.ts
│   │   ├── useEventMemories.ts
│   │   └── useRealtimeSubscription.ts
│   ├── utils/
│   │   ├── location.ts
│   │   ├── dateTime.ts
│   │   ├── qrCode.ts
│   │   ├── imageUpload.ts
│   │   ├── imageCompression.ts
│   │   ├── distance.ts
│   │   └── validation.ts
│   ├── store/
│   │   ├── userStore.ts         # Zustand - User State
│   │   ├── filterStore.ts       # Map Filter State
│   │   ├── chatStore.ts         # Chat State
│   │   └── locationStore.ts     # Current Location
│   └── types/
│       ├── database.types.ts    # Supabase Generated Types
│       ├── event.types.ts
│       ├── chat.types.ts
│       └── user.types.ts
├── services/
│   ├── stripe.ts                # Payment Integration
│   ├── notifications.ts         # Push Notifications
│   ├── analytics.ts             # Analytics Tracking
│   └── storage.ts               # Supabase Storage Wrapper
├── constants/
│   ├── theme.js                 # ✅ Bestehend
│   ├── eventTypes.ts
│   ├── musicGenres.ts
│   ├── config.ts
│   └── mapStyles.ts
├── assets/
│   └── ... (bestehend)
└── supabase/
    ├── migrations/
    │   ├── 001_initial_schema.sql
    │   ├── 002_rls_policies.sql
    │   ├── 003_functions.sql
    │   └── 004_triggers.sql
    └── functions/
        ├── ticket-purchase/
        ├── stripe-webhook/
        ├── send-notification/
        └── event-recommendations/
```

---

## 🎨 Navigation & Screen-Flow

### Tab-Navigation Struktur

```typescript
// app/(tabs)/_layout.tsx
<Tabs>
  <Tab name="home" icon="map-pin" />
  <Tab name="events" icon="calendar" />
  <Tab name="social" icon="message-circle" />
  <Tab name="discover" icon="compass" />
  <Tab name="profile" icon="user" />
</Tabs>
```

### Screen Hierarchie

```
Auth Flow:
  Login → Signup → Onboarding → Tabs

Main App (Tabs):
  ├── Home (Map)
  │   ├── → Filter Modal (Swipe Right)
  │   └── → Event Details Modal
  ├── Events (List)
  │   └── → Event Details Modal
  ├── Social (Chats)
  │   ├── → Chat Modal
  │   └── → Memories Gallery Modal
  ├── Discover
  │   ├── → Event Details Modal
  │   └── → User Profile Modal
  └── Profile
      ├── → My Tickets
      ├── → Settings
      └── → Edit Profile

Host Flow:
  Host Dashboard → Create/Edit Event → Analytics
```

---

## 🔐 Sicherheit & Row Level Security (RLS)

### Core RLS-Policies

```sql
-- ============================================
-- PROFILES: User können nur ihr eigenes Profil bearbeiten
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
TO authenticated
USING (is_public = true OR id = auth.uid());

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- EVENTS: Nur Hosts können Events erstellen
-- ============================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
ON events FOR SELECT
TO authenticated
USING (status = 'active' OR host_id = auth.uid());

CREATE POLICY "Hosts can create events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE is_host = true
  )
);

CREATE POLICY "Hosts can update own events"
ON events FOR UPDATE
TO authenticated
USING (host_id = auth.uid())
WITH CHECK (host_id = auth.uid());

-- ============================================
-- TICKETS: User sehen nur ihre eigenen Tickets
-- ============================================
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own tickets"
ON tickets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only system can create tickets"
ON tickets FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- MESSAGES: Nur Chat-Teilnehmer sehen Nachrichten
-- ============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants see messages"
ON messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND left_at IS NULL
  )
);

CREATE POLICY "Chat participants can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND left_at IS NULL
  )
  AND sender_id = auth.uid()
);

-- ============================================
-- EVENT_MEMORIES: Nur Chat-Teilnehmer
-- ============================================
ALTER TABLE event_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants see memories"
ON event_memories FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Conversation participants upload memories"
ON event_memories FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND left_at IS NULL
  )
);
```

---

## 💳 Payment-Flow (Stripe Integration)

### Ticket-Kauf Ablauf

```
1. User wählt Event
   ↓
2. Klick auf "Ticket kaufen"
   ↓
3. [Frontend] Validation:
   - Event noch verfügbar?
   - User bereits Ticket gekauft?
   - Preis korrekt?
   ↓
4. [Frontend] Ruft Edge Function auf:
   POST /functions/v1/create-payment-intent
   Body: { eventId, userId }
   ↓
5. [Edge Function] Erstellt Stripe Payment Intent
   - Berechnet Gesamtpreis (inkl. Gebühren)
   - Speichert temporären Eintrag in DB
   - Gibt client_secret zurück
   ↓
6. [Frontend] Zeigt Stripe Payment-Sheet
   - User gibt Zahlungsdaten ein
   - Zahlung wird abgewickelt
   ↓
7. [Stripe] Sendet Webhook an:
   POST /functions/v1/stripe-webhook
   ↓
8. [Edge Function] Verarbeitet Webhook:
   - Validiert Signatur
   - Bei Erfolg:
     * Erstellt Ticket in DB
     * Generiert QR-Code
     * Aktualisiert ticket_sold Counter
     * Sendet Push-Notification
   - Bei Fehler:
     * Rollback
     * Benachrichtigt User
   ↓
9. [Frontend] Zeigt Success-Screen
   - QR-Code Display
   - Ticket-Details
   - "In Apple Wallet hinzufügen" Button
```

### Gebühren-Struktur

```typescript
interface PricingModel {
  ticketPrice: number;
  serviceFee: number;      // z.B. 10% für euch
  paymentFee: number;       // Stripe: ~2.9% + 0.30€
  totalPrice: number;
}

// Beispiel:
// Ticket: 20€
// Service: 2€ (10%)
// Payment: 0.69€ (2.9% + 0.30€)
// Total: 22.69€
```

---

## 📱 Implementierungs-Roadmap

### **Phase 1: Core MVP (8-10 Wochen)**

#### Woche 1-2: Foundation
- [x] Onboarding (bereits erledigt)
- [ ] Bottom Tab Navigation implementieren
- [ ] Basis-Layout für alle 5 Tabs
- [ ] Supabase Datenbank-Schema aufsetzen
- [ ] RLS-Policies implementieren

#### Woche 3-4: Home & Events
- [ ] [@rnmapbox/maps](https://github.com/rnmapbox/maps) Integration
- [ ] Event-Marker auf Map anzeigen
- [ ] Filter-Panel mit Swipe-Gesture
- [ ] Event-Liste Screen
- [ ] Event-Details Modal

#### Woche 5-6: Social Core
- [ ] Chat-System (1-zu-1)
- [ ] Supabase Realtime Integration
- [ ] Message-Input Component
- [ ] Chat-Liste

#### Woche 7-8: Profile & Polish
- [ ] User-Profile Screen
- [ ] Settings
- [ ] Freundschafts-System Basis
- [ ] Bug-Fixes & UX-Verbesserungen

---

### **Phase 2: Social Features (6-8 Wochen)**

#### Woche 9-10: Erweiterte Social Features
- [ ] Gruppen-Chats
- [ ] Event-spezifische Chats
- [ ] Freundschafts-Anfragen UI

#### Woche 11-13: Event Memories (USP!)
- [ ] Bildergalerie in Conversations
- [ ] Upload-Funktion
- [ ] Likes & Comments
- [ ] Memory-Notifications

#### Woche 14-16: Discover Page
- [ ] Trending Events
- [ ] Friends' Activities Feed
- [ ] Personalisierte Empfehlungen (ML-Algorithmus)
- [ ] "Going Solo" Feature

---

### **Phase 3: Monetarisierung (8-10 Wochen)**

#### Woche 17-19: Stripe Integration
- [ ] Stripe Account Setup
- [ ] Payment-Flow Frontend
- [ ] Edge Functions: create-payment-intent
- [ ] Edge Functions: stripe-webhook
- [ ] Ticket-Erstellung

#### Woche 20-22: Ticketing-System
- [ ] QR-Code Generation
- [ ] Ticket-Display in App
- [ ] Check-In System (Host)
- [ ] Apple Wallet Integration

#### Woche 23-24: Host-Features
- [ ] Host-Dashboard
- [ ] Event-Erstellung UI
- [ ] Event-Analytics
- [ ] Boost-System

---

### **Phase 4: Scale & Optimize (fortlaufend)**

#### Performance
- [ ] React Query für API-Caching
- [ ] Bildoptimierung (Thumbnails)
- [ ] Infinite Scroll
- [ ] Lazy Loading

#### Notifications
- [ ] Expo Notifications Setup
- [ ] Push für neue Messages
- [ ] Push für Event-Updates
- [ ] Push für Freundschafts-Anfragen

#### Analytics & Testing
- [ ] Sentry Error-Tracking
- [ ] Mixpanel/PostHog Analytics
- [ ] A/B Testing Setup
- [ ] Beta-Testing Phase

---

## 🚀 Nächste Schritte

### Sofort umsetzen:
1. **Datenbank-Migrationen erstellen** (SQL-Skripte)
2. **Bottom Tab Navigation implementieren** (expo-router)
3. **[@rnmapbox/maps](https://github.com/rnmapbox/maps) installieren und konfigurieren**

### Packages installieren:
```bash
# Map
npm install @rnmapbox/maps

# State Management
npm install zustand @tanstack/react-query

# Stripe
npm install @stripe/stripe-react-native

# Utilities
npm install date-fns
npm install react-native-qrcode-svg
```

---

## 💡 Weitere Empfehlungen

### Performance-Optimierungen
- Verwende React Query für Event-Caching (reduziert API-Calls)
- Implementiere Virtualisierung für lange Listen (FlashList statt FlatList)
- Komprimiere Bilder vor Upload (expo-image-manipulator)
- Implementiere Pagination für Events (50 pro Page)

### UX-Verbesserungen
- Skeleton-Loader während Daten laden
- Optimistic Updates für Chat (instant UI-Feedback)
- Haptic Feedback bei Interaktionen
- Dark Mode Support

### Skalierbarkeit
- Verwende Supabase Edge Functions für heavy Logik
- Implementiere Redis-Caching für häufige Queries
- CDN für Bilder (Supabase Storage hat CDN integriert)
- Database-Indizes für Performance (siehe Schema)

---

## 📊 Geschätzte Kosten (Monthly, bei 1000 aktiven Usern)

```
Supabase:
  - Free Tier: 0€ (bis 500MB DB, 1GB Bandwidth)
  - Pro: ~25€/Monat (empfohlen ab Launch)

Stripe:
  - 2.9% + 0.30€ pro Transaktion
  - Bei 100 Tickets á 20€ = ~67€ Gebühren

Expo:
  - Free bis 100k Requests/Monat

OneSignal/Notifications:
  - Free bis 10k Subscribers

Gesamt MVP: ~25-50€/Monat
Bei 10k Usern: ~100-200€/Monat
```

---

**Status: Architektur-Plan fertiggestellt ✅**

Nächster Schritt: Implementation starten!