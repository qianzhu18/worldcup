do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_predictions_user_id_profiles_fkey'
  ) then
    alter table public.user_predictions
      add constraint user_predictions_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'user_favorites_user_id_profiles_fkey'
  ) then
    alter table public.user_favorites
      add constraint user_favorites_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;
