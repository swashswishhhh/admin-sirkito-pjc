-- Schema updates for new Opportunity requirements:
-- - date_started (date)
-- - date_ended (date)
-- - status restricted to ('Bidding', 'Awarded')
-- - final_amount_after_discount (numeric)

alter table if exists public.opportunities
  add column if not exists date_started date,
  add column if not exists date_ended date,
  add column if not exists final_amount_after_discount numeric;

-- If you already have rows with legacy statuses (e.g. 'Submitted', 'Revised'),
-- map them into the allowed domain so the constraint doesn't fail.
update public.opportunities
set status = 'Bidding'
where status is null
   or status not in ('Bidding', 'Awarded');

-- Enforce allowed statuses
alter table if exists public.opportunities
  drop constraint if exists opportunities_status_check;

alter table if exists public.opportunities
  add constraint opportunities_status_check
  check (status in ('Bidding', 'Awarded'));

