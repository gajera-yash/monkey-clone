import axios from 'axios';

// Country code to flag emoji mapping
const countryCodeToFlag = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return '🌍';

    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());

    return String.fromCodePoint(...codePoints);
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
};

// Format distance for display
const formatDistance = (distanceKm) => {
    if (distanceKm < 1) return '< 1 km away';
    if (distanceKm < 1000) return `${distanceKm.toLocaleString()} km away`;
    return `${distanceKm.toLocaleString()} km away`;
};

// Fetch user location from IPInfo Lite API (country, state, city)
export const getUserLocation = async () => {
    try {
        // Check if location is cached in localStorage
        const cachedLocation = localStorage.getItem('userLocation');
        const cacheTimestamp = localStorage.getItem('userLocationTimestamp');

        // Cache for 24 hours
        if (cachedLocation && cacheTimestamp) {
            const cacheAge = Date.now() - parseInt(cacheTimestamp);
            const twentyFourHours = 24 * 60 * 60 * 1000;
            if (cacheAge < twentyFourHours) {
                console.log('[Geo] Using cached location data');
                return JSON.parse(cachedLocation);
            }
        }

        // --- PRIMARY: IPInfo Lite API (New Token) ---
        const IPINFO_TOKEN = "0e6362ad9ac7bd";
        console.log('[Geo] Fetching from IPInfo Lite...');

        const response = await axios.get(`https://api.ipinfo.io/lite/json?token=${IPINFO_TOKEN}`, {
            timeout: 6000
        });

        const data = response.data;
        console.log('[Geo] IPInfo Lite raw response:', data);

        // IPInfo Lite returns: country_code, country_name, city, state_code, state_name, lat, lng
        // Regular IPInfo returns: country, city, region, loc (lat,long)
        // Handle both formats:
        const countryCode = data.country_code || data.country || 'XX';
        const countryName = data.country_name || (() => {
            try {
                const regions = new Intl.DisplayNames(['en'], { type: 'region' });
                return regions.of(countryCode) || countryCode;
            } catch (e) { return countryCode; }
        })();

        const city = data.city || 'Unknown';
        const region = data.state_name || data.region || 'Unknown';

        let lat = data.lat || data.latitude || 0;
        let lon = data.lng || data.longitude || 0;
        if (!lat && data.loc) {
            const parts = data.loc.split(',');
            lat = parseFloat(parts[0]) || 0;
            lon = parseFloat(parts[1]) || 0;
        }

        const locationData = {
            country: countryName,
            countryCode: countryCode,
            city: city,
            region: region,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            flag: countryCodeToFlag(countryCode)
        };

        // Cache the location data
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        localStorage.setItem('userLocationTimestamp', Date.now().toString());

        console.log('[Geo] Location fetched from IPInfo Lite:', locationData);
        return locationData;

    } catch (error) {
        console.warn('[Geo] IPInfo Lite failed, trying fallback...', error?.message);

        try {
            // --- FALLBACK: freeipapi.com ---
            const fallbackRes = await axios.get('https://freeipapi.com/api/json', { timeout: 4000 });
            const fb = fallbackRes.data;

            if (fb && fb.countryCode) {
                const fbLocation = {
                    country: fb.countryName || 'Unknown',
                    countryCode: fb.countryCode || 'XX',
                    city: fb.cityName || 'Unknown',
                    region: fb.regionName || 'Unknown',
                    latitude: fb.latitude || 0,
                    longitude: fb.longitude || 0,
                    flag: countryCodeToFlag(fb.countryCode)
                };

                localStorage.setItem('userLocation', JSON.stringify(fbLocation));
                localStorage.setItem('userLocationTimestamp', Date.now().toString());

                console.log('[Geo] Location fetched from Fallback (freeipapi):', fbLocation);
                return fbLocation;
            }
        } catch (fallbackError) {
            console.error('[Geo] All geolocation services failed:', fallbackError?.message);
        }

        // Final hardcoded fallback
        return {
            country: 'Unknown',
            countryCode: 'XX',
            city: 'Unknown',
            region: 'Unknown',
            latitude: 0,
            longitude: 0,
            flag: '🌍'
        };
    }
};


// Get location display string - shows City, State, Country with flag
export const getLocationDisplay = (locationData, showCity = true) => {
    if (!locationData) return '🌍 Unknown Location';

    const { flag, city, region, country } = locationData;

    if (showCity && city && city !== 'Unknown') {
        // Show City, State if state is available, else City, Country
        if (region && region !== 'Unknown') {
            return `${flag} ${city}, ${region}`;
        }
        return `${flag} ${city}, ${country}`;
    }

    return `${flag} ${country}`;
};

// Calculate and format distance between two locations
export const getDistanceBetween = (location1, location2) => {
    if (!location1 || !location2) return null;

    const { latitude: lat1, longitude: lon1 } = location1;
    const { latitude: lat2, longitude: lon2 } = location2;

    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    return formatDistance(distance);
};

// Clear cached location (useful for VPN users)
export const clearLocationCache = () => {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationTimestamp');
    console.log('Location cache cleared');
};
