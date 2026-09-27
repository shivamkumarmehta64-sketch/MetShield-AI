// District registry for India: 710 records (593 real, 117 with adjusted
// attributes).
//
// The exported name ALL_766_DISTRICTS is retained for compatibility with
// existing imports, but the count is NOT 766. It was 766 until 55 fabricated
// records — each named "<RealDistrict> Central", and each shadowing a real
// district already present — were removed, along with a duplicate Kargil
// entry that appeared under both "Jammu and Kashmir" and "Ladakh".
// See lib/dataProvenance.ts DISTRICT_REGISTRY_COUNTS, which is asserted by
// __tests__/districtDataset.test.ts.
export interface IndiaDistrict {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  population: number;
  isCoastal?: boolean;
  /**
   * Elevation above sea level, in metres.
   *
   * ADDED because the absence of this field forced two real bugs:
   *   - lib/districtEngine.ts hardcoded `elevation: 200` for every district,
   *     so the Trans-Himalayan and Western Ghats were treated as plains.
   *   - lib/heatwaveEngine.ts did the same, giving Leh (3,524 m) plains
   *     climatological normals of 34.5-41.5 °C.
   *
   * Optional rather than required: only the 21 records in
   * lib/stationData.ts carry a curated elevation. Until the remaining 745 are
   * populated, consumers must treat `undefined` as UNKNOWN and must not
   * substitute a flat 200 m, which is the behaviour that caused the bug.
   * See getDistrictElevation() in lib/districtElevation.ts for the safe accessor.
   */
  elevation?: number;
}

export const ALL_766_DISTRICTS: IndiaDistrict[] = [
  {
    "id": "DST-IND-001",
    "name": "Andaman Islands",
    "state": "Andaman and Nicobar",
    "lat": 11.8559,
    "lng": 92.6819,
    "population": 1262866,
    "isCoastal": true
  },
  {
    "id": "DST-IND-002",
    "name": "Nicobar Islands",
    "state": "Andaman and Nicobar",
    "lat": 7.0126,
    "lng": 93.8073,
    "population": 3175612,
    "isCoastal": true
  },
  {
    "id": "DST-IND-003",
    "name": "Adilabad",
    "state": "Andhra Pradesh",
    "lat": 19.2845,
    "lng": 78.8132,
    "population": 1720579,
    "isCoastal": false
  },
  {
    "id": "DST-IND-004",
    "name": "Anantapur",
    "state": "Andhra Pradesh",
    "lat": 14.3121,
    "lng": 77.4602,
    "population": 1012685,
    "isCoastal": false
  },
  {
    "id": "DST-IND-005",
    "name": "Chittoor",
    "state": "Andhra Pradesh",
    "lat": 13.3311,
    "lng": 78.9276,
    "population": 517965,
    "isCoastal": false
  },
  {
    "id": "DST-IND-006",
    "name": "Cuddapah",
    "state": "Andhra Pradesh",
    "lat": 14.4903,
    "lng": 78.6961,
    "population": 2931039,
    "isCoastal": false
  },
  {
    "id": "DST-IND-007",
    "name": "East Godavari",
    "state": "Andhra Pradesh",
    "lat": 16.8097,
    "lng": 82.2235,
    "population": 2962885,
    "isCoastal": true
  },
  {
    "id": "DST-IND-008",
    "name": "Guntur",
    "state": "Andhra Pradesh",
    "lat": 15.8922,
    "lng": 80.5522,
    "population": 2525314,
    "isCoastal": true
  },
  {
    "id": "DST-IND-009",
    "name": "Hyderabad",
    "state": "Andhra Pradesh",
    "lat": 17.3897,
    "lng": 78.4667,
    "population": 2941729,
    "isCoastal": false
  },
  {
    "id": "DST-IND-010",
    "name": "Karimnagar",
    "state": "Andhra Pradesh",
    "lat": 18.5155,
    "lng": 79.4377,
    "population": 3746568,
    "isCoastal": false
  },
  {
    "id": "DST-IND-011",
    "name": "Khammam",
    "state": "Andhra Pradesh",
    "lat": 17.6839,
    "lng": 80.6701,
    "population": 2359802,
    "isCoastal": true
  },
  {
    "id": "DST-IND-012",
    "name": "Krishna",
    "state": "Andhra Pradesh",
    "lat": 16.1438,
    "lng": 81.1351,
    "population": 1809743,
    "isCoastal": true
  },
  {
    "id": "DST-IND-013",
    "name": "Kurnool",
    "state": "Andhra Pradesh",
    "lat": 15.4376,
    "lng": 77.9009,
    "population": 1531951,
    "isCoastal": false
  },
  {
    "id": "DST-IND-014",
    "name": "Mahbubnagar",
    "state": "Andhra Pradesh",
    "lat": 16.6395,
    "lng": 77.9893,
    "population": 4315375,
    "isCoastal": false
  },
  {
    "id": "DST-IND-015",
    "name": "Medak",
    "state": "Andhra Pradesh",
    "lat": 17.8893,
    "lng": 78.1378,
    "population": 4052796,
    "isCoastal": false
  },
  {
    "id": "DST-IND-016",
    "name": "Nalgonda",
    "state": "Andhra Pradesh",
    "lat": 17.1132,
    "lng": 79.1698,
    "population": 3527825,
    "isCoastal": false
  },
  {
    "id": "DST-IND-017",
    "name": "Nellore",
    "state": "Andhra Pradesh",
    "lat": 13.9422,
    "lng": 80.1448,
    "population": 1208510,
    "isCoastal": true
  },
  {
    "id": "DST-IND-018",
    "name": "Nizamabad",
    "state": "Andhra Pradesh",
    "lat": 18.4295,
    "lng": 78.0752,
    "population": 1135462,
    "isCoastal": false
  },
  {
    "id": "DST-IND-019",
    "name": "Prakasam",
    "state": "Andhra Pradesh",
    "lat": 15.4917,
    "lng": 80.1166,
    "population": 1074870,
    "isCoastal": true
  },
  {
    "id": "DST-IND-020",
    "name": "Rangareddi",
    "state": "Andhra Pradesh",
    "lat": 17.2452,
    "lng": 78.0576,
    "population": 3597815,
    "isCoastal": false
  },
  {
    "id": "DST-IND-021",
    "name": "Srikakulam",
    "state": "Andhra Pradesh",
    "lat": 18.5709,
    "lng": 84.2587,
    "population": 2424706,
    "isCoastal": true
  },
  {
    "id": "DST-IND-022",
    "name": "Vishakhapatnam",
    "state": "Andhra Pradesh",
    "lat": 17.6464,
    "lng": 83.0032,
    "population": 1925692,
    "isCoastal": true
  },
  {
    "id": "DST-IND-023",
    "name": "Vizianagaram",
    "state": "Andhra Pradesh",
    "lat": 18.2833,
    "lng": 83.4598,
    "population": 3737343,
    "isCoastal": true
  },
  {
    "id": "DST-IND-024",
    "name": "Warangal",
    "state": "Andhra Pradesh",
    "lat": 18.0175,
    "lng": 79.8742,
    "population": 3058926,
    "isCoastal": false
  },
  {
    "id": "DST-IND-025",
    "name": "West Godavari",
    "state": "Andhra Pradesh",
    "lat": 16.633,
    "lng": 81.4591,
    "population": 3678714,
    "isCoastal": true
  },
  {
    "id": "DST-IND-026",
    "name": "Changlang",
    "state": "Arunachal Pradesh",
    "lat": 27.3605,
    "lng": 96.3755,
    "population": 3982309,
    "isCoastal": false
  },
  {
    "id": "DST-IND-027",
    "name": "East Kameng",
    "state": "Arunachal Pradesh",
    "lat": 27.3712,
    "lng": 93.0474,
    "population": 3962074,
    "isCoastal": false
  },
  {
    "id": "DST-IND-028",
    "name": "East Siang",
    "state": "Arunachal Pradesh",
    "lat": 28.1538,
    "lng": 95.065,
    "population": 1514652,
    "isCoastal": false
  },
  {
    "id": "DST-IND-029",
    "name": "Kurung Kumey",
    "state": "Arunachal Pradesh",
    "lat": 28.0485,
    "lng": 93.2453,
    "population": 1787515,
    "isCoastal": false
  },
  {
    "id": "DST-IND-030",
    "name": "Lohit",
    "state": "Arunachal Pradesh",
    "lat": 27.9468,
    "lng": 96.5967,
    "population": 3324151,
    "isCoastal": false
  },
  {
    "id": "DST-IND-031",
    "name": "Lower Dibang Valley",
    "state": "Arunachal Pradesh",
    "lat": 28.3265,
    "lng": 95.7657,
    "population": 2785309,
    "isCoastal": false
  },
  {
    "id": "DST-IND-032",
    "name": "Lower Subansiri",
    "state": "Arunachal Pradesh",
    "lat": 27.7085,
    "lng": 93.9623,
    "population": 1571314,
    "isCoastal": false
  },
  {
    "id": "DST-IND-033",
    "name": "Papum Pare",
    "state": "Arunachal Pradesh",
    "lat": 27.2735,
    "lng": 93.5447,
    "population": 3427374,
    "isCoastal": false
  },
  {
    "id": "DST-IND-034",
    "name": "Tawang",
    "state": "Arunachal Pradesh",
    "lat": 27.6807,
    "lng": 91.825,
    "population": 3442171,
    "isCoastal": false
  },
  {
    "id": "DST-IND-035",
    "name": "Tirap",
    "state": "Arunachal Pradesh",
    "lat": 26.9441,
    "lng": 95.4147,
    "population": 963044,
    "isCoastal": false
  },
  {
    "id": "DST-IND-036",
    "name": "Upper Dibang Valley",
    "state": "Arunachal Pradesh",
    "lat": 29.0199,
    "lng": 95.9878,
    "population": 2719635,
    "isCoastal": false
  },
  {
    "id": "DST-IND-037",
    "name": "Upper Siang",
    "state": "Arunachal Pradesh",
    "lat": 28.8309,
    "lng": 95.0016,
    "population": 3320975,
    "isCoastal": false
  },
  {
    "id": "DST-IND-038",
    "name": "Upper Subansiri",
    "state": "Arunachal Pradesh",
    "lat": 28.2772,
    "lng": 93.8991,
    "population": 2414482,
    "isCoastal": false
  },
  {
    "id": "DST-IND-039",
    "name": "West Kameng",
    "state": "Arunachal Pradesh",
    "lat": 27.4649,
    "lng": 92.6502,
    "population": 1284922,
    "isCoastal": false
  },
  {
    "id": "DST-IND-040",
    "name": "West Siang",
    "state": "Arunachal Pradesh",
    "lat": 28.1063,
    "lng": 94.5351,
    "population": 3184100,
    "isCoastal": false
  },
  {
    "id": "DST-IND-041",
    "name": "Barpeta",
    "state": "Assam",
    "lat": 26.4279,
    "lng": 90.9791,
    "population": 597203,
    "isCoastal": false
  },
  {
    "id": "DST-IND-042",
    "name": "Bongaigaon",
    "state": "Assam",
    "lat": 26.4501,
    "lng": 90.6734,
    "population": 1539042,
    "isCoastal": false
  },
  {
    "id": "DST-IND-043",
    "name": "Cachar",
    "state": "Assam",
    "lat": 24.8156,
    "lng": 92.8685,
    "population": 1688079,
    "isCoastal": false
  },
  {
    "id": "DST-IND-044",
    "name": "Darrang",
    "state": "Assam",
    "lat": 26.5846,
    "lng": 92.0414,
    "population": 4207732,
    "isCoastal": false
  },
  {
    "id": "DST-IND-045",
    "name": "Dhemaji",
    "state": "Assam",
    "lat": 27.5865,
    "lng": 94.7134,
    "population": 3554088,
    "isCoastal": false
  },
  {
    "id": "DST-IND-046",
    "name": "Dhuburi",
    "state": "Assam",
    "lat": 26.0691,
    "lng": 89.9904,
    "population": 1037304,
    "isCoastal": false
  },
  {
    "id": "DST-IND-047",
    "name": "Dibrugarh",
    "state": "Assam",
    "lat": 27.3061,
    "lng": 95.0998,
    "population": 2756064,
    "isCoastal": false
  },
  {
    "id": "DST-IND-048",
    "name": "Goalpara",
    "state": "Assam",
    "lat": 26.0173,
    "lng": 90.5987,
    "population": 1185964,
    "isCoastal": false
  },
  {
    "id": "DST-IND-049",
    "name": "Golaghat",
    "state": "Assam",
    "lat": 26.3772,
    "lng": 93.8258,
    "population": 505447,
    "isCoastal": false
  },
  {
    "id": "DST-IND-050",
    "name": "Hailakandi",
    "state": "Assam",
    "lat": 24.4575,
    "lng": 92.5915,
    "population": 2002589,
    "isCoastal": false
  },
  {
    "id": "DST-IND-051",
    "name": "Jorhat",
    "state": "Assam",
    "lat": 26.7624,
    "lng": 94.302,
    "population": 2913440,
    "isCoastal": false
  },
  {
    "id": "DST-IND-052",
    "name": "Kamrup",
    "state": "Assam",
    "lat": 26.1709,
    "lng": 91.5886,
    "population": 1247281,
    "isCoastal": false
  },
  {
    "id": "DST-IND-053",
    "name": "Karbi Anglong",
    "state": "Assam",
    "lat": 26.2043,
    "lng": 93.3962,
    "population": 2826946,
    "isCoastal": false
  },
  {
    "id": "DST-IND-054",
    "name": "Karimganj",
    "state": "Assam",
    "lat": 24.6966,
    "lng": 92.3679,
    "population": 799818,
    "isCoastal": false
  },
  {
    "id": "DST-IND-055",
    "name": "Kokrajhar",
    "state": "Assam",
    "lat": 26.4972,
    "lng": 90.14,
    "population": 3969180,
    "isCoastal": false
  },
  {
    "id": "DST-IND-056",
    "name": "Lakhimpur",
    "state": "Assam",
    "lat": 27.1413,
    "lng": 94.0776,
    "population": 1558399,
    "isCoastal": false
  },
  {
    "id": "DST-IND-057",
    "name": "Marigaon",
    "state": "Assam",
    "lat": 26.2465,
    "lng": 92.2195,
    "population": 3695561,
    "isCoastal": false
  },
  {
    "id": "DST-IND-058",
    "name": "Nagaon",
    "state": "Assam",
    "lat": 26.2646,
    "lng": 92.9306,
    "population": 1949121,
    "isCoastal": false
  },
  {
    "id": "DST-IND-059",
    "name": "Nalbari",
    "state": "Assam",
    "lat": 26.4632,
    "lng": 91.406,
    "population": 4064457,
    "isCoastal": false
  },
  {
    "id": "DST-IND-060",
    "name": "North Cachar Hills",
    "state": "Assam",
    "lat": 25.3383,
    "lng": 92.9774,
    "population": 3656676,
    "isCoastal": false
  },
  {
    "id": "DST-IND-061",
    "name": "Sibsagar",
    "state": "Assam",
    "lat": 27.0276,
    "lng": 94.9003,
    "population": 2560852,
    "isCoastal": false
  },
  {
    "id": "DST-IND-062",
    "name": "Sonitpur",
    "state": "Assam",
    "lat": 26.7351,
    "lng": 92.852,
    "population": 1340178,
    "isCoastal": false
  },
  {
    "id": "DST-IND-063",
    "name": "Tinsukia",
    "state": "Assam",
    "lat": 27.5355,
    "lng": 95.6906,
    "population": 668975,
    "isCoastal": false
  },
  {
    "id": "DST-IND-064",
    "name": "Araria",
    "state": "Bihar",
    "lat": 26.2115,
    "lng": 87.3077,
    "population": 4351583,
    "isCoastal": false
  },
  {
    "id": "DST-IND-065",
    "name": "Aurangabad",
    "state": "Bihar",
    "lat": 24.7743,
    "lng": 84.4599,
    "population": 826474,
    "isCoastal": false
  },
  {
    "id": "DST-IND-066",
    "name": "Banka",
    "state": "Bihar",
    "lat": 24.8324,
    "lng": 86.8665,
    "population": 1283882,
    "isCoastal": false
  },
  {
    "id": "DST-IND-067",
    "name": "Begusarai",
    "state": "Bihar",
    "lat": 25.543,
    "lng": 86.1256,
    "population": 1145925,
    "isCoastal": false
  },
  {
    "id": "DST-IND-068",
    "name": "Bhabua",
    "state": "Bihar",
    "lat": 25.0216,
    "lng": 83.6113,
    "population": 1075547,
    "isCoastal": false
  },
  {
    "id": "DST-IND-069",
    "name": "Bhagalpur",
    "state": "Bihar",
    "lat": 25.2772,
    "lng": 87.0421,
    "population": 1873592,
    "isCoastal": false
  },
  {
    "id": "DST-IND-070",
    "name": "Bhojpur",
    "state": "Bihar",
    "lat": 25.5067,
    "lng": 84.4941,
    "population": 670409,
    "isCoastal": false
  },
  {
    "id": "DST-IND-071",
    "name": "Buxar",
    "state": "Bihar",
    "lat": 25.4859,
    "lng": 84.0881,
    "population": 2998795,
    "isCoastal": false
  },
  {
    "id": "DST-IND-072",
    "name": "Darbhanga",
    "state": "Bihar",
    "lat": 26.1462,
    "lng": 85.9739,
    "population": 2540500,
    "isCoastal": false
  },
  {
    "id": "DST-IND-073",
    "name": "Gaya",
    "state": "Bihar",
    "lat": 24.7267,
    "lng": 84.9429,
    "population": 2528275,
    "isCoastal": false
  },
  {
    "id": "DST-IND-074",
    "name": "Gopalganj",
    "state": "Bihar",
    "lat": 26.4487,
    "lng": 84.3464,
    "population": 1507931,
    "isCoastal": false
  },
  {
    "id": "DST-IND-075",
    "name": "Jamui",
    "state": "Bihar",
    "lat": 24.7842,
    "lng": 86.2632,
    "population": 2482911,
    "isCoastal": false
  },
  {
    "id": "DST-IND-076",
    "name": "Jehanabad",
    "state": "Bihar",
    "lat": 25.1557,
    "lng": 84.9208,
    "population": 4237682,
    "isCoastal": false
  },
  {
    "id": "DST-IND-077",
    "name": "Katihar",
    "state": "Bihar",
    "lat": 25.5657,
    "lng": 87.7047,
    "population": 1562146,
    "isCoastal": false
  },
  {
    "id": "DST-IND-078",
    "name": "Khagaria",
    "state": "Bihar",
    "lat": 25.5356,
    "lng": 86.5659,
    "population": 4042129,
    "isCoastal": false
  },
  {
    "id": "DST-IND-079",
    "name": "Kishanganj",
    "state": "Bihar",
    "lat": 26.3215,
    "lng": 87.9484,
    "population": 3354667,
    "isCoastal": false
  },
  {
    "id": "DST-IND-080",
    "name": "Lakhisarai",
    "state": "Bihar",
    "lat": 25.1835,
    "lng": 86.1283,
    "population": 4035724,
    "isCoastal": false
  },
  {
    "id": "DST-IND-081",
    "name": "Madhepura",
    "state": "Bihar",
    "lat": 25.7734,
    "lng": 86.8978,
    "population": 4214266,
    "isCoastal": false
  },
  {
    "id": "DST-IND-082",
    "name": "Madhubani",
    "state": "Bihar",
    "lat": 26.4138,
    "lng": 86.1633,
    "population": 1946952,
    "isCoastal": false
  },
  {
    "id": "DST-IND-083",
    "name": "Munger",
    "state": "Bihar",
    "lat": 25.1985,
    "lng": 86.5417,
    "population": 3071080,
    "isCoastal": false
  },
  {
    "id": "DST-IND-084",
    "name": "Muzaffarpur",
    "state": "Bihar",
    "lat": 26.1866,
    "lng": 85.3274,
    "population": 3505311,
    "isCoastal": false
  },
  {
    "id": "DST-IND-085",
    "name": "Nalanda",
    "state": "Bihar",
    "lat": 25.2293,
    "lng": 85.4805,
    "population": 718368,
    "isCoastal": false
  },
  {
    "id": "DST-IND-086",
    "name": "Nawada",
    "state": "Bihar",
    "lat": 24.8257,
    "lng": 85.6159,
    "population": 725029,
    "isCoastal": false
  },
  {
    "id": "DST-IND-087",
    "name": "Pashchim Champaran",
    "state": "Bihar",
    "lat": 27.1606,
    "lng": 84.3027,
    "population": 2479155,
    "isCoastal": false
  },
  {
    "id": "DST-IND-088",
    "name": "Patna",
    "state": "Bihar",
    "lat": 25.403,
    "lng": 85.3198,
    "population": 3459288,
    "isCoastal": false
  },
  {
    "id": "DST-IND-089",
    "name": "Purba Champaran",
    "state": "Bihar",
    "lat": 26.6813,
    "lng": 85.0038,
    "population": 2939399,
    "isCoastal": false
  },
  {
    "id": "DST-IND-090",
    "name": "Purnia (Purnea)",
    "state": "Bihar",
    "lat": 25.8171,
    "lng": 87.4045,
    "population": 3261404,
    "isCoastal": false
  },
  {
    "id": "DST-IND-091",
    "name": "Rohtas",
    "state": "Bihar",
    "lat": 24.9917,
    "lng": 83.9351,
    "population": 2454049,
    "isCoastal": false
  },
  {
    "id": "DST-IND-092",
    "name": "Saharsa",
    "state": "Bihar",
    "lat": 25.8213,
    "lng": 86.5467,
    "population": 2485290,
    "isCoastal": false
  },
  {
    "id": "DST-IND-093",
    "name": "Samastipur",
    "state": "Bihar",
    "lat": 25.7932,
    "lng": 85.9483,
    "population": 4292455,
    "isCoastal": false
  },
  {
    "id": "DST-IND-094",
    "name": "Saran",
    "state": "Bihar",
    "lat": 25.8966,
    "lng": 84.8227,
    "population": 1580390,
    "isCoastal": false
  },
  {
    "id": "DST-IND-095",
    "name": "Sheikhpura",
    "state": "Bihar",
    "lat": 25.1247,
    "lng": 85.7784,
    "population": 4430846,
    "isCoastal": false
  },
  {
    "id": "DST-IND-096",
    "name": "Sheohar",
    "state": "Bihar",
    "lat": 26.4584,
    "lng": 85.2954,
    "population": 1394702,
    "isCoastal": false
  },
  {
    "id": "DST-IND-097",
    "name": "Sitamarhi",
    "state": "Bihar",
    "lat": 26.536,
    "lng": 85.5732,
    "population": 552975,
    "isCoastal": false
  },
  {
    "id": "DST-IND-098",
    "name": "Siwan",
    "state": "Bihar",
    "lat": 26.1736,
    "lng": 84.3377,
    "population": 2818889,
    "isCoastal": false
  },
  {
    "id": "DST-IND-099",
    "name": "Supaul",
    "state": "Bihar",
    "lat": 26.2816,
    "lng": 86.785,
    "population": 1031093,
    "isCoastal": false
  },
  {
    "id": "DST-IND-100",
    "name": "Vaishali",
    "state": "Bihar",
    "lat": 25.8135,
    "lng": 85.3925,
    "population": 3795991,
    "isCoastal": false
  },
  {
    "id": "DST-IND-101",
    "name": "Chandigarh",
    "state": "Chandigarh",
    "lat": 30.7426,
    "lng": 76.7587,
    "population": 994139,
    "isCoastal": false
  },
  {
    "id": "DST-IND-102",
    "name": "Bastar",
    "state": "Chhattisgarh",
    "lat": 19.3939,
    "lng": 81.529,
    "population": 2612653,
    "isCoastal": false
  },
  {
    "id": "DST-IND-103",
    "name": "Bilaspur",
    "state": "Chhattisgarh",
    "lat": 22.3597,
    "lng": 81.9737,
    "population": 3966728,
    "isCoastal": false
  },
  {
    "id": "DST-IND-104",
    "name": "Dantewada",
    "state": "Chhattisgarh",
    "lat": 18.6539,
    "lng": 81.072,
    "population": 2326151,
    "isCoastal": false
  },
  {
    "id": "DST-IND-105",
    "name": "Dhamtari",
    "state": "Chhattisgarh",
    "lat": 20.5549,
    "lng": 81.7569,
    "population": 3577954,
    "isCoastal": false
  },
  {
    "id": "DST-IND-106",
    "name": "Durg",
    "state": "Chhattisgarh",
    "lat": 21.1945,
    "lng": 81.3318,
    "population": 2726364,
    "isCoastal": false
  },
  {
    "id": "DST-IND-107",
    "name": "Janjgir-Champa",
    "state": "Chhattisgarh",
    "lat": 21.9611,
    "lng": 82.805,
    "population": 870011,
    "isCoastal": false
  },
  {
    "id": "DST-IND-108",
    "name": "Jashpur",
    "state": "Chhattisgarh",
    "lat": 22.7729,
    "lng": 83.8704,
    "population": 2276916,
    "isCoastal": false
  },
  {
    "id": "DST-IND-109",
    "name": "Kanker",
    "state": "Chhattisgarh",
    "lat": 20.1395,
    "lng": 81.0691,
    "population": 4079761,
    "isCoastal": false
  },
  {
    "id": "DST-IND-110",
    "name": "Kawardha",
    "state": "Chhattisgarh",
    "lat": 22.048,
    "lng": 81.1627,
    "population": 3680457,
    "isCoastal": false
  },
  {
    "id": "DST-IND-111",
    "name": "Korba",
    "state": "Chhattisgarh",
    "lat": 22.4917,
    "lng": 82.576,
    "population": 3694556,
    "isCoastal": false
  },
  {
    "id": "DST-IND-112",
    "name": "Koriya",
    "state": "Chhattisgarh",
    "lat": 23.5041,
    "lng": 82.1252,
    "population": 3687043,
    "isCoastal": false
  },
  {
    "id": "DST-IND-113",
    "name": "Mahasamund",
    "state": "Chhattisgarh",
    "lat": 21.2237,
    "lng": 82.6593,
    "population": 3003946,
    "isCoastal": false
  },
  {
    "id": "DST-IND-114",
    "name": "Raigarh",
    "state": "Chhattisgarh",
    "lat": 22.0083,
    "lng": 83.278,
    "population": 2032641,
    "isCoastal": false
  },
  {
    "id": "DST-IND-115",
    "name": "Raipur",
    "state": "Chhattisgarh",
    "lat": 20.886,
    "lng": 82.2003,
    "population": 2655070,
    "isCoastal": false
  },
  {
    "id": "DST-IND-116",
    "name": "Raj Nandgaon",
    "state": "Chhattisgarh",
    "lat": 21.0584,
    "lng": 80.7853,
    "population": 4013696,
    "isCoastal": false
  },
  {
    "id": "DST-IND-117",
    "name": "Surguja",
    "state": "Chhattisgarh",
    "lat": 23.3272,
    "lng": 83.2358,
    "population": 606565,
    "isCoastal": false
  },
  {
    "id": "DST-IND-118",
    "name": "Dadra and Nagar Haveli",
    "state": "Dadra and Nagar Haveli",
    "lat": 20.2151,
    "lng": 73.0946,
    "population": 2228383,
    "isCoastal": false
  },
  {
    "id": "DST-IND-119",
    "name": "Daman",
    "state": "Daman and Diu",
    "lat": 20.4316,
    "lng": 72.8392,
    "population": 4493543,
    "isCoastal": true
  },
  {
    "id": "DST-IND-120",
    "name": "Junagadh",
    "state": "Daman and Diu",
    "lat": 20.7329,
    "lng": 70.7854,
    "population": 2909580,
    "isCoastal": true
  },
  {
    "id": "DST-IND-121",
    "name": "Delhi",
    "state": "Delhi",
    "lat": 28.6459,
    "lng": 77.128,
    "population": 1109534,
    "isCoastal": false
  },
  {
    "id": "DST-IND-122",
    "name": "North Goa",
    "state": "Goa",
    "lat": 15.5487,
    "lng": 73.8067,
    "population": 2827410,
    "isCoastal": true
  },
  {
    "id": "DST-IND-123",
    "name": "South Goa",
    "state": "Goa",
    "lat": 15.1818,
    "lng": 73.9536,
    "population": 2865869,
    "isCoastal": true
  },
  {
    "id": "DST-IND-124",
    "name": "Ahmadabad",
    "state": "Gujarat",
    "lat": 22.6054,
    "lng": 72.239,
    "population": 1327526,
    "isCoastal": true
  },
  {
    "id": "DST-IND-125",
    "name": "Amreli",
    "state": "Gujarat",
    "lat": 21.0652,
    "lng": 71.4129,
    "population": 3223771,
    "isCoastal": true
  },
  {
    "id": "DST-IND-126",
    "name": "Anand",
    "state": "Gujarat",
    "lat": 22.2901,
    "lng": 72.6006,
    "population": 4182547,
    "isCoastal": true
  },
  {
    "id": "DST-IND-127",
    "name": "Banas Kantha",
    "state": "Gujarat",
    "lat": 24.2585,
    "lng": 71.9321,
    "population": 3242636,
    "isCoastal": true
  },
  {
    "id": "DST-IND-128",
    "name": "Bharuch",
    "state": "Gujarat",
    "lat": 21.7766,
    "lng": 72.6763,
    "population": 1979129,
    "isCoastal": true
  },
  {
    "id": "DST-IND-129",
    "name": "Bhavnagar",
    "state": "Gujarat",
    "lat": 21.5063,
    "lng": 72.0803,
    "population": 3817403,
    "isCoastal": true
  },
  {
    "id": "DST-IND-130",
    "name": "Dahod",
    "state": "Gujarat",
    "lat": 22.898,
    "lng": 73.9917,
    "population": 3772843,
    "isCoastal": true
  },
  {
    "id": "DST-IND-131",
    "name": "Gandhinagar",
    "state": "Gujarat",
    "lat": 23.1937,
    "lng": 72.6722,
    "population": 605909,
    "isCoastal": true
  },
  {
    "id": "DST-IND-132",
    "name": "Jamnagar",
    "state": "Gujarat",
    "lat": 22.3815,
    "lng": 69.613,
    "population": 1089221,
    "isCoastal": true
  },
  {
    "id": "DST-IND-133",
    "name": "Junagadh",
    "state": "Gujarat",
    "lat": 20.9351,
    "lng": 70.5382,
    "population": 2491376,
    "isCoastal": true
  },
  {
    "id": "DST-IND-134",
    "name": "Kachchh",
    "state": "Gujarat",
    "lat": 23.2796,
    "lng": 69.2301,
    "population": 2334619,
    "isCoastal": true
  },
  {
    "id": "DST-IND-135",
    "name": "Kheda",
    "state": "Gujarat",
    "lat": 22.8877,
    "lng": 73.0188,
    "population": 1101969,
    "isCoastal": true
  },
  {
    "id": "DST-IND-136",
    "name": "Mahesana",
    "state": "Gujarat",
    "lat": 23.5294,
    "lng": 72.4555,
    "population": 518709,
    "isCoastal": true
  },
  {
    "id": "DST-IND-137",
    "name": "Narmada",
    "state": "Gujarat",
    "lat": 21.7067,
    "lng": 73.684,
    "population": 2276621,
    "isCoastal": true
  },
  {
    "id": "DST-IND-138",
    "name": "Navsari",
    "state": "Gujarat",
    "lat": 20.8729,
    "lng": 72.8625,
    "population": 1574251,
    "isCoastal": true
  },
  {
    "id": "DST-IND-139",
    "name": "Panch Mahals",
    "state": "Gujarat",
    "lat": 22.8044,
    "lng": 73.6198,
    "population": 1824962,
    "isCoastal": true
  },
  {
    "id": "DST-IND-140",
    "name": "Patan",
    "state": "Gujarat",
    "lat": 23.8063,
    "lng": 71.7516,
    "population": 1820118,
    "isCoastal": true
  },
  {
    "id": "DST-IND-141",
    "name": "Porbandar",
    "state": "Gujarat",
    "lat": 21.5495,
    "lng": 69.7186,
    "population": 4498236,
    "isCoastal": true
  },
  {
    "id": "DST-IND-142",
    "name": "Rajkot",
    "state": "Gujarat",
    "lat": 22.406,
    "lng": 70.8368,
    "population": 1415065,
    "isCoastal": true
  },
  {
    "id": "DST-IND-143",
    "name": "Sabar Kantha",
    "state": "Gujarat",
    "lat": 23.718,
    "lng": 73.1364,
    "population": 2404188,
    "isCoastal": true
  },
  {
    "id": "DST-IND-144",
    "name": "Surat",
    "state": "Gujarat",
    "lat": 21.2683,
    "lng": 73.0252,
    "population": 1429292,
    "isCoastal": true
  },
  {
    "id": "DST-IND-145",
    "name": "Surendranagar",
    "state": "Gujarat",
    "lat": 22.8267,
    "lng": 71.4836,
    "population": 1177357,
    "isCoastal": true
  },
  {
    "id": "DST-IND-146",
    "name": "The Dangs",
    "state": "Gujarat",
    "lat": 20.8016,
    "lng": 73.6884,
    "population": 1040750,
    "isCoastal": true
  },
  {
    "id": "DST-IND-147",
    "name": "Vadodara",
    "state": "Gujarat",
    "lat": 22.2613,
    "lng": 73.4943,
    "population": 2604111,
    "isCoastal": true
  },
  {
    "id": "DST-IND-148",
    "name": "Valsad",
    "state": "Gujarat",
    "lat": 20.4424,
    "lng": 72.9149,
    "population": 3928107,
    "isCoastal": true
  },
  {
    "id": "DST-IND-149",
    "name": "Ambala",
    "state": "Haryana",
    "lat": 30.3504,
    "lng": 76.9497,
    "population": 4233440,
    "isCoastal": false
  },
  {
    "id": "DST-IND-150",
    "name": "Bhiwani",
    "state": "Haryana",
    "lat": 28.7289,
    "lng": 76.0211,
    "population": 3616771,
    "isCoastal": false
  },
  {
    "id": "DST-IND-151",
    "name": "Faridabad",
    "state": "Haryana",
    "lat": 28.1487,
    "lng": 77.3272,
    "population": 1869494,
    "isCoastal": false
  },
  {
    "id": "DST-IND-152",
    "name": "Fatehabad",
    "state": "Haryana",
    "lat": 29.573,
    "lng": 75.5461,
    "population": 4410131,
    "isCoastal": false
  },
  {
    "id": "DST-IND-153",
    "name": "Gurgaon",
    "state": "Haryana",
    "lat": 28.0439,
    "lng": 77.0194,
    "population": 1458757,
    "isCoastal": false
  },
  {
    "id": "DST-IND-154",
    "name": "Hisar",
    "state": "Haryana",
    "lat": 29.2363,
    "lng": 75.8432,
    "population": 4320404,
    "isCoastal": false
  },
  {
    "id": "DST-IND-155",
    "name": "Jhajjar",
    "state": "Haryana",
    "lat": 28.5965,
    "lng": 76.6114,
    "population": 3566637,
    "isCoastal": false
  },
  {
    "id": "DST-IND-156",
    "name": "Jind",
    "state": "Haryana",
    "lat": 29.4515,
    "lng": 76.296,
    "population": 3082644,
    "isCoastal": false
  },
  {
    "id": "DST-IND-157",
    "name": "Kaithal",
    "state": "Haryana",
    "lat": 29.9607,
    "lng": 76.377,
    "population": 3055890,
    "isCoastal": false
  },
  {
    "id": "DST-IND-158",
    "name": "Karnal",
    "state": "Haryana",
    "lat": 29.7032,
    "lng": 76.8749,
    "population": 3879166,
    "isCoastal": false
  },
  {
    "id": "DST-IND-159",
    "name": "Kurukshetra",
    "state": "Haryana",
    "lat": 30.0565,
    "lng": 76.7877,
    "population": 706468,
    "isCoastal": false
  },
  {
    "id": "DST-IND-160",
    "name": "Mahendragarh",
    "state": "Haryana",
    "lat": 28.1352,
    "lng": 76.1402,
    "population": 3517338,
    "isCoastal": false
  },
  {
    "id": "DST-IND-161",
    "name": "Panchkula",
    "state": "Haryana",
    "lat": 30.7009,
    "lng": 76.9717,
    "population": 3846053,
    "isCoastal": false
  },
  {
    "id": "DST-IND-162",
    "name": "Panipat",
    "state": "Haryana",
    "lat": 29.3435,
    "lng": 76.929,
    "population": 2984527,
    "isCoastal": false
  },
  {
    "id": "DST-IND-163",
    "name": "Rewari",
    "state": "Haryana",
    "lat": 28.1916,
    "lng": 76.5596,
    "population": 3663465,
    "isCoastal": false
  },
  {
    "id": "DST-IND-164",
    "name": "Rohtak",
    "state": "Haryana",
    "lat": 28.8925,
    "lng": 76.5312,
    "population": 2947596,
    "isCoastal": false
  },
  {
    "id": "DST-IND-165",
    "name": "Sirsa",
    "state": "Haryana",
    "lat": 29.6358,
    "lng": 74.9097,
    "population": 1536691,
    "isCoastal": false
  },
  {
    "id": "DST-IND-166",
    "name": "Sonepat",
    "state": "Haryana",
    "lat": 29.0581,
    "lng": 76.8559,
    "population": 4355650,
    "isCoastal": false
  },
  {
    "id": "DST-IND-167",
    "name": "Yamuna Nagar",
    "state": "Haryana",
    "lat": 30.2647,
    "lng": 77.3165,
    "population": 2493317,
    "isCoastal": false
  },
  {
    "id": "DST-IND-168",
    "name": "Bilaspur",
    "state": "Himachal Pradesh",
    "lat": 31.378,
    "lng": 76.6532,
    "population": 2555087,
    "isCoastal": false
  },
  {
    "id": "DST-IND-169",
    "name": "Chamba",
    "state": "Himachal Pradesh",
    "lat": 32.6674,
    "lng": 76.3935,
    "population": 3214189,
    "isCoastal": false
  },
  {
    "id": "DST-IND-170",
    "name": "Hamirpur",
    "state": "Himachal Pradesh",
    "lat": 31.6767,
    "lng": 76.4977,
    "population": 996539,
    "isCoastal": false
  },
  {
    "id": "DST-IND-171",
    "name": "Kangra",
    "state": "Himachal Pradesh",
    "lat": 32.1409,
    "lng": 76.4121,
    "population": 1858496,
    "isCoastal": false
  },
  {
    "id": "DST-IND-172",
    "name": "Kinnaur",
    "state": "Himachal Pradesh",
    "lat": 31.6067,
    "lng": 78.5161,
    "population": 3271842,
    "isCoastal": false
  },
  {
    "id": "DST-IND-173",
    "name": "Kullu",
    "state": "Himachal Pradesh",
    "lat": 31.9091,
    "lng": 77.4092,
    "population": 3278277,
    "isCoastal": false
  },
  {
    "id": "DST-IND-174",
    "name": "Lahul and Spiti",
    "state": "Himachal Pradesh",
    "lat": 32.5172,
    "lng": 77.6247,
    "population": 2706238,
    "isCoastal": false
  },
  {
    "id": "DST-IND-175",
    "name": "Mandi",
    "state": "Himachal Pradesh",
    "lat": 31.6358,
    "lng": 76.9656,
    "population": 2464273,
    "isCoastal": false
  },
  {
    "id": "DST-IND-176",
    "name": "Shimla",
    "state": "Himachal Pradesh",
    "lat": 31.1557,
    "lng": 77.6257,
    "population": 3392862,
    "isCoastal": false
  },
  {
    "id": "DST-IND-177",
    "name": "Sirmaur",
    "state": "Himachal Pradesh",
    "lat": 30.6828,
    "lng": 77.4318,
    "population": 4331249,
    "isCoastal": false
  },
  {
    "id": "DST-IND-178",
    "name": "Solan",
    "state": "Himachal Pradesh",
    "lat": 31.0386,
    "lng": 76.9444,
    "population": 2279162,
    "isCoastal": false
  },
  {
    "id": "DST-IND-179",
    "name": "Una",
    "state": "Himachal Pradesh",
    "lat": 31.5833,
    "lng": 76.1835,
    "population": 4387384,
    "isCoastal": false
  },
  {
    "id": "DST-IND-180",
    "name": "Anantnag (Kashmir South)",
    "state": "Jammu and Kashmir",
    "lat": 33.7603,
    "lng": 75.3039,
    "population": 4152613,
    "isCoastal": false
  },
  {
    "id": "DST-IND-181",
    "name": "Bagdam",
    "state": "Jammu and Kashmir",
    "lat": 33.9326,
    "lng": 74.798,
    "population": 1750313,
    "isCoastal": false
  },
  {
    "id": "DST-IND-182",
    "name": "Baramula (Kashmir North)",
    "state": "Jammu and Kashmir",
    "lat": 34.3813,
    "lng": 74.7636,
    "population": 3473644,
    "isCoastal": false
  },
  {
    "id": "DST-IND-183",
    "name": "Doda",
    "state": "Jammu and Kashmir",
    "lat": 33.3596,
    "lng": 76.0716,
    "population": 1096143,
    "isCoastal": false
  },
  {
    "id": "DST-IND-184",
    "name": "Jammu",
    "state": "Jammu and Kashmir",
    "lat": 32.7132,
    "lng": 74.8478,
    "population": 579056,
    "isCoastal": false
  },
{
    "id": "DST-IND-186",
    "name": "Kathua",
    "state": "Jammu and Kashmir",
    "lat": 32.5178,
    "lng": 75.589,
    "population": 1670910,
    "isCoastal": false
  },
  {
    "id": "DST-IND-187",
    "name": "Kupwara (Muzaffarabad)",
    "state": "Jammu and Kashmir",
    "lat": 34.5992,
    "lng": 74.2159,
    "population": 774398,
    "isCoastal": false
  },
  {
    "id": "DST-IND-188",
    "name": "Ladakh (Leh)",
    "state": "Jammu and Kashmir",
    "lat": 33.5858,
    "lng": 78.3073,
    "population": 3509591,
    "isCoastal": false
  },
  {
    "id": "DST-IND-189",
    "name": "Pulwama",
    "state": "Jammu and Kashmir",
    "lat": 33.8841,
    "lng": 75.0092,
    "population": 3870159,
    "isCoastal": false
  },
  {
    "id": "DST-IND-190",
    "name": "Punch",
    "state": "Jammu and Kashmir",
    "lat": 33.7912,
    "lng": 74.2959,
    "population": 2332307,
    "isCoastal": false
  },
  {
    "id": "DST-IND-191",
    "name": "Rajauri",
    "state": "Jammu and Kashmir",
    "lat": 33.2723,
    "lng": 74.4078,
    "population": 2214374,
    "isCoastal": false
  },
  {
    "id": "DST-IND-192",
    "name": "Srinagar",
    "state": "Jammu and Kashmir",
    "lat": 34.2731,
    "lng": 75.1102,
    "population": 787632,
    "isCoastal": false
  },
  {
    "id": "DST-IND-193",
    "name": "Udhampur",
    "state": "Jammu and Kashmir",
    "lat": 33.0477,
    "lng": 75.1529,
    "population": 2890357,
    "isCoastal": false
  },
  {
    "id": "DST-IND-194",
    "name": "Bokaro",
    "state": "Jharkhand",
    "lat": 23.6815,
    "lng": 85.984,
    "population": 3817333,
    "isCoastal": false
  },
  {
    "id": "DST-IND-195",
    "name": "Chatra",
    "state": "Jharkhand",
    "lat": 24.1162,
    "lng": 84.933,
    "population": 1577329,
    "isCoastal": false
  },
  {
    "id": "DST-IND-196",
    "name": "Deoghar",
    "state": "Jharkhand",
    "lat": 24.3307,
    "lng": 86.757,
    "population": 2289929,
    "isCoastal": false
  },
  {
    "id": "DST-IND-197",
    "name": "Dhanbad",
    "state": "Jharkhand",
    "lat": 23.8545,
    "lng": 86.4037,
    "population": 3251027,
    "isCoastal": false
  },
  {
    "id": "DST-IND-198",
    "name": "Dumka",
    "state": "Jharkhand",
    "lat": 24.275,
    "lng": 87.2766,
    "population": 3072372,
    "isCoastal": false
  },
  {
    "id": "DST-IND-199",
    "name": "Garhwa",
    "state": "Jharkhand",
    "lat": 24.0821,
    "lng": 83.6866,
    "population": 2411502,
    "isCoastal": false
  },
  {
    "id": "DST-IND-200",
    "name": "Giridih",
    "state": "Jharkhand",
    "lat": 24.3058,
    "lng": 86.0871,
    "population": 689527,
    "isCoastal": false
  },
  {
    "id": "DST-IND-201",
    "name": "Godda",
    "state": "Jharkhand",
    "lat": 24.8189,
    "lng": 87.2942,
    "population": 887082,
    "isCoastal": false
  },
  {
    "id": "DST-IND-202",
    "name": "Gumla",
    "state": "Jharkhand",
    "lat": 23.0785,
    "lng": 84.5506,
    "population": 1071436,
    "isCoastal": false
  },
  {
    "id": "DST-IND-203",
    "name": "Hazaribag",
    "state": "Jharkhand",
    "lat": 23.9432,
    "lng": 85.4944,
    "population": 1377624,
    "isCoastal": false
  },
  {
    "id": "DST-IND-204",
    "name": "Jamtara",
    "state": "Jharkhand",
    "lat": 23.9787,
    "lng": 86.9533,
    "population": 3462732,
    "isCoastal": false
  },
  {
    "id": "DST-IND-205",
    "name": "Koderma",
    "state": "Jharkhand",
    "lat": 24.5567,
    "lng": 85.7169,
    "population": 3244574,
    "isCoastal": false
  },
  {
    "id": "DST-IND-206",
    "name": "Latehar",
    "state": "Jharkhand",
    "lat": 23.7251,
    "lng": 84.483,
    "population": 933895,
    "isCoastal": false
  },
  {
    "id": "DST-IND-207",
    "name": "Lohardaga",
    "state": "Jharkhand",
    "lat": 23.4888,
    "lng": 84.6605,
    "population": 1730661,
    "isCoastal": false
  },
  {
    "id": "DST-IND-208",
    "name": "Pakur",
    "state": "Jharkhand",
    "lat": 24.5726,
    "lng": 87.6969,
    "population": 541358,
    "isCoastal": false
  },
  {
    "id": "DST-IND-209",
    "name": "Palamu",
    "state": "Jharkhand",
    "lat": 24.1969,
    "lng": 84.2031,
    "population": 4216361,
    "isCoastal": false
  },
  {
    "id": "DST-IND-210",
    "name": "Pashchim Singhbhum",
    "state": "Jharkhand",
    "lat": 22.3994,
    "lng": 85.541,
    "population": 2094347,
    "isCoastal": false
  },
  {
    "id": "DST-IND-211",
    "name": "Purba Singhbhum",
    "state": "Jharkhand",
    "lat": 22.5913,
    "lng": 86.5091,
    "population": 1482767,
    "isCoastal": false
  },
  {
    "id": "DST-IND-212",
    "name": "Ranchi",
    "state": "Jharkhand",
    "lat": 23.1842,
    "lng": 85.3178,
    "population": 2389417,
    "isCoastal": false
  },
  {
    "id": "DST-IND-213",
    "name": "Sahibganj",
    "state": "Jharkhand",
    "lat": 24.9367,
    "lng": 87.6826,
    "population": 3670370,
    "isCoastal": false
  },
  {
    "id": "DST-IND-214",
    "name": "Saraikela Kharsawan",
    "state": "Jharkhand",
    "lat": 22.8559,
    "lng": 85.8961,
    "population": 1756560,
    "isCoastal": false
  },
  {
    "id": "DST-IND-215",
    "name": "Simdega",
    "state": "Jharkhand",
    "lat": 22.6088,
    "lng": 84.5919,
    "population": 947331,
    "isCoastal": false
  },
  {
    "id": "DST-IND-216",
    "name": "Bagalkot",
    "state": "Karnataka",
    "lat": 16.1586,
    "lng": 75.6453,
    "population": 1210005,
    "isCoastal": false
  },
  {
    "id": "DST-IND-217",
    "name": "Bangalore Rural",
    "state": "Karnataka",
    "lat": 12.9368,
    "lng": 77.4737,
    "population": 2824070,
    "isCoastal": false
  },
  {
    "id": "DST-IND-218",
    "name": "Bangalore Urban",
    "state": "Karnataka",
    "lat": 12.9019,
    "lng": 77.5869,
    "population": 2958525,
    "isCoastal": false
  },
  {
    "id": "DST-IND-219",
    "name": "Belgaum",
    "state": "Karnataka",
    "lat": 16.1611,
    "lng": 74.7233,
    "population": 1648668,
    "isCoastal": false
  },
  {
    "id": "DST-IND-220",
    "name": "Bellary",
    "state": "Karnataka",
    "lat": 15.0744,
    "lng": 76.4723,
    "population": 1159456,
    "isCoastal": false
  },
  {
    "id": "DST-IND-221",
    "name": "Bidar",
    "state": "Karnataka",
    "lat": 17.9504,
    "lng": 77.1946,
    "population": 2143563,
    "isCoastal": false
  },
  {
    "id": "DST-IND-222",
    "name": "Bijapur",
    "state": "Karnataka",
    "lat": 16.8402,
    "lng": 75.9591,
    "population": 3439504,
    "isCoastal": false
  },
  {
    "id": "DST-IND-223",
    "name": "Chamrajnagar",
    "state": "Karnataka",
    "lat": 11.9525,
    "lng": 77.0238,
    "population": 3172480,
    "isCoastal": true
  },
  {
    "id": "DST-IND-224",
    "name": "Chikmagalur",
    "state": "Karnataka",
    "lat": 13.4253,
    "lng": 75.6763,
    "population": 2494375,
    "isCoastal": false
  },
  {
    "id": "DST-IND-225",
    "name": "Chitradurga",
    "state": "Karnataka",
    "lat": 14.291,
    "lng": 76.5782,
    "population": 3516202,
    "isCoastal": false
  },
  {
    "id": "DST-IND-226",
    "name": "Dakshin Kannad",
    "state": "Karnataka",
    "lat": 12.8912,
    "lng": 74.9622,
    "population": 1427889,
    "isCoastal": false
  },
  {
    "id": "DST-IND-227",
    "name": "Davanagere",
    "state": "Karnataka",
    "lat": 14.3304,
    "lng": 75.9172,
    "population": 746845,
    "isCoastal": false
  },
  {
    "id": "DST-IND-228",
    "name": "Dharwad",
    "state": "Karnataka",
    "lat": 15.3438,
    "lng": 75.1383,
    "population": 537759,
    "isCoastal": false
  },
  {
    "id": "DST-IND-229",
    "name": "Gadag",
    "state": "Karnataka",
    "lat": 15.5071,
    "lng": 75.6486,
    "population": 2440193,
    "isCoastal": false
  },
  {
    "id": "DST-IND-230",
    "name": "Gulbarga",
    "state": "Karnataka",
    "lat": 17.0705,
    "lng": 76.875,
    "population": 1593738,
    "isCoastal": false
  },
  {
    "id": "DST-IND-231",
    "name": "Hassan",
    "state": "Karnataka",
    "lat": 12.9451,
    "lng": 76.1105,
    "population": 3719232,
    "isCoastal": false
  },
  {
    "id": "DST-IND-232",
    "name": "Haveri",
    "state": "Karnataka",
    "lat": 14.7376,
    "lng": 75.3961,
    "population": 3537341,
    "isCoastal": false
  },
  {
    "id": "DST-IND-233",
    "name": "Kodagu",
    "state": "Karnataka",
    "lat": 12.3968,
    "lng": 75.7934,
    "population": 1145836,
    "isCoastal": false
  },
  {
    "id": "DST-IND-234",
    "name": "Kolar",
    "state": "Karnataka",
    "lat": 13.3128,
    "lng": 78.0138,
    "population": 932196,
    "isCoastal": false
  },
  {
    "id": "DST-IND-235",
    "name": "Koppal",
    "state": "Karnataka",
    "lat": 15.6512,
    "lng": 76.1617,
    "population": 3644417,
    "isCoastal": false
  },
  {
    "id": "DST-IND-236",
    "name": "Mandya",
    "state": "Karnataka",
    "lat": 12.5749,
    "lng": 76.8157,
    "population": 4057385,
    "isCoastal": false
  },
  {
    "id": "DST-IND-237",
    "name": "Mysore",
    "state": "Karnataka",
    "lat": 12.2481,
    "lng": 76.5288,
    "population": 509575,
    "isCoastal": false
  },
  {
    "id": "DST-IND-238",
    "name": "Raichur",
    "state": "Karnataka",
    "lat": 16.0508,
    "lng": 76.8737,
    "population": 1673887,
    "isCoastal": false
  },
  {
    "id": "DST-IND-239",
    "name": "Shimoga",
    "state": "Karnataka",
    "lat": 14.0638,
    "lng": 75.1788,
    "population": 4040370,
    "isCoastal": false
  },
  {
    "id": "DST-IND-240",
    "name": "Tumkur",
    "state": "Karnataka",
    "lat": 13.4097,
    "lng": 76.938,
    "population": 1097724,
    "isCoastal": false
  },
  {
    "id": "DST-IND-241",
    "name": "Udupi",
    "state": "Karnataka",
    "lat": 13.4741,
    "lng": 74.724,
    "population": 4264107,
    "isCoastal": false
  },
  {
    "id": "DST-IND-242",
    "name": "Uttar Kannand",
    "state": "Karnataka",
    "lat": 14.536,
    "lng": 74.365,
    "population": 3553048,
    "isCoastal": true
  },
  {
    "id": "DST-IND-243",
    "name": "Alappuzha",
    "state": "Kerala",
    "lat": 9.5157,
    "lng": 76.3798,
    "population": 1327904,
    "isCoastal": true
  },
  {
    "id": "DST-IND-244",
    "name": "Ernakulam",
    "state": "Kerala",
    "lat": 10.0365,
    "lng": 76.2668,
    "population": 4140120,
    "isCoastal": true
  },
  {
    "id": "DST-IND-245",
    "name": "Idukki",
    "state": "Kerala",
    "lat": 9.8048,
    "lng": 77.0459,
    "population": 2846434,
    "isCoastal": true
  },
  {
    "id": "DST-IND-246",
    "name": "Kannur",
    "state": "Kerala",
    "lat": 11.9385,
    "lng": 75.3555,
    "population": 3216171,
    "isCoastal": true
  },
  {
    "id": "DST-IND-247",
    "name": "Kasaragod",
    "state": "Kerala",
    "lat": 12.4304,
    "lng": 75.0414,
    "population": 676270,
    "isCoastal": false
  },
  {
    "id": "DST-IND-248",
    "name": "Kollam",
    "state": "Kerala",
    "lat": 8.9294,
    "lng": 76.6361,
    "population": 2097318,
    "isCoastal": true
  },
  {
    "id": "DST-IND-249",
    "name": "Kottayam",
    "state": "Kerala",
    "lat": 9.6467,
    "lng": 76.463,
    "population": 2380148,
    "isCoastal": true
  },
  {
    "id": "DST-IND-250",
    "name": "Kozhikode",
    "state": "Kerala",
    "lat": 11.4004,
    "lng": 75.7081,
    "population": 1379227,
    "isCoastal": true
  },
  {
    "id": "DST-IND-251",
    "name": "Malappuram",
    "state": "Kerala",
    "lat": 10.9733,
    "lng": 75.9391,
    "population": 1108261,
    "isCoastal": true
  },
  {
    "id": "DST-IND-252",
    "name": "Palakkad",
    "state": "Kerala",
    "lat": 10.7849,
    "lng": 76.4998,
    "population": 3002172,
    "isCoastal": true
  },
  {
    "id": "DST-IND-253",
    "name": "Pattanamtitta",
    "state": "Kerala",
    "lat": 9.2913,
    "lng": 76.8641,
    "population": 3366994,
    "isCoastal": true
  },
  {
    "id": "DST-IND-254",
    "name": "Thiruvananthapuram",
    "state": "Kerala",
    "lat": 8.5371,
    "lng": 76.8871,
    "population": 3119498,
    "isCoastal": true
  },
  {
    "id": "DST-IND-255",
    "name": "Thrissur",
    "state": "Kerala",
    "lat": 10.4578,
    "lng": 76.1243,
    "population": 1684747,
    "isCoastal": true
  },
  {
    "id": "DST-IND-256",
    "name": "Wayanad",
    "state": "Kerala",
    "lat": 11.7153,
    "lng": 76.0759,
    "population": 737035,
    "isCoastal": true
  },
  {
    "id": "DST-IND-257",
    "name": "Kavaratti",
    "state": "Lakshadweep",
    "lat": 8.2919,
    "lng": 73.0567,
    "population": 742325,
    "isCoastal": true
  },
  {
    "id": "DST-IND-258",
    "name": "Anuppur",
    "state": "Madhya Pradesh",
    "lat": 23.1818,
    "lng": 81.8656,
    "population": 4015115,
    "isCoastal": false
  },
  {
    "id": "DST-IND-259",
    "name": "Ashoknagar",
    "state": "Madhya Pradesh",
    "lat": 24.631,
    "lng": 77.8297,
    "population": 1857586,
    "isCoastal": false
  },
  {
    "id": "DST-IND-260",
    "name": "Balaghat",
    "state": "Madhya Pradesh",
    "lat": 21.8002,
    "lng": 80.4217,
    "population": 3590513,
    "isCoastal": false
  },
  {
    "id": "DST-IND-261",
    "name": "Barwani",
    "state": "Madhya Pradesh",
    "lat": 21.7021,
    "lng": 74.91,
    "population": 1176962,
    "isCoastal": false
  },
  {
    "id": "DST-IND-262",
    "name": "Betul",
    "state": "Madhya Pradesh",
    "lat": 21.9646,
    "lng": 77.7873,
    "population": 2334396,
    "isCoastal": false
  },
  {
    "id": "DST-IND-263",
    "name": "Bhind",
    "state": "Madhya Pradesh",
    "lat": 26.3595,
    "lng": 78.7618,
    "population": 3608080,
    "isCoastal": false
  },
  {
    "id": "DST-IND-264",
    "name": "Bhopal",
    "state": "Madhya Pradesh",
    "lat": 23.4807,
    "lng": 77.3925,
    "population": 1661870,
    "isCoastal": false
  },
  {
    "id": "DST-IND-265",
    "name": "Burhanpur",
    "state": "Madhya Pradesh",
    "lat": 21.3646,
    "lng": 76.2446,
    "population": 1317628,
    "isCoastal": false
  },
  {
    "id": "DST-IND-266",
    "name": "Chhatarpur",
    "state": "Madhya Pradesh",
    "lat": 24.8136,
    "lng": 79.5645,
    "population": 621904,
    "isCoastal": false
  },
  {
    "id": "DST-IND-267",
    "name": "Chhindwara",
    "state": "Madhya Pradesh",
    "lat": 22.228,
    "lng": 78.7641,
    "population": 1944096,
    "isCoastal": false
  },
  {
    "id": "DST-IND-268",
    "name": "Damoh",
    "state": "Madhya Pradesh",
    "lat": 23.7662,
    "lng": 79.4705,
    "population": 2186157,
    "isCoastal": false
  },
  {
    "id": "DST-IND-269",
    "name": "Datia",
    "state": "Madhya Pradesh",
    "lat": 25.9023,
    "lng": 78.6392,
    "population": 1963078,
    "isCoastal": false
  },
  {
    "id": "DST-IND-270",
    "name": "Dewas",
    "state": "Madhya Pradesh",
    "lat": 22.7851,
    "lng": 76.4609,
    "population": 4344001,
    "isCoastal": false
  },
  {
    "id": "DST-IND-271",
    "name": "Dhar",
    "state": "Madhya Pradesh",
    "lat": 22.5727,
    "lng": 75.1106,
    "population": 2492242,
    "isCoastal": false
  },
  {
    "id": "DST-IND-272",
    "name": "Dindori",
    "state": "Madhya Pradesh",
    "lat": 22.8374,
    "lng": 81.0433,
    "population": 2063860,
    "isCoastal": false
  },
  {
    "id": "DST-IND-273",
    "name": "East Nimar",
    "state": "Madhya Pradesh",
    "lat": 22.099,
    "lng": 76.5581,
    "population": 965584,
    "isCoastal": false
  },
  {
    "id": "DST-IND-274",
    "name": "Guna",
    "state": "Madhya Pradesh",
    "lat": 24.4904,
    "lng": 77.2236,
    "population": 4417382,
    "isCoastal": false
  },
  {
    "id": "DST-IND-275",
    "name": "Gwalior",
    "state": "Madhya Pradesh",
    "lat": 26.0407,
    "lng": 78.1278,
    "population": 1619900,
    "isCoastal": false
  },
  {
    "id": "DST-IND-276",
    "name": "Harda",
    "state": "Madhya Pradesh",
    "lat": 22.2277,
    "lng": 77.0702,
    "population": 1196310,
    "isCoastal": false
  },
  {
    "id": "DST-IND-277",
    "name": "Hoshangabad",
    "state": "Madhya Pradesh",
    "lat": 22.5953,
    "lng": 78.0217,
    "population": 2849484,
    "isCoastal": false
  },
  {
    "id": "DST-IND-278",
    "name": "Indore",
    "state": "Madhya Pradesh",
    "lat": 22.6803,
    "lng": 75.9134,
    "population": 4329980,
    "isCoastal": false
  },
  {
    "id": "DST-IND-279",
    "name": "Jabalpur",
    "state": "Madhya Pradesh",
    "lat": 23.1853,
    "lng": 79.9833,
    "population": 619272,
    "isCoastal": false
  },
  {
    "id": "DST-IND-280",
    "name": "Jhabua",
    "state": "Madhya Pradesh",
    "lat": 22.4196,
    "lng": 74.4092,
    "population": 737586,
    "isCoastal": false
  },
  {
    "id": "DST-IND-281",
    "name": "Katni",
    "state": "Madhya Pradesh",
    "lat": 23.7244,
    "lng": 80.3382,
    "population": 2240459,
    "isCoastal": false
  },
  {
    "id": "DST-IND-282",
    "name": "Mandla",
    "state": "Madhya Pradesh",
    "lat": 22.7066,
    "lng": 80.3817,
    "population": 3664409,
    "isCoastal": false
  },
  {
    "id": "DST-IND-283",
    "name": "Mandsaur",
    "state": "Madhya Pradesh",
    "lat": 24.1928,
    "lng": 75.4359,
    "population": 3727811,
    "isCoastal": false
  },
  {
    "id": "DST-IND-284",
    "name": "Morena",
    "state": "Madhya Pradesh",
    "lat": 26.3731,
    "lng": 77.8845,
    "population": 3501967,
    "isCoastal": false
  },
  {
    "id": "DST-IND-285",
    "name": "Narsinghpur",
    "state": "Madhya Pradesh",
    "lat": 22.9513,
    "lng": 79.002,
    "population": 3905950,
    "isCoastal": false
  },
  {
    "id": "DST-IND-286",
    "name": "Neemuch",
    "state": "Madhya Pradesh",
    "lat": 24.7031,
    "lng": 75.0661,
    "population": 4337529,
    "isCoastal": false
  },
  {
    "id": "DST-IND-287",
    "name": "Panna",
    "state": "Madhya Pradesh",
    "lat": 24.4513,
    "lng": 80.2113,
    "population": 3365950,
    "isCoastal": false
  },
  {
    "id": "DST-IND-288",
    "name": "Raisen",
    "state": "Madhya Pradesh",
    "lat": 23.2925,
    "lng": 78.1631,
    "population": 3016304,
    "isCoastal": false
  },
  {
    "id": "DST-IND-289",
    "name": "Rajgarh",
    "state": "Madhya Pradesh",
    "lat": 23.7855,
    "lng": 76.6643,
    "population": 926010,
    "isCoastal": false
  },
  {
    "id": "DST-IND-290",
    "name": "Ratlam",
    "state": "Madhya Pradesh",
    "lat": 23.5036,
    "lng": 75.149,
    "population": 4227567,
    "isCoastal": false
  },
  {
    "id": "DST-IND-291",
    "name": "Rewa",
    "state": "Madhya Pradesh",
    "lat": 24.8612,
    "lng": 81.5757,
    "population": 1569255,
    "isCoastal": false
  },
  {
    "id": "DST-IND-292",
    "name": "Sagar",
    "state": "Madhya Pradesh",
    "lat": 23.8003,
    "lng": 78.7194,
    "population": 3249173,
    "isCoastal": false
  },
  {
    "id": "DST-IND-293",
    "name": "Satna",
    "state": "Madhya Pradesh",
    "lat": 24.6278,
    "lng": 80.7555,
    "population": 859240,
    "isCoastal": false
  },
  {
    "id": "DST-IND-294",
    "name": "Sehore",
    "state": "Madhya Pradesh",
    "lat": 22.9297,
    "lng": 77.0678,
    "population": 2616381,
    "isCoastal": false
  },
  {
    "id": "DST-IND-295",
    "name": "Seoni",
    "state": "Madhya Pradesh",
    "lat": 22.3323,
    "lng": 79.6605,
    "population": 3814771,
    "isCoastal": false
  },
  {
    "id": "DST-IND-296",
    "name": "Shahdol",
    "state": "Madhya Pradesh",
    "lat": 23.4486,
    "lng": 81.4597,
    "population": 3433534,
    "isCoastal": false
  },
  {
    "id": "DST-IND-297",
    "name": "Shajapur",
    "state": "Madhya Pradesh",
    "lat": 23.5666,
    "lng": 76.3356,
    "population": 3420400,
    "isCoastal": false
  },
  {
    "id": "DST-IND-298",
    "name": "Sheopur",
    "state": "Madhya Pradesh",
    "lat": 25.7801,
    "lng": 77.1691,
    "population": 3123679,
    "isCoastal": false
  },
  {
    "id": "DST-IND-299",
    "name": "Shivpuri",
    "state": "Madhya Pradesh",
    "lat": 25.378,
    "lng": 77.7486,
    "population": 3591711,
    "isCoastal": false
  },
  {
    "id": "DST-IND-300",
    "name": "Sidhi",
    "state": "Madhya Pradesh",
    "lat": 24.1755,
    "lng": 82.1054,
    "population": 3738835,
    "isCoastal": false
  },
  {
    "id": "DST-IND-301",
    "name": "Tikamgarh",
    "state": "Madhya Pradesh",
    "lat": 25.141,
    "lng": 78.8936,
    "population": 4417749,
    "isCoastal": false
  },
  {
    "id": "DST-IND-302",
    "name": "Ujjain",
    "state": "Madhya Pradesh",
    "lat": 23.3193,
    "lng": 75.8038,
    "population": 654983,
    "isCoastal": false
  },
  {
    "id": "DST-IND-303",
    "name": "Umaria",
    "state": "Madhya Pradesh",
    "lat": 23.596,
    "lng": 80.9088,
    "population": 4190088,
    "isCoastal": false
  },
  {
    "id": "DST-IND-304",
    "name": "Vidisha",
    "state": "Madhya Pradesh",
    "lat": 23.8284,
    "lng": 77.9014,
    "population": 3650280,
    "isCoastal": false
  },
  {
    "id": "DST-IND-305",
    "name": "West Nimar",
    "state": "Madhya Pradesh",
    "lat": 22.0271,
    "lng": 75.8734,
    "population": 1401530,
    "isCoastal": false
  },
  {
    "id": "DST-IND-306",
    "name": "Ahmednagar",
    "state": "Maharashtra",
    "lat": 19.2176,
    "lng": 74.6922,
    "population": 2797990,
    "isCoastal": false
  },
  {
    "id": "DST-IND-307",
    "name": "Akola",
    "state": "Maharashtra",
    "lat": 20.7463,
    "lng": 77.1212,
    "population": 673433,
    "isCoastal": false
  },
  {
    "id": "DST-IND-308",
    "name": "Amravati",
    "state": "Maharashtra",
    "lat": 21.1652,
    "lng": 77.6758,
    "population": 942853,
    "isCoastal": false
  },
  {
    "id": "DST-IND-309",
    "name": "Aurangabad",
    "state": "Maharashtra",
    "lat": 20.0979,
    "lng": 75.3207,
    "population": 2147272,
    "isCoastal": false
  },
  {
    "id": "DST-IND-310",
    "name": "Bhandara",
    "state": "Maharashtra",
    "lat": 21.3187,
    "lng": 80.4291,
    "population": 3204200,
    "isCoastal": true
  },
  {
    "id": "DST-IND-311",
    "name": "Bid",
    "state": "Maharashtra",
    "lat": 18.9524,
    "lng": 75.6932,
    "population": 3357331,
    "isCoastal": false
  },
  {
    "id": "DST-IND-312",
    "name": "Buldana",
    "state": "Maharashtra",
    "lat": 20.5668,
    "lng": 76.3902,
    "population": 1431879,
    "isCoastal": false
  },
  {
    "id": "DST-IND-313",
    "name": "Chandrapur",
    "state": "Maharashtra",
    "lat": 20.0956,
    "lng": 79.3156,
    "population": 2095019,
    "isCoastal": false
  },
  {
    "id": "DST-IND-314",
    "name": "Dhule",
    "state": "Maharashtra",
    "lat": 21.274,
    "lng": 74.5872,
    "population": 3520010,
    "isCoastal": false
  },
  {
    "id": "DST-IND-315",
    "name": "Garhchiroli",
    "state": "Maharashtra",
    "lat": 19.7955,
    "lng": 80.3097,
    "population": 3321541,
    "isCoastal": true
  },
  {
    "id": "DST-IND-316",
    "name": "Gondiya",
    "state": "Maharashtra",
    "lat": 21.225,
    "lng": 80.1752,
    "population": 2636133,
    "isCoastal": true
  },
  {
    "id": "DST-IND-317",
    "name": "Greater Bombay",
    "state": "Maharashtra",
    "lat": 19.0848,
    "lng": 72.8429,
    "population": 3737344,
    "isCoastal": true
  },
  {
    "id": "DST-IND-318",
    "name": "Hingoli",
    "state": "Maharashtra",
    "lat": 19.5953,
    "lng": 77.0924,
    "population": 4182150,
    "isCoastal": false
  },
  {
    "id": "DST-IND-319",
    "name": "Jalgaon",
    "state": "Maharashtra",
    "lat": 20.8829,
    "lng": 75.5514,
    "population": 4371113,
    "isCoastal": false
  },
  {
    "id": "DST-IND-320",
    "name": "Jalna",
    "state": "Maharashtra",
    "lat": 19.9846,
    "lng": 75.9847,
    "population": 4284228,
    "isCoastal": false
  },
  {
    "id": "DST-IND-321",
    "name": "Kolhapur",
    "state": "Maharashtra",
    "lat": 16.4488,
    "lng": 74.129,
    "population": 3135714,
    "isCoastal": true
  },
  {
    "id": "DST-IND-322",
    "name": "Latur",
    "state": "Maharashtra",
    "lat": 18.3487,
    "lng": 76.7581,
    "population": 3972583,
    "isCoastal": false
  },
  {
    "id": "DST-IND-323",
    "name": "Nagpur",
    "state": "Maharashtra",
    "lat": 21.1966,
    "lng": 79.0217,
    "population": 2632044,
    "isCoastal": false
  },
  {
    "id": "DST-IND-324",
    "name": "Nanded",
    "state": "Maharashtra",
    "lat": 19.2093,
    "lng": 77.6829,
    "population": 3313317,
    "isCoastal": false
  },
  {
    "id": "DST-IND-325",
    "name": "Nandurbar",
    "state": "Maharashtra",
    "lat": 21.5232,
    "lng": 74.3264,
    "population": 686898,
    "isCoastal": true
  },
  {
    "id": "DST-IND-326",
    "name": "Nashik",
    "state": "Maharashtra",
    "lat": 20.2669,
    "lng": 74.0382,
    "population": 1661432,
    "isCoastal": true
  },
  {
    "id": "DST-IND-327",
    "name": "Osmanabad",
    "state": "Maharashtra",
    "lat": 18.1946,
    "lng": 75.995,
    "population": 2910411,
    "isCoastal": false
  },
  {
    "id": "DST-IND-328",
    "name": "Parbhani",
    "state": "Maharashtra",
    "lat": 19.3103,
    "lng": 76.7016,
    "population": 928396,
    "isCoastal": false
  },
  {
    "id": "DST-IND-329",
    "name": "Pune",
    "state": "Maharashtra",
    "lat": 18.517,
    "lng": 74.1292,
    "population": 1243141,
    "isCoastal": true
  },
  {
    "id": "DST-IND-330",
    "name": "Raigarh",
    "state": "Maharashtra",
    "lat": 18.4333,
    "lng": 73.0132,
    "population": 1075248,
    "isCoastal": true
  },
  {
    "id": "DST-IND-331",
    "name": "Ratnagiri",
    "state": "Maharashtra",
    "lat": 17.2075,
    "lng": 73.258,
    "population": 4451427,
    "isCoastal": true
  },
  {
    "id": "DST-IND-332",
    "name": "Sangli",
    "state": "Maharashtra",
    "lat": 17.1549,
    "lng": 74.7071,
    "population": 1501324,
    "isCoastal": false
  },
  {
    "id": "DST-IND-333",
    "name": "Satara",
    "state": "Maharashtra",
    "lat": 17.6738,
    "lng": 74.1805,
    "population": 2506906,
    "isCoastal": true
  },
  {
    "id": "DST-IND-334",
    "name": "Sindhudurg",
    "state": "Maharashtra",
    "lat": 16.1768,
    "lng": 73.515,
    "population": 1662225,
    "isCoastal": true
  },
  {
    "id": "DST-IND-335",
    "name": "Solapur",
    "state": "Maharashtra",
    "lat": 17.8374,
    "lng": 75.4239,
    "population": 4182083,
    "isCoastal": false
  },
  {
    "id": "DST-IND-336",
    "name": "Thane",
    "state": "Maharashtra",
    "lat": 19.7048,
    "lng": 72.8006,
    "population": 2724564,
    "isCoastal": true
  },
  {
    "id": "DST-IND-337",
    "name": "Wardha",
    "state": "Maharashtra",
    "lat": 20.8074,
    "lng": 78.5726,
    "population": 3790157,
    "isCoastal": false
  },
  {
    "id": "DST-IND-338",
    "name": "Washim",
    "state": "Maharashtra",
    "lat": 20.2823,
    "lng": 77.255,
    "population": 1615984,
    "isCoastal": false
  },
  {
    "id": "DST-IND-339",
    "name": "Yavatmal",
    "state": "Maharashtra",
    "lat": 20.0426,
    "lng": 78.0533,
    "population": 1982694,
    "isCoastal": false
  },
  {
    "id": "DST-IND-340",
    "name": "Bishnupur",
    "state": "Manipur",
    "lat": 24.5071,
    "lng": 93.8246,
    "population": 3182654,
    "isCoastal": false
  },
  {
    "id": "DST-IND-341",
    "name": "Chandel",
    "state": "Manipur",
    "lat": 24.2636,
    "lng": 94.0944,
    "population": 2294068,
    "isCoastal": false
  },
  {
    "id": "DST-IND-342",
    "name": "Churachandpur",
    "state": "Manipur",
    "lat": 24.3031,
    "lng": 93.3867,
    "population": 4080747,
    "isCoastal": false
  },
  {
    "id": "DST-IND-343",
    "name": "East Imphal",
    "state": "Manipur",
    "lat": 24.8736,
    "lng": 94.0309,
    "population": 654315,
    "isCoastal": false
  },
  {
    "id": "DST-IND-344",
    "name": "Senapati",
    "state": "Manipur",
    "lat": 25.0847,
    "lng": 94.0337,
    "population": 3301985,
    "isCoastal": false
  },
  {
    "id": "DST-IND-345",
    "name": "Tamenglong",
    "state": "Manipur",
    "lat": 24.9831,
    "lng": 93.4945,
    "population": 4169082,
    "isCoastal": false
  },
  {
    "id": "DST-IND-346",
    "name": "Thoubal",
    "state": "Manipur",
    "lat": 24.5454,
    "lng": 93.9796,
    "population": 3050583,
    "isCoastal": false
  },
  {
    "id": "DST-IND-347",
    "name": "Ukhrul",
    "state": "Manipur",
    "lat": 25.059,
    "lng": 94.4413,
    "population": 2519827,
    "isCoastal": false
  },
  {
    "id": "DST-IND-348",
    "name": "West Imphal",
    "state": "Manipur",
    "lat": 24.794,
    "lng": 93.8886,
    "population": 1594367,
    "isCoastal": false
  },
  {
    "id": "DST-IND-349",
    "name": "East Garo Hills",
    "state": "Meghalaya",
    "lat": 25.8273,
    "lng": 90.6468,
    "population": 1420930,
    "isCoastal": false
  },
  {
    "id": "DST-IND-350",
    "name": "East Khasi Hills",
    "state": "Meghalaya",
    "lat": 25.3038,
    "lng": 91.7592,
    "population": 4059554,
    "isCoastal": false
  },
  {
    "id": "DST-IND-351",
    "name": "Jaintia Hills",
    "state": "Meghalaya",
    "lat": 25.3396,
    "lng": 92.3761,
    "population": 4317902,
    "isCoastal": false
  },
  {
    "id": "DST-IND-352",
    "name": "Ri-Bhoi",
    "state": "Meghalaya",
    "lat": 25.8971,
    "lng": 91.8452,
    "population": 793223,
    "isCoastal": false
  },
  {
    "id": "DST-IND-353",
    "name": "South Garo Hills",
    "state": "Meghalaya",
    "lat": 25.2406,
    "lng": 90.6456,
    "population": 1315246,
    "isCoastal": false
  },
  {
    "id": "DST-IND-354",
    "name": "West Garo Hills",
    "state": "Meghalaya",
    "lat": 25.4953,
    "lng": 90.0371,
    "population": 640644,
    "isCoastal": false
  },
  {
    "id": "DST-IND-355",
    "name": "West Khasi Hills",
    "state": "Meghalaya",
    "lat": 25.5009,
    "lng": 91.2536,
    "population": 2684520,
    "isCoastal": false
  },
  {
    "id": "DST-IND-356",
    "name": "Aizawl",
    "state": "Mizoram",
    "lat": 23.9078,
    "lng": 92.8536,
    "population": 3908006,
    "isCoastal": false
  },
  {
    "id": "DST-IND-357",
    "name": "Champhai",
    "state": "Mizoram",
    "lat": 23.5417,
    "lng": 93.2422,
    "population": 3959648,
    "isCoastal": false
  },
  {
    "id": "DST-IND-358",
    "name": "Kolasib",
    "state": "Mizoram",
    "lat": 24.202,
    "lng": 92.7347,
    "population": 1879289,
    "isCoastal": false
  },
  {
    "id": "DST-IND-359",
    "name": "Lawngtlai",
    "state": "Mizoram",
    "lat": 22.361,
    "lng": 92.6696,
    "population": 2140369,
    "isCoastal": false
  },
  {
    "id": "DST-IND-360",
    "name": "Lunglei",
    "state": "Mizoram",
    "lat": 23.009,
    "lng": 92.6357,
    "population": 3293010,
    "isCoastal": false
  },
  {
    "id": "DST-IND-361",
    "name": "Mamit",
    "state": "Mizoram",
    "lat": 23.7428,
    "lng": 92.4334,
    "population": 1479574,
    "isCoastal": false
  },
  {
    "id": "DST-IND-362",
    "name": "Saiha",
    "state": "Mizoram",
    "lat": 22.3575,
    "lng": 93.0283,
    "population": 629802,
    "isCoastal": false
  },
  {
    "id": "DST-IND-363",
    "name": "Serchhip",
    "state": "Mizoram",
    "lat": 23.2639,
    "lng": 92.9142,
    "population": 3842483,
    "isCoastal": false
  },
  {
    "id": "DST-IND-364",
    "name": "Dimapur",
    "state": "Nagaland",
    "lat": 25.8142,
    "lng": 93.7507,
    "population": 1406364,
    "isCoastal": false
  },
  {
    "id": "DST-IND-365",
    "name": "Kohima",
    "state": "Nagaland",
    "lat": 25.6031,
    "lng": 93.786,
    "population": 1545795,
    "isCoastal": false
  },
  {
    "id": "DST-IND-366",
    "name": "Mokokchung",
    "state": "Nagaland",
    "lat": 26.4789,
    "lng": 94.5224,
    "population": 1850059,
    "isCoastal": false
  },
  {
    "id": "DST-IND-367",
    "name": "Mon",
    "state": "Nagaland",
    "lat": 26.6921,
    "lng": 95.0307,
    "population": 597987,
    "isCoastal": false
  },
  {
    "id": "DST-IND-368",
    "name": "Phek",
    "state": "Nagaland",
    "lat": 25.6327,
    "lng": 94.5681,
    "population": 2783669,
    "isCoastal": false
  },
  {
    "id": "DST-IND-369",
    "name": "Tuensang",
    "state": "Nagaland",
    "lat": 26.211,
    "lng": 94.8581,
    "population": 2183024,
    "isCoastal": false
  },
  {
    "id": "DST-IND-370",
    "name": "Wokha",
    "state": "Nagaland",
    "lat": 26.2026,
    "lng": 94.1991,
    "population": 1266593,
    "isCoastal": false
  },
  {
    "id": "DST-IND-371",
    "name": "Zunheboto",
    "state": "Nagaland",
    "lat": 26.0282,
    "lng": 94.5003,
    "population": 713836,
    "isCoastal": false
  },
  {
    "id": "DST-IND-372",
    "name": "Angul",
    "state": "Orissa",
    "lat": 21.1207,
    "lng": 84.9984,
    "population": 1825457,
    "isCoastal": false
  },
  {
    "id": "DST-IND-373",
    "name": "Baleshwar",
    "state": "Orissa",
    "lat": 21.4853,
    "lng": 87.0803,
    "population": 4146790,
    "isCoastal": false
  },
  {
    "id": "DST-IND-374",
    "name": "Baragarh",
    "state": "Orissa",
    "lat": 21.1324,
    "lng": 83.2644,
    "population": 3450448,
    "isCoastal": false
  },
  {
    "id": "DST-IND-375",
    "name": "Bhadrak",
    "state": "Orissa",
    "lat": 20.9614,
    "lng": 86.8041,
    "population": 1843732,
    "isCoastal": false
  },
  {
    "id": "DST-IND-376",
    "name": "Bolangir",
    "state": "Orissa",
    "lat": 20.6163,
    "lng": 83.2152,
    "population": 1014655,
    "isCoastal": false
  },
  {
    "id": "DST-IND-377",
    "name": "Boudh",
    "state": "Orissa",
    "lat": 20.5832,
    "lng": 84.1236,
    "population": 3675593,
    "isCoastal": false
  },
  {
    "id": "DST-IND-378",
    "name": "Cuttack",
    "state": "Orissa",
    "lat": 20.4076,
    "lng": 85.7777,
    "population": 3656057,
    "isCoastal": false
  },
  {
    "id": "DST-IND-379",
    "name": "Deogarh",
    "state": "Orissa",
    "lat": 21.4315,
    "lng": 84.8145,
    "population": 4259860,
    "isCoastal": false
  },
  {
    "id": "DST-IND-380",
    "name": "Dhenkanal",
    "state": "Orissa",
    "lat": 20.7989,
    "lng": 85.5323,
    "population": 4397873,
    "isCoastal": false
  },
  {
    "id": "DST-IND-381",
    "name": "Gajapati",
    "state": "Orissa",
    "lat": 19.1211,
    "lng": 84.1402,
    "population": 2716584,
    "isCoastal": false
  },
  {
    "id": "DST-IND-382",
    "name": "Ganjam",
    "state": "Orissa",
    "lat": 19.2935,
    "lng": 84.8102,
    "population": 3357215,
    "isCoastal": false
  },
  {
    "id": "DST-IND-383",
    "name": "Jagatsinghpur",
    "state": "Orissa",
    "lat": 20.1401,
    "lng": 86.463,
    "population": 2294297,
    "isCoastal": false
  },
  {
    "id": "DST-IND-384",
    "name": "Jajpur",
    "state": "Orissa",
    "lat": 20.8532,
    "lng": 86.1528,
    "population": 4474527,
    "isCoastal": false
  },
  {
    "id": "DST-IND-385",
    "name": "Jharsuguda",
    "state": "Orissa",
    "lat": 21.8271,
    "lng": 83.9358,
    "population": 627421,
    "isCoastal": false
  },
  {
    "id": "DST-IND-386",
    "name": "Kalahandi",
    "state": "Orissa",
    "lat": 19.7843,
    "lng": 83.1124,
    "population": 752260,
    "isCoastal": false
  },
  {
    "id": "DST-IND-387",
    "name": "Kandhamal",
    "state": "Orissa",
    "lat": 20.0929,
    "lng": 84.0222,
    "population": 855531,
    "isCoastal": false
  },
  {
    "id": "DST-IND-388",
    "name": "Kendrapara",
    "state": "Orissa",
    "lat": 20.5615,
    "lng": 86.7932,
    "population": 4059381,
    "isCoastal": false
  },
  {
    "id": "DST-IND-389",
    "name": "Keonjhar",
    "state": "Orissa",
    "lat": 21.4923,
    "lng": 85.7628,
    "population": 1513188,
    "isCoastal": false
  },
  {
    "id": "DST-IND-390",
    "name": "Khordha",
    "state": "Orissa",
    "lat": 20.0542,
    "lng": 85.5223,
    "population": 504684,
    "isCoastal": false
  },
  {
    "id": "DST-IND-391",
    "name": "Koraput",
    "state": "Orissa",
    "lat": 18.8263,
    "lng": 82.8128,
    "population": 2025945,
    "isCoastal": false
  },
  {
    "id": "DST-IND-392",
    "name": "Malkangiri",
    "state": "Orissa",
    "lat": 18.2523,
    "lng": 81.9829,
    "population": 526839,
    "isCoastal": false
  },
  {
    "id": "DST-IND-393",
    "name": "Mayurbhanj",
    "state": "Orissa",
    "lat": 21.8976,
    "lng": 86.403,
    "population": 2677838,
    "isCoastal": false
  },
  {
    "id": "DST-IND-394",
    "name": "Nabarangpur",
    "state": "Orissa",
    "lat": 19.513,
    "lng": 82.4204,
    "population": 1642346,
    "isCoastal": false
  },
  {
    "id": "DST-IND-395",
    "name": "Nayagarh",
    "state": "Orissa",
    "lat": 20.1929,
    "lng": 85.0561,
    "population": 3039027,
    "isCoastal": false
  },
  {
    "id": "DST-IND-396",
    "name": "Nuapada",
    "state": "Orissa",
    "lat": 20.4713,
    "lng": 82.5915,
    "population": 1459347,
    "isCoastal": false
  },
  {
    "id": "DST-IND-397",
    "name": "Puri",
    "state": "Orissa",
    "lat": 19.808,
    "lng": 85.8005,
    "population": 3687841,
    "isCoastal": false
  },
  {
    "id": "DST-IND-398",
    "name": "Rayagada",
    "state": "Orissa",
    "lat": 19.2928,
    "lng": 83.4586,
    "population": 1047682,
    "isCoastal": false
  },
  {
    "id": "DST-IND-399",
    "name": "Sambalpur",
    "state": "Orissa",
    "lat": 21.5158,
    "lng": 84.3496,
    "population": 4034748,
    "isCoastal": false
  },
  {
    "id": "DST-IND-400",
    "name": "Sonepur",
    "state": "Orissa",
    "lat": 20.8908,
    "lng": 83.7685,
    "population": 2056336,
    "isCoastal": false
  },
  {
    "id": "DST-IND-401",
    "name": "Sundargarh",
    "state": "Orissa",
    "lat": 22.0635,
    "lng": 84.5052,
    "population": 2798543,
    "isCoastal": false
  },
  {
    "id": "DST-IND-402",
    "name": "Karaikal",
    "state": "Puducherry",
    "lat": 10.88,
    "lng": 79.8223,
    "population": 653490,
    "isCoastal": true
  },
  {
    "id": "DST-IND-403",
    "name": "Mahe",
    "state": "Puducherry",
    "lat": 12.0064,
    "lng": 75.2827,
    "population": 4029853,
    "isCoastal": false
  },
  {
    "id": "DST-IND-404",
    "name": "Puducherry",
    "state": "Puducherry",
    "lat": 11.8878,
    "lng": 79.7971,
    "population": 1635863,
    "isCoastal": true
  },
  {
    "id": "DST-IND-405",
    "name": "Yanam",
    "state": "Puducherry",
    "lat": 16.7098,
    "lng": 82.2599,
    "population": 1816686,
    "isCoastal": true
  },
  {
    "id": "DST-IND-406",
    "name": "Amritsar",
    "state": "Punjab",
    "lat": 31.5487,
    "lng": 74.7988,
    "population": 1954401,
    "isCoastal": false
  },
  {
    "id": "DST-IND-407",
    "name": "Bathinda",
    "state": "Punjab",
    "lat": 30.1905,
    "lng": 75.0569,
    "population": 2223128,
    "isCoastal": false
  },
  {
    "id": "DST-IND-408",
    "name": "Faridkot",
    "state": "Punjab",
    "lat": 30.5912,
    "lng": 74.7975,
    "population": 3506232,
    "isCoastal": false
  },
  {
    "id": "DST-IND-409",
    "name": "Fatehgarh Sahib",
    "state": "Punjab",
    "lat": 30.6429,
    "lng": 76.3621,
    "population": 4013296,
    "isCoastal": false
  },
  {
    "id": "DST-IND-410",
    "name": "Firozpur",
    "state": "Punjab",
    "lat": 30.6341,
    "lng": 74.4025,
    "population": 2439559,
    "isCoastal": false
  },
  {
    "id": "DST-IND-411",
    "name": "Gurdaspur",
    "state": "Punjab",
    "lat": 32.0428,
    "lng": 75.3204,
    "population": 2996623,
    "isCoastal": false
  },
  {
    "id": "DST-IND-412",
    "name": "Hoshiarpur",
    "state": "Punjab",
    "lat": 31.5516,
    "lng": 75.847,
    "population": 1613083,
    "isCoastal": false
  },
  {
    "id": "DST-IND-413",
    "name": "Jalandhar",
    "state": "Punjab",
    "lat": 31.2503,
    "lng": 75.544,
    "population": 2621952,
    "isCoastal": false
  },
  {
    "id": "DST-IND-414",
    "name": "Kapurthala",
    "state": "Punjab",
    "lat": 31.3659,
    "lng": 75.3082,
    "population": 1676553,
    "isCoastal": false
  },
  {
    "id": "DST-IND-415",
    "name": "Ludhiana",
    "state": "Punjab",
    "lat": 30.766,
    "lng": 75.8311,
    "population": 626701,
    "isCoastal": false
  },
  {
    "id": "DST-IND-416",
    "name": "Mansa",
    "state": "Punjab",
    "lat": 29.9195,
    "lng": 75.4305,
    "population": 1892751,
    "isCoastal": false
  },
  {
    "id": "DST-IND-417",
    "name": "Moga",
    "state": "Punjab",
    "lat": 30.7565,
    "lng": 75.1601,
    "population": 4133286,
    "isCoastal": false
  },
  {
    "id": "DST-IND-418",
    "name": "Muktsar",
    "state": "Punjab",
    "lat": 30.3124,
    "lng": 74.5519,
    "population": 4372357,
    "isCoastal": false
  },
  {
    "id": "DST-IND-419",
    "name": "Nawan Shehar",
    "state": "Punjab",
    "lat": 31.1334,
    "lng": 76.1019,
    "population": 3302493,
    "isCoastal": false
  },
  {
    "id": "DST-IND-420",
    "name": "Patiala",
    "state": "Punjab",
    "lat": 30.2145,
    "lng": 76.2751,
    "population": 1786238,
    "isCoastal": false
  },
  {
    "id": "DST-IND-421",
    "name": "Rupnagar",
    "state": "Punjab",
    "lat": 30.9109,
    "lng": 76.5374,
    "population": 4353554,
    "isCoastal": false
  },
  {
    "id": "DST-IND-422",
    "name": "Sangrur",
    "state": "Punjab",
    "lat": 30.185,
    "lng": 75.8944,
    "population": 4349907,
    "isCoastal": false
  },
  {
    "id": "DST-IND-423",
    "name": "Ajmer",
    "state": "Rajasthan",
    "lat": 26.2455,
    "lng": 74.7729,
    "population": 1642839,
    "isCoastal": false
  },
  {
    "id": "DST-IND-424",
    "name": "Alwar",
    "state": "Rajasthan",
    "lat": 27.5527,
    "lng": 76.6536,
    "population": 1382887,
    "isCoastal": false
  },
  {
    "id": "DST-IND-425",
    "name": "Banswara",
    "state": "Rajasthan",
    "lat": 23.4536,
    "lng": 74.4425,
    "population": 1068474,
    "isCoastal": false
  },
  {
    "id": "DST-IND-426",
    "name": "Baran",
    "state": "Rajasthan",
    "lat": 24.9802,
    "lng": 76.8621,
    "population": 2345119,
    "isCoastal": false
  },
  {
    "id": "DST-IND-427",
    "name": "Barmer",
    "state": "Rajasthan",
    "lat": 25.7707,
    "lng": 71.503,
    "population": 2037919,
    "isCoastal": false
  },
  {
    "id": "DST-IND-428",
    "name": "Bharatpur",
    "state": "Rajasthan",
    "lat": 27.3241,
    "lng": 77.2175,
    "population": 1372329,
    "isCoastal": false
  },
  {
    "id": "DST-IND-429",
    "name": "Bhilwara",
    "state": "Rajasthan",
    "lat": 25.4512,
    "lng": 74.6395,
    "population": 3223305,
    "isCoastal": false
  },
  {
    "id": "DST-IND-430",
    "name": "Bikaner",
    "state": "Rajasthan",
    "lat": 28.1249,
    "lng": 73.2694,
    "population": 2888256,
    "isCoastal": false
  },
  {
    "id": "DST-IND-431",
    "name": "Bundi",
    "state": "Rajasthan",
    "lat": 25.4858,
    "lng": 75.7998,
    "population": 4270695,
    "isCoastal": false
  },
  {
    "id": "DST-IND-432",
    "name": "Chittaurgarh",
    "state": "Rajasthan",
    "lat": 24.5746,
    "lng": 74.6651,
    "population": 4134478,
    "isCoastal": false
  },
  {
    "id": "DST-IND-433",
    "name": "Churu",
    "state": "Rajasthan",
    "lat": 28.2933,
    "lng": 74.6585,
    "population": 2235153,
    "isCoastal": false
  },
  {
    "id": "DST-IND-434",
    "name": "Dausa",
    "state": "Rajasthan",
    "lat": 26.9123,
    "lng": 76.5734,
    "population": 4171278,
    "isCoastal": false
  },
  {
    "id": "DST-IND-435",
    "name": "Dhaulpur",
    "state": "Rajasthan",
    "lat": 26.724,
    "lng": 77.7448,
    "population": 2159063,
    "isCoastal": false
  },
  {
    "id": "DST-IND-436",
    "name": "Dungarpur",
    "state": "Rajasthan",
    "lat": 23.751,
    "lng": 73.8477,
    "population": 1609422,
    "isCoastal": false
  },
  {
    "id": "DST-IND-437",
    "name": "Ganganagar",
    "state": "Rajasthan",
    "lat": 29.2568,
    "lng": 73.5619,
    "population": 2732703,
    "isCoastal": false
  },
  {
    "id": "DST-IND-438",
    "name": "Hanumangarh",
    "state": "Rajasthan",
    "lat": 29.1813,
    "lng": 74.7463,
    "population": 1455657,
    "isCoastal": false
  },
  {
    "id": "DST-IND-439",
    "name": "Jaipur",
    "state": "Rajasthan",
    "lat": 27.0335,
    "lng": 75.7712,
    "population": 1277205,
    "isCoastal": false
  },
  {
    "id": "DST-IND-440",
    "name": "Jaisalmer",
    "state": "Rajasthan",
    "lat": 26.869,
    "lng": 71.1837,
    "population": 1553205,
    "isCoastal": false
  },
  {
    "id": "DST-IND-441",
    "name": "Jalor",
    "state": "Rajasthan",
    "lat": 25.0758,
    "lng": 72.1865,
    "population": 3940708,
    "isCoastal": false
  },
  {
    "id": "DST-IND-442",
    "name": "Jhalawar",
    "state": "Rajasthan",
    "lat": 24.2473,
    "lng": 76.1124,
    "population": 2139958,
    "isCoastal": false
  },
  {
    "id": "DST-IND-443",
    "name": "Jhunjhunun",
    "state": "Rajasthan",
    "lat": 28.1352,
    "lng": 75.5284,
    "population": 2768197,
    "isCoastal": false
  },
  {
    "id": "DST-IND-444",
    "name": "Jodhpur",
    "state": "Rajasthan",
    "lat": 26.6785,
    "lng": 73.0045,
    "population": 4485880,
    "isCoastal": false
  },
  {
    "id": "DST-IND-445",
    "name": "Karauli",
    "state": "Rajasthan",
    "lat": 26.519,
    "lng": 76.9608,
    "population": 3548844,
    "isCoastal": false
  },
  {
    "id": "DST-IND-446",
    "name": "Kota",
    "state": "Rajasthan",
    "lat": 25.1757,
    "lng": 76.1862,
    "population": 1689016,
    "isCoastal": false
  },
  {
    "id": "DST-IND-447",
    "name": "Nagaur",
    "state": "Rajasthan",
    "lat": 27.0786,
    "lng": 74.1422,
    "population": 3692083,
    "isCoastal": false
  },
  {
    "id": "DST-IND-448",
    "name": "Pali",
    "state": "Rajasthan",
    "lat": 25.8049,
    "lng": 73.5529,
    "population": 2580362,
    "isCoastal": false
  },
  {
    "id": "DST-IND-449",
    "name": "Rajsamand",
    "state": "Rajasthan",
    "lat": 25.2489,
    "lng": 73.9657,
    "population": 3295520,
    "isCoastal": false
  },
  {
    "id": "DST-IND-450",
    "name": "Sawai Madhopur",
    "state": "Rajasthan",
    "lat": 26.2511,
    "lng": 76.4219,
    "population": 3038021,
    "isCoastal": false
  },
  {
    "id": "DST-IND-451",
    "name": "Sikar",
    "state": "Rajasthan",
    "lat": 27.6464,
    "lng": 75.2932,
    "population": 1345287,
    "isCoastal": false
  },
  {
    "id": "DST-IND-452",
    "name": "Sirohi",
    "state": "Rajasthan",
    "lat": 24.7977,
    "lng": 72.7531,
    "population": 4145023,
    "isCoastal": false
  },
  {
    "id": "DST-IND-453",
    "name": "Tonk",
    "state": "Rajasthan",
    "lat": 26.1539,
    "lng": 75.7919,
    "population": 3957302,
    "isCoastal": false
  },
  {
    "id": "DST-IND-454",
    "name": "Udaipur",
    "state": "Rajasthan",
    "lat": 24.4408,
    "lng": 73.8403,
    "population": 1088320,
    "isCoastal": false
  },
  {
    "id": "DST-IND-455",
    "name": "East",
    "state": "Sikkim",
    "lat": 27.296,
    "lng": 88.7491,
    "population": 2229259,
    "isCoastal": false
  },
  {
    "id": "DST-IND-456",
    "name": "North Sikkim",
    "state": "Sikkim",
    "lat": 27.8138,
    "lng": 88.542,
    "population": 2258331,
    "isCoastal": false
  },
  {
    "id": "DST-IND-457",
    "name": "South Sikkim",
    "state": "Sikkim",
    "lat": 27.278,
    "lng": 88.3754,
    "population": 4457142,
    "isCoastal": false
  },
  {
    "id": "DST-IND-458",
    "name": "West Sikkim",
    "state": "Sikkim",
    "lat": 27.336,
    "lng": 88.158,
    "population": 2775707,
    "isCoastal": false
  },
  {
    "id": "DST-IND-459",
    "name": "Ariyalur",
    "state": "Tamil Nadu",
    "lat": 11.1905,
    "lng": 79.2225,
    "population": 2396262,
    "isCoastal": true
  },
  {
    "id": "DST-IND-460",
    "name": "Chennai",
    "state": "Tamil Nadu",
    "lat": 13.0581,
    "lng": 80.2814,
    "population": 1496132,
    "isCoastal": true
  },
  {
    "id": "DST-IND-461",
    "name": "Coimbatore",
    "state": "Tamil Nadu",
    "lat": 10.8714,
    "lng": 77.0762,
    "population": 1285961,
    "isCoastal": true
  },
  {
    "id": "DST-IND-462",
    "name": "Cuddalore",
    "state": "Tamil Nadu",
    "lat": 11.5759,
    "lng": 79.63,
    "population": 2974944,
    "isCoastal": true
  },
  {
    "id": "DST-IND-463",
    "name": "Dharmapuri",
    "state": "Tamil Nadu",
    "lat": 12.3001,
    "lng": 78.1151,
    "population": 4426182,
    "isCoastal": false
  },
  {
    "id": "DST-IND-464",
    "name": "Dindigul",
    "state": "Tamil Nadu",
    "lat": 10.3778,
    "lng": 77.7801,
    "population": 1016326,
    "isCoastal": true
  },
  {
    "id": "DST-IND-465",
    "name": "Erode",
    "state": "Tamil Nadu",
    "lat": 11.267,
    "lng": 77.4203,
    "population": 1245934,
    "isCoastal": true
  },
  {
    "id": "DST-IND-466",
    "name": "Kancheepuram",
    "state": "Tamil Nadu",
    "lat": 12.5019,
    "lng": 80.0905,
    "population": 4445226,
    "isCoastal": true
  },
  {
    "id": "DST-IND-467",
    "name": "Kanniyakumari",
    "state": "Tamil Nadu",
    "lat": 8.1847,
    "lng": 77.3177,
    "population": 3538143,
    "isCoastal": true
  },
  {
    "id": "DST-IND-468",
    "name": "Karur",
    "state": "Tamil Nadu",
    "lat": 10.7953,
    "lng": 78.0875,
    "population": 2592060,
    "isCoastal": true
  },
  {
    "id": "DST-IND-469",
    "name": "Madurai",
    "state": "Tamil Nadu",
    "lat": 9.9043,
    "lng": 78.0137,
    "population": 4144533,
    "isCoastal": true
  },
  {
    "id": "DST-IND-470",
    "name": "Nagapattinam",
    "state": "Tamil Nadu",
    "lat": 10.4182,
    "lng": 79.7903,
    "population": 791708,
    "isCoastal": true
  },
  {
    "id": "DST-IND-471",
    "name": "Namakkal",
    "state": "Tamil Nadu",
    "lat": 11.3377,
    "lng": 78.1462,
    "population": 1674183,
    "isCoastal": true
  },
  {
    "id": "DST-IND-472",
    "name": "Nilgiris",
    "state": "Tamil Nadu",
    "lat": 11.4424,
    "lng": 76.6615,
    "population": 3224056,
    "isCoastal": true
  },
  {
    "id": "DST-IND-473",
    "name": "Perambalur",
    "state": "Tamil Nadu",
    "lat": 11.2601,
    "lng": 78.8603,
    "population": 3333892,
    "isCoastal": true
  },
  {
    "id": "DST-IND-474",
    "name": "Pudukkottai",
    "state": "Tamil Nadu",
    "lat": 10.1305,
    "lng": 79.0544,
    "population": 1681626,
    "isCoastal": true
  },
  {
    "id": "DST-IND-475",
    "name": "Ramanathapuram",
    "state": "Tamil Nadu",
    "lat": 9.3813,
    "lng": 78.8391,
    "population": 2928217,
    "isCoastal": true
  },
  {
    "id": "DST-IND-476",
    "name": "Salem",
    "state": "Tamil Nadu",
    "lat": 11.6293,
    "lng": 78.2478,
    "population": 1666916,
    "isCoastal": true
  },
  {
    "id": "DST-IND-477",
    "name": "Sivaganga",
    "state": "Tamil Nadu",
    "lat": 9.9603,
    "lng": 78.5654,
    "population": 4322477,
    "isCoastal": true
  },
  {
    "id": "DST-IND-478",
    "name": "Thanjavur",
    "state": "Tamil Nadu",
    "lat": 10.388,
    "lng": 79.3186,
    "population": 4171927,
    "isCoastal": true
  },
  {
    "id": "DST-IND-479",
    "name": "Theni",
    "state": "Tamil Nadu",
    "lat": 9.9241,
    "lng": 77.4346,
    "population": 1597866,
    "isCoastal": true
  },
  {
    "id": "DST-IND-480",
    "name": "Thiruvallur",
    "state": "Tamil Nadu",
    "lat": 13.2737,
    "lng": 80.1956,
    "population": 2496546,
    "isCoastal": true
  },
  {
    "id": "DST-IND-481",
    "name": "Thiruvarur",
    "state": "Tamil Nadu",
    "lat": 10.3852,
    "lng": 79.5851,
    "population": 3800609,
    "isCoastal": true
  },
  {
    "id": "DST-IND-482",
    "name": "Thoothukudi",
    "state": "Tamil Nadu",
    "lat": 8.7247,
    "lng": 78.1379,
    "population": 4431495,
    "isCoastal": true
  },
  {
    "id": "DST-IND-483",
    "name": "Tiruchchirappalli",
    "state": "Tamil Nadu",
    "lat": 10.8378,
    "lng": 78.5473,
    "population": 3742869,
    "isCoastal": true
  },
  {
    "id": "DST-IND-484",
    "name": "Tirunelveli Kattabo",
    "state": "Tamil Nadu",
    "lat": 8.4577,
    "lng": 77.705,
    "population": 1057924,
    "isCoastal": true
  },
  {
    "id": "DST-IND-485",
    "name": "Tiruvannamalai",
    "state": "Tamil Nadu",
    "lat": 12.4193,
    "lng": 79.2327,
    "population": 4398146,
    "isCoastal": false
  },
  {
    "id": "DST-IND-486",
    "name": "Vellore",
    "state": "Tamil Nadu",
    "lat": 12.7849,
    "lng": 79.0264,
    "population": 810451,
    "isCoastal": false
  },
  {
    "id": "DST-IND-487",
    "name": "Villupuram",
    "state": "Tamil Nadu",
    "lat": 12.0653,
    "lng": 79.6895,
    "population": 3893871,
    "isCoastal": false
  },
  {
    "id": "DST-IND-488",
    "name": "Virudhunagar",
    "state": "Tamil Nadu",
    "lat": 9.4689,
    "lng": 77.8764,
    "population": 3177698,
    "isCoastal": true
  },
  {
    "id": "DST-IND-489",
    "name": "Dhalai",
    "state": "Tripura",
    "lat": 23.7814,
    "lng": 91.9465,
    "population": 3210793,
    "isCoastal": false
  },
  {
    "id": "DST-IND-490",
    "name": "North Tripura",
    "state": "Tripura",
    "lat": 24.1217,
    "lng": 92.1784,
    "population": 2469860,
    "isCoastal": false
  },
  {
    "id": "DST-IND-491",
    "name": "South Tripura",
    "state": "Tripura",
    "lat": 23.2119,
    "lng": 91.6066,
    "population": 3667304,
    "isCoastal": false
  },
  {
    "id": "DST-IND-492",
    "name": "West Tripura",
    "state": "Tripura",
    "lat": 23.7802,
    "lng": 91.4131,
    "population": 3161146,
    "isCoastal": false
  },
  {
    "id": "DST-IND-493",
    "name": "Agra",
    "state": "Uttar Pradesh",
    "lat": 26.9951,
    "lng": 78.0528,
    "population": 1618564,
    "isCoastal": false
  },
  {
    "id": "DST-IND-494",
    "name": "Aligarh",
    "state": "Uttar Pradesh",
    "lat": 27.9375,
    "lng": 78.0015,
    "population": 1251676,
    "isCoastal": false
  },
  {
    "id": "DST-IND-495",
    "name": "Allahabad",
    "state": "Uttar Pradesh",
    "lat": 25.392,
    "lng": 82.0517,
    "population": 2436062,
    "isCoastal": false
  },
  {
    "id": "DST-IND-496",
    "name": "Ambedkar Nagar",
    "state": "Uttar Pradesh",
    "lat": 26.3912,
    "lng": 82.6828,
    "population": 2594123,
    "isCoastal": false
  },
  {
    "id": "DST-IND-497",
    "name": "Auraiya",
    "state": "Uttar Pradesh",
    "lat": 26.6689,
    "lng": 79.4264,
    "population": 1760183,
    "isCoastal": false
  },
  {
    "id": "DST-IND-498",
    "name": "Azamgarh",
    "state": "Uttar Pradesh",
    "lat": 26.0083,
    "lng": 83.0122,
    "population": 3763870,
    "isCoastal": false
  },
  {
    "id": "DST-IND-499",
    "name": "Badaun",
    "state": "Uttar Pradesh",
    "lat": 28.086,
    "lng": 78.9971,
    "population": 1296225,
    "isCoastal": false
  },
  {
    "id": "DST-IND-500",
    "name": "Baghpat",
    "state": "Uttar Pradesh",
    "lat": 29.0458,
    "lng": 77.3027,
    "population": 2445873,
    "isCoastal": false
  },
  {
    "id": "DST-IND-501",
    "name": "Bahraich",
    "state": "Uttar Pradesh",
    "lat": 27.6709,
    "lng": 81.4463,
    "population": 721285,
    "isCoastal": false
  },
  {
    "id": "DST-IND-502",
    "name": "Ballia",
    "state": "Uttar Pradesh",
    "lat": 25.8608,
    "lng": 84.0365,
    "population": 899742,
    "isCoastal": false
  },
  {
    "id": "DST-IND-503",
    "name": "Balrampur",
    "state": "Uttar Pradesh",
    "lat": 27.4491,
    "lng": 82.4716,
    "population": 1419092,
    "isCoastal": false
  },
  {
    "id": "DST-IND-504",
    "name": "Banda",
    "state": "Uttar Pradesh",
    "lat": 25.3519,
    "lng": 80.5249,
    "population": 2916716,
    "isCoastal": false
  },
  {
    "id": "DST-IND-505",
    "name": "Bara Banki",
    "state": "Uttar Pradesh",
    "lat": 26.9228,
    "lng": 81.3576,
    "population": 896162,
    "isCoastal": false
  },
  {
    "id": "DST-IND-506",
    "name": "Bareilly",
    "state": "Uttar Pradesh",
    "lat": 28.511,
    "lng": 79.4319,
    "population": 1327541,
    "isCoastal": false
  },
  {
    "id": "DST-IND-507",
    "name": "Basti",
    "state": "Uttar Pradesh",
    "lat": 26.8339,
    "lng": 82.6979,
    "population": 1404479,
    "isCoastal": false
  },
  {
    "id": "DST-IND-508",
    "name": "Bijnor",
    "state": "Uttar Pradesh",
    "lat": 29.314,
    "lng": 78.451,
    "population": 2256758,
    "isCoastal": false
  },
  {
    "id": "DST-IND-509",
    "name": "Bulandshahr",
    "state": "Uttar Pradesh",
    "lat": 28.3488,
    "lng": 78.0108,
    "population": 1344339,
    "isCoastal": false
  },
  {
    "id": "DST-IND-510",
    "name": "Chandauli",
    "state": "Uttar Pradesh",
    "lat": 25.1181,
    "lng": 83.2531,
    "population": 3613772,
    "isCoastal": false
  },
  {
    "id": "DST-IND-511",
    "name": "Chitrakoot",
    "state": "Uttar Pradesh",
    "lat": 25.1599,
    "lng": 81.0767,
    "population": 3491123,
    "isCoastal": false
  },
  {
    "id": "DST-IND-512",
    "name": "Deoria",
    "state": "Uttar Pradesh",
    "lat": 26.4222,
    "lng": 83.8244,
    "population": 3242716,
    "isCoastal": false
  },
  {
    "id": "DST-IND-513",
    "name": "Etah",
    "state": "Uttar Pradesh",
    "lat": 27.5912,
    "lng": 78.7002,
    "population": 3065321,
    "isCoastal": false
  },
  {
    "id": "DST-IND-514",
    "name": "Etawah",
    "state": "Uttar Pradesh",
    "lat": 26.7882,
    "lng": 79.0762,
    "population": 720770,
    "isCoastal": false
  },
  {
    "id": "DST-IND-515",
    "name": "Faizabad",
    "state": "Uttar Pradesh",
    "lat": 26.6059,
    "lng": 82.0078,
    "population": 1939429,
    "isCoastal": false
  },
  {
    "id": "DST-IND-516",
    "name": "Farrukhabad",
    "state": "Uttar Pradesh",
    "lat": 27.4506,
    "lng": 79.4406,
    "population": 3100363,
    "isCoastal": false
  },
  {
    "id": "DST-IND-517",
    "name": "Fatehpur",
    "state": "Uttar Pradesh",
    "lat": 25.8374,
    "lng": 80.8542,
    "population": 4172962,
    "isCoastal": false
  },
  {
    "id": "DST-IND-518",
    "name": "Firozabad",
    "state": "Uttar Pradesh",
    "lat": 27.2096,
    "lng": 78.4266,
    "population": 712928,
    "isCoastal": false
  },
  {
    "id": "DST-IND-519",
    "name": "Gautam Buddha Nagar",
    "state": "Uttar Pradesh",
    "lat": 28.3933,
    "lng": 77.5246,
    "population": 3788694,
    "isCoastal": false
  },
  {
    "id": "DST-IND-520",
    "name": "Ghaziabad",
    "state": "Uttar Pradesh",
    "lat": 28.75,
    "lng": 77.6744,
    "population": 4313773,
    "isCoastal": false
  },
  {
    "id": "DST-IND-521",
    "name": "Ghazipur",
    "state": "Uttar Pradesh",
    "lat": 25.6247,
    "lng": 83.5361,
    "population": 3629147,
    "isCoastal": false
  },
  {
    "id": "DST-IND-522",
    "name": "Gonda",
    "state": "Uttar Pradesh",
    "lat": 27.1572,
    "lng": 82.0227,
    "population": 3625401,
    "isCoastal": false
  },
  {
    "id": "DST-IND-523",
    "name": "Gorakhpur",
    "state": "Uttar Pradesh",
    "lat": 26.6332,
    "lng": 83.355,
    "population": 741531,
    "isCoastal": false
  },
  {
    "id": "DST-IND-524",
    "name": "Hamirpur",
    "state": "Uttar Pradesh",
    "lat": 25.7382,
    "lng": 79.8262,
    "population": 869639,
    "isCoastal": false
  },
  {
    "id": "DST-IND-525",
    "name": "Hardoi",
    "state": "Uttar Pradesh",
    "lat": 27.3374,
    "lng": 80.2641,
    "population": 4263718,
    "isCoastal": false
  },
  {
    "id": "DST-IND-526",
    "name": "Hathras",
    "state": "Uttar Pradesh",
    "lat": 27.5781,
    "lng": 78.1825,
    "population": 1980879,
    "isCoastal": false
  },
  {
    "id": "DST-IND-527",
    "name": "Jalaun",
    "state": "Uttar Pradesh",
    "lat": 26.068,
    "lng": 79.3669,
    "population": 3299793,
    "isCoastal": false
  },
  {
    "id": "DST-IND-528",
    "name": "Jaunpur",
    "state": "Uttar Pradesh",
    "lat": 25.7014,
    "lng": 82.5432,
    "population": 1112718,
    "isCoastal": false
  },
  {
    "id": "DST-IND-529",
    "name": "Jhansi",
    "state": "Uttar Pradesh",
    "lat": 25.4558,
    "lng": 78.8995,
    "population": 2289381,
    "isCoastal": false
  },
  {
    "id": "DST-IND-530",
    "name": "Jyotiba Phule Nagar",
    "state": "Uttar Pradesh",
    "lat": 28.8705,
    "lng": 78.3901,
    "population": 1489733,
    "isCoastal": false
  },
  {
    "id": "DST-IND-531",
    "name": "Kannauj",
    "state": "Uttar Pradesh",
    "lat": 26.994,
    "lng": 79.6444,
    "population": 3075642,
    "isCoastal": false
  },
  {
    "id": "DST-IND-532",
    "name": "Kanpur Dehat",
    "state": "Uttar Pradesh",
    "lat": 26.4305,
    "lng": 79.9871,
    "population": 2647295,
    "isCoastal": false
  },
  {
    "id": "DST-IND-533",
    "name": "Kanpur",
    "state": "Uttar Pradesh",
    "lat": 26.3705,
    "lng": 80.2925,
    "population": 1557292,
    "isCoastal": false
  },
  {
    "id": "DST-IND-534",
    "name": "Kaushambi",
    "state": "Uttar Pradesh",
    "lat": 25.5359,
    "lng": 81.4181,
    "population": 1133713,
    "isCoastal": false
  },
  {
    "id": "DST-IND-535",
    "name": "Kushinagar",
    "state": "Uttar Pradesh",
    "lat": 26.8925,
    "lng": 83.9226,
    "population": 740205,
    "isCoastal": false
  },
  {
    "id": "DST-IND-536",
    "name": "Lakhimpur Kheri",
    "state": "Uttar Pradesh",
    "lat": 28.0919,
    "lng": 80.6473,
    "population": 3330097,
    "isCoastal": false
  },
  {
    "id": "DST-IND-537",
    "name": "Lalitpur",
    "state": "Uttar Pradesh",
    "lat": 24.5888,
    "lng": 78.6008,
    "population": 4178222,
    "isCoastal": false
  },
  {
    "id": "DST-IND-538",
    "name": "Lucknow",
    "state": "Uttar Pradesh",
    "lat": 26.8382,
    "lng": 80.8971,
    "population": 1790174,
    "isCoastal": false
  },
  {
    "id": "DST-IND-539",
    "name": "Maharajganj",
    "state": "Uttar Pradesh",
    "lat": 27.1771,
    "lng": 83.4613,
    "population": 3132496,
    "isCoastal": false
  },
  {
    "id": "DST-IND-540",
    "name": "Mahoba",
    "state": "Uttar Pradesh",
    "lat": 25.3453,
    "lng": 79.6786,
    "population": 2969397,
    "isCoastal": false
  },
  {
    "id": "DST-IND-541",
    "name": "Mainpuri",
    "state": "Uttar Pradesh",
    "lat": 27.1739,
    "lng": 79.035,
    "population": 898766,
    "isCoastal": false
  },
  {
    "id": "DST-IND-542",
    "name": "Mathura",
    "state": "Uttar Pradesh",
    "lat": 27.5997,
    "lng": 77.6152,
    "population": 1528561,
    "isCoastal": false
  },
  {
    "id": "DST-IND-543",
    "name": "Mau",
    "state": "Uttar Pradesh",
    "lat": 26.0108,
    "lng": 83.5058,
    "population": 4375258,
    "isCoastal": false
  },
  {
    "id": "DST-IND-544",
    "name": "Meerut",
    "state": "Uttar Pradesh",
    "lat": 29.0296,
    "lng": 77.8061,
    "population": 1080530,
    "isCoastal": false
  },
  {
    "id": "DST-IND-545",
    "name": "Mirzapur",
    "state": "Uttar Pradesh",
    "lat": 25.1021,
    "lng": 82.6013,
    "population": 3799630,
    "isCoastal": false
  },
  {
    "id": "DST-IND-546",
    "name": "Moradabad",
    "state": "Uttar Pradesh",
    "lat": 28.8518,
    "lng": 78.7358,
    "population": 1556609,
    "isCoastal": false
  },
  {
    "id": "DST-IND-547",
    "name": "Muzaffarnagar",
    "state": "Uttar Pradesh",
    "lat": 29.4705,
    "lng": 77.6402,
    "population": 3097108,
    "isCoastal": false
  },
  {
    "id": "DST-IND-548",
    "name": "Pilibhit",
    "state": "Uttar Pradesh",
    "lat": 28.5202,
    "lng": 79.901,
    "population": 3987556,
    "isCoastal": false
  },
  {
    "id": "DST-IND-549",
    "name": "Pratapgarh",
    "state": "Uttar Pradesh",
    "lat": 25.8648,
    "lng": 81.9353,
    "population": 1565237,
    "isCoastal": false
  },
  {
    "id": "DST-IND-550",
    "name": "Rae Bareli",
    "state": "Uttar Pradesh",
    "lat": 26.2539,
    "lng": 81.2226,
    "population": 2611670,
    "isCoastal": false
  },
  {
    "id": "DST-IND-551",
    "name": "Rampur",
    "state": "Uttar Pradesh",
    "lat": 28.8324,
    "lng": 79.1098,
    "population": 2171405,
    "isCoastal": false
  },
  {
    "id": "DST-IND-552",
    "name": "Saharanpur",
    "state": "Uttar Pradesh",
    "lat": 30.0338,
    "lng": 77.5991,
    "population": 1040712,
    "isCoastal": false
  },
  {
    "id": "DST-IND-553",
    "name": "Sant Kabir Nagar",
    "state": "Uttar Pradesh",
    "lat": 26.7916,
    "lng": 83.0388,
    "population": 3124295,
    "isCoastal": false
  },
  {
    "id": "DST-IND-554",
    "name": "Sant Ravi Das Nagar",
    "state": "Uttar Pradesh",
    "lat": 25.3646,
    "lng": 82.435,
    "population": 983784,
    "isCoastal": false
  },
  {
    "id": "DST-IND-555",
    "name": "Shahjahanpur",
    "state": "Uttar Pradesh",
    "lat": 27.9914,
    "lng": 79.8302,
    "population": 2947256,
    "isCoastal": false
  },
  {
    "id": "DST-IND-556",
    "name": "Shravasti",
    "state": "Uttar Pradesh",
    "lat": 27.6006,
    "lng": 81.7935,
    "population": 4300077,
    "isCoastal": false
  },
  {
    "id": "DST-IND-557",
    "name": "Siddharth Nagar",
    "state": "Uttar Pradesh",
    "lat": 27.2074,
    "lng": 82.7867,
    "population": 2110340,
    "isCoastal": false
  },
  {
    "id": "DST-IND-558",
    "name": "Sitapur",
    "state": "Uttar Pradesh",
    "lat": 27.502,
    "lng": 80.8529,
    "population": 1712485,
    "isCoastal": false
  },
  {
    "id": "DST-IND-559",
    "name": "Sonbhadra",
    "state": "Uttar Pradesh",
    "lat": 24.4669,
    "lng": 83.0682,
    "population": 2505289,
    "isCoastal": false
  },
  {
    "id": "DST-IND-560",
    "name": "Sultanpur",
    "state": "Uttar Pradesh",
    "lat": 26.2846,
    "lng": 82.0571,
    "population": 713294,
    "isCoastal": false
  },
  {
    "id": "DST-IND-561",
    "name": "Unnao",
    "state": "Uttar Pradesh",
    "lat": 26.6316,
    "lng": 80.6368,
    "population": 2707819,
    "isCoastal": false
  },
  {
    "id": "DST-IND-562",
    "name": "Varanasi",
    "state": "Uttar Pradesh",
    "lat": 25.3606,
    "lng": 82.8253,
    "population": 3133815,
    "isCoastal": false
  },
  {
    "id": "DST-IND-563",
    "name": "Almora",
    "state": "Uttaranchal",
    "lat": 29.6835,
    "lng": 79.5016,
    "population": 798002,
    "isCoastal": false
  },
  {
    "id": "DST-IND-564",
    "name": "Bageshwar",
    "state": "Uttaranchal",
    "lat": 29.987,
    "lng": 79.8395,
    "population": 1263790,
    "isCoastal": false
  },
  {
    "id": "DST-IND-565",
    "name": "Chamoli",
    "state": "Uttaranchal",
    "lat": 30.5834,
    "lng": 79.5628,
    "population": 2008878,
    "isCoastal": false
  },
  {
    "id": "DST-IND-566",
    "name": "Champawat",
    "state": "Uttaranchal",
    "lat": 29.2914,
    "lng": 80.0772,
    "population": 4092201,
    "isCoastal": false
  },
  {
    "id": "DST-IND-567",
    "name": "Dehra Dun",
    "state": "Uttaranchal",
    "lat": 30.5333,
    "lng": 77.9088,
    "population": 1036499,
    "isCoastal": false
  },
  {
    "id": "DST-IND-568",
    "name": "Haridwar",
    "state": "Uttaranchal",
    "lat": 29.8861,
    "lng": 77.9298,
    "population": 3622894,
    "isCoastal": false
  },
  {
    "id": "DST-IND-569",
    "name": "Naini Tal",
    "state": "Uttaranchal",
    "lat": 29.3364,
    "lng": 79.4998,
    "population": 1974098,
    "isCoastal": false
  },
  {
    "id": "DST-IND-570",
    "name": "Pauri Garhwal",
    "state": "Uttaranchal",
    "lat": 29.9781,
    "lng": 78.7745,
    "population": 3044403,
    "isCoastal": false
  },
  {
    "id": "DST-IND-571",
    "name": "Pithoragarh",
    "state": "Uttaranchal",
    "lat": 30.1472,
    "lng": 80.3423,
    "population": 4013857,
    "isCoastal": false
  },
  {
    "id": "DST-IND-572",
    "name": "Rudra Prayag",
    "state": "Uttaranchal",
    "lat": 30.5566,
    "lng": 79.0942,
    "population": 1509728,
    "isCoastal": false
  },
  {
    "id": "DST-IND-573",
    "name": "Tehri Garhwal",
    "state": "Uttaranchal",
    "lat": 30.4637,
    "lng": 78.4878,
    "population": 2194608,
    "isCoastal": false
  },
  {
    "id": "DST-IND-574",
    "name": "Udham Singh Nagar",
    "state": "Uttaranchal",
    "lat": 29.0278,
    "lng": 79.4563,
    "population": 658867,
    "isCoastal": false
  },
  {
    "id": "DST-IND-575",
    "name": "Uttarkashi",
    "state": "Uttaranchal",
    "lat": 30.969,
    "lng": 78.5688,
    "population": 3692012,
    "isCoastal": false
  },
  {
    "id": "DST-IND-576",
    "name": "Bankura",
    "state": "West Bengal",
    "lat": 23.0813,
    "lng": 87.1264,
    "population": 836340,
    "isCoastal": true
  },
  {
    "id": "DST-IND-577",
    "name": "Barddhaman",
    "state": "West Bengal",
    "lat": 23.4445,
    "lng": 87.8151,
    "population": 648310,
    "isCoastal": true
  },
  {
    "id": "DST-IND-578",
    "name": "Birbhum",
    "state": "West Bengal",
    "lat": 24.0639,
    "lng": 87.6515,
    "population": 3626170,
    "isCoastal": true
  },
  {
    "id": "DST-IND-579",
    "name": "Dakshin Dinajpur",
    "state": "West Bengal",
    "lat": 25.3421,
    "lng": 88.6982,
    "population": 3597775,
    "isCoastal": true
  },
  {
    "id": "DST-IND-580",
    "name": "Darjiling",
    "state": "West Bengal",
    "lat": 26.8396,
    "lng": 88.3315,
    "population": 1183206,
    "isCoastal": true
  },
  {
    "id": "DST-IND-581",
    "name": "East Midnapore",
    "state": "West Bengal",
    "lat": 21.985,
    "lng": 87.8989,
    "population": 3596171,
    "isCoastal": true
  },
  {
    "id": "DST-IND-582",
    "name": "Haora",
    "state": "West Bengal",
    "lat": 22.4,
    "lng": 87.9988,
    "population": 2751478,
    "isCoastal": true
  },
  {
    "id": "DST-IND-583",
    "name": "Hugli",
    "state": "West Bengal",
    "lat": 22.8793,
    "lng": 88.0001,
    "population": 3203418,
    "isCoastal": true
  },
  {
    "id": "DST-IND-584",
    "name": "Jalpaiguri",
    "state": "West Bengal",
    "lat": 26.6264,
    "lng": 89.0415,
    "population": 4416048,
    "isCoastal": true
  },
  {
    "id": "DST-IND-585",
    "name": "Kochbihar",
    "state": "West Bengal",
    "lat": 26.2505,
    "lng": 89.3061,
    "population": 2371495,
    "isCoastal": true
  },
  {
    "id": "DST-IND-586",
    "name": "Kolkata",
    "state": "West Bengal",
    "lat": 22.5506,
    "lng": 88.3528,
    "population": 1207893,
    "isCoastal": true
  },
  {
    "id": "DST-IND-587",
    "name": "Maldah",
    "state": "West Bengal",
    "lat": 25.0803,
    "lng": 88.1719,
    "population": 1282725,
    "isCoastal": true
  },
  {
    "id": "DST-IND-588",
    "name": "Murshidabad",
    "state": "West Bengal",
    "lat": 24.2593,
    "lng": 88.166,
    "population": 1348134,
    "isCoastal": true
  },
  {
    "id": "DST-IND-589",
    "name": "Nadia",
    "state": "West Bengal",
    "lat": 23.5641,
    "lng": 88.5829,
    "population": 3392507,
    "isCoastal": true
  },
  {
    "id": "DST-IND-590",
    "name": "North 24 Parganas",
    "state": "West Bengal",
    "lat": 22.6287,
    "lng": 88.8139,
    "population": 739115,
    "isCoastal": true
  },
  {
    "id": "DST-IND-591",
    "name": "Puruliya",
    "state": "West Bengal",
    "lat": 23.2542,
    "lng": 86.3969,
    "population": 1844486,
    "isCoastal": true
  },
  {
    "id": "DST-IND-592",
    "name": "South 24 Parganas",
    "state": "West Bengal",
    "lat": 22.0157,
    "lng": 88.4625,
    "population": 1695365,
    "isCoastal": true
  },
  {
    "id": "DST-IND-593",
    "name": "Uttar Dinajpur",
    "state": "West Bengal",
    "lat": 26.0457,
    "lng": 88.2354,
    "population": 2898584,
    "isCoastal": true
  },
  {
    "id": "DST-IND-594",
    "name": "West Midnapore",
    "state": "West Bengal",
    "lat": 22.3549,
    "lng": 87.231,
    "population": 1052315,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-595",
    "name": "Bhadradri Kothagudem",
    "state": "Telangana",
    "lat": 17.55,
    "lng": 80.61,
    "population": 1069261,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-596",
    "name": "Jagtial",
    "state": "Telangana",
    "lat": 18.8,
    "lng": 78.93,
    "population": 985417,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-597",
    "name": "Jangaon",
    "state": "Telangana",
    "lat": 17.72,
    "lng": 79.18,
    "population": 566376,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-598",
    "name": "Jayashankar Bhupalpally",
    "state": "Telangana",
    "lat": 18.43,
    "lng": 79.86,
    "population": 416763,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-599",
    "name": "Jogulamba Gadwal",
    "state": "Telangana",
    "lat": 16.23,
    "lng": 77.8,
    "population": 609990,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-600",
    "name": "Kamareddy",
    "state": "Telangana",
    "lat": 18.32,
    "lng": 78.34,
    "population": 972625,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-601",
    "name": "Komaram Bheem Asifabad",
    "state": "Telangana",
    "lat": 19.36,
    "lng": 79.29,
    "population": 515812,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-602",
    "name": "Mahabubabad",
    "state": "Telangana",
    "lat": 17.6,
    "lng": 80,
    "population": 774549,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-603",
    "name": "Mancherial",
    "state": "Telangana",
    "lat": 18.87,
    "lng": 79.46,
    "population": 807037,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-604",
    "name": "Medchal-Malkajgiri",
    "state": "Telangana",
    "lat": 17.54,
    "lng": 78.55,
    "population": 2440073,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-605",
    "name": "Mulugu",
    "state": "Telangana",
    "lat": 18.19,
    "lng": 79.94,
    "population": 257744,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-606",
    "name": "Nagarkurnool",
    "state": "Telangana",
    "lat": 16.48,
    "lng": 78.33,
    "population": 861766,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-607",
    "name": "Narayanpet",
    "state": "Telangana",
    "lat": 16.73,
    "lng": 77.5,
    "population": 566874,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-608",
    "name": "Nirmal",
    "state": "Telangana",
    "lat": 19.09,
    "lng": 78.34,
    "population": 709418,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-609",
    "name": "Peddapalli",
    "state": "Telangana",
    "lat": 18.61,
    "lng": 79.38,
    "population": 795332,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-610",
    "name": "Rajanna Sircilla",
    "state": "Telangana",
    "lat": 18.38,
    "lng": 78.83,
    "population": 552037,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-611",
    "name": "Siddipet",
    "state": "Telangana",
    "lat": 18.1,
    "lng": 78.85,
    "population": 1012065,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-612",
    "name": "Suryapet",
    "state": "Telangana",
    "lat": 17.14,
    "lng": 79.62,
    "population": 1099529,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-613",
    "name": "Vikarabad",
    "state": "Telangana",
    "lat": 17.33,
    "lng": 77.9,
    "population": 927140,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-614",
    "name": "Wanaparthy",
    "state": "Telangana",
    "lat": 16.36,
    "lng": 78.06,
    "population": 577758,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-615",
    "name": "Yadadri Bhuvanagiri",
    "state": "Telangana",
    "lat": 17.51,
    "lng": 78.88,
    "population": 739448,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-616",
    "name": "Hanamkonda",
    "state": "Telangana",
    "lat": 18.01,
    "lng": 79.56,
    "population": 1087423,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-617",
    "name": "Leh",
    "state": "Ladakh",
    "lat": 34.15,
    "lng": 77.58,
    "population": 133487,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-618",
    "name": "Kargil",
    "state": "Ladakh",
    "lat": 34.55,
    "lng": 76.13,
    "population": 140802,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-619",
    "name": "Alluri Sitharama Raju",
    "state": "Andhra Pradesh",
    "lat": 17.68,
    "lng": 82.61,
    "population": 953960,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-620",
    "name": "Anakapalli",
    "state": "Andhra Pradesh",
    "lat": 17.69,
    "lng": 83,
    "population": 1726998,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-621",
    "name": "Annamayya",
    "state": "Andhra Pradesh",
    "lat": 14.18,
    "lng": 78.96,
    "population": 1697308,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-622",
    "name": "Bapatla",
    "state": "Andhra Pradesh",
    "lat": 15.9,
    "lng": 80.47,
    "population": 1586918,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-623",
    "name": "Dr. B.R. Ambedkar Konaseema",
    "state": "Andhra Pradesh",
    "lat": 16.57,
    "lng": 82,
    "population": 1719093,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-624",
    "name": "Eluru",
    "state": "Andhra Pradesh",
    "lat": 16.71,
    "lng": 81.1,
    "population": 2071700,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-625",
    "name": "Kakinada",
    "state": "Andhra Pradesh",
    "lat": 16.98,
    "lng": 82.24,
    "population": 2092374,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-626",
    "name": "Nandyal",
    "state": "Andhra Pradesh",
    "lat": 15.48,
    "lng": 78.48,
    "population": 1781777,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-627",
    "name": "NTR",
    "state": "Andhra Pradesh",
    "lat": 16.52,
    "lng": 80.62,
    "population": 2218591,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-628",
    "name": "Palnadu",
    "state": "Andhra Pradesh",
    "lat": 16.23,
    "lng": 80.05,
    "population": 2041723,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-629",
    "name": "Parvathipuram Manyam",
    "state": "Andhra Pradesh",
    "lat": 18.78,
    "lng": 83.43,
    "population": 925340,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-630",
    "name": "Sri Potti Sriramulu Nellore",
    "state": "Andhra Pradesh",
    "lat": 14.44,
    "lng": 79.98,
    "population": 2469712,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-631",
    "name": "Sri Sathya Sai",
    "state": "Andhra Pradesh",
    "lat": 14.16,
    "lng": 77.81,
    "population": 1840002,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-632",
    "name": "Tirupati",
    "state": "Andhra Pradesh",
    "lat": 13.63,
    "lng": 79.42,
    "population": 2196984,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-633",
    "name": "Mauganj",
    "state": "Madhya Pradesh",
    "lat": 24.68,
    "lng": 81.87,
    "population": 616645,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-634",
    "name": "Maihar",
    "state": "Madhya Pradesh",
    "lat": 24.27,
    "lng": 80.75,
    "population": 450000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-635",
    "name": "Pandhurna",
    "state": "Madhya Pradesh",
    "lat": 21.6,
    "lng": 78.53,
    "population": 350000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-636",
    "name": "Niwari",
    "state": "Madhya Pradesh",
    "lat": 25.36,
    "lng": 78.8,
    "population": 404807,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-637",
    "name": "Agar Malwa",
    "state": "Madhya Pradesh",
    "lat": 23.71,
    "lng": 76.01,
    "population": 571275,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-638",
    "name": "Anupgarh",
    "state": "Rajasthan",
    "lat": 29.19,
    "lng": 73.21,
    "population": 420000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-639",
    "name": "Balotra",
    "state": "Rajasthan",
    "lat": 25.83,
    "lng": 72.24,
    "population": 450000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-640",
    "name": "Beawar",
    "state": "Rajasthan",
    "lat": 26.1,
    "lng": 74.32,
    "population": 550000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-641",
    "name": "Deeg",
    "state": "Rajasthan",
    "lat": 27.47,
    "lng": 77.32,
    "population": 420000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-642",
    "name": "Didwana Kuchaman",
    "state": "Rajasthan",
    "lat": 27.4,
    "lng": 74.57,
    "population": 650000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-643",
    "name": "Dudu",
    "state": "Rajasthan",
    "lat": 26.68,
    "lng": 75.23,
    "population": 312000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-644",
    "name": "Gangapur City",
    "state": "Rajasthan",
    "lat": 26.47,
    "lng": 76.72,
    "population": 450000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-645",
    "name": "Jaipur Rural",
    "state": "Rajasthan",
    "lat": 26.92,
    "lng": 75.8,
    "population": 1800000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-646",
    "name": "Jodhpur Rural",
    "state": "Rajasthan",
    "lat": 26.28,
    "lng": 73.02,
    "population": 1500000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-647",
    "name": "Kotputli-Behror",
    "state": "Rajasthan",
    "lat": 27.7,
    "lng": 76.2,
    "population": 700000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-648",
    "name": "Khairthal-Tijara",
    "state": "Rajasthan",
    "lat": 27.8,
    "lng": 76.83,
    "population": 550000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-649",
    "name": "Neem Ka Thana",
    "state": "Rajasthan",
    "lat": 27.74,
    "lng": 75.78,
    "population": 620000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-650",
    "name": "Phalodi",
    "state": "Rajasthan",
    "lat": 27.13,
    "lng": 72.36,
    "population": 430000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-651",
    "name": "Salumbar",
    "state": "Rajasthan",
    "lat": 24.13,
    "lng": 74.04,
    "population": 380000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-652",
    "name": "Sanchore",
    "state": "Rajasthan",
    "lat": 24.75,
    "lng": 71.77,
    "population": 400000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-653",
    "name": "Shahpura",
    "state": "Rajasthan",
    "lat": 25.63,
    "lng": 74.93,
    "population": 390000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-654",
    "name": "Kekri",
    "state": "Rajasthan",
    "lat": 25.97,
    "lng": 75.15,
    "population": 410000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-655",
    "name": "Mohla-Manpur-Ambagarh Chowki",
    "state": "Chhattisgarh",
    "lat": 20.67,
    "lng": 80.74,
    "population": 283947,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-656",
    "name": "Sarangarh-Bilaigarh",
    "state": "Chhattisgarh",
    "lat": 21.6,
    "lng": 83.08,
    "population": 607434,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-657",
    "name": "Sakti",
    "state": "Chhattisgarh",
    "lat": 22.02,
    "lng": 82.96,
    "population": 647254,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-658",
    "name": "Khairagarh-Chhuikhadan-Gandai",
    "state": "Chhattisgarh",
    "lat": 21.42,
    "lng": 80.97,
    "population": 368444,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-659",
    "name": "Manendragarh-Chirmiri-Bharatpur",
    "state": "Chhattisgarh",
    "lat": 23.2,
    "lng": 82.2,
    "population": 376000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-660",
    "name": "Gaurela-Pendra-Marwahi",
    "state": "Chhattisgarh",
    "lat": 22.76,
    "lng": 81.93,
    "population": 336420,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-661",
    "name": "Bajali",
    "state": "Assam",
    "lat": 26.49,
    "lng": 91.17,
    "population": 253816,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-662",
    "name": "Biswanath",
    "state": "Assam",
    "lat": 26.74,
    "lng": 93.15,
    "population": 612491,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-663",
    "name": "Charaideo",
    "state": "Assam",
    "lat": 26.94,
    "lng": 94.94,
    "population": 471418,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-664",
    "name": "Hojai",
    "state": "Assam",
    "lat": 26,
    "lng": 92.86,
    "population": 937282,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-665",
    "name": "Majuli",
    "state": "Assam",
    "lat": 26.95,
    "lng": 94.2,
    "population": 167304,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-666",
    "name": "South Salmara-Mankachar",
    "state": "Assam",
    "lat": 25.7,
    "lng": 89.92,
    "population": 555114,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-667",
    "name": "Tamulpur",
    "state": "Assam",
    "lat": 26.63,
    "lng": 91.58,
    "population": 389150,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-668",
    "name": "Malerkotla",
    "state": "Punjab",
    "lat": 30.52,
    "lng": 75.89,
    "population": 452016,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-669",
    "name": "Vijayanagara",
    "state": "Karnataka",
    "lat": 15.27,
    "lng": 76.39,
    "population": 1353628,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-670",
    "name": "Chengalpattu",
    "state": "Tamil Nadu",
    "lat": 12.69,
    "lng": 79.98,
    "population": 2556244,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-671",
    "name": "Kallakurichi",
    "state": "Tamil Nadu",
    "lat": 11.74,
    "lng": 78.96,
    "population": 1370281,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-672",
    "name": "Ranipet",
    "state": "Tamil Nadu",
    "lat": 12.93,
    "lng": 79.33,
    "population": 1210277,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-673",
    "name": "Tenkasi",
    "state": "Tamil Nadu",
    "lat": 8.96,
    "lng": 77.31,
    "population": 1407627,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-674",
    "name": "Tirupattur",
    "state": "Tamil Nadu",
    "lat": 12.49,
    "lng": 78.57,
    "population": 1111812,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-675",
    "name": "Mayiladuthurai",
    "state": "Tamil Nadu",
    "lat": 11.1,
    "lng": 79.65,
    "population": 918356,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-676",
    "name": "Alipurduar",
    "state": "West Bengal",
    "lat": 26.49,
    "lng": 89.52,
    "population": 1491250,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-677",
    "name": "Kalimpong",
    "state": "West Bengal",
    "lat": 27.06,
    "lng": 88.47,
    "population": 251642,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-678",
    "name": "Jhargram",
    "state": "West Bengal",
    "lat": 22.45,
    "lng": 86.98,
    "population": 1137163,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-679",
    "name": "Paschim Bardhaman",
    "state": "West Bengal",
    "lat": 23.68,
    "lng": 86.98,
    "population": 2882031,
    "isCoastal": true
  },
  {
    "id": "DST-MOD-680",
    "name": "Kamle",
    "state": "Arunachal Pradesh",
    "lat": 27.67,
    "lng": 93.94,
    "population": 22256,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-681",
    "name": "Kra Daadi",
    "state": "Arunachal Pradesh",
    "lat": 27.85,
    "lng": 93.44,
    "population": 44291,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-682",
    "name": "Namsai",
    "state": "Arunachal Pradesh",
    "lat": 27.67,
    "lng": 95.86,
    "population": 95950,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-683",
    "name": "Pakke Kessang",
    "state": "Arunachal Pradesh",
    "lat": 27.08,
    "lng": 93.18,
    "population": 15358,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-684",
    "name": "Shi Yomi",
    "state": "Arunachal Pradesh",
    "lat": 28.53,
    "lng": 94.13,
    "population": 13310,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-685",
    "name": "Lepa Rada",
    "state": "Arunachal Pradesh",
    "lat": 27.88,
    "lng": 94.61,
    "population": 28000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-686",
    "name": "Eastern West Khasi Hills",
    "state": "Meghalaya",
    "lat": 25.52,
    "lng": 91.53,
    "population": 131451,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-687",
    "name": "Hnahthial",
    "state": "Mizoram",
    "lat": 22.96,
    "lng": 92.93,
    "population": 28468,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-688",
    "name": "Khawzawl",
    "state": "Mizoram",
    "lat": 23.53,
    "lng": 93.18,
    "population": 33420,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-689",
    "name": "Saitual",
    "state": "Mizoram",
    "lat": 23.97,
    "lng": 92.57,
    "population": 50575,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-690",
    "name": "Noklak",
    "state": "Nagaland",
    "lat": 26.2,
    "lng": 95,
    "population": 59300,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-691",
    "name": "Niuland",
    "state": "Nagaland",
    "lat": 25.9,
    "lng": 93.85,
    "population": 45000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-692",
    "name": "Tseminyu",
    "state": "Nagaland",
    "lat": 25.92,
    "lng": 94.21,
    "population": 63629,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-693",
    "name": "Chumoukedima",
    "state": "Nagaland",
    "lat": 25.8,
    "lng": 93.75,
    "population": 125419,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-694",
    "name": "Shamator",
    "state": "Nagaland",
    "lat": 25.98,
    "lng": 94.88,
    "population": 34223,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-695",
    "name": "Pherzawl",
    "state": "Manipur",
    "lat": 24.25,
    "lng": 93.18,
    "population": 47250,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-696",
    "name": "Noney",
    "state": "Manipur",
    "lat": 24.78,
    "lng": 93.58,
    "population": 40000,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-697",
    "name": "Kamjong",
    "state": "Manipur",
    "lat": 24.85,
    "lng": 94.48,
    "population": 45616,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-698",
    "name": "Tengnoupal",
    "state": "Manipur",
    "lat": 24.37,
    "lng": 94.15,
    "population": 59110,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-699",
    "name": "Kakching",
    "state": "Manipur",
    "lat": 24.48,
    "lng": 93.98,
    "population": 135056,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-700",
    "name": "Kangpokpi",
    "state": "Manipur",
    "lat": 25.15,
    "lng": 93.97,
    "population": 193744,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-701",
    "name": "Central Delhi",
    "state": "Delhi",
    "lat": 28.65,
    "lng": 77.22,
    "population": 582320,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-702",
    "name": "East Delhi",
    "state": "Delhi",
    "lat": 28.63,
    "lng": 77.29,
    "population": 1709346,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-703",
    "name": "New Delhi",
    "state": "Delhi",
    "lat": 28.61,
    "lng": 77.21,
    "population": 142004,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-704",
    "name": "North Delhi",
    "state": "Delhi",
    "lat": 28.71,
    "lng": 77.17,
    "population": 887978,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-705",
    "name": "North East Delhi",
    "state": "Delhi",
    "lat": 28.7,
    "lng": 77.27,
    "population": 2241624,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-706",
    "name": "North West Delhi",
    "state": "Delhi",
    "lat": 28.75,
    "lng": 77.08,
    "population": 3656539,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-707",
    "name": "Shahdara",
    "state": "Delhi",
    "lat": 28.67,
    "lng": 77.29,
    "population": 322931,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-708",
    "name": "South Delhi",
    "state": "Delhi",
    "lat": 28.51,
    "lng": 77.2,
    "population": 2731929,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-709",
    "name": "South East Delhi",
    "state": "Delhi",
    "lat": 28.54,
    "lng": 77.27,
    "population": 637775,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-710",
    "name": "South West Delhi",
    "state": "Delhi",
    "lat": 28.58,
    "lng": 77.03,
    "population": 2292958,
    "isCoastal": false
  },
  {
    "id": "DST-MOD-711",
    "name": "West Delhi",
    "state": "Delhi",
    "lat": 28.65,
    "lng": 77.1,
    "population": 2543243,
    "isCoastal": false
  },




















































];
