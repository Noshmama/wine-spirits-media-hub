/**
 * Wine & Spirits Media Hub — YouTube Panel
 * Features: beverage toggle, region filter, dynamic categories,
 * one-time DOM build, CSS show/hide filtering, text search,
 * lazy image loading, paginated "Show more".
 */

const YouTubePanel = {
  videos: [],
  grid: null,
  categorySelect: null,
  regionSelect: null,
  searchInput: null,
  beverageButtons: [],
  currentBeverage: 'All',
  allCards: [],
  PAGE_SIZE: 30,
  visibleLimit: 30,
  showMoreBtn: null,

  async init() {
    this.grid = document.getElementById('youtube-grid');
    this.categorySelect = document.getElementById('youtube-category');
    this.regionSelect = document.getElementById('youtube-region');
    this.searchInput = document.getElementById('youtube-search');
    this.beverageButtons = document.querySelectorAll('#youtube-panel .beverage-toggle button');

    App.initImageObserver();

    // Populate initial categories and regions
    App.populateCategories(this.categorySelect, 'All');
    App.populateRegions(this.regionSelect, 'All');

    // Beverage toggle
    this.beverageButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.beverageButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentBeverage = btn.dataset.beverage;
        App.populateCategories(this.categorySelect, this.currentBeverage);
        App.populateRegions(this.regionSelect, this.currentBeverage);
        this.visibleLimit = this.PAGE_SIZE;
        this.applyFilters();
      });
    });

    // Reset pagination when filters change
    this.categorySelect.addEventListener('change', () => {
      this.visibleLimit = this.PAGE_SIZE;
      this.applyFilters();
    });

    this.regionSelect.addEventListener('change', () => {
      this.visibleLimit = this.PAGE_SIZE;
      this.applyFilters();
    });

    let searchTimer;
    this.searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.visibleLimit = this.PAGE_SIZE;
        this.applyFilters();
      }, 200);
    });

    // Video player modal
    const modal = document.getElementById('video-modal');
    const closeBtn = document.getElementById('video-modal-close');
    const embed = document.getElementById('video-embed');

    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      embed.innerHTML = '';
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        embed.innerHTML = '';
      }
    });

    const data = await App.fetchData('data/youtube.json');
    if (!data || !data.videos) {
      App.renderError(this.grid, 'Could not load videos. Data may not be available yet.');
      return;
    }

    // Sort videos newest-first by publish date
    this.videos = data.videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    this.buildCards();
    this.applyFilters();
  },

  openVideo(videoId) {
    const modal = document.getElementById('video-modal');
    const embed = document.getElementById('video-embed');
    embed.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    modal.classList.add('open');
  },

  buildCards() {
    if (this.videos.length === 0) {
      this.grid.innerHTML = '<div class="loading">No videos found.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    this.videos.forEach(video => {
      const card = document.createElement('div');
      card.className = 'video-card';
      card.dataset.categories = video.categories.join('|');
      card.dataset.beverage = video.beverageType || 'wine';
      card.dataset.regions = (video.regions || []).join('|');
      card.dataset.searchtext = (video.title + ' ' + video.channel).toLowerCase();

      const title = App.escapeHtml(video.title);
      const channel = App.escapeHtml(video.channel);
      const date = App.formatDate(video.publishedAt);
      const thumbnail = App.escapeHtml(video.thumbnail || '');
      const videoId = App.escapeHtml(video.videoId);

      const badges = video.categories
        .map(c => {
          const isSpirits = SPIRITS_CATEGORY_SET.has(c);
          const cls = isSpirits ? 'category-badge badge-spirits' : 'category-badge';
          return `<span class="${cls}">${App.escapeHtml(c)}</span>`;
        })
        .join('');

      card.innerHTML = `
        <a href="#" data-video-id="${videoId}">
          <img class="thumbnail" data-src="${thumbnail}" alt="${title}">
        </a>
        <div class="video-info">
          <div class="video-title">
            <a href="#" data-video-id="${videoId}">${title}</a>
          </div>
          <div class="video-channel">${channel}</div>
          <div class="video-date">${date}</div>
          <div class="category-badges">${badges}</div>
        </div>
      `;

      card.querySelectorAll('[data-video-id]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.openVideo(el.dataset.videoId);
        });
      });

      this.allCards.push(card);
      fragment.appendChild(card);
    });

    // "Show more" button
    this.showMoreBtn = document.createElement('button');
    this.showMoreBtn.className = 'show-more-btn';
    this.showMoreBtn.addEventListener('click', () => {
      this.visibleLimit += this.PAGE_SIZE;
      this.applyFilters();
    });

    this.grid.innerHTML = '';
    this.grid.appendChild(fragment);
    this.grid.appendChild(this.showMoreBtn);
  },

  applyFilters() {
    const category = this.categorySelect.value;
    const region = this.regionSelect.value;
    const query = this.searchInput.value.toLowerCase().trim();
    const beverage = this.currentBeverage;

    let matchCount = 0;
    let shownCount = 0;

    for (let i = 0; i < this.allCards.length; i++) {
      const card = this.allCards[i];
      const cardBeverage = card.dataset.beverage;
      const cardCategories = card.dataset.categories.split('|');
      const cardRegions = card.dataset.regions;

      // Beverage filter
      const matchesBeverage = beverage === 'All' ||
        cardBeverage === beverage.toLowerCase();

      // Category filter
      const matchesCategory = category === 'All' || cardCategories.includes(category);

      // Region filter
      const matchesRegion = region === 'All' || (cardRegions && cardRegions.split('|').includes(region));

      // Search filter
      const matchesSearch = !query || card.dataset.searchtext.includes(query);

      if (matchesBeverage && matchesCategory && matchesRegion && matchesSearch) {
        matchCount++;
        if (matchCount <= this.visibleLimit) {
          card.style.display = '';
          shownCount++;
          const img = card.querySelector('img[data-src]');
          if (img) App.observeImage(img);
        } else {
          card.style.display = 'none';
        }
      } else {
        card.style.display = 'none';
      }
    }

    // Show/hide "Show more" button
    const remaining = matchCount - shownCount;
    if (remaining > 0) {
      this.showMoreBtn.textContent = `Show more videos (${remaining} remaining)`;
      this.showMoreBtn.style.display = '';
    } else {
      this.showMoreBtn.style.display = 'none';
    }

    // Empty state
    let emptyMsg = this.grid.querySelector('.empty-message');
    if (matchCount === 0) {
      if (!emptyMsg) {
        emptyMsg = document.createElement('div');
        emptyMsg.className = 'loading empty-message';
        emptyMsg.textContent = 'No videos found.';
        this.grid.appendChild(emptyMsg);
      }
      emptyMsg.style.display = '';
    } else if (emptyMsg) {
      emptyMsg.style.display = 'none';
    }
  }
};
