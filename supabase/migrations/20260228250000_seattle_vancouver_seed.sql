-- Seattle WA and Vancouver WA bars, and bar_whiskeys seed data
-- Status notes (as of Feb 2026):
--   All Seattle bars confirmed open via Yelp/web Feb 2026.
--   Trusty Brewing (Vancouver WA) is CLOSED — omitted.
--   Heathen Brewing Feral Public House (Vancouver WA) closed Oct 2025, being converted to
--     Loyal Legion Vancouver. Included with available=false on bar_whiskeys; remove when
--     Loyal Legion reopens.
--   Needle & Thread address corrected to 1406 12th Ave (not 1435 E Olive Way as originally
--     supplied — confirmed via Yelp/Tripadvisor Feb 2026).
--   "The Whiskey Bar Ballard 5404 Ballard Ave NW" not found; replaced with confirmed-open
--     Radiator Whiskey Ballard (5311 Ballard Ave NW), a second location of Radiator Whiskey.
--   Percy's & Co is in Ballard (5233 Ballard Ave NW), not Capitol Hill.

-- ============================================================
-- BARS — Seattle WA (cccccccc- prefix)
-- ============================================================
INSERT INTO bars (id, name, location, address, city, state, country, phone, website, google_place_id, metadata) VALUES

-- 1. Canon — legendary whiskey bar, 4000+ bottle collection
('cccccccc-0000-0000-0000-000000000001',
 'Canon',
 ST_MakePoint(-122.3166, 47.6113)::geography,
 '928 12th Ave',
 'Seattle', 'WA', 'US',
 '+1 206-552-9755',
 'https://www.canonseattle.com',
 'ChIJcanon00000001sea',
 '{"neighborhood":"Capitol Hill","whiskey_list_size":4000,"craft_cocktails":true,"reservations":true,"award_winning":true,"notes":"Named to North America 50 Best Bars 2025"}'),

-- 2. The Whisky Bar — extensive Scotch and world whisky selection
('cccccccc-0000-0000-0000-000000000002',
 'The Whisky Bar',
 ST_MakePoint(-122.3459, 47.6147)::geography,
 '2122 2nd Ave',
 'Seattle', 'WA', 'US',
 '+1 206-443-4490',
 'https://www.thewhiskybar.com',
 'ChIJwhiskybar0002sea',
 '{"neighborhood":"Belltown","scotch_focus":true,"world_whisky":true,"established":2000}'),

-- 3. Needle & Thread — reservation-only speakeasy upstairs at Tavern Law
('cccccccc-0000-0000-0000-000000000003',
 'Needle & Thread',
 ST_MakePoint(-122.3167, 47.6129)::geography,
 '1406 12th Ave',
 'Seattle', 'WA', 'US',
 NULL,
 'https://www.tavernlaw.com/needle-thread',
 'ChIJneedle000003sea',
 '{"neighborhood":"Capitol Hill","speakeasy":true,"reservations":true,"bespoke_cocktails":true,"parent_venue":"Tavern Law"}'),

-- 4. Rob Roy — classic cocktail bar with strong whiskey focus, est. 2003
('cccccccc-0000-0000-0000-000000000004',
 'Rob Roy',
 ST_MakePoint(-122.3465, 47.6165)::geography,
 '2332 2nd Ave',
 'Seattle', 'WA', 'US',
 '+1 206-956-8423',
 'http://www.robroyseattle.com',
 'ChIJrobroybar0004sea',
 '{"neighborhood":"Belltown","craft_cocktails":true,"whiskey_selection":true,"established":2003}'),

-- 5. Radiator Whiskey Ballard — second location of the Pike Place original
('cccccccc-0000-0000-0000-000000000005',
 'Radiator Whiskey Ballard',
 ST_MakePoint(-122.3835, 47.6668)::geography,
 '5311 Ballard Ave NW',
 'Seattle', 'WA', 'US',
 NULL,
 'https://www.radiatorwhiskey.com/ballard',
 'ChIJradballard005sea',
 '{"neighborhood":"Ballard","whiskey_selection":true,"craft_cocktails":true,"brunch":true}'),

-- 6. Bathtub Gin & Co — basement speakeasy with 40+ gins and as many whiskeys
('cccccccc-0000-0000-0000-000000000006',
 'Bathtub Gin & Co',
 ST_MakePoint(-122.3459, 47.6162)::geography,
 '2205 2nd Ave',
 'Seattle', 'WA', 'US',
 '+1 206-728-6069',
 'https://www.bathtubginseattle.com',
 'ChIJbathtubgin006sea',
 '{"neighborhood":"Belltown","speakeasy":true,"gin_focus":true,"whiskey_selection":true,"small_bar":true,"walk_in_only":true}'),

-- 7. Liberty Bar — neighborhood bar open since 2006, cocktails + sushi
('cccccccc-0000-0000-0000-000000000007',
 'Liberty Bar',
 ST_MakePoint(-122.3109, 47.6245)::geography,
 '517 15th Ave E',
 'Seattle', 'WA', 'US',
 '+1 206-323-9898',
 'https://libertybarseattle.com',
 'ChIJlibertybar007sea',
 '{"neighborhood":"Capitol Hill","established":2006,"cocktail_bar":true,"sushi":true,"late_night":true}'),

-- 8. The Pine Box — craft beer bar in a converted 1923 funeral home
('cccccccc-0000-0000-0000-000000000008',
 'The Pine Box',
 ST_MakePoint(-122.3277, 47.6155)::geography,
 '1600 Melrose Ave',
 'Seattle', 'WA', 'US',
 '+1 206-588-0375',
 'https://www.pineboxbar.com',
 'ChIJpinebox0000008sea',
 '{"neighborhood":"Capitol Hill","craft_beer":true,"whiskey_selection":true,"historic_building":true,"established":1923}'),

-- 9. Percy''s & Co — apothecary-style cocktail bar and restaurant in Ballard
('cccccccc-0000-0000-0000-000000000009',
 'Percy''s & Co',
 ST_MakePoint(-122.3826, 47.6672)::geography,
 '5233 Ballard Ave NW',
 'Seattle', 'WA', 'US',
 '+1 206-420-3750',
 'https://percysseattle.com',
 'ChIJpercysco0000009sea',
 '{"neighborhood":"Ballard","apothecary_theme":true,"craft_cocktails":true,"dinner":true,"whiskey_selection":true}'),

-- 10. Radiator Whiskey Pike Place — flagship location in Pike Place Market
('cccccccc-0000-0000-0000-000000000010',
 'Radiator Whiskey',
 ST_MakePoint(-122.3407, 47.6085)::geography,
 '94 Pike St',
 'Seattle', 'WA', 'US',
 '+1 206-467-4268',
 'https://www.radiatorwhiskey.com',
 'ChIJradpikepla0010sea',
 '{"neighborhood":"Pike Place Market","whiskey_selection":true,"craft_cocktails":true,"21_and_over":true,"reservations":true}')

ON CONFLICT DO NOTHING;

-- ============================================================
-- BARS — Vancouver WA (dddddddd- prefix)
-- ============================================================
INSERT INTO bars (id, name, location, address, city, state, country, phone, website, google_place_id, metadata) VALUES

-- 1. Loowit Brewing — downtown Vancouver craft brewery and pub since 2012
('dddddddd-0000-0000-0000-000000000001',
 'Loowit Brewing',
 ST_MakePoint(-122.6720, 45.6262)::geography,
 '507 Columbia St',
 'Vancouver', 'WA', 'US',
 '+1 360-566-2323',
 'https://loowitbrewing.com',
 'ChIJloowit000001van',
 '{"neighborhood":"Downtown Vancouver","craft_beer":true,"whiskey_selection":true,"established":2012,"near_columbia_river":true}'),

-- 2. Heathen Brewing Feral Public House — CLOSED Oct 2025; converting to Loyal Legion Vancouver
--    Included for reference but bar_whiskeys are marked available=false.
('dddddddd-0000-0000-0000-000000000002',
 'Heathen Brewing Feral Public House',
 ST_MakePoint(-122.6745, 45.6270)::geography,
 '1109 Washington St',
 'Vancouver', 'WA', 'US',
 NULL,
 'https://www.heathenbrewing.com',
 'ChIJheathen00002van',
 '{"neighborhood":"Downtown Vancouver","craft_beer":true,"status":"closed_oct_2025","note":"Converting to Loyal Legion Vancouver, expected reopen spring 2026"}')

ON CONFLICT DO NOTHING;

-- ============================================================
-- BAR_WHISKEYS — Seattle bars (44444444- prefix)
-- Whiskey UUIDs reference existing 22222222- records from portland seed.
-- ============================================================

-- Canon (10 links) — flagship whiskey bar, top-shelf pricing
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000001', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000049', 32.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000002', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000050', 28.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000003', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000051', 30.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000004', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000048', 24.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000005', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000060', 35.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000006', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000042', 25.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000007', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000041', 22.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000008', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000054', 22.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000009', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000044', 20.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000010', 'cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000055', 48.00, '1oz', true, 'Barrel-proof single barrel')
ON CONFLICT DO NOTHING;

-- The Whisky Bar (8 links) — Scotch-heavy list
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000011', 'cccccccc-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000048', 16.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000012', 'cccccccc-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000049', 20.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000013', 'cccccccc-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000050', 18.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000014', 'cccccccc-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000051', 20.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000015', 'cccccccc-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000041', 14.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000016', 'cccccccc-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000045', 16.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000017', 'cccccccc-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000052', 12.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000018', 'cccccccc-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000047', 13.00, '1.5oz', true, NULL)
ON CONFLICT DO NOTHING;

-- Needle & Thread (6 links) — bespoke cocktail speakeasy, curated spirits
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000019', 'cccccccc-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000043', 18.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000020', 'cccccccc-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000044', 20.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000021', 'cccccccc-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000059', 16.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000022', 'cccccccc-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000049', 28.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000023', 'cccccccc-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000048', 22.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000024', 'cccccccc-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000051', 26.00, '1oz', true, NULL)
ON CONFLICT DO NOTHING;

-- Rob Roy (7 links) — craft cocktail lounge with solid whiskey back-bar
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000025', 'cccccccc-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000041', 15.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000026', 'cccccccc-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000042', 18.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000027', 'cccccccc-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000043', 16.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000028', 'cccccccc-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000053', 13.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000029', 'cccccccc-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000054', 17.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000030', 'cccccccc-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000046', 11.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000031', 'cccccccc-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000059', 14.00, '1.5oz', true, NULL)
ON CONFLICT DO NOTHING;

-- Radiator Whiskey Ballard (6 links)
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000032', 'cccccccc-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000041', 14.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000033', 'cccccccc-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000045', 15.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000034', 'cccccccc-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000047', 12.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000035', 'cccccccc-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000052', 11.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000036', 'cccccccc-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000060', 22.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000037', 'cccccccc-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000046', 10.00, '2oz', true, NULL)
ON CONFLICT DO NOTHING;

-- Bathtub Gin & Co (5 links) — 40+ whiskeys alongside the gin focus
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000038', 'cccccccc-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000043', 15.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000039', 'cccccccc-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000041', 14.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000040', 'cccccccc-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000053', 12.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000041', 'cccccccc-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000046', 10.00, '1oz', true, NULL),
('44444444-0000-0000-cccc-000000000042', 'cccccccc-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000059', 13.00, '1oz', true, NULL)
ON CONFLICT DO NOTHING;

-- Liberty Bar (6 links) — neighborhood bar, approachable whiskey list
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000043', 'cccccccc-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000041', 13.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000044', 'cccccccc-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000046', 10.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000045', 'cccccccc-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000052', 10.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000046', 'cccccccc-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000047', 12.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000047', 'cccccccc-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000059', 12.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000048', 'cccccccc-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000043', 14.00, '1.5oz', true, NULL)
ON CONFLICT DO NOTHING;

-- The Pine Box (5 links) — craft beer primary, but keeps a decent whiskey shelf
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000049', 'cccccccc-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000041', 12.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000050', 'cccccccc-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000046', 10.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000051', 'cccccccc-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000052', 10.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000052', 'cccccccc-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000045', 14.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000053', 'cccccccc-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000053', 11.00, '2oz', true, NULL)
ON CONFLICT DO NOTHING;

-- Percy''s & Co (7 links) — apothecary cocktails; whiskey figures in the back-bar
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000054', 'cccccccc-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000043', 16.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000055', 'cccccccc-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000044', 17.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000056', 'cccccccc-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000059', 14.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000057', 'cccccccc-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000047', 13.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000058', 'cccccccc-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000041', 14.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000059', 'cccccccc-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000048', 18.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000060', 'cccccccc-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000052', 12.00, '2oz', true, NULL)
ON CONFLICT DO NOTHING;

-- Radiator Whiskey Pike Place (8 links)
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-cccc-000000000061', 'cccccccc-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000041', 15.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000062', 'cccccccc-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000045', 16.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000063', 'cccccccc-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000042', 20.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000064', 'cccccccc-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000054', 18.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000065', 'cccccccc-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000060', 25.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000066', 'cccccccc-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000047', 14.00, '1.5oz', true, NULL),
('44444444-0000-0000-cccc-000000000067', 'cccccccc-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000053', 13.00, '2oz', true, NULL),
('44444444-0000-0000-cccc-000000000068', 'cccccccc-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000044', 17.00, '1.5oz', true, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- BAR_WHISKEYS — Vancouver WA bars (44444444-dddd- prefix)
-- ============================================================

-- Loowit Brewing (5 links) — craft brewery; spirits on the back shelf
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-dddd-000000000001', 'dddddddd-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000041', 12.00, '2oz', true, NULL),
('44444444-0000-0000-dddd-000000000002', 'dddddddd-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000046', 10.00, '2oz', true, NULL),
('44444444-0000-0000-dddd-000000000003', 'dddddddd-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000052', 10.00, '2oz', true, NULL),
('44444444-0000-0000-dddd-000000000004', 'dddddddd-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000047', 11.00, '2oz', true, NULL),
('44444444-0000-0000-dddd-000000000005', 'dddddddd-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000059', 12.00, '2oz', true, NULL)
ON CONFLICT DO NOTHING;

-- Heathen Brewing Feral Public House — CLOSED Oct 2025; links marked available=false
-- Remove or update when Loyal Legion Vancouver reopens at this address (spring 2026)
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('44444444-0000-0000-dddd-000000000006', 'dddddddd-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000041', 13.00, '2oz', false, 'Bar closed Oct 2025'),
('44444444-0000-0000-dddd-000000000007', 'dddddddd-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000046', 10.00, '2oz', false, 'Bar closed Oct 2025'),
('44444444-0000-0000-dddd-000000000008', 'dddddddd-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000052', 10.00, '2oz', false, 'Bar closed Oct 2025'),
('44444444-0000-0000-dddd-000000000009', 'dddddddd-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000047', 12.00, '2oz', false, 'Bar closed Oct 2025'),
('44444444-0000-0000-dddd-000000000010', 'dddddddd-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000053', 11.00, '2oz', false, 'Bar closed Oct 2025')
ON CONFLICT DO NOTHING;
