// Self-contained geography reference data (Platform RC, Phase 4). No
// runtime dependency is added here -- packages/account stays independently
// type-checkable, per its zero-dependency policy (see package.json).
//
// Coverage is deliberately partial and honestly so: a full country list is
// static reference data safe to author directly, but state/city hierarchies
// are only included for a handful of countries this platform has real
// confidence in (US, Canada, India, Australia for states; US and India for
// cities). Every lookup function returns `null`, never an empty-but-wrong
// list, when no data exists for a given country/state -- callers (see
// SearchableSelect usage in ProfileTab.tsx) fall back to a plain text input
// in that case, never a dropdown that silently claims coverage it doesn't
// have. Extending coverage later means adding rows here, not redesigning
// anything that calls this module.
import type { SelectOption } from '../contracts/adapters.ts'

// ISO 3166-1 alpha-2 country codes. Ordered roughly alphabetically by name.
export const COUNTRY_OPTIONS: SelectOption[] = [
  { value: 'AF', label: 'Afghanistan' }, { value: 'AL', label: 'Albania' }, { value: 'DZ', label: 'Algeria' },
  { value: 'AD', label: 'Andorra' }, { value: 'AO', label: 'Angola' }, { value: 'AG', label: 'Antigua and Barbuda' },
  { value: 'AR', label: 'Argentina' }, { value: 'AM', label: 'Armenia' }, { value: 'AU', label: 'Australia' },
  { value: 'AT', label: 'Austria' }, { value: 'AZ', label: 'Azerbaijan' }, { value: 'BS', label: 'Bahamas' },
  { value: 'BH', label: 'Bahrain' }, { value: 'BD', label: 'Bangladesh' }, { value: 'BB', label: 'Barbados' },
  { value: 'BY', label: 'Belarus' }, { value: 'BE', label: 'Belgium' }, { value: 'BZ', label: 'Belize' },
  { value: 'BJ', label: 'Benin' }, { value: 'BT', label: 'Bhutan' }, { value: 'BO', label: 'Bolivia' },
  { value: 'BA', label: 'Bosnia and Herzegovina' }, { value: 'BW', label: 'Botswana' }, { value: 'BR', label: 'Brazil' },
  { value: 'BN', label: 'Brunei' }, { value: 'BG', label: 'Bulgaria' }, { value: 'BF', label: 'Burkina Faso' },
  { value: 'BI', label: 'Burundi' }, { value: 'KH', label: 'Cambodia' }, { value: 'CM', label: 'Cameroon' },
  { value: 'CA', label: 'Canada' }, { value: 'CV', label: 'Cabo Verde' }, { value: 'CF', label: 'Central African Republic' },
  { value: 'TD', label: 'Chad' }, { value: 'CL', label: 'Chile' }, { value: 'CN', label: 'China' },
  { value: 'CO', label: 'Colombia' }, { value: 'KM', label: 'Comoros' }, { value: 'CR', label: 'Costa Rica' },
  { value: 'HR', label: 'Croatia' }, { value: 'CU', label: 'Cuba' }, { value: 'CY', label: 'Cyprus' },
  { value: 'CZ', label: 'Czechia' }, { value: 'CD', label: 'Democratic Republic of the Congo' }, { value: 'DK', label: 'Denmark' },
  { value: 'DJ', label: 'Djibouti' }, { value: 'DM', label: 'Dominica' }, { value: 'DO', label: 'Dominican Republic' },
  { value: 'EC', label: 'Ecuador' }, { value: 'EG', label: 'Egypt' }, { value: 'SV', label: 'El Salvador' },
  { value: 'GQ', label: 'Equatorial Guinea' }, { value: 'ER', label: 'Eritrea' }, { value: 'EE', label: 'Estonia' },
  { value: 'SZ', label: 'Eswatini' }, { value: 'ET', label: 'Ethiopia' }, { value: 'FJ', label: 'Fiji' },
  { value: 'FI', label: 'Finland' }, { value: 'FR', label: 'France' }, { value: 'GA', label: 'Gabon' },
  { value: 'GM', label: 'Gambia' }, { value: 'GE', label: 'Georgia' }, { value: 'DE', label: 'Germany' },
  { value: 'GH', label: 'Ghana' }, { value: 'GR', label: 'Greece' }, { value: 'GD', label: 'Grenada' },
  { value: 'GT', label: 'Guatemala' }, { value: 'GN', label: 'Guinea' }, { value: 'GW', label: 'Guinea-Bissau' },
  { value: 'GY', label: 'Guyana' }, { value: 'HT', label: 'Haiti' }, { value: 'HN', label: 'Honduras' },
  { value: 'HK', label: 'Hong Kong' }, { value: 'HU', label: 'Hungary' }, { value: 'IS', label: 'Iceland' },
  { value: 'IN', label: 'India' }, { value: 'ID', label: 'Indonesia' }, { value: 'IR', label: 'Iran' },
  { value: 'IQ', label: 'Iraq' }, { value: 'IE', label: 'Ireland' }, { value: 'IL', label: 'Israel' },
  { value: 'IT', label: 'Italy' }, { value: 'JM', label: 'Jamaica' }, { value: 'JP', label: 'Japan' },
  { value: 'JO', label: 'Jordan' }, { value: 'KZ', label: 'Kazakhstan' }, { value: 'KE', label: 'Kenya' },
  { value: 'KI', label: 'Kiribati' }, { value: 'KW', label: 'Kuwait' }, { value: 'KG', label: 'Kyrgyzstan' },
  { value: 'LA', label: 'Laos' }, { value: 'LV', label: 'Latvia' }, { value: 'LB', label: 'Lebanon' },
  { value: 'LS', label: 'Lesotho' }, { value: 'LR', label: 'Liberia' }, { value: 'LY', label: 'Libya' },
  { value: 'LI', label: 'Liechtenstein' }, { value: 'LT', label: 'Lithuania' }, { value: 'LU', label: 'Luxembourg' },
  { value: 'MG', label: 'Madagascar' }, { value: 'MW', label: 'Malawi' }, { value: 'MY', label: 'Malaysia' },
  { value: 'MV', label: 'Maldives' }, { value: 'ML', label: 'Mali' }, { value: 'MT', label: 'Malta' },
  { value: 'MH', label: 'Marshall Islands' }, { value: 'MR', label: 'Mauritania' }, { value: 'MU', label: 'Mauritius' },
  { value: 'MX', label: 'Mexico' }, { value: 'FM', label: 'Micronesia' }, { value: 'MD', label: 'Moldova' },
  { value: 'MC', label: 'Monaco' }, { value: 'MN', label: 'Mongolia' }, { value: 'ME', label: 'Montenegro' },
  { value: 'MA', label: 'Morocco' }, { value: 'MZ', label: 'Mozambique' }, { value: 'MM', label: 'Myanmar' },
  { value: 'NA', label: 'Namibia' }, { value: 'NR', label: 'Nauru' }, { value: 'NP', label: 'Nepal' },
  { value: 'NL', label: 'Netherlands' }, { value: 'NZ', label: 'New Zealand' }, { value: 'NI', label: 'Nicaragua' },
  { value: 'NE', label: 'Niger' }, { value: 'NG', label: 'Nigeria' }, { value: 'KP', label: 'North Korea' },
  { value: 'MK', label: 'North Macedonia' }, { value: 'NO', label: 'Norway' }, { value: 'OM', label: 'Oman' },
  { value: 'PK', label: 'Pakistan' }, { value: 'PW', label: 'Palau' }, { value: 'PS', label: 'Palestine' },
  { value: 'PA', label: 'Panama' }, { value: 'PG', label: 'Papua New Guinea' }, { value: 'PY', label: 'Paraguay' },
  { value: 'PE', label: 'Peru' }, { value: 'PH', label: 'Philippines' }, { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' }, { value: 'QA', label: 'Qatar' }, { value: 'CG', label: 'Republic of the Congo' },
  { value: 'RO', label: 'Romania' }, { value: 'RU', label: 'Russia' }, { value: 'RW', label: 'Rwanda' },
  { value: 'KN', label: 'Saint Kitts and Nevis' }, { value: 'LC', label: 'Saint Lucia' }, { value: 'VC', label: 'Saint Vincent and the Grenadines' },
  { value: 'WS', label: 'Samoa' }, { value: 'SM', label: 'San Marino' }, { value: 'ST', label: 'Sao Tome and Principe' },
  { value: 'SA', label: 'Saudi Arabia' }, { value: 'SN', label: 'Senegal' }, { value: 'RS', label: 'Serbia' },
  { value: 'SC', label: 'Seychelles' }, { value: 'SL', label: 'Sierra Leone' }, { value: 'SG', label: 'Singapore' },
  { value: 'SK', label: 'Slovakia' }, { value: 'SI', label: 'Slovenia' }, { value: 'SB', label: 'Solomon Islands' },
  { value: 'SO', label: 'Somalia' }, { value: 'ZA', label: 'South Africa' }, { value: 'KR', label: 'South Korea' },
  { value: 'SS', label: 'South Sudan' }, { value: 'ES', label: 'Spain' }, { value: 'LK', label: 'Sri Lanka' },
  { value: 'SD', label: 'Sudan' }, { value: 'SR', label: 'Suriname' }, { value: 'SE', label: 'Sweden' },
  { value: 'CH', label: 'Switzerland' }, { value: 'SY', label: 'Syria' }, { value: 'TW', label: 'Taiwan' },
  { value: 'TJ', label: 'Tajikistan' }, { value: 'TZ', label: 'Tanzania' }, { value: 'TH', label: 'Thailand' },
  { value: 'TL', label: 'Timor-Leste' }, { value: 'TG', label: 'Togo' }, { value: 'TO', label: 'Tonga' },
  { value: 'TT', label: 'Trinidad and Tobago' }, { value: 'TN', label: 'Tunisia' }, { value: 'TR', label: 'Turkey' },
  { value: 'TM', label: 'Turkmenistan' }, { value: 'TV', label: 'Tuvalu' }, { value: 'UG', label: 'Uganda' },
  { value: 'UA', label: 'Ukraine' }, { value: 'AE', label: 'United Arab Emirates' }, { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' }, { value: 'UY', label: 'Uruguay' }, { value: 'UZ', label: 'Uzbekistan' },
  { value: 'VU', label: 'Vanuatu' }, { value: 'VA', label: 'Vatican City' }, { value: 'VE', label: 'Venezuela' },
  { value: 'VN', label: 'Vietnam' }, { value: 'YE', label: 'Yemen' }, { value: 'ZM', label: 'Zambia' },
  { value: 'ZW', label: 'Zimbabwe' },
]

const US_STATES: SelectOption[] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
  ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
  ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
].map(([value, label]) => ({ value, label }))

const CA_PROVINCES: SelectOption[] = [
  ['AB', 'Alberta'], ['BC', 'British Columbia'], ['MB', 'Manitoba'], ['NB', 'New Brunswick'],
  ['NL', 'Newfoundland and Labrador'], ['NS', 'Nova Scotia'], ['NT', 'Northwest Territories'], ['NU', 'Nunavut'],
  ['ON', 'Ontario'], ['PE', 'Prince Edward Island'], ['QC', 'Quebec'], ['SK', 'Saskatchewan'], ['YT', 'Yukon'],
].map(([value, label]) => ({ value, label }))

const IN_STATES: SelectOption[] = [
  ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'], ['BR', 'Bihar'], ['CT', 'Chhattisgarh'],
  ['DL', 'Delhi'], ['GA', 'Goa'], ['GJ', 'Gujarat'], ['HR', 'Haryana'], ['HP', 'Himachal Pradesh'],
  ['JK', 'Jammu and Kashmir'], ['JH', 'Jharkhand'], ['KA', 'Karnataka'], ['KL', 'Kerala'], ['MP', 'Madhya Pradesh'],
  ['MH', 'Maharashtra'], ['MN', 'Manipur'], ['ML', 'Meghalaya'], ['MZ', 'Mizoram'], ['NL', 'Nagaland'],
  ['OD', 'Odisha'], ['PB', 'Punjab'], ['RJ', 'Rajasthan'], ['SK', 'Sikkim'], ['TN', 'Tamil Nadu'],
  ['TG', 'Telangana'], ['TR', 'Tripura'], ['UP', 'Uttar Pradesh'], ['UT', 'Uttarakhand'], ['WB', 'West Bengal'],
  ['CH', 'Chandigarh'], ['PY', 'Puducherry'],
].map(([value, label]) => ({ value, label }))

const AU_STATES: SelectOption[] = [
  ['NSW', 'New South Wales'], ['VIC', 'Victoria'], ['QLD', 'Queensland'], ['WA', 'Western Australia'],
  ['SA', 'South Australia'], ['TAS', 'Tasmania'], ['ACT', 'Australian Capital Territory'], ['NT', 'Northern Territory'],
].map(([value, label]) => ({ value, label }))

const STATES_BY_COUNTRY: Record<string, SelectOption[]> = {
  US: US_STATES, CA: CA_PROVINCES, IN: IN_STATES, AU: AU_STATES,
}

// Top few cities per state/UT -- capital plus largest city/cities, not an
// exhaustive gazetteer. US covers every state; India covers its largest
// states by population (not all 31 states/UTs) -- the rest fall back to a
// free-text city field, same graceful-degradation rule as states.
const US_CITIES_BY_STATE: Record<string, string[]> = {
  AL: ['Montgomery', 'Birmingham'], AK: ['Juneau', 'Anchorage'], AZ: ['Phoenix', 'Tucson'], AR: ['Little Rock', 'Fayetteville'],
  CA: ['Sacramento', 'Los Angeles', 'San Francisco', 'San Diego'], CO: ['Denver', 'Colorado Springs'],
  CT: ['Hartford', 'Bridgeport'], DE: ['Dover', 'Wilmington'], DC: ['Washington'], FL: ['Tallahassee', 'Miami', 'Orlando'],
  GA: ['Atlanta', 'Savannah'], HI: ['Honolulu'], ID: ['Boise'], IL: ['Springfield', 'Chicago'],
  IN: ['Indianapolis', 'Fort Wayne'], IA: ['Des Moines', 'Cedar Rapids'], KS: ['Topeka', 'Wichita'],
  KY: ['Frankfort', 'Louisville'], LA: ['Baton Rouge', 'New Orleans'], ME: ['Augusta', 'Portland'],
  MD: ['Annapolis', 'Baltimore'], MA: ['Boston', 'Worcester'], MI: ['Lansing', 'Detroit'], MN: ['Saint Paul', 'Minneapolis'],
  MS: ['Jackson'], MO: ['Jefferson City', 'Kansas City', 'St. Louis'], MT: ['Helena', 'Billings'],
  NE: ['Lincoln', 'Omaha'], NV: ['Carson City', 'Las Vegas'], NH: ['Concord', 'Manchester'],
  NJ: ['Trenton', 'Newark'], NM: ['Santa Fe', 'Albuquerque'], NY: ['Albany', 'New York City', 'Buffalo'],
  NC: ['Raleigh', 'Charlotte'], ND: ['Bismarck', 'Fargo'], OH: ['Columbus', 'Cleveland'],
  OK: ['Oklahoma City', 'Tulsa'], OR: ['Salem', 'Portland'], PA: ['Harrisburg', 'Philadelphia', 'Pittsburgh'],
  RI: ['Providence'], SC: ['Columbia', 'Charleston'], SD: ['Pierre', 'Sioux Falls'], TN: ['Nashville', 'Memphis'],
  TX: ['Austin', 'Houston', 'Dallas', 'San Antonio'], UT: ['Salt Lake City'], VT: ['Montpelier', 'Burlington'],
  VA: ['Richmond', 'Virginia Beach'], WA: ['Olympia', 'Seattle'], WV: ['Charleston'],
  WI: ['Madison', 'Milwaukee'], WY: ['Cheyenne'],
}

const IN_CITIES_BY_STATE: Record<string, string[]> = {
  MH: ['Mumbai', 'Pune', 'Nagpur'], DL: ['New Delhi'], KA: ['Bengaluru', 'Mysuru'], TN: ['Chennai', 'Coimbatore'],
  WB: ['Kolkata'], UP: ['Lucknow', 'Kanpur', 'Noida', 'Mathura', 'Vrindavan'], GJ: ['Ahmedabad', 'Gandhinagar', 'Surat'],
  RJ: ['Jaipur', 'Udaipur'], TG: ['Hyderabad'], KL: ['Thiruvananthapuram', 'Kochi'], PB: ['Chandigarh', 'Amritsar'],
  HR: ['Chandigarh', 'Gurugram'], MP: ['Bhopal', 'Indore'], BR: ['Patna'], OD: ['Bhubaneswar'],
  AS: ['Guwahati', 'Dispur'],
}

function toCityOptions(cities: string[]): SelectOption[] {
  return cities.map((name) => ({ value: name, label: name }))
}

const CITIES_BY_STATE: Record<string, SelectOption[]> = {
  ...Object.fromEntries(Object.entries(US_CITIES_BY_STATE).map(([code, cities]) => [`US:${code}`, toCityOptions(cities)])),
  ...Object.fromEntries(Object.entries(IN_CITIES_BY_STATE).map(([code, cities]) => [`IN:${code}`, toCityOptions(cities)])),
}

// Best-effort single timezone per state/country -- several (e.g. Florida,
// Texas) genuinely span more than one IANA zone; this names the zone the
// capital/largest city uses, same "imperfect but consistent" tradeoff
// lib/admin/systemInformation.ts's supabaseProjectLabel already accepts
// elsewhere in this codebase. Always user-editable afterward, never final.
const US_STATE_TIMEZONE: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix', AR: 'America/Chicago', CA: 'America/Los_Angeles',
  CO: 'America/Denver', CT: 'America/New_York', DE: 'America/New_York', DC: 'America/New_York', FL: 'America/New_York',
  GA: 'America/New_York', HI: 'Pacific/Honolulu', ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago', KS: 'America/Chicago', KY: 'America/New_York', LA: 'America/Chicago', ME: 'America/New_York',
  MD: 'America/New_York', MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago', MS: 'America/Chicago',
  MO: 'America/Chicago', MT: 'America/Denver', NE: 'America/Chicago', NV: 'America/Los_Angeles', NH: 'America/New_York',
  NJ: 'America/New_York', NM: 'America/Denver', NY: 'America/New_York', NC: 'America/New_York', ND: 'America/Chicago',
  OH: 'America/New_York', OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago', UT: 'America/Denver',
  VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles', WV: 'America/New_York',
  WI: 'America/Chicago', WY: 'America/Denver',
}

const COUNTRY_TIMEZONE: Record<string, string> = {
  CA: 'America/Toronto', IN: 'Asia/Kolkata', AU: 'Australia/Sydney', GB: 'Europe/London', US: 'America/New_York',
}

export function getStatesForCountry(countryCode: string | null): SelectOption[] | null {
  if (!countryCode) return null
  return STATES_BY_COUNTRY[countryCode] ?? null
}

export function getCitiesForState(countryCode: string | null, stateCode: string | null): SelectOption[] | null {
  if (!countryCode || !stateCode) return null
  return CITIES_BY_STATE[`${countryCode}:${stateCode}`] ?? null
}

/** Best-effort suggestion only -- always overridable, never authoritative. */
export function guessTimezone(countryCode: string | null, stateCode: string | null): string | null {
  if (countryCode === 'US' && stateCode && US_STATE_TIMEZONE[stateCode]) return US_STATE_TIMEZONE[stateCode]
  if (countryCode && COUNTRY_TIMEZONE[countryCode]) return COUNTRY_TIMEZONE[countryCode]
  return null
}

/** Pure, case-insensitive substring filter over a SelectOption[] -- shared by every SearchableSelect instance. */
export function filterOptions(query: string, options: SelectOption[]): SelectOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return options
  return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
}
