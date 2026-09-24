-- Billing groundwork: track each business's Stripe customer/subscription.
alter table public.businesses
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text not null default 'trial'
    check (plan in ('trial', 'starter', 'growth', 'pro')),
  add column if not exists subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled'));

comment on column public.businesses.plan is 'Which pricing tier: trial (default, unpaid), starter ($24), growth ($99), pro ($299).';
comment on column public.businesses.subscription_status is 'Mirrors the Stripe subscription status, kept in sync via the Stripe webhook.';
