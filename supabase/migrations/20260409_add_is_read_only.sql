-- Add is_read_only column to support Copy-on-Write versioning.
-- When a new version is created via "Revise", the previous version row
-- will be locked (is_read_only = true) to preserve historical data integrity.
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: Add an index for quick lookups of editable rows.
CREATE INDEX IF NOT EXISTS idx_opportunities_is_read_only
  ON public.opportunities(is_read_only);

COMMENT ON COLUMN public.opportunities.is_read_only IS
  'When TRUE, this row is a historical version locked by Copy-on-Write. Edits are rejected by the API.';
