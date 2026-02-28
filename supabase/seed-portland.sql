-- =============================================================================
-- findadram Portland seed data
-- Generated 2026-02-28T18:56:50.315Z by scripts/generate-portland-seed.ts
-- =============================================================================

-- BARS (23 Portland establishments)
INSERT INTO bars (id, name, location, address, city, state, country, phone, website, metadata) VALUES
(
  'aaaaaaaa-pdx-0000-0000-000000000001',
  'Multnomah Whiskey Library',
  ST_MakePoint(-122.6831, 45.5209)::geography,
  '1124 SW Alder St, Portland, OR 97205',
  'Portland',
  'OR',
  'US',
  '+1 503-954-1381',
  'https://mwlpdx.com',
  '{"neighborhood":"Downtown","whiskey_count":1500,"reservations":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000002',
  'Scotch Lodge',
  ST_MakePoint(-122.6569, 45.5214)::geography,
  '215 SE 9th Ave, Ste 102, Portland, OR 97214',
  'Portland',
  'OR',
  'US',
  '+1 503-208-2039',
  'https://www.scotchlodge.com',
  '{"neighborhood":"Central Eastside","whiskey_count":300,"half_pours":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000003',
  'The Old Gold',
  ST_MakePoint(-122.6892, 45.5629)::geography,
  '2105 N Killingsworth St, Portland, OR 97217',
  'Portland',
  'OR',
  'US',
  '+1 503-894-8937',
  'https://www.drinkinoregon.com',
  '{"neighborhood":"North Portland","single_barrel_selections":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000004',
  'Paydirt',
  ST_MakePoint(-122.6369, 45.5285)::geography,
  '2724 NE Pacific St, Portland, OR 97232',
  'Portland',
  'OR',
  'US',
  NULL,
  'https://www.paydirtbar.com',
  '{"neighborhood":"The Zipper","whiskey_count":250,"sister_bar":"The Old Gold"}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000005',
  'Pope House Bourbon Lounge',
  ST_MakePoint(-122.694, 45.5265)::geography,
  '2075 NW Glisan St, Portland, OR 97209',
  'Portland',
  'OR',
  'US',
  '+1 503-222-1056',
  'https://www.popehouselounge.com',
  '{"neighborhood":"Nob Hill","bourbon_count":150,"historic_building":true,"year_built":1890}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000006',
  'Swine Moonshine & Whiskey Bar',
  ST_MakePoint(-122.6801, 45.5187)::geography,
  '808 SW Taylor St, Portland, OR 97205',
  'Portland',
  'OR',
  'US',
  '+1 503-943-5844',
  'https://swinemoonshine.com',
  '{"neighborhood":"Downtown","hotel":"Paramount Hotel","prohibition_aesthetic":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000007',
  'Loyal Legion',
  ST_MakePoint(-122.66, 45.5189)::geography,
  '710 SE 6th Ave, Portland, OR 97214',
  'Portland',
  'OR',
  'US',
  '+1 503-235-8272',
  'https://loyallegionbeerhall.com/portland/',
  '{"neighborhood":"Central Eastside","beers_on_tap":99,"whiskey_count":130}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000008',
  'The Eastburn',
  ST_MakePoint(-122.6457, 45.5237)::geography,
  '1800 E Burnside St, Portland, OR 97214',
  'Portland',
  'OR',
  'US',
  '+1 503-236-2876',
  'https://theeastburn.com',
  '{"neighborhood":"Buckman","whisky_wednesday":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000009',
  'Interurban',
  ST_MakePoint(-122.6757, 45.553)::geography,
  '4057 N Mississippi Ave, Portland, OR 97227',
  'Portland',
  'OR',
  'US',
  '+1 503-284-6669',
  'https://www.interurbanpdx.com',
  '{"neighborhood":"Mississippi","pre_prohibition_cocktails":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000010',
  'Holy Ghost Bar',
  ST_MakePoint(-122.634, 45.4988)::geography,
  '4107 SE 28th Ave, Portland, OR 97202',
  'Portland',
  'OR',
  'US',
  '+1 503-235-0969',
  'https://www.holyghostbar.com',
  '{"neighborhood":"Woodstock","whiskey_and_mezcal":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000011',
  'Teardrop Lounge',
  ST_MakePoint(-122.6821, 45.5264)::geography,
  '1015 NW Everett St, Portland, OR 97209',
  'Portland',
  'OR',
  'US',
  '+1 503-445-8109',
  'https://www.teardroplounge.com',
  '{"neighborhood":"Pearl District","specialty_cocktails":30}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000012',
  'Angel Face',
  ST_MakePoint(-122.6366, 45.5231)::geography,
  '14 NE 28th Ave, Portland, OR 97232',
  'Portland',
  'OR',
  'US',
  '+1 503-239-3804',
  'https://www.angelfaceportland.com',
  '{"neighborhood":"Kerns","no_menu":true,"bartender_driven":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000013',
  'Hey Love',
  ST_MakePoint(-122.6512, 45.5232)::geography,
  '920 E Burnside St, Portland, OR 97214',
  'Portland',
  'OR',
  'US',
  '+1 503-206-6223',
  'https://www.heylovepdx.com',
  '{"neighborhood":"Buckman","hotel":"Jupiter NEXT Hotel","best_hotel_bar":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000014',
  'Bible Club PDX',
  ST_MakePoint(-122.6507, 45.4849)::geography,
  '6716 SE 16th Ave, Portland, OR 97202',
  'Portland',
  'OR',
  'US',
  '+1 971-279-2198',
  'https://bibleclubpdx.com',
  '{"neighborhood":"Sellwood","speakeasy":true,"year_built":1922}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000015',
  'Hale Pele',
  ST_MakePoint(-122.6374, 45.5353)::geography,
  '2733 NE Broadway, Portland, OR 97232',
  'Portland',
  'OR',
  'US',
  '+1 503-662-8454',
  'https://www.halepele.com',
  '{"neighborhood":"Sullivan''s Gulch","tiki_bar":true,"cocktail_count":50}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000016',
  'Rum Club',
  ST_MakePoint(-122.6548, 45.5234)::geography,
  '720 SE Sandy Blvd, Portland, OR 97214',
  'Portland',
  'OR',
  'US',
  '+1 503-265-8807',
  'https://rumclubpdx.com',
  '{"neighborhood":"Buckman"}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000017',
  'The Sapphire Hotel',
  ST_MakePoint(-122.6113, 45.5119)::geography,
  '5008 SE Hawthorne Blvd, Portland, OR 97215',
  'Portland',
  'OR',
  'US',
  '+1 503-232-6333',
  'https://thesapphirehotel.com',
  '{"neighborhood":"Hawthorne"}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000018',
  'Bacchus Bar',
  ST_MakePoint(-122.6793, 45.5196)::geography,
  '422 SW Broadway, Portland, OR 97205',
  'Portland',
  'OR',
  'US',
  '+1 503-228-1212',
  'https://www.bacchusbarpdx.com',
  '{"neighborhood":"Downtown","hotel":"Kimpton Hotel Vintage"}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000019',
  'Too Soon',
  ST_MakePoint(-122.6367, 45.5231)::geography,
  '18 NE 28th Ave, Portland, OR 97232',
  'Portland',
  'OR',
  'US',
  '+1 971-380-0548',
  'https://toosoonpdx.com',
  '{"neighborhood":"Kerns","esquire_top_50":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000020',
  'Bull Run Distillery',
  ST_MakePoint(-122.6999, 45.5311)::geography,
  '2259 NW Quimby St, Portland, OR 97210',
  'Portland',
  'OR',
  'US',
  '+1 503-224-3483',
  'https://www.bullrundistillery.com',
  '{"neighborhood":"Slabtown","products":["Oregon Single Malt"],"hours":"Fri-Sun 12-6pm"}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000021',
  'New Deal Distillery',
  ST_MakePoint(-122.6567, 45.5144)::geography,
  '900 SE Salmon St, Portland, OR 97214',
  'Portland',
  'OR',
  'US',
  '+1 503-234-2513',
  'https://newdealdistillery.com',
  '{"neighborhood":"Central Eastside","distillery_row":true,"bottle_shop":true}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000022',
  'Stone Barn Brandyworks',
  ST_MakePoint(-122.6494, 45.5013)::geography,
  '3315 SE 19th Ave, Ste B, Portland, OR 97202',
  'Portland',
  'OR',
  'US',
  '+1 503-341-2227',
  'https://www.stonebarnbrandyworks.com',
  '{"neighborhood":"Brooklyn","products":["Rye Whiskey","Fruit Brandies"]}'
),
(
  'aaaaaaaa-pdx-0000-0000-000000000023',
  'Freeland Spirits',
  ST_MakePoint(-122.7011, 45.533)::geography,
  '2671 NW Vaughn St, Portland, OR 97210',
  'Portland',
  'OR',
  'US',
  '+1 971-279-5692',
  'https://freelandspirits.com',
  '{"neighborhood":"Slabtown","female_founded":true,"products":["Bourbon","Gin"]}'
);

-- WHISKEYS (24 unique whiskeys found in Portland)
INSERT INTO whiskeys (id, name, distillery, region, country, type, age, abv, description) VALUES
(
  'bbbbbbbb-pdx-0000-0000-000000000001',
  'Rittenhouse Bottled-in-Bond Rye (Single Barrel)',
  'Heaven Hill',
  'Kentucky',
  'US',
  'rye',
  NULL,
  50,
  'A house single barrel selection of Heaven Hill''s Bottled-in-Bond rye, offering spicy, herbal notes with a robust, full-proof backbone.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000002',
  'Sazerac Rye (Single Barrel)',
  'Buffalo Trace',
  'Kentucky',
  'US',
  'rye',
  NULL,
  NULL,
  'A house single barrel selection of Buffalo Trace''s Sazerac Rye, delivering classic spice, dried fruit, and a clean, assertive finish.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000003',
  'Mezcal Union Cirial and Espadín Blend (Single Barrel)',
  'Mezcal Union',
  NULL,
  'US',
  'other',
  NULL,
  NULL,
  'A house single barrel selection of a 100% agave blend of Cirial and Espadín varieties, offering smoky, earthy, and complex agave character.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000004',
  'Old Taylor Kentucky Straight Bourbon',
  'Buffalo Trace',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  NULL,
  'A light, approachable Kentucky bourbon with notes of vanilla, grain, and mild oak, ideal for mixing or sipping.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000005',
  'Sazerac Rye',
  'Buffalo Trace',
  'Kentucky',
  'US',
  'rye',
  NULL,
  NULL,
  'Buffalo Trace''s flagship rye whiskey, featuring peppery spice, subtle sweetness, and a smooth, well-balanced finish.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000006',
  'J.T.S. Brown Bottled-in-Bond Bourbon',
  'Heaven Hill',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  50,
  'A Bottled-in-Bond Kentucky bourbon with straightforward caramel, oak, and grain notes at a robust full proof.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000007',
  'Wild Turkey Rare Breed',
  'Wild Turkey',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  58.4,
  'A barrel-proof blend of Wild Turkey''s finest aged stocks, delivering bold caramel, vanilla, and warm spice with a long, rich finish.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000008',
  'Elijah Craig Small Batch Bourbon',
  'Heaven Hill',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  47,
  'A well-rounded Kentucky bourbon with notes of charred oak, toffee, vanilla, and a touch of mint and dried fruit.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000009',
  'Bulleit Bourbon',
  'Bulleit',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  45,
  'A high-rye frontier bourbon with bold notes of maple, oak, and a distinctive spicy finish.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000010',
  'Old Forester Bourbon',
  'Brown-Forman',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  43,
  'A classic Louisville bourbon with notes of dark fruit, cocoa, and toasted oak, offering an approachable and versatile profile.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000011',
  'Maker''s Mark Kentucky Straight Bourbon Whisky',
  'Maker''s Mark',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  45,
  'A smooth, wheated Kentucky bourbon with characteristic notes of red winter wheat, caramel, vanilla, and a soft, creamy finish.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000012',
  'Buffalo Trace Kentucky Straight Bourbon',
  'Buffalo Trace',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  45,
  'A flagship American bourbon with notes of vanilla, mint, molasses, and light oak, balanced and approachable across many occasions.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000013',
  'Jim Beam Rye',
  'Jim Beam',
  'Kentucky',
  'US',
  'rye',
  NULL,
  40,
  'A straightforward, affordable rye with notes of pepper, light oak, and subtle sweetness, well-suited for mixing.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000014',
  'George Dickel Rye',
  'George Dickel',
  'Kentucky',
  'US',
  'rye',
  NULL,
  45,
  'A Tennessee-crafted rye with smooth, mellow spice, light fruit, and a clean, slightly sweet finish.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000015',
  'Slane Irish Whiskey',
  'Slane Distillery',
  NULL,
  'IE',
  'irish',
  NULL,
  40,
  'A triple-casked Irish whiskey with notes of vanilla, toffee, and subtle spice, offering a smooth and approachable character.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000016',
  'Jim Beam Black',
  'Jim Beam',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  43,
  'An extra-aged expression of Jim Beam with deeper notes of caramel, vanilla, and toasted oak compared to the standard offering.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000017',
  'Mellow Corn Straight Corn Whiskey',
  'Heaven Hill',
  NULL,
  'US',
  'other',
  NULL,
  50,
  'A Bottled-in-Bond straight corn whiskey with sweet, buttery cornbread notes and a light, easy-going finish.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000018',
  'Eagle Rare Kentucky Straight Bourbon (Private Barrel, on Draft)',
  'Buffalo Trace',
  'Kentucky',
  'US',
  'bourbon',
  10,
  45,
  'A private barrel selection of Buffalo Trace''s Eagle Rare, featuring bold toffee, herbs, and oak served uniquely on draft.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000019',
  'Colonel E.H. Taylor Small Batch Bourbon (Private Barrel)',
  'Buffalo Trace',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  50,
  'A Bottled-in-Bond private barrel selection with notes of herbal sweetness, caramel, and spice from one of Buffalo Trace''s most storied lines.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000020',
  'W.L. Weller Full Proof Bourbon (Private Barrel)',
  'Buffalo Trace',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  57,
  'A private barrel selection of Buffalo Trace''s wheated full-proof Weller, delivering rich caramel, vanilla, and lush sweetness at barrel strength.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000021',
  'Old Grand-Dad Bourbon',
  'Beam Suntory',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  40,
  'A high-rye recipe bourbon with bright, peppery spice, orange peel, and a warm, slightly sweet finish.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000022',
  'Kings County Distillery Bourbon',
  'Kings County Distillery',
  'Kentucky',
  'US',
  'bourbon',
  NULL,
  NULL,
  'A New York craft bourbon made with locally sourced grain, offering approachable sweetness, light oak, and subtle earthiness.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000023',
  'Westward American Single Malt Whiskey',
  'Westward Whiskey',
  NULL,
  'GB',
  'single_malt',
  NULL,
  45,
  'An Oregon-crafted American single malt with notes of toasted barley, dark fruit, and a gentle hoppy character from the craft beer influence.'
),
(
  'bbbbbbbb-pdx-0000-0000-000000000024',
  'Remus Gatsby Reserve 15 Year Bourbon',
  'MGP / George Remus Distillery',
  'Kentucky',
  'US',
  'bourbon',
  15,
  NULL,
  'A well-aged Indiana bourbon with deep notes of dried fruit, leather, dark caramel, and polished oak from 15 years of maturation.'
);

-- BAR_WHISKEYS (25 links)

-- The Old Gold (18 whiskeys)
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('cccccccc-pdx-0000-0000-000000000001', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000001', NULL, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000002', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000002', NULL, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000003', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000003', NULL, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000004', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000004', 9, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000005', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000002', 13, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000006', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000006', 10, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000007', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000007', 16, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000008', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000008', 12, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000009', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000009', 13, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000010', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000010', 14, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000011', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000011', 15, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000012', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000012', 13, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000013', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000013', 13, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000014', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000014', 9, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000015', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000015', 15, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000016', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000016', 6, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000017', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000017', 12, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000018', 'aaaaaaaa-pdx-0000-0000-000000000003', 'bbbbbbbb-pdx-0000-0000-000000000001', 16, NULL, true, NULL);

-- Interurban (7 whiskeys)
INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES
('cccccccc-pdx-0000-0000-000000000019', 'aaaaaaaa-pdx-0000-0000-000000000009', 'bbbbbbbb-pdx-0000-0000-000000000018', 13, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000020', 'aaaaaaaa-pdx-0000-0000-000000000009', 'bbbbbbbb-pdx-0000-0000-000000000020', 25, NULL, true, NULL),
('cccccccc-pdx-0000-0000-000000000021', 'aaaaaaaa-pdx-0000-0000-000000000009', 'bbbbbbbb-pdx-0000-0000-000000000010', 9, '1 oz', true, NULL),
('cccccccc-pdx-0000-0000-000000000022', 'aaaaaaaa-pdx-0000-0000-000000000009', 'bbbbbbbb-pdx-0000-0000-000000000009', 14, '1 oz', true, NULL),
('cccccccc-pdx-0000-0000-000000000023', 'aaaaaaaa-pdx-0000-0000-000000000009', 'bbbbbbbb-pdx-0000-0000-000000000023', 17, '1 oz', true, NULL),
('cccccccc-pdx-0000-0000-000000000024', 'aaaaaaaa-pdx-0000-0000-000000000009', 'bbbbbbbb-pdx-0000-0000-000000000024', 40, '1 oz', true, NULL),
('cccccccc-pdx-0000-0000-000000000025', 'aaaaaaaa-pdx-0000-0000-000000000009', 'bbbbbbbb-pdx-0000-0000-000000000010', 8, '2 oz', true, NULL);
