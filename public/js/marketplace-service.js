// Updated
/**
 * Marketplace Service — Central API communication for marketplace
 * Handles listing CRUD, inquiries, saved listings, and local caching
 */

const MarketplaceService = {
  CACHE_KEY: 'marketplace_cache_',
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

  /**
   * Get listings with filters and pagination
   */
  getListings: async function(filters = {}) {
    const query = new URLSearchParams({
      category: filters.category || '',
      listing_type: filters.listingType || filters.listing_type || '',
      sport: filters.sport || '',
      seller_type: filters.sellerType || filters.seller_type || '',
      min_price: filters.minPrice || filters.min_price || '',
      max_price: filters.maxPrice || filters.max_price || '',
      sort: filters.sort || 'newest',
      page: filters.page || 1,
      limit: filters.limit || 20
    });

    // Remove empty params
    for (let [key, value] of query) {
      if (!value) query.delete(key);
    }

    const url = `/api/marketplace/listings?${query.toString()}`;
    const cacheKey = this.CACHE_KEY + url;

    // Check cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < this.CACHE_DURATION) {
        return data;
      }
    }

    // Fetch from API
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch listings');
    const data = await response.json();

    // Cache result
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  },

  /**
   * Get single listing
   */
  getListing: async function(id) {
    const cacheKey = this.CACHE_KEY + `listing_${id}`;
    
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < this.CACHE_DURATION) {
        return data;
      }
    }

    const response = await fetch(`/api/marketplace/listings/${id}`);
    if (!response.ok) throw new Error('Listing not found');
    const data = await response.json();

    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  },

  /**
   * Create a new listing
   */
  createListing: async function(listing) {
    this.validateListing(listing);

    const response = await fetch('/api/marketplace/listings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(listing)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create listing');
    }

    const data = await response.json();
    this.clearListingsCache();
    return data;
  },

  /**
   * Update an existing listing
   */
  updateListing: async function(id, updates) {
    const response = await fetch(`/api/marketplace/listings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update listing');
    }

    this.clearListingsCache();
    return await response.json();
  },

  /**
   * Delete a listing (soft-delete)
   */
  deleteListing: async function(id) {
    const response = await fetch(`/api/marketplace/listings/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to delete listing');
    this.clearListingsCache();
    return await response.json();
  },

  /**
   * Update listing status
   */
  updateStatus: async function(id, status) {
    const response = await fetch(`/api/marketplace/listings/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ status })
    });

    if (!response.ok) throw new Error('Failed to update status');
    this.clearListingsCache();
    return await response.json();
  },

  /**
   * Get current user's listings
   */
  getMyListings: async function() {
    const response = await fetch('/api/marketplace/my-listings', {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch your listings');
    return await response.json();
  },

  /**
   * Create an inquiry (send message to seller)
   */
  createInquiry: async function(listingId, message = '') {
    const response = await fetch('/api/marketplace/inquiries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        listingId: listingId,
        listing_id: listingId,
        message
      })
    });

    if (!response.ok) throw new Error('Failed to create inquiry');
    return await response.json();
  },

  /**
   * Get inquiries received as seller
   */
  getReceivedInquiries: async function() {
    const response = await fetch('/api/marketplace/inquiries/received', {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch inquiries');
    return await response.json();
  },

  /**
   * Get inquiries sent as buyer
   */
  getSentInquiries: async function() {
    const response = await fetch('/api/marketplace/inquiries/sent', {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch inquiries');
    return await response.json();
  },

  /**
   * Update inquiry status (seller only)
   */
  updateInquiryStatus: async function(inquiryId, status) {
    const response = await fetch(`/api/marketplace/inquiries/${inquiryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ status })
    });

    if (!response.ok) throw new Error('Failed to update inquiry status');
    return await response.json();
  },

  /**
   * Toggle save/bookmark on a listing
   */
  toggleSave: async function(listingId) {
    const response = await fetch(`/api/marketplace/saved/${listingId}`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to toggle save');
    return await response.json();
  },

  /**
   * Get all saved listings
   */
  getSavedListings: async function() {
    const response = await fetch('/api/marketplace/saved', {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch saved listings');
    return await response.json();
  },

  /**
   * Get seller's shop/listings
   */
  getSellerListings: async function(userId) {
    const response = await fetch(`/api/marketplace/seller/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch seller listings');
    return await response.json();
  },

  /**
   * Flag a listing for moderation
   */
  flagListing: async function(listingId, reason) {
    const response = await fetch(`/api/marketplace/listings/${listingId}/flag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });

    if (!response.ok) throw new Error('Failed to flag listing');
    return await response.json();
  },

  /**
   * Validation helper
   */
  validateListing: function(listing) {
    if (!listing.title || listing.title.length < 5 || listing.title.length > 120) {
      throw new Error('Title must be 5-120 characters');
    }
    if (!listing.category) {
      throw new Error('Category is required');
    }
    if (!listing.listingType && !listing.listing_type) {
      throw new Error('Listing type is required');
    }
    if (listing.description && listing.description.length > 2000) {
      throw new Error('Description must be under 2000 characters');
    }
    if (typeof listing.price !== 'number' || listing.price < 0) {
      throw new Error('Price must be a valid number');
    }
    const images = listing.imageUrls || listing.images;
    if (images && images.length > 8) {
      throw new Error('Maximum 8 images allowed');
    }
  },

  /**
   * Clear listings cache
   */
  clearListingsCache: function() {
    for (let key in localStorage) {
      if (key.startsWith(this.CACHE_KEY) && key.includes('listings')) {
        localStorage.removeItem(key);
      }
    }
  },

  /**
   * Save current search filters
   */
  saveSearch: function(searchName, filters) {
    const saved = JSON.parse(localStorage.getItem('saved_searches') || '{}');
    saved[searchName] = {
      filters: filters,
      timestamp: Date.now()
    };
    localStorage.setItem('saved_searches', JSON.stringify(saved));
    return true;
  },

  /**
   * Get all saved searches
   */
  getSavedSearches: function() {
    return JSON.parse(localStorage.getItem('saved_searches') || '{}');
  },

  /**
   * Delete a saved search
   */
  deleteSavedSearch: function(searchName) {
    const saved = JSON.parse(localStorage.getItem('saved_searches') || '{}');
    delete saved[searchName];
    localStorage.setItem('saved_searches', JSON.stringify(saved));
    return true;
  },

  /**
   * Get trending search terms based on activity
   */
  getTrendingSearches: async function() {
    try {
      const response = await fetch('/api/marketplace/trending-searches');
      if (!response.ok) throw new Error('Failed to fetch trending');
      return await response.json();
    } catch (error) {
      return [
        'Sports equipment',
        'Training sessions',
        'Yoga mats',
        'Running shoes',
        'Fitness coaching'
      ];
    }
  },

  /**
   * Get search suggestions based on category
   */
  getSearchSuggestions: function(category) {
    const suggestions = {
      'Sports Equipment': ['dumbbells', 'yoga mat', 'resistance bands', 'tennis racket', 'soccer ball'],
      'Sportswear & Apparel': ['running shoes', 'gym clothes', 'sports jacket', 'athletic leggings'],
      'Training Services': ['personal training', 'yoga classes', 'boxing coaching', 'swimming lessons'],
      'Recovery & Wellness': ['massage therapy', 'physical therapy', 'nutrition planning'],
      'Coaching Packages': ['fitness coaching', 'sports coaching', 'technique coaching'],
      'Club Memberships': ['gym membership', 'sports club', 'training facility access']
    };
    return suggestions[category] || [];
  },

  /**
   * Track search activity for analytics
   */
  trackSearch: function(query, filters) {
    const searches = JSON.parse(localStorage.getItem('search_history') || '[]');
    searches.push({
      query: query,
      filters: filters,
      timestamp: Date.now()
    });
    // Keep last 50 searches
    if (searches.length > 50) searches.shift();
    localStorage.setItem('search_history', JSON.stringify(searches));
  }
};


// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarketplaceService;
}

