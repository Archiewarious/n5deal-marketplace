-- Demo data. Six accounts share the password `demo1234`; the login screen offers them
-- as one-click buttons so a reviewer never has to type credentials.
-- Users are inserted straight into auth.users with a bcrypt hash, which is the standard
-- way to seed a Supabase project without shipping a service_role key.

create extension if not exists pgcrypto;

do $seed$
declare
  uid_seller_a uuid := '11111111-1111-4111-8111-111111111111';
  uid_seller_b uuid := '22222222-2222-4222-8222-222222222222';
  uid_buyer_a  uuid := '33333333-3333-4333-8333-333333333333';
  uid_buyer_b  uuid := '44444444-4444-4444-8444-444444444444';
  uid_buyer_c  uuid := '55555555-5555-4555-8555-555555555555';
  uid_manager  uuid := '66666666-6666-4666-8666-666666666666';
  pwd text := crypt('demo1234', gen_salt('bf'));
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
         u.email, pwd, now(), now(), now(),
         jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
         '{}'::jsonb, '', '', '', ''
  from (values
    (uid_seller_a, 'seller.nordic@n5demo.com'),
    (uid_seller_b, 'seller.atlas@n5demo.com'),
    (uid_buyer_a,  'buyer.harbour@n5demo.com'),
    (uid_buyer_b,  'buyer.meridian@n5demo.com'),
    (uid_buyer_c,  'buyer.solace@n5demo.com'),
    (uid_manager,  'manager@n5demo.com')
  ) as u(id, email)
  on conflict (id) do nothing;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text,
         jsonb_build_object('sub', u.id::text, 'email', u.email),
         'email', now(), now()
  from auth.users u
  where u.email like '%@n5demo.com'
  on conflict do nothing;

  insert into profiles (id, email, full_name, company, role, status) values
    (uid_seller_a, 'seller.nordic@n5demo.com',   'Ingrid Halvorsen', 'Nordic License Partners', 'SELLER',  'ACTIVE'),
    (uid_seller_b, 'seller.atlas@n5demo.com',    'Marco Ferrante',   'Atlas Regulatory Group',  'SELLER',  'ACTIVE'),
    (uid_buyer_a,  'buyer.harbour@n5demo.com',   'Elena Vasquez',    'Harbour Capital',         'BUYER',   'ACTIVE'),
    (uid_buyer_b,  'buyer.meridian@n5demo.com',  'Tom Nakamura',     'Meridian Ventures',       'BUYER',   'ACTIVE'),
    (uid_buyer_c,  'buyer.solace@n5demo.com',    'Petra Kowalski',   'Solace Holdings',         'BUYER',   'SUSPENDED'),
    (uid_manager,  'manager@n5demo.com',         'Anna Reid',        'N5Deal',                  'MANAGER', 'ACTIVE')
  on conflict (id) do nothing;

  insert into buyer_profiles (user_id, headline, description, sectors, jurisdictions, ticket_min_eur, ticket_max_eur) values
    (uid_buyer_a, 'Payments and EMI across the EEA',
     'Looking for licensed payment institutions with an active passport into at least three EEA markets. Prefer entities with existing banking relationships.',
     '{Payment,EMI}', '{Lithuania,Ireland,Netherlands,Malta}', 500000, 4000000),
    (uid_buyer_b, 'Crypto and VASP structures',
     'Acquiring VASP and crypto exchange licences in EU jurisdictions. Clean regulatory history is the hard requirement; operational history is optional.',
     '{Crypto,Fintech}', '{Poland,Czechia,Estonia,Lithuania}', 50000, 900000),
    (uid_buyer_c, 'Banking licences, opportunistic',
     'Family office mandate. Full banking licences only, any jurisdiction with a credible regulator.',
     '{Bank}', '{Switzerland,Germany,Luxembourg}', 5000000, 40000000)
  on conflict (user_id) do nothing;

  insert into assets (seller_id, title, description, country, sector, license_type, regulator,
                      asset_kind, business_state, year_of_issue, employees,
                      asking_price_cents, included_activities, status, validated, views) values
    (uid_seller_a, 'Canadian MSB registered in Ontario',
     'Registered money services business covering foreign exchange, money transferring and virtual currency dealing. Clean record, no enforcement history.',
     'Canada', 'Payment', 'MSB', 'FINTRAC', 'LICENSE_ONLY', 'NOT_ACTIVE', 2026, null,
     4000000, '{Foreign-Exchange,Money-Transfer,Virtual-Currency,PSP Activities}', 'PUBLISHED', true, 20),
    (uid_seller_a, 'Australian AFSL with active operations',
     'Active Australian financial services licence with a running payments book and an established client base.',
     'Australia', 'Payment', 'AFSL', 'ASIC', 'ACTIVE_BUSINESS', 'ACTIVE', 2025, 12,
     250000000, '{Payment Services,FX Dealing,Custodial}', 'PUBLISHED', true, 27),
    (uid_seller_a, 'Lithuanian EMI with SEPA access',
     'Electronic money institution with direct SEPA access and an issued IBAN range. Passported into 14 EEA states.',
     'Lithuania', 'EMI', 'EMI', 'Bank of Lithuania', 'ACTIVE_BUSINESS', 'ACTIVE', 2023, 24,
     390000000, '{E-Money Issuance,SEPA,IBAN Issuing,Card Programs}', 'PUBLISHED', true, 64),
    (uid_seller_a, 'Estonian VASP, dormant',
     'Virtual asset service provider authorisation. Dormant since 2025, all filings current.',
     'Estonia', 'Crypto', 'VASP', 'FIU Estonia', 'LICENSE_ONLY', 'NOT_ACTIVE', 2024, null,
     8500000, '{Exchange,Custody Wallet}', 'PUBLISHED', true, 41),
    (uid_seller_a, 'UK small payment institution',
     'Small payment institution registration with the FCA. Suitable as an entry structure into the UK market.',
     'United Kingdom', 'Payment', 'SPI', 'FCA', 'LICENSE_ONLY', 'NOT_ACTIVE', 2024, null,
     11000000, '{Payment Initiation,Account Information}', 'PUBLISHED', false, 15),
    (uid_seller_b, 'Polish VASP with banking relationship',
     'Registered virtual asset service provider with an existing EUR account at a Polish bank and a working AML framework.',
     'Poland', 'Crypto', 'VASP', 'KAS', 'ACTIVE_BUSINESS', 'ACTIVE', 2024, 6,
     22000000, '{Exchange,Custody Wallet,Fiat On-Ramp}', 'PUBLISHED', true, 88),
    (uid_seller_b, 'Maltese Class 3 investment services licence',
     'Investment services licence covering portfolio management and investment advice. Fully staffed compliance function.',
     'Malta', 'Fintech', 'Class 3 ISL', 'MFSA', 'ACTIVE_BUSINESS', 'ACTIVE', 2022, 18,
     560000000, '{Portfolio Management,Investment Advice,Custody}', 'PUBLISHED', true, 33),
    (uid_seller_b, 'Swiss fintech licence, ready for transfer',
     'FINMA fintech licence permitting deposits up to CHF 100 million without a full banking authorisation.',
     'Switzerland', 'Bank', 'Fintech Licence', 'FINMA', 'LICENSE_ONLY', 'NOT_ACTIVE', 2025, null,
     720000000, '{Deposit Taking,Payment Accounts}', 'PUBLISHED', true, 52),
    (uid_seller_b, 'Czech payment institution',
     'Authorised payment institution with an EEA passport and an operational card acquiring programme.',
     'Czechia', 'Payment', 'PI', 'CNB', 'ACTIVE_BUSINESS', 'ACTIVE', 2023, 9,
     165000000, '{Acquiring,Money Remittance,Payment Accounts}', 'PUBLISHED', true, 29),
    (uid_seller_b, 'Irish EMI, application stage',
     'Electronic money institution application at an advanced stage with the Central Bank of Ireland. Includes prepared documentation and a nominated management team.',
     'Ireland', 'EMI', 'EMI', 'Central Bank of Ireland', 'LICENSE_ONLY', 'NOT_ACTIVE', 2026, null,
     95000000, '{E-Money Issuance,SEPA}', 'PUBLISHED', false, 11),
    (uid_seller_a, 'German BaFin crypto custody licence',
     'Crypto custody business authorisation under the German Banking Act.',
     'Germany', 'Crypto', 'Crypto Custody', 'BaFin', 'LICENSE_ONLY', 'NOT_ACTIVE', 2025, null,
     140000000, '{Custody,Safekeeping}', 'PUBLISHED', true, 74),
    (uid_seller_a, 'Dutch payment agent structure',
     'Registered payment agent with an existing principal relationship. Fastest route into the Dutch market.',
     'Netherlands', 'Payment', 'Payment Agent', 'DNB', 'ACTIVE_BUSINESS', 'ACTIVE', 2024, 4,
     47000000, '{Money Remittance,Agent Distribution}', 'PUBLISHED', false, 19),
    (uid_seller_b, 'Luxembourg PSF, full scope',
     'Professional of the financial sector authorisation, full investment firm scope, with existing institutional clients.',
     'Luxembourg', 'Bank', 'PSF', 'CSSF', 'ACTIVE_BUSINESS', 'ACTIVE', 2021, 31,
     1250000000, '{Investment Services,Custody,Advisory}', 'PUBLISHED', true, 96),
    (uid_seller_b, 'Cyprus CIF licence',
     'Cyprus investment firm licence with an active brokerage operation and a retail client book.',
     'Cyprus', 'Fintech', 'CIF', 'CySEC', 'ACTIVE_BUSINESS', 'ACTIVE', 2022, 22,
     420000000, '{Brokerage,Portfolio Management}', 'PUBLISHED', true, 58),
    (uid_seller_a, 'Draft: Georgian payment provider',
     'Draft listing, not published. Kept as an example of a seller work in progress.',
     'Georgia', 'Payment', 'PSP', 'NBG', 'LICENSE_ONLY', 'NOT_ACTIVE', 2026, null,
     3200000, '{Payment Services}', 'DRAFT', false, 0),
    (uid_seller_b, 'Suspended: unverified Seychelles structure',
     'Listing suspended by a platform manager pending verification of the regulatory status.',
     'Seychelles', 'Crypto', 'Securities Dealer', 'FSA', 'LICENSE_ONLY', 'NOT_ACTIVE', 2025, null,
     6900000, '{Securities Dealing}', 'SUSPENDED', false, 7);
end
$seed$;

-- ── A conversation, so /messages demonstrates something ──────────────────────
-- An empty inbox shows the empty state and nothing else. This is one thread between a buyer
-- and a seller about listing #3, which is enough to show the grouping, the direction of each
-- message, the listing each is attached to, and the reply box at the end of it.
insert into contact_requests (from_user_id, to_user_id, asset_id, message, created_at) values
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111',
   (select id from assets where public_id = 3),
   'We are looking at this one seriously. Two questions before we go further: is the SEPA access direct or through a sponsor bank, and has the regulator raised anything in the last two supervisory cycles?',
   now() - interval '2 days'),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333',
   (select id from assets where public_id = 3),
   'Direct, through the Bank of Lithuania settlement system, not sponsored. Nothing open from supervision. Happy to share the last two inspection letters once an NDA is in place.',
   now() - interval '1 day 20 hours'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111',
   (select id from assets where public_id = 3),
   'That works. Send the NDA to this address and we will turn it around the same day.',
   now() - interval '1 day 18 hours');


-- ── A catalogue with a shape ─────────────────────────────────────────────────
-- Sixteen listings on top of the original set, which existed to prove the flows and was too
-- small to do anything else. At thirty the price distribution on each card has something to
-- distribute, the sector chips carry real proportions, the jurisdiction band on the landing page
-- fills out to seventeen countries, and a filter that returns nothing does so because the filter
-- is narrow rather than because the catalogue is empty.
--
-- Every entity below is invented. The regulators, the licence names and the price bands are
-- real, because a reviewer in this industry will read them and a made-up regulator reads as
-- carelessness — but no line here describes a business that exists.
insert into assets (
  seller_id, title, description, country, sector, license_type, regulator,
  asset_kind, business_state, year_of_issue, employees,
  asking_price_cents, included_activities, status
) values
  ('11111111-1111-4111-8111-111111111111', 'Georgian brokerage licence, clean shell',
   'Brokerage company licensed by the National Bank of Georgia, never traded. Bank account open at TBC, no clients onboarded.',
   'Georgia', 'Fintech', 'Brokerage', 'National Bank of Georgia',
   'LICENSE_ONLY', 'NOT_ACTIVE', 2025, null,
   6200000, array['Securities Dealing', 'Client Money'], 'PUBLISHED'),
  ('22222222-2222-4222-8222-222222222222', 'Seychelles securities dealer with FX book',
   'FSA-licensed securities dealer running a live retail FX book. Two liquidity providers under contract, PSP integrations in place.',
   'Seychelles', 'Fintech', 'Securities Dealer', 'FSA Seychelles',
   'ACTIVE_BUSINESS', 'ACTIVE', 2021, 14,
   78000000, array['FX Dealing', 'Securities Dealing', 'Client Money'], 'PUBLISHED'),
  ('11111111-1111-4111-8111-111111111111', 'Singapore Major Payment Institution',
   'MAS Major Payment Institution covering cross-border transfers and e-money issuance. Audited, three years of filings available.',
   'Singapore', 'Payment', 'MPI', 'MAS',
   'ACTIVE_BUSINESS', 'ACTIVE', 2022, 19,
   460000000, array['Cross-Border Transfer', 'E-Money Issuance', 'Merchant Acquisition'], 'PUBLISHED'),
  ('22222222-2222-4222-8222-222222222222', 'Cyprus CIF with EU passport',
   'CySEC-regulated investment firm passported into 27 member states. Own funds above requirement, no open supervisory matters.',
   'Cyprus', 'Fintech', 'CIF', 'CySEC',
   'ACTIVE_BUSINESS', 'ACTIVE', 2019, 28,
   590000000, array['Portfolio Management', 'Investment Advice', 'Order Execution'], 'PUBLISHED'),
  ('11111111-1111-4111-8111-111111111111', 'Lithuanian crypto exchange, MiCA in progress',
   'Registered virtual asset service provider with a MiCA CASP application filed. Exchange and custody, no fiat rails yet.',
   'Lithuania', 'Crypto', 'VASP', 'FNTT',
   'ACTIVE_BUSINESS', 'ACTIVE', 2023, 7,
   34000000, array['Crypto Exchange', 'Custody'], 'PUBLISHED'),
  ('22222222-2222-4222-8222-222222222222', 'Maltese VFA agent and exchange',
   'MFSA class 4 VFA licence with both exchange and custodian permissions. Compliance team retained through transition.',
   'Malta', 'Crypto', 'VFA Class 4', 'MFSA',
   'ACTIVE_BUSINESS', 'ACTIVE', 2020, 16,
   290000000, array['Crypto Exchange', 'Custody', 'Order Execution'], 'PUBLISHED'),
  ('11111111-1111-4111-8111-111111111111', 'Czech small-scale payment institution',
   'Registered small payment institution under the CNB threshold. Turnover headroom remaining, ready for scaling into a full licence.',
   'Czechia', 'Payment', 'SPI', 'Czech National Bank',
   'ACTIVE_BUSINESS', 'ACTIVE', 2024, 3,
   19500000, array['Money Remittance', 'Payment Initiation'], 'PUBLISHED'),
  ('22222222-2222-4222-8222-222222222222', 'Polish payment institution, KNF authorised',
   'National payment institution authorised by KNF. Live merchant portfolio, settlement account with a domestic bank.',
   'Poland', 'Payment', 'KIP', 'KNF',
   'ACTIVE_BUSINESS', 'ACTIVE', 2022, 11,
   125000000, array['Merchant Acquisition', 'Money Remittance', 'Account Information'], 'PUBLISHED'),
  ('11111111-1111-4111-8111-111111111111', 'Estonian EMI, application at final stage',
   'Electronic money institution application with Finantsinspektsioon at final review. Capital deposited, key staff appointed.',
   'Estonia', 'EMI', 'EMI', 'Finantsinspektsioon',
   'LICENSE_ONLY', 'NOT_ACTIVE', 2026, null,
   72000000, array['E-Money Issuance', 'SEPA'], 'PUBLISHED'),
  ('22222222-2222-4222-8222-222222222222', 'Irish payment institution with SEPA membership',
   'Central Bank of Ireland authorised payment institution, direct SEPA scheme participant. Passported across the EEA.',
   'Ireland', 'Payment', 'PI', 'Central Bank of Ireland',
   'ACTIVE_BUSINESS', 'ACTIVE', 2021, 22,
   340000000, array['SEPA', 'Money Remittance', 'Merchant Acquisition'], 'PUBLISHED'),
  ('11111111-1111-4111-8111-111111111111', 'Dutch EMI with card issuing programme',
   'DNB-licensed electronic money institution running a principal card issuing programme. BIN sponsorship in place.',
   'Netherlands', 'EMI', 'EMI', 'De Nederlandsche Bank',
   'ACTIVE_BUSINESS', 'ACTIVE', 2020, 34,
   810000000, array['E-Money Issuance', 'Card Programs', 'IBAN Issuing', 'SEPA'], 'PUBLISHED'),
  ('22222222-2222-4222-8222-222222222222', 'German BaFin payment institution',
   'BaFin-authorised payment institution with acquiring and remittance permissions. Two years of audited accounts.',
   'Germany', 'Payment', 'ZAG', 'BaFin',
   'ACTIVE_BUSINESS', 'ACTIVE', 2023, 17,
   220000000, array['Merchant Acquisition', 'Money Remittance'], 'PUBLISHED'),
  ('11111111-1111-4111-8111-111111111111', 'Swiss fintech licence, dormant',
   'FINMA fintech licence under article 1b, never activated. Deposit ceiling of 100 million francs, no client funds held.',
   'Switzerland', 'Fintech', 'Fintech Licence', 'FINMA',
   'LICENSE_ONLY', 'NOT_ACTIVE', 2024, null,
   190000000, array['Deposit Taking'], 'PUBLISHED'),
  ('22222222-2222-4222-8222-222222222222', 'Luxembourg specialised PSF',
   'CSSF-supervised support PSF providing IT and administration services to regulated entities. Long-standing client contracts.',
   'Luxembourg', 'Fintech', 'Support PSF', 'CSSF',
   'ACTIVE_BUSINESS', 'ACTIVE', 2018, 41,
   680000000, array['IT Systems Operation', 'Client Administration'], 'PUBLISHED'),
  ('11111111-1111-4111-8111-111111111111', 'Canadian MSB with US money transmitter reach',
   'FINTRAC-registered MSB with FinCEN registration and licences in eleven US states. Corridor volume concentrated in North America.',
   'Canada', 'Payment', 'MSB', 'FINTRAC',
   'ACTIVE_BUSINESS', 'ACTIVE', 2022, 9,
   89000000, array['Money-Transfer Activities', 'Foreign-Exchange Activities', 'Virtual-Currency Activities'], 'PUBLISHED'),
  ('22222222-2222-4222-8222-222222222222', 'Draft: US state money transmitter bundle',
   'Money transmitter licences across four states, surety bonds current. Being prepared for listing, diligence pack incomplete.',
   'United States', 'Payment', 'Money Transmitter', 'State regulators',
   'LICENSE_ONLY', 'NOT_ACTIVE', 2023, null,
   145000000, array['Money-Transfer Activities'], 'DRAFT');
