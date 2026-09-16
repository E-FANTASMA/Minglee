-- Unified Supabase Schema for Notifications and Popups

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  title TEXT DEFAULT 'Notification',
  type TEXT NOT NULL DEFAULT 'notification', -- 'notification' | 'popup'
  category TEXT DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration for existing tables: Add new columns if missing
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'info';

-- Enable RLS with public service role access policy
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to notifications"
ON public.notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type_dismissed ON public.notifications(user_id, type, is_dismissed, expires_at);
