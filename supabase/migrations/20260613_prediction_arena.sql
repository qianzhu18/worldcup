-- ============================================================
-- Prediction Arena: 积分系统 + 排行榜 + 段位 + 兑换商城
-- ============================================================

-- 1. 积分账户（每个用户一个）
create table if not exists public.user_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  total_earned integer not null default 0,
  total_wagered integer not null default 0,
  total_won integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  rank_title text not null default 'rookie',
  last_claim_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. 积分流水记录
create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  balance_after integer not null,
  tx_type text not null check (tx_type in (
    'daily_claim',      -- 每日领取
    'streak_bonus',     -- 连续登录奖励
    'prediction_wager', -- 预测押注
    'prediction_win',   -- 预测赢
    'prediction_refund',-- 预测退还
    'achievement_reward',-- 成就奖励
    'redeem_spend',     -- 兑换消耗
    'admin_adjust'      -- 管理员调整
  )),
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

-- 3. 成就/徽章定义
create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null default '🏆',
  category text not null default 'general',
  requirement_type text not null,
  requirement_value integer not null,
  reward_points integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. 用户已解锁成就
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- 5. 兑换商城商品
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  category text not null default 'physical',
  point_cost integer not null,
  total_stock integer not null default 0,
  remaining_stock integer not null default 0,
  min_rank text not null default 'rookie',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. 兑换记录
create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.rewards(id),
  point_cost integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'shipped', 'cancelled')),
  contact_info jsonb,
  created_at timestamptz not null default now()
);

-- 7. 扩展 predictions 表：增加积分押注字段
alter table public.user_predictions
  add column if not exists wager integer not null default 0,
  add column if not exists potential_payout integer not null default 0,
  add column if not exists settled_points integer not null default 0;

-- 8. 排行榜视图（准确率排行）
create or replace view public.leaderboard_accuracy as
select
  p.user_id,
  pr.name,
  pr.avatar_url,
  up.balance,
  up.rank_title,
  up.current_streak,
  up.best_streak,
  count(*) filter (where p.status = 'settled') as settled_count,
  count(*) filter (where p.status = 'settled' and p.settled_points > 0) as win_count,
  case
    when count(*) filter (where p.status = 'settled') > 0
    then round(
      count(*) filter (where p.status = 'settled' and p.settled_points > 0)::numeric
      / count(*) filter (where p.status = 'settled') * 100,
      1
    )
    else 0
  end as accuracy
from public.user_predictions p
join public.profiles pr on pr.id = p.user_id
left join public.user_points up on up.user_id = p.user_id
group by p.user_id, pr.name, pr.avatar_url, up.balance, up.rank_title, up.current_streak, up.best_streak;

-- 9. 排行榜视图（积分排行）
create or replace view public.leaderboard_points as
select
  up.user_id,
  pr.name,
  pr.avatar_url,
  up.balance,
  up.total_earned,
  up.rank_title,
  up.current_streak,
  up.best_streak
from public.user_points up
join public.profiles pr on pr.id = up.user_id
where up.balance > 0
order by up.balance desc;

-- 10. RLS 策略
alter table public.user_points enable row level security;
alter table public.point_transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;

-- 用户积分：只能看自己的
create policy "points own read" on public.user_points for select
  to authenticated using ((select auth.uid()) = user_id);

-- 积分流水：只能看自己的
create policy "transactions own read" on public.point_transactions for select
  to authenticated using ((select auth.uid()) = user_id);

-- 成就定义：所有人可读
create policy "achievements public read" on public.achievements for select
  to anon, authenticated using (true);

-- 用户成就：所有人可读（用于排行榜展示）
create policy "user_achievements public read" on public.user_achievements for select
  to anon, authenticated using (true);

-- 兑换商品：所有人可读
create policy "rewards public read" on public.rewards for select
  to anon, authenticated using (true);

-- 兑换记录：只能看自己的
create policy "redemptions own read" on public.redemptions for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "redemptions own insert" on public.redemptions for insert
  to authenticated with check ((select auth.uid()) = user_id);

-- 11. 索引
create index if not exists point_transactions_user_idx on public.point_transactions (user_id, created_at desc);
create index if not exists point_transactions_type_idx on public.point_transactions (tx_type);
create index if not exists user_achievements_user_idx on public.user_achievements (user_id);
create index if not exists redemptions_user_idx on public.redemptions (user_id, created_at desc);
create index if not exists rewards_active_idx on public.rewards (is_active, category);

-- 12. 每日积分发放函数
create or replace function public.claim_daily_points(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := current_date;
  v_last_claim date;
  v_streak integer;
  v_base_amount integer := 100;
  v_streak_bonus integer := 0;
  v_total integer;
  v_new_balance integer;
begin
  -- 获取用户积分信息
  select last_claim_date, current_streak
  into v_last_claim, v_streak
  from public.user_points
  where user_id = p_user_id;

  -- 如果没有积分账户，创建一个
  if not found then
    insert into public.user_points (user_id, balance, total_earned, last_claim_date, current_streak)
    values (p_user_id, v_base_amount, v_base_amount, v_today, 1);

    insert into public.point_transactions (user_id, amount, balance_after, tx_type, description)
    values (p_user_id, v_base_amount, v_base_amount, 'daily_claim', '每日积分领取');

    return json_build_object(
      'success', true,
      'amount', v_base_amount,
      'streak', 1,
      'streak_bonus', 0,
      'balance', v_base_amount
    );
  end if;

  -- 检查今天是否已领取
  if v_last_claim = v_today then
    return json_build_object('success', false, 'error', '今天已经领取过了');
  end if;

  -- 计算连续登录天数
  if v_last_claim = v_today - 1 then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  -- 计算连续登录奖励
  v_streak_bonus := case
    when v_streak >= 7 then 100
    when v_streak >= 3 then 30
    when v_streak >= 2 then 20
    else 0
  end;

  v_total := v_base_amount + v_streak_bonus;

  -- 更新积分
  update public.user_points
  set balance = balance + v_total,
      total_earned = total_earned + v_total,
      current_streak = v_streak,
      best_streak = greatest(best_streak, v_streak),
      last_claim_date = v_today,
      updated_at = now()
  where user_id = p_user_id
  returning balance into v_new_balance;

  -- 记录流水
  insert into public.point_transactions (user_id, amount, balance_after, tx_type, description)
  values (p_user_id, v_base_amount, v_new_balance - v_streak_bonus, 'daily_claim', '每日积分领取');

  if v_streak_bonus > 0 then
    insert into public.point_transactions (user_id, amount, balance_after, tx_type, description)
    values (p_user_id, v_streak_bonus, v_new_balance, 'streak_bonus', '连续登录 ' || v_streak || ' 天奖励');
  end if;

  return json_build_object(
    'success', true,
    'amount', v_total,
    'streak', v_streak,
    'streak_bonus', v_streak_bonus,
    'balance', v_new_balance
  );
end;
$$;

-- 13. 预测押注函数
create or replace function public.place_wager(
  p_user_id uuid,
  p_prediction_id uuid,
  p_wager integer
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
  v_new_balance integer;
begin
  -- 检查押注金额
  if p_wager < 10 or p_wager > 100 then
    return json_build_object('success', false, 'error', '押注金额需在 10-100 之间');
  end if;

  -- 获取余额
  select balance into v_balance
  from public.user_points
  where user_id = p_user_id;

  if not found or v_balance < p_wager then
    return json_build_object('success', false, 'error', '积分不足');
  end if;

  -- 扣除积分
  update public.user_points
  set balance = balance - p_wager,
      total_wagered = total_wagered + p_wager,
      updated_at = now()
  where user_id = p_user_id
  returning balance into v_new_balance;

  -- 更新预测记录
  update public.user_predictions
  set wager = p_wager,
      potential_payout = p_wager * 2
  where id = p_prediction_id and user_id = p_user_id;

  -- 记录流水
  insert into public.point_transactions (user_id, amount, balance_after, tx_type, reference_id, description)
  values (p_user_id, -p_wager, v_new_balance, 'prediction_wager', p_prediction_id, '预测押注');

  return json_build_object(
    'success', true,
    'wager', p_wager,
    'balance', v_new_balance
  );
end;
$$;

-- 14. 段位计算函数
create or replace function public.calculate_rank(total_earned integer)
returns text
language plpgsql
immutable
as $$
begin
  return case
    when total_earned >= 10000 then 'legend'
    when total_earned >= 5000 then 'diamond'
    when total_earned >= 2000 then 'gold'
    when total_earned >= 500 then 'silver'
    else 'rookie'
  end;
end;
$$;

-- 15. 初始化成就数据
insert into public.achievements (id, name, description, icon, category, requirement_type, requirement_value, reward_points) values
  ('first_prediction', '初出茅庐', '完成第一次预测', '🎯', 'prediction', 'prediction_count', 1, 50),
  ('prediction_10', '预测达人', '累计完成 10 次预测', '📊', 'prediction', 'prediction_count', 10, 100),
  ('prediction_50', '预测大师', '累计完成 50 次预测', '🏆', 'prediction', 'prediction_count', 50, 500),
  ('streak_3', '三连胜', '连续 3 天登录', '🔥', 'streak', 'login_streak', 3, 30),
  ('streak_7', '周冠王', '连续 7 天登录', '👑', 'streak', 'login_streak', 7, 100),
  ('accuracy_60', '精准射手', '预测准确率达到 60%', '🎯', 'accuracy', 'accuracy_rate', 60, 200),
  ('accuracy_80', '预言家', '预测准确率达到 80%', '🔮', 'accuracy', 'accuracy_rate', 80, 1000),
  ('hot_streak_5', '五连红', '连续 5 次预测正确', '🔥', 'streak', 'win_streak', 5, 300)
on conflict (id) do nothing;

-- 16. 初始化示例兑换商品
insert into public.rewards (name, description, image_url, category, point_cost, total_stock, remaining_stock, min_rank) values
  ('世界杯主题头像框', '专属头像框，展示你的预言家身份', '/rewards/avatar-frame.svg', 'virtual', 500, 999, 999, 'rookie'),
  ('JMWL 预言家认证', '个人主页展示预言家认证标识', '/rewards/predictor-badge.svg', 'virtual', 2000, 100, 100, 'silver'),
  ('世界杯官方用球', '2026 世界杯比赛用球（正品）', '/rewards/worldcup-ball.svg', 'physical', 50000, 5, 5, 'gold'),
  ('球队球衣（任选）', '2026 世界杯参赛球队球衣一件', '/rewards/jersey.svg', 'physical', 30000, 10, 10, 'gold'),
  ('JMWL 限定贴纸包', '世界杯主题限定贴纸 10 张', '/rewards/stickers.svg', 'physical', 3000, 50, 50, 'silver'),
  ('AI 深度分析报告', '单场比赛 AI 战术深度分析', '/rewards/ai-report.svg', 'virtual', 1000, 999, 999, 'rookie')
on conflict do nothing;
