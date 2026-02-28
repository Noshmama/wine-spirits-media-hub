/**
 * Wine & Spirits Media Hub — Podcast Panel
 * Features: beverage toggle, region filter, dynamic categories,
 * one-time DOM build, CSS show/hide filtering, text search,
 * lazy image loading, paginated "Show more".
 */

const PodcastPanel = {
  podcasts: [],
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
    this.grid = document.getElementById('podcast-grid');
    this.categorySelect = document.getElementById('podcast-category');
    this.regionSelect = document.getElementById('podcast-region');
    this.searchInput = document.getElementById('podcast-search');
    this.beverageButtons = document.querySelectorAll('#podcast-panel .beverage-toggle button');

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

    const data = await App.fetchData('data/podcasts.json');
    if (!data || !data.podcasts) {
      App.renderError(this.grid, 'Could not load podcasts. Data may not be available yet.');
      return;
    }

    // Sort podcasts newest-first by most recent episode date
    this.podcasts = data.podcasts.sort((a, b) => {
      const aDate = a.episodes && a.episodes.length > 0 ? new Date(a.episodes[0].pubDate || 0) : new Date(0);
      const bDate = b.episodes && b.episodes.length > 0 ? new Date(b.episodes[0].pubDate || 0) : new Date(0);
      return bDate - aDate;
    });
    this.buildCards();
    this.applyFilters();
  },

  buildCards() {
    if (this.podcasts.length === 0) {
      this.grid.innerHTML = '<div class="loading">No podcasts found.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    this.podcasts.forEach(podcast => {
      const card = document.createElement('div');
      card.className = 'podcast-card';
      card.dataset.categories = podcast.categories.join('|');
      card.dataset.beverage = podcast.beverageType || 'wine';
      card.dataset.regions = (podcast.regions || []).join('|');
      card.dataset.searchtext = (podcast.name + ' ' + podcast.author).toLowerCase();

      const name = App.escapeHtml(podcast.name);
      const author = App.escapeHtml(podcast.author);
      const artwork = App.escapeHtml(podcast.artwork || '');
      const description = App.escapeHtml(podcast.description || '');

      const badges = podcast.categories
        .map(c => {
          const isSpirits = SPIRITS_CATEGORY_SET.has(c);
          const cls = isSpirits ? 'category-badge badge-spirits' : 'category-badge';
          return `<span class="${cls}">${App.escapeHtml(c)}</span>`;
        })
        .join('');

      const episodes = podcast.episodes || [];
      let episodesHtml = '';

      if (episodes.length > 0) {
        const episodeItems = episodes.map(ep => {
          const epTitle = App.escapeHtml(ep.title);
          const epDate = App.formatDate(ep.pubDate);
          const audioUrl = ep.audioUrl ? App.escapeHtml(ep.audioUrl) : '';

          return `
            <div class="episode-item">
              <div class="episode-title">${epTitle}</div>
              <div class="episode-date">${epDate}${ep.duration ? ' &middot; ' + App.escapeHtml(ep.duration) : ''}</div>
              ${audioUrl ? `<audio controls preload="none" src="${audioUrl}"></audio>` : ''}
            </div>
          `;
        }).join('');

        episodesHtml = `
          <button class="episodes-toggle">Show ${episodes.length} recent episodes</button>
          <div class="episodes-list">${episodeItems}</div>
        `;
      }

      card.innerHTML = `
        <div class="podcast-top">
          <img class="artwork" data-src="${artwork}" alt="${name}" onerror="this.closest('.podcast-card').style.display='none'">
          <div class="podcast-info">
            <div class="podcast-name">
              <a href="#" class="podcast-name-link">${name}</a>
            </div>
            <div class="podcast-author">${author}</div>
            <div class="podcast-description">${description}</div>
            <div class="category-badges">${badges}</div>
          </div>
        </div>
        ${episodesHtml}
      `;

      // Attach episode toggle listener
      const toggle = card.querySelector('.episodes-toggle');
      if (toggle) {
        const list = card.querySelector('.episodes-list');

        toggle.addEventListener('click', () => {
          const isOpen = list.classList.toggle('open');
          toggle.textContent = isOpen
            ? 'Hide episodes'
            : `Show ${list.children.length} recent episodes`;
        });

        card.querySelectorAll('.artwork, .podcast-name-link').forEach(el => {
          el.style.cursor = 'pointer';
          el.addEventListener('click', (e) => {
            e.preventDefault();
            toggle.click();
          });
        });
      }

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
      this.showMoreBtn.textContent = `Show more podcasts (${remaining} remaining)`;
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
        emptyMsg.textContent = 'No podcasts found.';
        this.grid.appendChild(emptyMsg);
      }
      emptyMsg.style.display = '';
    } else if (emptyMsg) {
      emptyMsg.style.display = 'none';
    }
  }
};
