-- =============================================================================
-- findadram seed data
-- Realistic bars, whiskeys, and bar_whiskeys links for development
-- =============================================================================

-- =============================================================================
-- BARS (12 bars across US and UK)
-- ST_MakePoint(longitude, latitude)
-- =============================================================================
INSERT INTO bars (id, name, location, address, city, state, country, phone, website, google_place_id, metadata) VALUES

-- New York City
(
  '11111111-0000-0000-0000-000000000001',
  'Dead Rabbit Grocery & Grog',
  ST_MakePoint(-74.0128, 40.7033)::geography,
  '30 Water St',
  'New York',
  'NY',
  'US',
  '+1 646-422-7906',
  'https://www.deadrabbitnyc.com',
  'ChIJdeadrabbit0001nyc',
  '{"neighborhood": "Financial District", "seating": 80, "reservations": true}'
),
(
  '11111111-0000-0000-0000-000000000002',
  'Attaboy',
  ST_MakePoint(-73.9897, 40.7195)::geography,
  '134 Eldridge St',
  'New York',
  'NY',
  'US',
  NULL,
  NULL,
  'ChIJattaboy00000002nyc',
  '{"neighborhood": "Lower East Side", "seating": 35, "reservations": false, "no_menu": true}'
),

-- Chicago
(
  '11111111-0000-0000-0000-000000000003',
  'The Violet Hour',
  ST_MakePoint(-87.6648, 41.9083)::geography,
  '1520 N Damen Ave',
  'Chicago',
  'IL',
  'US',
  '+1 773-252-1500',
  'https://www.theviolethour.com',
  'ChIJviolethour000003chi',
  '{"neighborhood": "Wicker Park", "seating": 70, "dress_code": "smart casual"}'
),
(
  '11111111-0000-0000-0000-000000000004',
  'Scofflaw',
  ST_MakePoint(-87.6793, 41.9188)::geography,
  '3201 W Armitage Ave',
  'Chicago',
  'IL',
  'US',
  '+1 773-252-9700',
  'https://www.scofflawchicago.com',
  'ChIJscofflaw00000004chi',
  '{"neighborhood": "Logan Square", "seating": 50, "gin_focus": true}'
),

-- Nashville
(
  '11111111-0000-0000-0000-000000000005',
  'The Crying Wolf',
  ST_MakePoint(-86.7770, 36.1665)::geography,
  '823 Woodland St',
  'Nashville',
  'TN',
  'US',
  '+1 615-953-6715',
  'https://www.thecryingwolf.com',
  'ChIJcryingwolf000005nas',
  '{"neighborhood": "East Nashville", "seating": 90, "live_music": true}'
),
(
  '11111111-0000-0000-0000-000000000006',
  'Patterson House',
  ST_MakePoint(-86.7945, 36.1521)::geography,
  '1711 Division St',
  'Nashville',
  'TN',
  'US',
  '+1 615-636-7724',
  'https://www.thepattersonnashville.com',
  'ChIJpatterson000006nas',
  '{"neighborhood": "Midtown", "seating": 60, "reservations": true, "whiskey_list_size": 200}'
),

-- San Francisco
(
  '11111111-0000-0000-0000-000000000007',
  'Trick Dog',
  ST_MakePoint(-122.4166, 37.7630)::geography,
  '3010 20th St',
  'San Francisco',
  'CA',
  'US',
  '+1 415-471-2999',
  'https://www.trickdogbar.com',
  'ChIJtrickdog000007sfo',
  '{"neighborhood": "Mission District", "seating": 80, "themed_menu": true}'
),
(
  '11111111-0000-0000-0000-000000000008',
  'Benjamin Cooper',
  ST_MakePoint(-122.4073, 37.7849)::geography,
  '398 Geary St',
  'San Francisco',
  'CA',
  'US',
  '+1 415-800-7827',
  'https://www.benjamincooper.com',
  'ChIJbenjamin000008sfo',
  '{"neighborhood": "Union Square", "seating": 55, "whiskey_specialists": true}'
),

-- London, UK
(
  '11111111-0000-0000-0000-000000000009',
  'Nightjar',
  ST_MakePoint(-0.0856, 51.5231)::geography,
  '129 City Rd',
  'London',
  NULL,
  'GB',
  '+44 20 7253 4101',
  'https://www.barnightjar.com',
  'ChIJnightjar000009lon',
  '{"neighborhood": "Shoreditch", "seating": 100, "live_jazz": true, "reservations": true}'
),
(
  '11111111-0000-0000-0000-000000000010',
  'Callooh Callay',
  ST_MakePoint(-0.0783, 51.5243)::geography,
  '65 Rivington St',
  'London',
  NULL,
  'GB',
  '+44 20 7739 4781',
  'https://www.calloohcallaybar.com',
  'ChIJcallooh00000010lon',
  '{"neighborhood": "Shoreditch", "seating": 60, "secret_room": true}'
),

-- Edinburgh, UK
(
  '11111111-0000-0000-0000-000000000011',
  'The Scotch Malt Whisky Society',
  ST_MakePoint(-3.2001, 55.9575)::geography,
  '28 Queen St',
  'Edinburgh',
  NULL,
  'GB',
  '+44 131 220 2044',
  'https://www.smws.com',
  'ChIJsmws000000011edi',
  '{"neighborhood": "New Town", "members_club": true, "cask_bottlings": true, "seating": 120}'
),
(
  '11111111-0000-0000-0000-000000000012',
  'Devil''s Advocate',
  ST_MakePoint(-3.1916, 55.9486)::geography,
  '9 Advocates Close',
  'Edinburgh',
  NULL,
  'GB',
  '+44 131 225 4465',
  'https://www.devilsadvocateedinburgh.co.uk',
  'ChIJdevils00000012edi',
  '{"neighborhood": "Old Town", "seating": 140, "scotch_specialists": true, "whisky_count": 300}'
);


-- =============================================================================
-- WHISKEYS (35 entries across all types)
-- =============================================================================
INSERT INTO whiskeys (id, name, distillery, region, country, type, age, abv, description) VALUES

-- BOURBON (9)
(
  '22222222-0000-0000-0000-000000000001',
  'Buffalo Trace',
  'Buffalo Trace Distillery',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  45.00,
  'A flagship Kentucky straight bourbon aged in new charred oak barrels. Vanilla and caramel on the nose with hints of mint and anise.'
),
(
  '22222222-0000-0000-0000-000000000002',
  'Maker''s Mark',
  'Maker''s Mark Distillery',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  45.00,
  'A soft red winter wheat bourbon known for its iconic red wax seal. Sweet and approachable with notes of vanilla, caramel, and a hint of oak.'
),
(
  '22222222-0000-0000-0000-000000000003',
  'Woodford Reserve',
  'Woodford Reserve Distillery',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  43.20,
  'A small-batch premium bourbon with rich and full flavors of dried fruit, vanilla, and toasted oak with a smooth, long finish.'
),
(
  '22222222-0000-0000-0000-000000000004',
  'Blanton''s Original Single Barrel',
  'Buffalo Trace Distillery',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  46.50,
  'The original single-barrel bourbon. Fruity and sweet with citrus and caramel notes, finishing with a long, dry oakiness.'
),
(
  '22222222-0000-0000-0000-000000000005',
  'Eagle Rare 10 Year',
  'Buffalo Trace Distillery',
  'Kentucky',
  'US',
  'bourbon',
  10,
  45.00,
  'A rich and complex single-barrel bourbon with notes of toffee, hints of orange peel, herbs and oak.'
),
(
  '22222222-0000-0000-0000-000000000006',
  'Pappy Van Winkle 15 Year',
  'Buffalo Trace Distillery',
  'Kentucky',
  'US',
  'bourbon',
  15,
  53.50,
  'The legendary wheated bourbon. Extraordinarily complex with flavors of vanilla, oak, and dried fruit. Extremely rare.'
),
(
  '22222222-0000-0000-0000-000000000007',
  'Four Roses Single Barrel',
  'Four Roses Distillery',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  50.00,
  'Bold and spicy with a rich, full body. Notes of ripe fruit, maple, and subtle vanilla with a long, smooth finish.'
),
(
  '22222222-0000-0000-0000-000000000008',
  'Knob Creek 9 Year',
  'Jim Beam Distillery',
  'Kentucky',
  'US',
  'bourbon',
  9,
  50.00,
  'A full-flavored bourbon aged 9 years in deeply charred American oak barrels. Rich caramel, vanilla, and oak with a clean, full finish.'
),
(
  '22222222-0000-0000-0000-000000000009',
  'Elijah Craig Small Batch',
  'Heaven Hill Distillery',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  47.00,
  'Named after the reputed father of bourbon, this small batch expression offers vanilla, caramel, and sweet spice on the palate.'
),

-- SCOTCH / SINGLE MALT (10)
(
  '22222222-0000-0000-0000-000000000010',
  'Lagavulin 16 Year',
  'Lagavulin Distillery',
  'Islay',
  'GB',
  'scotch',
  16,
  43.00,
  'An iconic Islay single malt with intense peat smoke, iodine, and medicinal notes balanced by rich dried fruit and sweetness.'
),
(
  '22222222-0000-0000-0000-000000000011',
  'Glenfiddich 12 Year',
  'Glenfiddich Distillery',
  'Speyside',
  'GB',
  'single_malt',
  12,
  40.00,
  'The world''s most awarded single malt Scotch. Fresh and fruity with pear and subtle oak, finished in sherry and bourbon casks.'
),
(
  '22222222-0000-0000-0000-000000000012',
  'Macallan 12 Year Sherry Oak',
  'Macallan Distillery',
  'Speyside',
  'GB',
  'single_malt',
  12,
  40.00,
  'Matured exclusively in hand-picked sherry-seasoned casks. Rich dried fruits, vanilla, and ginger with a warm, spicy finish.'
),
(
  '22222222-0000-0000-0000-000000000013',
  'Laphroaig 10 Year',
  'Laphroaig Distillery',
  'Islay',
  'GB',
  'scotch',
  10,
  40.00,
  'The most richly flavoured of all Scotch whiskies. Peaty, smoky, and slightly sweet with a hint of seaweed and iodine.'
),
(
  '22222222-0000-0000-0000-000000000014',
  'Oban 14 Year',
  'Oban Distillery',
  'West Highlands',
  'GB',
  'single_malt',
  14,
  43.00,
  'A beautiful balance of Highland and Island character. Dry and slightly smoky with notes of citrus, sea salt, and heather honey.'
),
(
  '22222222-0000-0000-0000-000000000015',
  'Glenlivet 12 Year',
  'Glenlivet Distillery',
  'Speyside',
  'GB',
  'single_malt',
  12,
  40.00,
  'The classic Speyside expression. Light and floral with notes of vanilla, butterscotch, and fresh orchard fruits.'
),
(
  '22222222-0000-0000-0000-000000000016',
  'Balvenie DoubleWood 12 Year',
  'Balvenie Distillery',
  'Speyside',
  'GB',
  'single_malt',
  12,
  40.00,
  'Aged in two distinct cask types: traditional whisky oak casks then European oak sherry casks. Honey, vanilla, and warm spice.'
),
(
  '22222222-0000-0000-0000-000000000017',
  'Highland Park 12 Year Viking Honour',
  'Highland Park Distillery',
  'Orkney',
  'GB',
  'single_malt',
  12,
  40.00,
  'Balanced and full-bodied. Aromatic peat smoke, heather honey, dried fruits, and a long warming finish from Orkney''s northernmost distillery.'
),
(
  '22222222-0000-0000-0000-000000000018',
  'Ardbeg 10 Year',
  'Ardbeg Distillery',
  'Islay',
  'GB',
  'single_malt',
  10,
  46.00,
  'One of the most heavily peated whiskies on the planet. Intense smoke, tarry rope, and coffee with a lingering sweet finish.'
),
(
  '22222222-0000-0000-0000-000000000019',
  'Talisker 10 Year',
  'Talisker Distillery',
  'Isle of Skye',
  'GB',
  'single_malt',
  10,
  45.80,
  'The only single malt distillery on the Isle of Skye. Peppery, warming, and smoky with sea salt and a long dry finish.'
),

-- IRISH (4)
(
  '22222222-0000-0000-0000-000000000020',
  'Jameson',
  'Midleton Distillery',
  'Cork',
  'IE',
  'irish',
  NULL,
  40.00,
  'Ireland''s best-selling Irish whiskey. Triple distilled for exceptional smoothness with notes of spice, vanilla, and a hint of nuttiness.'
),
(
  '22222222-0000-0000-0000-000000000021',
  'Redbreast 12 Year',
  'Midleton Distillery',
  'Cork',
  'IE',
  'irish',
  12,
  40.00,
  'A classic pot still Irish whiskey aged in a combination of bourbon and Oloroso sherry-seasoned oak casks. Dried fruit, sherry spice, and cream.'
),
(
  '22222222-0000-0000-0000-000000000022',
  'Green Spot',
  'Midleton Distillery',
  'Cork',
  'IE',
  'irish',
  NULL,
  40.00,
  'A traditional single pot still Irish whiskey with notes of fresh apple, barley, clove, and toasted wood.'
),
(
  '22222222-0000-0000-0000-000000000023',
  'Teeling Small Batch',
  'Teeling Whiskey Distillery',
  'Dublin',
  'IE',
  'irish',
  NULL,
  46.00,
  'A blend of grain and malt whiskeys finished in Central American rum casks. Vanilla, caramel, pepper, and tropical fruit.'
),

-- RYE (4)
(
  '22222222-0000-0000-0000-000000000024',
  'Whistlepig 10 Year',
  'WhistlePig Farm',
  'Vermont',
  'US',
  'rye',
  10,
  50.00,
  'A 100% rye whiskey that defined the craft rye revival. Bold and spicy with notes of chocolate, anise, and dried stone fruit.'
),
(
  '22222222-0000-0000-0000-000000000025',
  'Sazerac Rye',
  'Buffalo Trace Distillery',
  'Kentucky',
  'US',
  'rye',
  NULL,
  45.00,
  'Named after the classic New Orleans cocktail it often stars in. Floral and herbal with classic rye spice and a clean, dry finish.'
),
(
  '22222222-0000-0000-0000-000000000026',
  'Rittenhouse Rye',
  'Heaven Hill Distillery',
  'Kentucky',
  'US',
  'rye',
  NULL,
  50.00,
  'A bottled-in-bond rye whiskey beloved by bartenders. Big, bold rye spice with black pepper, clove, and a long finish.'
),
(
  '22222222-0000-0000-0000-000000000027',
  'Old Overholt',
  'Jim Beam Distillery',
  'Kentucky',
  'US',
  'rye',
  NULL,
  40.00,
  'One of America''s oldest whiskey brands, dating back to 1810. Light and approachable rye spice with caramel and a clean finish.'
),

-- JAPANESE (4)
(
  '22222222-0000-0000-0000-000000000028',
  'Hibiki Japanese Harmony',
  'Suntory Distilleries',
  'Osaka',
  'JP',
  'japanese',
  NULL,
  43.00,
  'A delicate blend of malt and grain whiskies. Honey, orange peel, and light oak with a silky smooth finish.'
),
(
  '22222222-0000-0000-0000-000000000029',
  'Yamazaki 12 Year',
  'Yamazaki Distillery',
  'Osaka',
  'JP',
  'japanese',
  12,
  43.00,
  'Japan''s first single malt distillery. Subtle fruit, peach, and pineapple with vanilla and coconut oak.'
),
(
  '22222222-0000-0000-0000-000000000030',
  'Nikka From The Barrel',
  'Nikka Whisky',
  'Hokkaido',
  'JP',
  'japanese',
  NULL,
  51.40,
  'A premium blended whisky bottled at cask strength. Rich vanilla, toffee, and chocolate with a bold, warming spice finish.'
),
(
  '22222222-0000-0000-0000-000000000031',
  'Hakushu 12 Year',
  'Hakushu Distillery',
  'Yamanashi',
  'JP',
  'single_malt',
  12,
  43.00,
  'From the forest distillery in the Japanese Alps. Refreshingly herbal and lightly peated with green apple and mint.'
),

-- BLENDED (2)
(
  '22222222-0000-0000-0000-000000000032',
  'Johnnie Walker Black Label 12 Year',
  'Various Scotch Distilleries',
  'Scotland',
  'GB',
  'blended',
  12,
  40.00,
  'The definitive premium Scotch blend. Smoky with deeper fruit and complex character from 12-year-old malts and grains.'
),
(
  '22222222-0000-0000-0000-000000000033',
  'Monkey Shoulder',
  'William Grant & Sons',
  'Speyside',
  'GB',
  'blended',
  NULL,
  40.00,
  'A blend of three Speyside single malts. Mellow and easy-drinking with vanilla, honey, and baked apple. Perfect for cocktails.'
),

-- CANADIAN (2)
(
  '22222222-0000-0000-0000-000000000034',
  'Crown Royal',
  'Crown Royal Distillery',
  'Manitoba',
  'CA',
  'canadian',
  NULL,
  40.00,
  'Canada''s best-selling Canadian whisky. Smooth and light with notes of vanilla, caramel, and a pleasantly fruity finish.'
),
(
  '22222222-0000-0000-0000-000000000035',
  'Canadian Club 12 Year',
  'Canadian Club Distillery',
  'Ontario',
  'CA',
  'canadian',
  12,
  40.00,
  'A classic Canadian blended whisky aged 12 years. Smooth with notes of dried fruit, vanilla, and gentle oak spice.'
);


-- =============================================================================
-- BAR_WHISKEYS (~80 links with realistic prices)
-- =============================================================================

-- Dead Rabbit, NYC (bar 01) — 10 whiskeys, focus on Irish and Scotch
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0001-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000020', 12.00, '1.5oz', true, 'Well pour'),
('33333333-0000-0000-0001-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000021', 18.00, '1.5oz', true, NULL),
('33333333-0000-0000-0001-000000000003', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000022', 17.00, '1.5oz', true, NULL),
('33333333-0000-0000-0001-000000000004', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000023', 15.00, '1.5oz', true, NULL),
('33333333-0000-0000-0001-000000000005', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000010', 22.00, '1.5oz', true, NULL),
('33333333-0000-0000-0001-000000000006', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000011', 16.00, '1.5oz', true, NULL),
('33333333-0000-0000-0001-000000000007', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000013', 17.00, '1.5oz', true, NULL),
('33333333-0000-0000-0001-000000000008', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 13.00, '1.5oz', true, NULL),
('33333333-0000-0000-0001-000000000009', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000025', 14.00, '1.5oz', true, 'Classic for Sazerac cocktail'),
('33333333-0000-0000-0001-000000000010', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000032', 13.00, '1.5oz', true, NULL),

-- Attaboy, NYC (bar 02) — 8 whiskeys, curated no-menu bar
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0002-000000000001', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 16.00, '1.5oz', true, NULL),
('33333333-0000-0000-0002-000000000002', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 25.00, '1.5oz', true, 'Allocated — ask bartender'),
('33333333-0000-0000-0002-000000000003', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', 18.00, '1.5oz', true, NULL),
('33333333-0000-0000-0002-000000000004', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000024', 22.00, '1.5oz', true, NULL),
('33333333-0000-0000-0002-000000000005', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000025', 15.00, '1.5oz', true, NULL),
('33333333-0000-0000-0002-000000000006', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000026', 14.00, '1.5oz', true, NULL),
('33333333-0000-0000-0002-000000000007', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000028', 20.00, '1.5oz', true, NULL),
('33333333-0000-0000-0002-000000000008', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000012', 19.00, '1.5oz', true, NULL),

-- The Violet Hour, Chicago (bar 03) — 7 whiskeys
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0003-000000000001', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 14.00, '1.5oz', true, NULL),
('33333333-0000-0000-0003-000000000002', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', 17.00, '1.5oz', true, NULL),
('33333333-0000-0000-0003-000000000003', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000007', 16.00, '1.5oz', true, NULL),
('33333333-0000-0000-0003-000000000004', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000024', 20.00, '1.5oz', true, NULL),
('33333333-0000-0000-0003-000000000005', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000026', 13.00, '1.5oz', true, NULL),
('33333333-0000-0000-0003-000000000006', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000033', 12.00, '1.5oz', true, 'House blend for cocktails'),
('33333333-0000-0000-0003-000000000007', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000020', 11.00, '1.5oz', true, NULL),

-- Scofflaw, Chicago (bar 04) — 7 whiskeys
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0004-000000000001', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000027', 9.00, '1.5oz', true, NULL),
('33333333-0000-0000-0004-000000000002', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000026', 12.00, '1.5oz', true, NULL),
('33333333-0000-0000-0004-000000000003', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 12.00, '1.5oz', true, NULL),
('33333333-0000-0000-0004-000000000004', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000009', 14.00, '1.5oz', true, NULL),
('33333333-0000-0000-0004-000000000005', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000033', 11.00, '1.5oz', true, NULL),
('33333333-0000-0000-0004-000000000006', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000020', 10.00, '1.5oz', true, NULL),
('33333333-0000-0000-0004-000000000007', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000034', 10.00, '1.5oz', true, NULL),

-- The Crying Wolf, Nashville (bar 05) — 7 whiskeys
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0005-000000000001', '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 11.00, '1.5oz', true, NULL),
('33333333-0000-0000-0005-000000000002', '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000002', 12.00, '1.5oz', true, NULL),
('33333333-0000-0000-0005-000000000003', '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000005', 15.00, '1.5oz', true, NULL),
('33333333-0000-0000-0005-000000000004', '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000008', 14.00, '1.5oz', true, NULL),
('33333333-0000-0000-0005-000000000005', '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000009', 13.00, '1.5oz', true, NULL),
('33333333-0000-0000-0005-000000000006', '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000025', 12.00, '1.5oz', true, NULL),
('33333333-0000-0000-0005-000000000007', '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000007', 14.00, '1.5oz', true, NULL),

-- Patterson House, Nashville (bar 06) — 9 whiskeys, premium whiskey bar
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0006-000000000001', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000006', 85.00, '1oz', true, 'Pappy 15 — allocated, limited availability'),
('33333333-0000-0000-0006-000000000002', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000004', 28.00, '1.5oz', true, NULL),
('33333333-0000-0000-0006-000000000003', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000005', 20.00, '1.5oz', true, NULL),
('33333333-0000-0000-0006-000000000004', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000003', 17.00, '1.5oz', true, NULL),
('33333333-0000-0000-0006-000000000005', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', 14.00, '1.5oz', true, NULL),
('33333333-0000-0000-0006-000000000006', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000024', 24.00, '1.5oz', true, NULL),
('33333333-0000-0000-0006-000000000007', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000029', 25.00, '1.5oz', true, NULL),
('33333333-0000-0000-0006-000000000008', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000028', 22.00, '1.5oz', true, NULL),
('33333333-0000-0000-0006-000000000009', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000030', 23.00, '1.5oz', true, NULL),

-- Trick Dog, San Francisco (bar 07) — 7 whiskeys
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0007-000000000001', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000002', 14.00, '1.5oz', true, NULL),
('33333333-0000-0000-0007-000000000002', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000003', 17.00, '1.5oz', true, NULL),
('33333333-0000-0000-0007-000000000003', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000028', 21.00, '1.5oz', true, NULL),
('33333333-0000-0000-0007-000000000004', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000031', 24.00, '1.5oz', true, NULL),
('33333333-0000-0000-0007-000000000005', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000033', 12.00, '1.5oz', true, NULL),
('33333333-0000-0000-0007-000000000006', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000022', 15.00, '1.5oz', true, NULL),
('33333333-0000-0000-0007-000000000007', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000024', 22.00, '1.5oz', true, NULL),

-- Benjamin Cooper, San Francisco (bar 08) — 8 whiskeys, whiskey specialists
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0008-000000000001', '11111111-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000029', 26.00, '1.5oz', true, NULL),
('33333333-0000-0000-0008-000000000002', '11111111-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000030', 24.00, '1.5oz', true, NULL),
('33333333-0000-0000-0008-000000000003', '11111111-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000031', 25.00, '1.5oz', true, NULL),
('33333333-0000-0000-0008-000000000004', '11111111-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000028', 22.00, '1.5oz', true, NULL),
('33333333-0000-0000-0008-000000000005', '11111111-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000010', 23.00, '1.5oz', true, NULL),
('33333333-0000-0000-0008-000000000006', '11111111-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000016', 20.00, '1.5oz', true, NULL),
('33333333-0000-0000-0008-000000000007', '11111111-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000018', 21.00, '1.5oz', true, NULL),
('33333333-0000-0000-0008-000000000008', '11111111-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000003', 18.00, '1.5oz', true, NULL),

-- Nightjar, London (bar 09) — 8 whiskeys
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0009-000000000001', '11111111-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000010', 18.00, '25ml', true, NULL),
('33333333-0000-0000-0009-000000000002', '11111111-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000011', 14.00, '25ml', true, NULL),
('33333333-0000-0000-0009-000000000003', '11111111-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000012', 16.00, '25ml', true, NULL),
('33333333-0000-0000-0009-000000000004', '11111111-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000015', 13.00, '25ml', true, NULL),
('33333333-0000-0000-0009-000000000005', '11111111-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000017', 15.00, '25ml', true, NULL),
('33333333-0000-0000-0009-000000000006', '11111111-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000032', 12.00, '25ml', true, NULL),
('33333333-0000-0000-0009-000000000007', '11111111-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000020', 11.00, '25ml', true, NULL),
('33333333-0000-0000-0009-000000000008', '11111111-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000028', 20.00, '25ml', true, NULL),

-- Callooh Callay, London (bar 10) — 6 whiskeys
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0010-000000000001', '11111111-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000021', 16.00, '25ml', true, NULL),
('33333333-0000-0000-0010-000000000002', '11111111-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000020', 10.00, '25ml', true, NULL),
('33333333-0000-0000-0010-000000000003', '11111111-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000013', 17.00, '25ml', true, NULL),
('33333333-0000-0000-0010-000000000004', '11111111-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000019', 16.00, '25ml', true, NULL),
('33333333-0000-0000-0010-000000000005', '11111111-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000033', 11.00, '25ml', true, NULL),
('33333333-0000-0000-0010-000000000006', '11111111-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000032', 12.00, '25ml', true, NULL),

-- SMWS Edinburgh (bar 11) — 9 whiskeys, Scotch specialists
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0011-000000000001', '11111111-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000010', 22.00, '25ml', true, NULL),
('33333333-0000-0000-0011-000000000002', '11111111-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000011', 16.00, '25ml', true, NULL),
('33333333-0000-0000-0011-000000000003', '11111111-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000012', 20.00, '25ml', true, NULL),
('33333333-0000-0000-0011-000000000004', '11111111-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000013', 17.00, '25ml', true, NULL),
('33333333-0000-0000-0011-000000000005', '11111111-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000014', 20.00, '25ml', true, NULL),
('33333333-0000-0000-0011-000000000006', '11111111-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000016', 18.00, '25ml', true, NULL),
('33333333-0000-0000-0011-000000000007', '11111111-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000017', 17.00, '25ml', true, NULL),
('33333333-0000-0000-0011-000000000008', '11111111-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000018', 20.00, '25ml', true, NULL),
('33333333-0000-0000-0011-000000000009', '11111111-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000019', 18.00, '25ml', true, NULL),

-- Devil's Advocate Edinburgh (bar 12) — 9 whiskeys, 300+ Scotch list
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('33333333-0000-0000-0012-000000000001', '11111111-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000010', 20.00, '25ml', true, NULL),
('33333333-0000-0000-0012-000000000002', '11111111-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000011', 14.00, '25ml', true, NULL),
('33333333-0000-0000-0012-000000000003', '11111111-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000012', 18.00, '25ml', true, NULL),
('33333333-0000-0000-0012-000000000004', '11111111-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000013', 16.00, '25ml', true, NULL),
('33333333-0000-0000-0012-000000000005', '11111111-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000014', 19.00, '25ml', true, NULL),
('33333333-0000-0000-0012-000000000006', '11111111-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000015', 13.00, '25ml', true, NULL),
('33333333-0000-0000-0012-000000000007', '11111111-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000016', 17.00, '25ml', true, NULL),
('33333333-0000-0000-0012-000000000008', '11111111-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000018', 19.00, '25ml', true, NULL),
('33333333-0000-0000-0012-000000000009', '11111111-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000019', 17.00, '25ml', true, NULL);
