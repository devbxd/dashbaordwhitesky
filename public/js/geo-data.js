/* GEO LOOKUP — resolves free-text destination strings ("Sharm", "Dubai, UAE", "Paris")
   into [lat,lng] for the Command Center globe. Curated for the destinations a Kuwait/
   Lebanon-based travel agency actually sells, plus a broad country-level fallback so
   nothing typed in ever fails to plot somewhere reasonable. */
const GEO_CITIES = {
  'kuwait city':[29.3759,47.9774],'kuwait':[29.3759,47.9774],'hawally':[29.3328,48.0263],
  'beirut':[33.8938,35.5018],'tripoli':[34.4367,35.8497],'jounieh':[33.9808,35.6178],'byblos':[34.1230,35.6519],
  'dubai':[25.2048,55.2708],'abu dhabi':[24.4539,54.3773],'sharjah':[25.3463,55.4209],'ras al khaimah':[25.7895,55.9432],
  'istanbul':[41.0082,28.9784],'antalya':[36.8969,30.7133],'trabzon':[41.0027,39.7168],'ankara':[39.9334,32.8597],'bodrum':[37.0344,27.4305],'cappadocia':[38.6431,34.8289],
  'tbilisi':[41.7151,44.8271],'batumi':[41.6168,41.6367],
  'baku':[40.4093,49.8671],
  'cairo':[30.0444,31.2357],'sharm el sheikh':[27.9158,34.3300],'sharm':[27.9158,34.3300],'hurghada':[27.2579,33.8116],'alexandria':[31.2001,29.9187],'luxor':[25.6872,32.6396],
  'riyadh':[24.7136,46.6753],'jeddah':[21.4858,39.1925],'mecca':[21.3891,39.8579],'medina':[24.5247,39.5692],'makkah':[21.3891,39.8579],'madinah':[24.5247,39.5692],
  'doha':[25.2854,51.5310],'manama':[26.2285,50.5860],'muscat':[23.5880,58.3829],'amman':[31.9454,35.9284],'petra':[30.3285,35.4444],
  'casablanca':[33.5731,-7.5898],'marrakech':[31.6295,-7.9811],'rabat':[34.0209,-6.8416],'fes':[34.0181,-5.0078],'tunis':[36.8065,10.1815],
  'paris':[48.8566,2.3522],'nice':[43.7102,7.2620],'lyon':[45.7640,4.8357],
  'london':[51.5072,-0.1276],'manchester':[53.4808,-2.2426],'edinburgh':[55.9533,-3.1883],
  'geneva':[46.2044,6.1432],'zurich':[47.3769,8.5417],
  'rome':[41.9028,12.4964],'milan':[45.4642,9.1900],'venice':[45.4408,12.3155],'florence':[43.7696,11.2558],
  'madrid':[40.4168,-3.7038],'barcelona':[41.3874,2.1686],
  'athens':[37.9838,23.7275],'mykonos':[37.4467,25.3289],'santorini':[36.3932,25.4615],
  'frankfurt':[50.1109,8.6821],'munich':[48.1351,11.5820],'berlin':[52.5200,13.4050],
  'vienna':[48.2082,16.3738],'salzburg':[47.8095,13.0550],
  'bangkok':[13.7563,100.5018],'phuket':[7.8804,98.3923],'chiang mai':[18.7883,98.9853],'pattaya':[12.9236,100.8825],
  'kuala lumpur':[3.1390,101.6869],'langkawi':[6.3500,99.8000],
  'bali':[-8.3405,115.0920],'jakarta':[-6.2088,106.8456],
  'male':[4.1755,73.5093],'maldives':[3.2028,73.2207],
  'colombo':[6.9271,79.8612],
  'mumbai':[19.0760,72.8777],'delhi':[28.7041,77.1025],'goa':[15.2993,74.1240],'new delhi':[28.6139,77.2090],
  'singapore':[1.3521,103.8198],
  'yerevan':[40.1792,44.4991],
  'new york':[40.7128,-74.0060],'los angeles':[34.0522,-118.2437],'miami':[25.7617,-80.1918],'orlando':[28.5383,-81.3792],'las vegas':[36.1699,-115.1398],
  'toronto':[43.6532,-79.3832],'montreal':[45.5019,-73.5674],
  'moscow':[55.7558,37.6173],
  'larnaca':[34.9200,33.6300],'limassol':[34.7071,33.0226],'nicosia':[35.1856,33.3823],
  'malta':[35.9375,14.3754],
  'lisbon':[38.7223,-9.1393],'porto':[41.1579,-8.6291],
  'amsterdam':[52.3676,4.9041],
  'prague':[50.0755,14.4378],
  'budapest':[47.4979,19.0402],
  'zagreb':[45.8150,15.9819],'dubrovnik':[42.6507,18.0944],
  'tokyo':[35.6762,139.6503],'osaka':[34.6937,135.5023],
  'seoul':[37.5665,126.9780],
  'beijing':[39.9042,116.4074],'shanghai':[31.2304,121.4737],'hong kong':[22.3193,114.1694],
  'sydney':[-33.8688,151.2093],'melbourne':[-37.8136,144.9631],
  'auckland':[-36.8485,174.7633],
  'nairobi':[-1.2921,36.8219],'zanzibar':[-6.1659,39.2026],
  'seychelles':[-4.6796,55.4920],'mauritius':[-20.3484,57.5522],
  'cape town':[-33.9249,18.4241],'johannesburg':[-26.2041,28.0473],
  'baghdad':[33.3152,44.3661],'erbil':[36.1911,44.0092],
};
const GEO_COUNTRIES = {
  'kuwait':[29.3117,47.4818],'lebanon':[33.8547,35.8623],'uae':[23.4241,53.8478],'united arab emirates':[23.4241,53.8478],
  'turkey':[38.9637,35.2433],'georgia':[42.3154,43.3569],'azerbaijan':[40.1431,47.5769],
  'egypt':[26.8206,30.8025],'saudi arabia':[23.8859,45.0792],'qatar':[25.3548,51.1839],'bahrain':[25.9304,50.6378],
  'oman':[21.4735,55.9754],'jordan':[30.5852,36.2384],'iraq':[33.2232,43.6793],'syria':[34.8021,38.9968],
  'morocco':[31.7917,-7.0926],'tunisia':[33.8869,9.5375],'algeria':[28.0339,1.6596],
  'france':[46.2276,2.2137],'uk':[55.3781,-3.4360],'united kingdom':[55.3781,-3.4360],'england':[52.3555,-1.1743],
  'switzerland':[46.8182,8.2275],'italy':[41.8719,12.5674],'spain':[40.4637,-3.7492],'portugal':[39.3999,-8.2245],
  'greece':[39.0742,21.8243],'germany':[51.1657,10.4515],'austria':[47.5162,14.5501],'netherlands':[52.1326,5.2913],
  'belgium':[50.5039,4.4699],'czech republic':[49.8175,15.4730],'czechia':[49.8175,15.4730],'hungary':[47.1625,19.5033],
  'croatia':[45.1000,15.2000],'serbia':[44.0165,21.0059],'albania':[41.1533,20.1683],'poland':[51.9194,19.1451],
  'sweden':[60.1282,18.6435],'norway':[60.4720,8.4689],'iceland':[64.9631,-19.0208],'ireland':[53.4129,-8.2439],
  'cyprus':[35.1264,33.4299],'malta':[35.9375,14.3754],'russia':[61.5240,105.3188],
  'thailand':[15.8700,100.9925],'malaysia':[4.2105,101.9758],'indonesia':[-0.7893,113.9213],'philippines':[12.8797,121.7740],
  'maldives':[3.2028,73.2207],'sri lanka':[7.8731,80.7718],'india':[20.5937,78.9629],'singapore':[1.3521,103.8198],
  'vietnam':[14.0583,108.2772],'china':[35.8617,104.1954],'japan':[36.2048,138.2529],'south korea':[35.9078,127.7669],
  'armenia':[40.0691,45.0382],'usa':[37.0902,-95.7129],'united states':[37.0902,-95.7129],'canada':[56.1304,-106.3468],
  'mexico':[23.6345,-102.5528],'brazil':[-14.2350,-51.9253],'australia':[-25.2744,133.7751],'new zealand':[-40.9006,174.8860],
  'kenya':[-0.0236,37.9062],'tanzania':[-6.3690,34.8888],'south africa':[-30.5595,22.9375],'seychelles':[-4.6796,55.4920],
  'mauritius':[-20.3484,57.5522],'ethiopia':[9.1450,40.4897],'zambia':[-13.1339,27.8493],
};
function resolveDestinationCoords(raw){
  if(!raw) return null;
  const norm = String(raw).toLowerCase().replace(/[.,]/g,' ').replace(/\s+/g,' ').trim();
  if(!norm) return null;
  if(GEO_CITIES[norm]) return GEO_CITIES[norm];
  if(GEO_COUNTRIES[norm]) return GEO_COUNTRIES[norm];
  for(const key of Object.keys(GEO_CITIES)) if(norm.includes(key)) return GEO_CITIES[key];
  for(const key of Object.keys(GEO_COUNTRIES)) if(norm.includes(key)) return GEO_COUNTRIES[key];
  const parts = norm.split(/[\/\-]| and /).map(s=>s.trim()).filter(Boolean);
  for(const p of parts){
    if(GEO_CITIES[p]) return GEO_CITIES[p];
    if(GEO_COUNTRIES[p]) return GEO_COUNTRIES[p];
  }
  return null;
}
