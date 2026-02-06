-- Migration: Thêm cột image_url cho tin nhắn chat (ảnh)
-- Created: 2026-01

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN chat_messages.image_url IS 'URL ảnh đính kèm (uploads/chat-images/...)';
