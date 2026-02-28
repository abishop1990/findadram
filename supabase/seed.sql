-- =============================================================================
-- findadram seed data
-- Portland, OR primary market — whiskey discovery platform
-- =============================================================================

-- =============================================================================
-- BARS (27 bars: 15 Portland + 12 iconic non-Portland for variety)
-- ST_MakePoint(longitude, latitude)
-- =============================================================================
INSERT INTO bars (id, name, location, address, city, state, country, phone, website, google_place_id, metadata) VALUES

-- =====================
-- PORTLAND, OR (primary market)
-- =====================

(
  '11111111-0000-0000-0000-000000000013',
  'Scotch Lodge',
  ST_MakePoint(-122.6580, 45.5122)::geography,
  '215 SE 9th Ave',
  'Portland',
  'OR',
  'US',
  '+1 503-477-9989',
  'https://www.scotchlodgepdx.com',
  'ChIJscotchlodge0013pdx',
  '{"neighborhood": "SE Portland", "seating": 50, "whiskey_list_size": 400, "scotch_focus": true, "private_barrels": true}'
),
(
  '11111111-0000-0000-0000-000000000014',
  'Multnomah Whiskey Library',
  ST_MakePoint(-122.6817, 45.5231)::geography,
  '1124 SW Alder St',
  'Portland',
  'OR',
  'US',
  '+1 503-954-1381',
  'https://www.mwlpdx.com',
  'ChIJmwlibrary00014pdx',
  '{"neighborhood": "Downtown", "seating": 120, "whiskey_list_size": 1500, "members_club": true, "reservations": true, "private_barrels": true}'
),
(
  '11111111-0000-0000-0000-000000000015',
  'Teardrop Lounge',
  ST_MakePoint(-122.6831, 45.5267)::geography,
  '1015 NW Everett St',
  'Portland',
  'OR',
  'US',
  '+1 503-445-8109',
  'https://www.teardroplounge.com',
  'ChIJteardrop00015pdx',
  '{"neighborhood": "Pearl District", "seating": 60, "craft_cocktails": true, "spirits_focus": true}'
),
(
  '11111111-0000-0000-0000-000000000016',
  'Bible Club PDX',
  ST_MakePoint(-122.6604, 45.4717)::geography,
  '8th & Tacoma St',
  'Portland',
  'OR',
  'US',
  NULL,
  'https://www.bibleclubpdx.com',
  'ChIJbibleclub00016pdx',
  '{"neighborhood": "Sellwood", "seating": 40, "speakeasy": true, "bourbon_focus": true, "private_barrels": true, "reservations": true}'
),
(
  '11111111-0000-0000-0000-000000000017',
  'Pépé Le Moko',
  ST_MakePoint(-122.6782, 45.5218)::geography,
  '407 SW 10th Ave',
  'Portland',
  'OR',
  'US',
  '+1 503-546-8537',
  'https://www.pepelemoko.com',
  'ChIJpepelemoko0017pdx',
  '{"neighborhood": "Downtown", "seating": 35, "underground": true, "craft_cocktails": true}'
),
(
  '11111111-0000-0000-0000-000000000018',
  'Hale Pele',
  ST_MakePoint(-122.6538, 45.5375)::geography,
  '2733 NE Broadway',
  'Portland',
  'OR',
  'US',
  '+1 503-379-9999',
  'https://www.halepele.com',
  'ChIJhalepele000018pdx',
  '{"neighborhood": "NE Portland", "seating": 70, "tiki_bar": true, "rum_focus": true, "whiskey_selection": true}'
),
(
  '11111111-0000-0000-0000-000000000019',
  'Hey Love',
  ST_MakePoint(-122.6481, 45.5234)::geography,
  '1011 E Burnside St',
  'Portland',
  'OR',
  'US',
  '+1 503-206-6223',
  'https://www.heylovebar.com',
  'ChIJheylove000019pdx',
  '{"neighborhood": "E Burnside", "seating": 80, "hotel_bar": true, "curated_list": true}'
),
(
  '11111111-0000-0000-0000-000000000020',
  'Interurban',
  ST_MakePoint(-122.6790, 45.5561)::geography,
  '4057 N Mississippi Ave',
  'Portland',
  'OR',
  'US',
  '+1 503-284-6669',
  'https://www.interurbanpdx.com',
  'ChIJinterurban0020pdx',
  '{"neighborhood": "N Mississippi", "seating": 55, "neighborhood_bar": true, "whiskey_selection": true}'
),
(
  '11111111-0000-0000-0000-000000000021',
  'Doug Fir Lounge',
  ST_MakePoint(-122.6483, 45.5228)::geography,
  '830 E Burnside St',
  'Portland',
  'OR',
  'US',
  '+1 503-231-9663',
  'https://www.dougfirlounge.com',
  'ChIJdougfir000021pdx',
  '{"neighborhood": "E Burnside", "seating": 90, "music_venue": true, "open_late": true}'
),
(
  '11111111-0000-0000-0000-000000000022',
  'Horse Brass Pub',
  ST_MakePoint(-122.6391, 45.5105)::geography,
  '4534 SE Belmont St',
  'Portland',
  'OR',
  'US',
  '+1 503-232-2202',
  'https://www.horsebrasspub.com',
  'ChIJhorsebrass0022pdx',
  '{"neighborhood": "SE Belmont", "seating": 120, "british_pub": true, "scotch_selection": true, "established": 1976}'
),
(
  '11111111-0000-0000-0000-000000000023',
  'Expatriate',
  ST_MakePoint(-122.6441, 45.5388)::geography,
  '5424 NE 30th Ave',
  'Portland',
  'OR',
  'US',
  '+1 503-867-5309',
  NULL,
  'ChIJexpatriate0023pdx',
  '{"neighborhood": "NE Portland", "seating": 30, "small_bar": true, "craft_cocktails": true}'
),
(
  '11111111-0000-0000-0000-000000000024',
  'The Old Gold',
  ST_MakePoint(-122.6729, 45.5468)::geography,
  '729 N Killingsworth St',
  'Portland',
  'OR',
  'US',
  '+1 503-894-8937',
  'https://www.theoldgoldpdx.com',
  'ChIJoldgold000024pdx',
  '{"neighborhood": "N Williams", "seating": 45, "spirits_focus": true, "cocktail_bar": true}'
),
(
  '11111111-0000-0000-0000-000000000025',
  'Luc Lac Vietnamese Kitchen',
  ST_MakePoint(-122.6793, 45.5198)::geography,
  '835 SW 2nd Ave',
  'Portland',
  'OR',
  'US',
  '+1 503-222-0047',
  'https://www.luclackitchen.com',
  'ChIJluclac000025pdx',
  '{"neighborhood": "Downtown", "seating": 100, "vietnamese_kitchen": true, "whiskey_bar": true, "open_late": true}'
),
(
  '11111111-0000-0000-0000-000000000026',
  'Swine Bar',
  ST_MakePoint(-122.6432, 45.5085)::geography,
  '2955 SE Division St',
  'Portland',
  'OR',
  'US',
  '+1 503-208-3535',
  'https://www.swinepdx.com',
  'ChIJswine00000026pdx',
  '{"neighborhood": "SE Division", "seating": 50, "whiskey_specialist": true, "moonshine": true}'
),
(
  '11111111-0000-0000-0000-000000000027',
  'Shift Drinks',
  ST_MakePoint(-122.6824, 45.5261)::geography,
  '1200 NW 18th Ave',
  'Portland',
  'OR',
  'US',
  '+1 503-227-8286',
  NULL,
  'ChIJshiftdrinks027pdx',
  '{"neighborhood": "Pearl District", "seating": 40, "industry_bar": true, "spirits_focus": true}'
),

-- =====================
-- ICONIC NON-PORTLAND BARS (kept for variety)
-- =====================

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
),

-- Additional Portland bars
(
  '11111111-0000-0000-0000-000000000028',
  'Bit House Saloon',
  ST_MakePoint(-122.6601, 45.5175)::geography,
  '727 SE Grand Ave',
  'Portland',
  'OR',
  'US',
  '+1 503-954-3913',
  'https://www.bithousesaloon.com',
  'ChIJbithouse0028pdx',
  '{"neighborhood": "Central Eastside", "seating": 60, "craft_cocktails": true, "whiskey_selection": true}'
),
(
  '11111111-0000-0000-0000-000000000029',
  'Victoria Bar',
  ST_MakePoint(-122.6215, 45.5453)::geography,
  '4835 NE 42nd Ave',
  'Portland',
  'OR',
  'US',
  NULL,
  NULL,
  'ChIJvictoria0029pdx',
  '{"neighborhood": "Alberta Arts District", "seating": 35, "neighborhood_bar": true, "spirits_focus": true}'
);
