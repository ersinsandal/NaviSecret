-- =====================
-- geo_drops Policies
-- =====================
alter table geo_drops enable row level security;

-- Public drops visible to everyone
create policy "geo_drops_select_public"
on geo_drops for select
using (
  visibility = 'public'
  and status = 'active'
  and (expires_at is null or expires_at > now())
);

-- Friends drops visible only to accepted friends
create policy "geo_drops_select_friends"
on geo_drops for select
using (
  visibility = 'friends'
  and status = 'active'
  and (expires_at is null or expires_at > now())
  and (
    creator_id = auth.uid()
    or exists (
      select 1 from friend_requests
      where status = 'accepted'
        and ((from_user_id = auth.uid() and to_user_id = geo_drops.creator_id)
          or (to_user_id = auth.uid() and from_user_id = geo_drops.creator_id))
    )
  )
);

-- Creator can always view own drops (regardless of status)
create policy "geo_drops_select_own"
on geo_drops for select
using (creator_id = auth.uid());

-- Password drops visible to everyone (contents protected by password)
create policy "geo_drops_select_password"
on geo_drops for select
using (
  visibility = 'password'
  and status = 'active'
  and (expires_at is null or expires_at > now())
);

-- Private drops visible only to explicitly shared users
create policy "geo_drops_select_private_shared"
on geo_drops for select
using (
  visibility = 'private'
  and status = 'active'
  and (expires_at is null or expires_at > now())
  and exists (
    select 1 from drop_shares
    where drop_id = geo_drops.id
      and user_id = auth.uid()
  )
);

-- Drop creation allowed for authenticated users only
create policy "geo_drops_insert"
on geo_drops for insert
with check (auth.uid() = creator_id);

-- Drop update allowed for creator only (modifying creator_id forbidden)
create policy "geo_drops_update"
on geo_drops for update
using (auth.uid() = creator_id)
with check (auth.uid() = creator_id);

-- Drop deletion allowed for creator only
create policy "geo_drops_delete"
on geo_drops for delete
using (auth.uid() = creator_id);

-- NOTE: RLS cannot restrict column-level access. Sensitive columns (encryption_salt,
-- password_hash, encrypted_content) are excluded in the SDK SELECT query.
-- The unlock-drop Edge Function accesses rows via service_role bypassing RLS.

-- Trigger preventing unauthorized modifications to sensitive/security columns on update
create or replace function protect_drop_sensitive_columns()
returns trigger as $$
begin
  -- creator_id is immutable (prevents ownership transfer)
  if NEW.creator_id is distinct from OLD.creator_id then
    raise exception 'Cannot modify creator_id';
  end if;
  -- encryption_salt is immutable
  if NEW.encryption_salt is distinct from OLD.encryption_salt then
    raise exception 'Cannot modify encryption_salt';
  end if;
  -- geohash is immutable (used in decryption key derivation)
  if NEW.geohash is distinct from OLD.geohash then
    raise exception 'Cannot modify geohash';
  end if;
  return NEW;
end;
$$ language plpgsql;

create or replace trigger trg_protect_drop_sensitive_columns
before update on geo_drops
for each row execute function protect_drop_sensitive_columns();

-- =====================
-- drop_claims Policies
-- =====================
alter table drop_claims enable row level security;

-- Users can view their own claims
create policy "drop_claims_select_own"
on drop_claims for select
using (user_id = auth.uid());

-- Drop creator can view claims for their drops
create policy "drop_claims_select_creator"
on drop_claims for select
using (
  exists (
    select 1 from geo_drops
    where id = drop_claims.drop_id
      and creator_id = auth.uid()
  )
);

-- Claim creation only allowed via Edge Function (service_role)
-- Direct INSERT is forbidden (distance verification is enforced in Edge Function)
create policy "drop_claims_insert"
on drop_claims for insert
with check (false);

-- =====================
-- drop_shares Policies
-- =====================
alter table drop_shares enable row level security;

-- Shared users can view drops shared with them
create policy "drop_shares_select_shared"
on drop_shares for select
using (user_id = auth.uid());

-- Drop creators can view list of shares for their drops
create policy "drop_shares_select_creator"
on drop_shares for select
using (
  exists (
    select 1 from geo_drops
    where id = drop_shares.drop_id
      and creator_id = auth.uid()
  )
);

-- Only creators can add/remove shares
create policy "drop_shares_insert"
on drop_shares for insert
with check (
  exists (
    select 1 from geo_drops
    where id = drop_shares.drop_id
      and creator_id = auth.uid()
  )
);

create policy "drop_shares_delete"
on drop_shares for delete
using (
  exists (
    select 1 from geo_drops
    where id = drop_shares.drop_id
      and creator_id = auth.uid()
  )
);

-- =====================
-- drop_location_logs Policies
-- =====================
alter table drop_location_logs enable row level security;

-- Users can only view their own logs
create policy "drop_location_logs_select_own"
on drop_location_logs for select
using (auth.uid() = user_id);

-- Log insertion allowed for authenticated users for their own user_id
create policy "drop_location_logs_insert"
on drop_location_logs for insert
with check (auth.uid() = user_id);

-- =====================
-- Explicit Grants (authenticated role)
--
-- In alignment with database/policies.sql: Explicitly grant table permissions
-- without relying on Supabase implicit default permissions.
-- RLS policies enforce actual row-level security boundaries.
-- =====================
grant select on drop_claims to authenticated;
grant select, insert, delete on drop_shares to authenticated;
grant select, insert on drop_location_logs to authenticated;
