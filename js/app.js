/**
 * Wine & Spirits Media Hub — Shared utilities and initialization
 */

const WINE_CATEGORIES = [
  'Business & Trade',
  'Connoisseur & Tasting',
  'Wines by Region',
  'Grape Varieties',
  'Winemaking & Viticulture',
  'Wine Collecting & Investment',
  'Wine & Food',
  'Wine Education',
  'Sustainability & Climate',
  'Emerging Wine Regions',
  'Wineries'
];

const SPIRITS_CATEGORIES = [
  'Whiskey',
  'Tequila & Mezcal',
  'Sotol',
  'Bacanora',
  'Raicilla',
  'Pulque',
  'Rum',
  'Vodka',
  'Gin',
  'Brandy & Cognac',
  'Cachaça',
  'Spirits Business',
  'Cocktails & Mixology',
  'Distilleries'
];

const WINE_REGIONS = {
  'US States': ['California', 'Oregon', 'New York', 'Virginia', 'Washington'],
  'Europe': ['France', 'Italy', 'Spain', 'Germany', 'England', 'Hungary', 'Georgia'],
  'Other Americas': ['Argentina', 'Chile', 'Brazil'],
  'Asia-Pacific': ['Australia', 'New Zealand']
};

const SPIRITS_REGIONS = {
  'US States': ['Kentucky', 'Tennessee', 'Texas', 'Colorado', 'Indiana', 'Hawaii'],
  'Europe': ['Scotland', 'Scottish Isles', 'Ireland', 'France', 'England'],
  'Mexico': ['Jalisco', 'Oaxaca', 'Chihuahua', 'Sonora', 'Durango'],
  'Caribbean': ['Cuba', 'Jamaica', 'Barbados', 'Martinique', 'Puerto Rico', 'Trinidad', 'Dominican Republic', 'Haiti', 'Guadeloupe'],
  'Other Americas': ['Canada', 'Brazil', 'Chile', 'Peru'],
  'Asia-Pacific': ['Japan', 'Australia']
};

const ALL_REGIONS = {
  'US States': ['Kentucky', 'Tennessee', 'Texas', 'Colorado', 'California', 'Oregon', 'New York', 'Indiana', 'Virginia', 'Washington', 'Hawaii'],
  'Europe': ['Scotland', 'Scottish Isles', 'Ireland', 'France', 'Italy', 'Spain', 'Germany', 'England', 'Hungary', 'Georgia'],
  'Mexico': ['Jalisco', 'Oaxaca', 'Chihuahua', 'Sonora', 'Durango'],
  'Caribbean': ['Cuba', 'Jamaica', 'Barbados', 'Martinique', 'Puerto Rico', 'Trinidad', 'Dominican Republic', 'Haiti', 'Guadeloupe'],
  'Other Americas': ['Canada', 'Argentina', 'Chile', 'Brazil', 'Peru'],
  'Asia-Pacific': ['Japan', 'Australia', 'New Zealand']
};

const SPIRITS_CATEGORY_SET = new Set(SPIRITS_CATEGORIES);

const App = {
  /**
   * Fetch JSON data with error handling
   */
  async fetchData(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`Failed to fetch ${url}:`, err);
      return null;
    }
  },

  /**
   * Format an ISO date string to a readable format
   */
  formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Render an error message into a container
   */
  renderError(container, message) {
    container.innerHTML = `<div class="error-message">${App.escapeHtml(message)}</div>`;
  },

  /**
   * Populate a category <select> based on current beverage filter.
   * "All" → grouped optgroups; "Wine" → wine only; "Spirits" → spirits only.
   */
  populateCategories(selectEl, beverageFilter) {
    selectEl.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = 'All';
    if (beverageFilter === 'Wine') {
      allOpt.textContent = 'Wine Topics';
    } else if (beverageFilter === 'Spirits') {
      allOpt.textContent = 'Spirit Types';
    } else {
      allOpt.textContent = 'All';
    }
    selectEl.appendChild(allOpt);

    if (beverageFilter === 'All') {
      // Wine optgroup
      const wineGroup = document.createElement('optgroup');
      wineGroup.label = 'Wine';
      for (const cat of WINE_CATEGORIES) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        wineGroup.appendChild(opt);
      }
      selectEl.appendChild(wineGroup);

      // Spirits optgroup
      const spiritsGroup = document.createElement('optgroup');
      spiritsGroup.label = 'Spirits';
      for (const cat of SPIRITS_CATEGORIES) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        spiritsGroup.appendChild(opt);
      }
      selectEl.appendChild(spiritsGroup);
    } else if (beverageFilter === 'Wine') {
      for (const cat of WINE_CATEGORIES) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        selectEl.appendChild(opt);
      }
    } else if (beverageFilter === 'Spirits') {
      for (const cat of SPIRITS_CATEGORIES) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        selectEl.appendChild(opt);
      }
    }
  },

  /**
   * Populate a region <select> based on current beverage filter.
   */
  populateRegions(selectEl, beverageFilter) {
    selectEl.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = 'All';
    defaultOpt.textContent = 'Regions';
    selectEl.appendChild(defaultOpt);

    let regionMap;
    if (beverageFilter === 'Wine') {
      regionMap = WINE_REGIONS;
    } else if (beverageFilter === 'Spirits') {
      regionMap = SPIRITS_REGIONS;
    } else {
      regionMap = ALL_REGIONS;
    }

    for (const [groupLabel, regions] of Object.entries(regionMap)) {
      const group = document.createElement('optgroup');
      group.label = groupLabel;
      for (const region of regions) {
        const opt = document.createElement('option');
        opt.value = region;
        opt.textContent = region;
        group.appendChild(opt);
      }
      selectEl.appendChild(group);
    }
  },

  /** Shared IntersectionObserver — loads images when they scroll into view */
  imageObserver: null,
  initImageObserver() {
    if (this.imageObserver) return;
    this.imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          this.imageObserver.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
  },

  /** Observe a single image element for lazy loading */
  observeImage(img) {
    if (this.imageObserver) {
      this.imageObserver.observe(img);
    }
  }
};

// Initialize both panels and modals once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  YouTubePanel.init();
  PodcastPanel.init();

  // About Me modal
  const modal = document.getElementById('about-modal');
  const openBtn = document.getElementById('about-btn');
  const closeBtn = document.getElementById('modal-close');

  openBtn.addEventListener('click', () => modal.classList.add('open'));
  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  // Contact form toggle and submission
  const contactToggle = document.getElementById('contact-toggle');
  const contactForm = document.getElementById('contact-form');
  const contactStatus = document.getElementById('contact-status');

  contactToggle.addEventListener('click', () => {
    const showing = contactForm.style.display === 'none';
    contactForm.style.display = showing ? 'block' : 'none';
    contactToggle.textContent = showing ? 'Hide contact form' : 'Get in touch';
  });

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('.contact-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    contactStatus.textContent = '';

    const addr = ['nosh', 'mama', '@', 'ya', 'hoo', '.com'].join('');
    const formData = new FormData(contactForm);

    try {
      const resp = await fetch('https://formsubmit.co/ajax/' + addr, {
        method: 'POST',
        body: formData
      });
      if (resp.ok) {
        contactStatus.textContent = 'Message sent! Thank you.';
        contactStatus.style.color = '#2e7d32';
        contactForm.reset();
      } else {
        throw new Error('Send failed');
      }
    } catch {
      contactStatus.textContent = 'Could not send. Please try again.';
      contactStatus.style.color = '#c62828';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message';
  });

  // Industry Analyses modal
  const analysesModal = document.getElementById('analyses-modal');
  const analysesBtn = document.getElementById('analyses-btn');
  const analysesClose = document.getElementById('analyses-modal-close');

  analysesBtn.addEventListener('click', () => analysesModal.classList.add('open'));
  analysesClose.addEventListener('click', () => analysesModal.classList.remove('open'));
  analysesModal.addEventListener('click', (e) => {
    if (e.target === analysesModal) analysesModal.classList.remove('open');
  });

  // Analyses modal contact form
  const acForm = document.getElementById('analyses-contact-form');
  const acStatus = document.getElementById('analyses-contact-status');

  if (acForm) {
    acForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = acForm.querySelector('.contact-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      acStatus.textContent = '';

      const addr = ['nosh', 'mama', 'm@', 'ya', 'hoo', '.com'].join('');
      const formData = new FormData(acForm);

      try {
        const resp = await fetch('https://formsubmit.co/ajax/' + addr, {
          method: 'POST',
          body: formData
        });
        if (resp.ok) {
          acStatus.textContent = 'Message sent! Thank you.';
          acStatus.style.color = '#2e7d32';
          acForm.reset();
        } else {
          throw new Error('Send failed');
        }
      } catch {
        acStatus.textContent = 'Could not send. Please try again.';
        acStatus.style.color = '#c62828';
      }

      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    });
  }
});
