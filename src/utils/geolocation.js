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

// Fetch user location from IP geolocation API (using IPInfo as requested)
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
                console.log('Using cached location data');
                return JSON.parse(cachedLocation);
            }
        }

        // Fetch fresh location data from IPInfo
        const API_TOKEN = "c3aceba5644587";
        console.log('Fetching location from ipinfo.io...');
        
        // Use ipinfo.io with the provided token
        const response = await axios.get(`https://ipinfo.io/json?token=${API_TOKEN}`, {
            timeout: 5000
        });

        const data = response.data;
        const [lat, lon] = (data.loc || "0,0").split(',');

        // Convert country code to full name (e.g. IN -> India)
        let countryFullName = data.country || 'Unknown';
        try {
            const regions = new Intl.DisplayNames(['en'], { type: 'region' });
            countryFullName = regions.of(data.country) || data.country;
        } catch (e) {
            console.warn('Could not localize country name', e);
        }

        const locationData = {
            country: countryFullName,
            countryCode: data.country || 'XX',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            flag: countryCodeToFlag(data.country)
        };

        // Cache the location data
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        localStorage.setItem('userLocationTimestamp', Date.now().toString());

        console.log('Location fetched from IPInfo:', locationData);
        return locationData;

    } catch (error) {
        console.error('Error fetching location from IPInfo, trying fallback...', error);
        
        try {
            // Fallback to freeipapi.com (No token required, very reliable)
            const fallbackRes = await axios.get('https://freeipapi.com/api/json', { timeout: 3000 });
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
                
                // Cache the fallback location too
                localStorage.setItem('userLocation', JSON.stringify(fbLocation));
                localStorage.setItem('userLocationTimestamp', Date.now().toString());
                
                console.log('Location fetched from Fallback (FreeIPAPI):', fbLocation);
                return fbLocation;
            }
        } catch (fallbackError) {
            console.error('All geolocation services failed:', fallbackError);
        }

        // Return fallback location if everything fails
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

// Get location display string
export const getLocationDisplay = (locationData, showCity = true) => {
    if (!locationData) return '🌍 Unknown Location';

    const { flag, city, country } = locationData;

    if (showCity && city && city !== 'Unknown') {
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
