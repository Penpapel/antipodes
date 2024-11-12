// app.js

let userLatitude, userLongitude;
let cityDataArray = [];
const overlay = document.getElementById('overlay');

// Fetch city data
fetch('cities.json')
  .then(response => response.json())
  .then(data => {
    cityDataArray = data;
    getUserLocation();
  })
  .catch(error => {
    console.error('Error fetching city data:', error);
  });

// Get user's current location
function getUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
      userLatitude = position.coords.latitude;
      userLongitude = position.coords.longitude;
      startCamera();
    }, error => {
      console.error('Error obtaining location:', error);
    });
  } else {
    alert('Geolocation is not supported by your browser.');
  }
}

// Start the camera feed
function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      const video = document.getElementById('camera-feed');
      video.srcObject = stream;
      video.play();
      setupDeviceOrientationListener();
    })
    .catch(error => {
      console.error('Error accessing the camera:', error);
    });
}

// Set up device orientation listener
function setupDeviceOrientationListener() {
  if (window.DeviceOrientationEvent) {
    // For iOS devices that require permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          } else {
            alert('Permission denied for device orientation.');
          }
        })
        .catch(console.error);
    } else {
      // For other devices
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  } else {
    alert('Device Orientation is not supported by your browser.');
  }
}

// Handle device orientation changes
function handleOrientation(event) {
  let alpha;

  // Use compass heading if available
  if (event.webkitCompassHeading) {
    alpha = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    alpha = event.alpha;
  } else {
    console.warn('Alpha (compass heading) is null.');
    return;
  }

  const deviceHeading = 360 - alpha; // Adjust for compass heading
  updateCityLabels(deviceHeading);
}

// Calculate bearing between two points
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRadians = degrees => degrees * (Math.PI / 180);
  const toDegrees = radians => radians * (180 / Math.PI);

  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let θ = Math.atan2(y, x);
  θ = toDegrees(θ);
  return (θ + 360) % 360; // Normalize to 0-360 degrees
}

// Determine if a city is within the viewing threshold
function isCityInView(deviceHeading, cityBearing, threshold = 15) {
  let angleDifference = Math.abs(deviceHeading - cityBearing);
  if (angleDifference > 180) {
    angleDifference = 360 - angleDifference;
  }
  return angleDifference <= threshold;
}

// Update city labels based on device heading
function updateCityLabels(deviceHeading) {
  overlay.innerHTML = ''; // Clear existing labels

  cityDataArray.forEach(city => {
    const cityBearing = calculateBearing(userLatitude, userLongitude, city.latitude, city.longitude);
    if (isCityInView(deviceHeading, cityBearing)) {
      const angleOffset = ((cityBearing - deviceHeading + 360) % 360);
      const screenWidth = window.innerWidth;
      const xPos = (angleOffset / 30) * screenWidth; // Adjust divisor for spread

      const label = document.createElement('div');
      label.className = 'city-label';
      label.style.left = `${xPos}px`;
      label.style.top = '50%'; // Adjust as needed
      label.textContent = city.name;

      overlay.appendChild(label);
    }
  });
}
