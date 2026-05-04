const navbarNav = document.querySelector('.navbar-nav');
const hamburger = document.querySelector('#hamburger-menu');

if (hamburger && navbarNav) {
  hamburger.addEventListener('click', function (e) {
    // prevent the anchor's default navigation (href="#") which scrolls to top
    e.preventDefault();
    // prevent the click from bubbling to the document handler
    e.stopPropagation();
    navbarNav.classList.toggle('active');
  });
}

document.addEventListener('click', function (e) {
  // If clicking outside the hamburger and the nav, close the menu
  if (
    hamburger &&
    navbarNav &&
    !hamburger.contains(e.target) &&
    !navbarNav.contains(e.target)
  ) {
    navbarNav.classList.remove('active');
  }
});

const rssUrlInput = document.getElementById('rss-url');
const loadRssBtn = document.getElementById('load-rss');
const rssContainer = document.getElementById('rss-container');
const sampleButtons = document.querySelectorAll('.rss-sample');
const DEFAULT_FEED =
  'https://kreastudioroom.blogspot.com/feeds/posts/default?alt=rss';

function stripTags(html) {
  return html.replace(/<[^>]*>/g, '');
}

function truncate(text, max = 220) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + '…';
}

function renderItems(items) {
  if (!rssContainer) return;
  if (!items || items.length === 0) {
    rssContainer.innerHTML = '<p>Tidak ada item untuk ditampilkan.</p>';
    return;
  }

  const html = items
    .map((it) => {
      const title = it.title || '(tidak ada judul)';
      const link = it.link || '#';
      const pubDate = it.pubDate ? `<time>${it.pubDate}</time>` : '';
      const desc = it.description
        ? truncate(stripTags(it.description), 280)
        : '';
      const imgHtml = it.image
        ? `<div class="rss-thumb-wrap"><img class="rss-thumb" src="${it.image}" alt="" loading="lazy"/></div>`
        : '';
      // add tabindex for keyboard focus and store link in data-href for click handling
      return `
          <article class="rss-item" tabindex="0" data-href="${link}">
            ${imgHtml}
            <h3 class="rss-title"><a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
            <div class="rss-meta">${pubDate}</div>
            <p class="rss-desc">${desc}</p>
          </article>
        `;
    })
    .join('');

  rssContainer.innerHTML = html;
  bindRssItemHandlers();
}

// Make RSS items clickable and keyboard-accessible
function bindRssItemHandlers() {
  const items = rssContainer.querySelectorAll('.rss-item');
  items.forEach((el) => {
    // prevent adding multiple handlers
    if (el.__bound) return;
    el.__bound = true;

    el.style.cursor = 'pointer';

    el.addEventListener('click', (e) => {
      const href = el.getAttribute('data-href');
      if (href) window.open(href, '_blank', 'noopener');
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const href = el.getAttribute('data-href');
        if (href) window.open(href, '_blank', 'noopener');
      }
    });
  });
}
function parseAndExtract(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const items = [];

  const rssItems = doc.querySelectorAll('item');
  if (rssItems && rssItems.length) {
    rssItems.forEach((node) => {
      const title = node.querySelector('title')?.textContent || '';
      const link =
        node.querySelector('link')?.textContent ||
        node.querySelector('link')?.getAttribute('href') ||
        '';
      const pubDate = node.querySelector('pubDate')?.textContent || '';
      const description =
        node.querySelector('description')?.textContent ||
        node.querySelector('content:encoded')?.textContent ||
        '';
      // try to extract an image: media:thumbnail, enclosure, or first <img> in description
      let image = '';
      const mediaThumb = node.getElementsByTagName('media:thumbnail')[0];
      if (mediaThumb && mediaThumb.getAttribute) {
        image = mediaThumb.getAttribute('url') || '';
      }
      if (!image) {
        const enclosure = node.querySelector('enclosure');
        if (enclosure && enclosure.getAttribute)
          image = enclosure.getAttribute('url') || '';
      }
      if (!image) {
        const imgMatch = (description || '').match(
          /<img[^>]+src=["']?([^"'>\s]+)/i,
        );
        if (imgMatch) image = imgMatch[1];
      }

      items.push({ title, link, pubDate, description, image });
    });
    return items;
  }

  const atomEntries = doc.querySelectorAll('entry');
  if (atomEntries && atomEntries.length) {
    atomEntries.forEach((node) => {
      const title = node.querySelector('title')?.textContent || '';
      const link =
        node.querySelector('link')?.getAttribute('href') ||
        node.querySelector('link')?.textContent ||
        '';
      const pubDate =
        node.querySelector('updated')?.textContent ||
        node.querySelector('published')?.textContent ||
        '';
      const description =
        node.querySelector('summary')?.textContent ||
        node.querySelector('content')?.textContent ||
        '';
      // try to extract image from media tags or content
      let image = '';
      const mediaThumb = node.getElementsByTagName('media:thumbnail')[0];
      if (mediaThumb && mediaThumb.getAttribute)
        image = mediaThumb.getAttribute('url') || '';
      if (!image) {
        const imgMatch = (description || '').match(
          /<img[^>]+src=["']?([^"'>\s]+)/i,
        );
        if (imgMatch) image = imgMatch[1];
      }
      items.push({ title, link, pubDate, description, image });
    });
    return items;
  }

  return items;
}

async function loadRSS(url) {
  if (!rssContainer) return;
  rssContainer.innerHTML = '<p>Memuat... Mohon tunggu.</p>';
  try {
    // if caller passed a non-normalized URL, normalize it first
    url = normalizeFeedUrl(url);
    const proxy =
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
    const res = await fetch(proxy);
    if (!res.ok) throw new Error('Gagal memuat feed');
    const text = await res.text();
    const items = parseAndExtract(text).slice(0, 6);
    renderItems(items);
  } catch (err) {
    rssContainer.innerHTML = `<p>Terjadi kesalahan: ${err.message}</p>`;
  }
}

// auto-load default feed on page load
document.addEventListener('DOMContentLoaded', () => {
  loadRSS(DEFAULT_FEED);
});

if (loadRssBtn) {
  loadRssBtn.addEventListener('click', () => {
    const url = rssUrlInput?.value?.trim();
    if (!url) {
      rssContainer.innerHTML = '<p>Silakan masukkan URL feed RSS.</p>';
      return;
    }
    loadRSS(url);
  });
}

if (sampleButtons && sampleButtons.length) {
  sampleButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const feed = e.currentTarget.getAttribute('data-feed');
      const normalized = normalizeFeedUrl(feed);
      if (rssUrlInput) rssUrlInput.value = normalized;
      loadRSS(normalized);
    });
  });
}

// Normalize user-entered or sample feed identifiers into a usable feed URL
function normalizeFeedUrl(feed) {
  if (!feed) return feed;
  let candidate = feed.trim();

  // add https:// if scheme is missing
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    candidate = 'https://' + candidate;
  }

  try {
    const u = new URL(candidate);

    // If it's a Blogger (blogspot) domain and no feed path provided,
    // use the Blogger canonical feed URL
    if (
      u.hostname.endsWith('blogspot.com') &&
      (u.pathname === '/' || u.pathname === '')
    ) {
      return `${u.origin}/feeds/posts/default?alt=rss`;
    }

    // If the pathname already looks like a feed or an xml file, return as-is
    if (
      u.pathname.includes('/feeds') ||
      u.pathname.endsWith('.xml') ||
      u.pathname.endsWith('/rss')
    ) {
      return candidate;
    }

    // If the URL is just a site root (no path), try common feed endpoints
    if (u.pathname === '/' || u.pathname === '') {
      return `${u.origin}/feed`;
    }

    return candidate;
  } catch (e) {
    return candidate;
  }
}

/* Scroll-to-top button behavior + auto year update */
(function () {
  try {
    const scrollBtn = document.getElementById('scroll-top');
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }

    if (!scrollBtn) return;

    const onScroll = () => {
      if (window.scrollY > 300) scrollBtn.classList.add('visible');
      else scrollBtn.classList.remove('visible');
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // initial check in case page is loaded scrolled
    onScroll();

    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    scrollBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollBtn.click();
      }
    });
  } catch (err) {
    // safe no-op on older browsers
    console.warn('Scroll-to-top init failed', err);
  }
})();

/* Navbar glass toggle on scroll */
(function () {
  try {
    const header = document.querySelector('header.navbar');
    if (!header) return;
    const THRESHOLD = 48; // px scrolled before applying glass

    const onScroll = () => {
      if (window.scrollY > THRESHOLD) header.classList.add('glass');
      else header.classList.remove('glass');
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // initial state
    onScroll();
  } catch (err) {
    console.warn('Navbar glass init failed', err);
  }
})();

/* Page loader hide on window load */
(function () {
  try {
    const loader = document.getElementById('siteLoader');
    if (!loader) return;
    // Wait for full load (including images); then fade out
    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.classList.add('hidden');
        // remove from DOM after transition
        setTimeout(() => loader.remove(), 200);
      }, 100); // small delay so moment-like effect is visible (shortened)
    });
  } catch (err) {
    console.warn('Loader init failed', err);
  }
})();

// Dataset - replace with real integration when available
const PASS_LIST = new Set([
  '1234567890',
  '0096182577',
  '0081456273',
  '0078399954',
  '0081981716',
  '0099476706',
  '0086178321',
  '0078110719',
  '0073570912',
  '0088394392',
  '0082983249',
  '0081716239',
  '0082911315',
  '0083288355',
  '0085295788',
  '0084762488',
  '0088451876',
  '0079149197',
  '0081843363',
  '0089486580',
  '3077842382',
  '0076767989',
  '0089075166',
  '0087504309',
  '0087444716',
  '0085962627',
  '0085077101',
  '0085325367',
  '0076454751',
  '0087068051',
]);
const FAIL_LIST = new Set(['202300100', '202300101']);

// Optional student info lookup (NISN -> name, major).
// Fill in real data as available. If a NISN exists in PASS/FAIL lists
// but is not in this map, the UI will show status but no name/major.
const STUDENT_INFO = {
  '0096182577': { name: 'Aurel Musdalifah', major: 'TKJ' },
  '0081456273': { name: 'Muh. Roihan', major: 'TKJ' },
  '0078399954': { name: 'Muh. Ridho Anshorudin', major: 'TKJ' },
  '0081981716': { name: 'Rorokun Nadhiva Maryam', major: 'TKJ' },
  '0099476706': { name: 'Gilang Fabriano', major: 'TKJ' },
  '0086178321': { name: 'Aulia Nour Anjani', major: 'TKJ' },
  '0078110719': { name: 'Alan Bahtiar Dapit', major: 'TKJ' },
  '0073570912': { name: 'Andi Saifullah', major: 'TKJ' },
  '0088394392': { name: 'Gina Nur Afifah', major: 'TKJ' },
  '0082983249': { name: 'Rifqi Azifah Azka Fadhilla', major: 'TKJ' },
  '0081716239': { name: 'Revi Airin', major: 'TKJ' },
  '0082911315': { name: 'Magfirah Mutiara Pidani', major: 'TKJ' },
  '0083288355': { name: 'Jamung Istima Maulani', major: 'TKJ' },
  '0085295788': { name: 'Muh Adrian', major: 'TKJ' },
  '0084762488': { name: 'Nur Hidayah', major: 'TKJ' },
  '0088451876': { name: 'Zahra Yusrinnisa Agustin', major: 'TKJ' },
  '0079149197': { name: 'Hurin Ain Wibawati', major: 'TKJ' },
  '0081843363': { name: 'Dewi Kusuma Ningrum', major: 'TKJ' },
  '0089486580': { name: 'Reva Aulia Chariza', major: 'TKJ' },
  3077842382: { name: 'Khoirun Nisa', major: 'TKJ' },
  '0076767989': { name: 'Muh. Hidhir Saiful Ahyar', major: 'TKJ' },
  '0089075166': { name: 'Andi Alvina Fauziani A', major: 'TKJ' },
  '0087504309': { name: 'Aurel Juliantika', major: 'TKJ' },
  '0087444716': { name: 'Manshurrin', major: 'TKJ' },
  '0085962627': { name: 'Ainun Jariah', major: 'TKJ' },
  '0085077101': { name: 'Fadli Riviansyah', major: 'TSM' },
  '0085325367': { name: 'Fahri Isnan Hafid', major: 'TSM' },
  '0076454751': { name: 'Nicky Mulya Firdaus D', major: 'TSM' },
  '0087068051': { name: 'Muh. Nauval Aqilah Bambang', major: 'TSM' },
  // add more mappings here
};

const form = document.getElementById('cek-form');
const nisnInput = document.getElementById('nisn');
const result = document.getElementById('announce-result');
const yearEl = document.getElementById('current-year-announce');
if (yearEl) yearEl.textContent = new Date().getFullYear();

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = (nisnInput.value || '').trim();
  const nisn = raw.replace(/\s+/g, '');
  if (!/^[0-9]{5,20}$/.test(nisn)) {
    result.innerHTML =
      '<p class="result warn">NISN tidak valid. Mohon masukkan angka saja (5-20 digit).</p>';
    return;
  }

  const info = STUDENT_INFO[nisn];
  const infoHtml = info
    ? `<p class="student-name">Nama: <strong>${info.name}</strong></p><p class="student-major">Jurusan: <strong>${info.major}</strong></p>`
    : '';

  // Lookup sets + include student info when available
  if (PASS_LIST.has(nisn)) {
    result.innerHTML = `${infoHtml}<p class="result pass">Selamat Anda — <strong>LULUS</strong>. Semoga Aman, Selamat dan Lancar Barokah yah 😊.</p>`;
  } else if (FAIL_LIST.has(nisn)) {
    result.innerHTML = `${infoHtml}<p class="result fail">Maaf Anda — <strong>TIDAK LULUS</strong> 🙏🏾.</p>`;
  } else if (info) {
    // Student found but no pass/fail status recorded
    result.innerHTML = `${infoHtml}<p class="result unknown">Status kelulusan belum tersedia. Silahkan hubungi admin sekolah.</p>`;
  } else {
    result.innerHTML =
      '<p class="result unknown">Data NISN Anda <strong>TIDAK DITEMUKAN</strong>, Silahkan hubungi admin sekolah 😇.</p>';
  }
});

/* Testimonials slider behavior */
(function () {
  try {
    const track = document.getElementById('testimonialsTrack');
    const prevBtn = document.getElementById('prevTesti');
    const nextBtn = document.getElementById('nextTesti');
    const dotsWrap = document.getElementById('testiDots');
    if (!track) return;

    const cards = Array.from(track.querySelectorAll('.testimonial-card'));
    let activeIndex = 0;
    const cardWidth = () => cards[0]?.getBoundingClientRect().width || 320;

    function updateDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      cards.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.classList.toggle('active', i === activeIndex);
        btn.addEventListener('click', () => scrollToIndex(i));
        dotsWrap.appendChild(btn);
      });
    }

    function scrollToIndex(i) {
      activeIndex = i;
      track.scrollTo({ left: i * (cardWidth() + 16), behavior: 'smooth' });
      updateDots();
    }

    if (prevBtn)
      prevBtn.addEventListener('click', () =>
        scrollToIndex(Math.max(0, activeIndex - 1)),
      );
    if (nextBtn)
      nextBtn.addEventListener('click', () =>
        scrollToIndex(Math.min(cards.length - 1, activeIndex + 1)),
      );

    // update active based on scroll position
    let scrollTimeout;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const idx = Math.round(track.scrollLeft / (cardWidth() + 16));
        activeIndex = Math.min(cards.length - 1, Math.max(0, idx));
        updateDots();
      }, 120);
    });

    // init
    updateDots();

    // autoplay: advance every 5s
    let autoplay = setInterval(() => {
      activeIndex = activeIndex + 1 < cards.length ? activeIndex + 1 : 0;
      scrollToIndex(activeIndex);
    }, 5000);

    // pause on hover
    track.addEventListener('mouseenter', () => clearInterval(autoplay));
    track.addEventListener('mouseleave', () => {
      autoplay = setInterval(() => {
        activeIndex = activeIndex + 1 < cards.length ? activeIndex + 1 : 0;
        scrollToIndex(activeIndex);
      }, 5000);
    });
  } catch (err) {
    console.warn('Testimonials init failed', err);
  }
})();
