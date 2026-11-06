// Initialize Leaflet map centered on Roatán
const map = L.map('map').setView([16.3500, -86.4500], 11);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Storage for active map markers
const markers = {};

// Track current filter state
let currentCategory = 'all';
let currentSearchQuery = '';

// Category SVG Icons & Colors mapping
const categoryIcons = {
  beach: {
    color: '#0284c7', // Cyan / Blue
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M12 2v10"/><path d="M12 12a5 5 0 0 1 5 5"/><path d="M12 7a8 8 0 0 1 8 8"/></svg>`
  },
  food: {
    color: '#f59e0b', // Amber / Orange
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-6 0V2"/><path d="M15 2v16"/><path d="M8 2v16"/><path d="M5 2v6a3 3 0 0 0 6 0V2"/></svg>`
  },
  tour: {
    color: '#8b5cf6', // Purple
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/></svg>`
  },
  spot: {
    color: '#10b981', // Emerald / Green
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
  },
  service: {
    color: '#2563eb', // Royal Blue
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`
  }
};

// Helper function to create custom Leaflet divIcons
function createCustomMarkerIcon(category) {
  const config = categoryIcons[category] || categoryIcons.spot;
  const processedSvg = config.svg
    .replace('width="16"', 'width="18"')
    .replace('height="16"', 'height="18"')
    .replace('stroke="currentColor"', 'stroke="white"');

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div class="marker-pin" style="background-color: ${config.color};">
        ${processedSvg}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32]
  });
}

// Utility array-shuffling function (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Function to render cards and map markers
function renderSpots() {
  const directoryList = document.getElementById('directoryList');
  directoryList.innerHTML = '';

  // Clear existing markers from map
  Object.values(markers).forEach(marker => map.removeLayer(marker));

  // 1. Filter spots by active state, category, and search query
  const filteredSpots = spots.filter(spot => {
    const isActive = spot.active !== false; // Default to active if undefined
    const matchesCategory = currentCategory === 'all' || spot.category === currentCategory;
    const matchesSearch = spot.name.toLowerCase().includes(currentSearchQuery) || 
                          spot.description.toLowerCase().includes(currentSearchQuery);
    return isActive && matchesCategory && matchesSearch;
  });

  // 2. Separate into Featured and Standard tiers
  const featuredSpots = filteredSpots.filter(spot => spot.featured === true);
  const standardSpots = filteredSpots.filter(spot => !spot.featured);

  // 3. Randomly shuffle the featured spots for equal top-spot rotation
  const randomizedFeatured = shuffleArray(featuredSpots);

  // 4. Combine featured spots first, followed by standard spots
  const orderedSpots = [...randomizedFeatured, ...standardSpots];

  orderedSpots.forEach(spot => {
    // Create Custom SVG Map Marker
    const customIcon = createCustomMarkerIcon(spot.category);
    const marker = L.marker([spot.lat, spot.lng], { icon: customIcon }).addTo(map);
    marker.bindPopup(`<b>${spot.name}</b><br>${spot.description}`);
    markers[spot.id] = marker;

    // Build contact info HTML conditionally with Call + WhatsApp side-by-side
    let contactHTML = '';
    if (spot.phone || spot.email) {
      contactHTML = '<div class="spot-contact-info">';
      if (spot.phone) {
        const rawDigits = spot.phone.replace(/\D/g, '');
        contactHTML += `<a href="tel:+${rawDigits}" class="contact-link btn-call">📞 Call</a>`;
        contactHTML += `<a href="https://wa.me/${rawDigits}" target="_blank" rel="noopener noreferrer" class="contact-link btn-whatsapp">💬 WhatsApp</a>`;
      }
      if (spot.email) {
        contactHTML += `<a href="mailto:${spot.email}" class="contact-link">✉️ ${spot.email}</a>`;
      }
      contactHTML += '</div>';
    }

    // Build website button conditionally
    const websiteBtnHTML = spot.website 
      ? `<a href="${spot.website}" target="_blank" rel="noopener noreferrer" class="btn-website">Website</a>` 
      : '';

    // Build Featured Badge conditionally
    const featuredBadgeHTML = spot.featured 
      ? `<span class="featured-badge" style="color: #d97706; font-weight: 800; margin-left: auto;">★ FEATURED</span>` 
      : '';

    const categoryConfig = categoryIcons[spot.category] || categoryIcons.spot;

    // Build Card HTML element
    const card = document.createElement('article');
    card.className = spot.featured ? 'spot-card featured-card' : 'spot-card';
    card.innerHTML = `
      <img src="${spot.image}" alt="${spot.name}" class="spot-img" loading="lazy">
      <div class="spot-details">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
          <span class="spot-category" style="color: ${categoryConfig.color}">
            ${categoryConfig.svg}
            <span>${spot.category.toUpperCase()}</span>
          </span>
          ${featuredBadgeHTML}
        </div>
        <h3>${spot.name}</h3>
        <p>${spot.description}</p>
        ${contactHTML}
        <div class="spot-actions">
          <button class="btn-locate" onclick="focusSpot(${spot.id})">Locate on Map</button>
          <a href="${spot.directions}" target="_blank" rel="noopener noreferrer" class="btn-directions">Directions</a>
          ${websiteBtnHTML}
        </div>
      </div>
    `;

    directoryList.appendChild(card);
  });
}

// Function to pan map to spot when clicking "Locate on Map"
function focusSpot(id) {
  const spot = spots.find(s => s.id === id);
  if (spot && markers[id]) {
    map.flyTo([spot.lat, spot.lng], 15, { duration: 1.5 });
    markers[id].openPopup();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Event Listeners for Filters and Search
document.addEventListener('DOMContentLoaded', () => {
  renderSpots();

  // Category filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      currentCategory = e.target.getAttribute('data-category');
      renderSpots();
    });
  });

  // Real-time search input listener
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      renderSpots();
    });
  }

  // PWA Install Prompt Handler
  let deferredPrompt;
  const installBanner = document.getElementById('installBanner');
  const btnInstall = document.getElementById('btnInstall');
  const btnCloseBanner = document.getElementById('btnCloseBanner');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default browser banner
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom installation banner
    if (installBanner) {
      installBanner.style.display = 'flex';
    }
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      deferredPrompt = null;
      if (installBanner) {
        installBanner.style.display = 'none';
      }
    });
  }

  if (btnCloseBanner) {
    btnCloseBanner.addEventListener('click', () => {
      if (installBanner) {
        installBanner.style.display = 'none';
      }
    });
  }
});