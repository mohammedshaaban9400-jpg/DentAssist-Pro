-- DentAssist Pro: server-side trial anchor + clock probe (run in Supabase SQL Editor).
-- Trial length: 2.5 months (2 months + 15 days) — must match src/lib/trialDuration.ts
-- After applying, the app calls RPC `app_license_probe` with the anon key.

create table if not exists public.device_trials (
  machine_id text primary key,
  trial_started_at timestamptz not null
);

alter table public.device_trials enable row level security;

-- No GRANT on table to anon: rows are read/written only via SECURITY DEFINER function below.

create or replace function public.app_license_probe(
  p_machine_id text,
  p_first_launch_iso text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_id text;
  v_start timestamptz;
  v_candidate timestamptz;
  v_parsed timestamptz;
  v_end timestamptz;
  v_valid boolean;
begin
  v_id := nullif(trim(p_machine_id), '');
  if v_id is null or length(v_id) < 6 then
    return jsonb_build_object('ok', false, 'error', 'invalid_machine_id');
  end if;

  select trial_started_at into v_start from public.device_trials where machine_id = v_id;

  if v_start is null then
    if p_first_launch_iso is not null and length(trim(p_first_launch_iso)) > 0 then
      begin
        v_parsed := trim(p_first_launch_iso)::timestamptz;
      exception when others then
        v_parsed := v_now;
      end;
      v_candidate := least(v_parsed, v_now);
      -- Reject absurd backdating: trial cannot have started more than 10 days before server "now"
      v_start := greatest(v_candidate, v_now - interval '10 days');
    else
      v_start := v_now;
    end if;

    insert into public.device_trials (machine_id, trial_started_at)
    values (v_id, v_start);
  end if;

  v_end := v_start + interval '2 months 15 days';
  v_valid := v_now < v_end;

  return jsonb_build_object(
    'ok', true,
    'server_now', v_now,
    'trial_started_at', v_start,
    'trial_ends_at', v_end,
    'trial_valid', v_valid
  );
end;
$$;

-- Allow the browser/Electron client (anon JWT) to call this RPC only:
grant execute on function public.app_license_probe(text, text) to anon;
grant execute on function public.app_license_probe(text, text) to authenticated;
