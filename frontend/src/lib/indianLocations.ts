/**
 * Indian States & Districts Data Dictionary for Validating Farm Locations
 */

export interface StateDistrictMap {
  [state: string]: string[];
}

export const INDIAN_STATES_DISTRICTS: StateDistrictMap = {
  Maharashtra: [
    'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad (Chhatrapati Sambhaji Nagar)',
    'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli',
    'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur',
    'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar',
    'Nashik', 'Osmanabad (Dharashiv)', 'Palghar', 'Parbhani', 'Pune',
    'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur',
    'Thane', 'Wardha', 'Washim', 'Yavatmal'
  ],
  Gujarat: [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
    'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
    'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
    'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
    'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
    'Tapi', 'Vadodara', 'Valsad'
  ],
  Punjab: [
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib',
    'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar',
    'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga',
    'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar (Mohali)',
    'Sangrur', 'Shahid Bhagat Singh Nagar (Nawanshahr)', 'Tarn Taran'
  ],
  Haryana: [
    'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad',
    'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal',
    'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula',
    'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Dewas',
    'Satna', 'Ratlam', 'Rewa', 'Khargone', 'Hoshangabad (Narmadapuram)',
    'Chhindwara', 'Sehore', 'Vidisha', 'Shivpuri', 'Dhar', 'Mandsaur'
  ],
  Rajasthan: [
    'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara',
    'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur',
    'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu',
    'Jodhpur', 'Kota', 'Nagaur', 'Pali', 'Sikar', 'Sirohi', 'Sri Ganganagar',
    'Udaipur'
  ],
  'Uttar Pradesh': [
    'Agra', 'Aligarh', 'Ayodhya', 'Azamgarh', 'Bareilly', 'Basti', 'Bijnor',
    'Bulandshahr', 'Gorakhpur', 'Jhansi', 'Kanpur Nagar', 'Lakhimpur Kheri',
    'Lucknow', 'Mathura', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar',
    'Prayagraj', 'Saharanpur', 'Varanasi'
  ],
  Karnataka: [
    'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
    'Bidar', 'Chamarajanagar', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada',
    'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi',
    'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Shivamogga', 'Tumakuru',
    'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'
  ]
};

export const INDIAN_STATES = Object.keys(INDIAN_STATES_DISTRICTS);

export function getDistrictsForState(state: string): string[] {
  return INDIAN_STATES_DISTRICTS[state] || ['Other District'];
}
