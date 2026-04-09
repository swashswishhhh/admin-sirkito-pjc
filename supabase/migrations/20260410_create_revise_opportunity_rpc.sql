-- Creates a Stored Procedure to atomically execute the Copy-on-Write logic for Opportunity revisions.
-- This guarantees the original row is converted to read-only before the new duplicated row is created.

CREATE OR REPLACE FUNCTION public.revise_opportunity(p_opportunity_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current RECORD;
    v_next_version integer;
    v_next_opportunity_id text;
BEGIN
    -- 1. Grab the current version, locking the row to prevent concurrent edits
    SELECT * INTO v_current
    FROM public.opportunities
    WHERE opportunity_id = p_opportunity_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Opportunity not found: %', p_opportunity_id;
    END IF;

    IF v_current.is_read_only THEN
        RAISE EXCEPTION 'Cannot revise an already locked (read-only) opportunity. Ensure you are revising the latest active version.';
    END IF;

    -- 2. Lock the current version so no further edits are possible
    UPDATE public.opportunities 
    SET is_read_only = true, updated_at = now() 
    WHERE opportunity_id = p_opportunity_id;

    -- 3. Calculate next identity
    v_next_version := v_current.version + 1;
    v_next_opportunity_id := v_current.base_code || '-V' || v_next_version::text;

    -- 4. Duplicate the record as a new editable version
    INSERT INTO public.opportunities (
        opportunity_id,
        base_code,
        version,
        status,
        project_name,
        location,
        client_name,
        contact_person,
        contact,
        description,
        vat,
        estimated_amount,
        submitted_amount,
        date_started,
        date_ended,
        final_amount_after_discount,
        is_read_only,
        created_at,
        updated_at
    ) VALUES (
        v_next_opportunity_id,
        v_current.base_code,
        v_next_version,
        v_current.status,
        v_current.project_name,
        v_current.location,
        v_current.client_name,
        v_current.contact_person,
        v_current.contact,
        v_current.description,
        v_current.vat,
        v_current.estimated_amount,
        v_current.submitted_amount,
        v_current.date_started,
        v_current.date_ended,
        v_current.final_amount_after_discount,
        false,
        now(),
        now()
    );

    RETURN v_next_opportunity_id;
END;
$$;
