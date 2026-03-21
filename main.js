/* ═══════════════════════════════════════════════════════════════
   TASKBOOST.AI — MAIN JAVASCRIPT
═══════════════════════════════════════════════════════════════ */

// ── NAVIGATION ──────────────────────────────────────────────────
const nav = document.getElementById('nav');
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

// Sticky nav shadow on scroll
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });

// Mobile menu toggle
let menuOpen = false;
navToggle.addEventListener('click', () => {
  menuOpen = !menuOpen;
  navLinks.classList.toggle('open', menuOpen);
  navToggle.setAttribute('aria-expanded', menuOpen);
  document.body.style.overflow = menuOpen ? 'hidden' : '';

  // Animate hamburger to X
  const spans = navToggle.querySelectorAll('span');
  if (menuOpen) {
    spans[0].style.transform = 'translateY(7px) rotate(45deg)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  }
});

// Close menu when nav link clicked
navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    menuOpen = false;
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', false);
    document.body.style.overflow = '';
    const spans = navToggle.querySelectorAll('span');
    spans.forEach(s => s.style.transform = s.style.opacity = '');
  });
});

// ── SCROLL REVEAL ────────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Stagger children reveals within the same parent
      const siblings = entry.target.parentElement.querySelectorAll('.reveal:not(.visible)');
      siblings.forEach((el, idx) => {
        setTimeout(() => {
          el.classList.add('visible');
        }, idx * 80);
      });
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
});

document.querySelectorAll('.reveal').forEach(el => {
  revealObserver.observe(el);
});

// ── SMOOTH SCROLL FOR ANCHOR LINKS ──────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const navHeight = nav.offsetHeight;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  });
});

// ── OTHER INDUSTRY TOGGLE ────────────────────────────────────────
const industrySelect = document.getElementById('industry');
const otherGroup = document.getElementById('other-industry-group');
const otherInput = document.getElementById('other-industry');

if (industrySelect) {
  industrySelect.addEventListener('change', () => {
    const isOther = industrySelect.value === 'other';
    otherGroup.style.display = isOther ? 'flex' : 'none';
    if (isOther) {
      otherInput.focus();
    } else {
      otherInput.value = '';
    }
  });
}

// ── CONTACT FORM (Web3Forms) ────────────────────────────────────
const form = document.getElementById('contact-form');
const submitBtn = document.getElementById('submit-btn');
const formSuccess = document.getElementById('form-success');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic validation
    const accessKey = form.querySelector('[name="access_key"]').value;
    if (accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
      alert('⚠️ Contact form not configured yet.\n\nTo activate it:\n1. Go to web3forms.com\n2. Sign up free\n3. Get your access key\n4. Replace YOUR_WEB3FORMS_ACCESS_KEY in index.html');
      return;
    }

    // Loading state
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').textContent = 'Sending...';

    try {
      const formData = new FormData(form);
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        form.reset();
        formSuccess.classList.add('show');
        submitBtn.style.display = 'none';
        // Hide success message after 8s
        setTimeout(() => {
          formSuccess.classList.remove('show');
          submitBtn.style.display = '';
          submitBtn.disabled = false;
          submitBtn.querySelector('.btn-text').textContent = 'Get Your Free AI Audit';
        }, 8000);
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (err) {
      console.error('Form error:', err);
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').textContent = 'Get Your Free AI Audit';
      alert('Something went wrong. Please email us directly at jurgen@taskboost.ai');
    }
  });
}

// ── ACTIVE NAV LINK ON SCROLL ────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinksAll = document.querySelectorAll('.nav-link');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinksAll.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${id}`) {
          link.style.color = 'rgba(240, 235, 255, 1)';
        }
      });
    }
  });
}, {
  threshold: 0.4,
  rootMargin: '-80px 0px -40% 0px'
});

sections.forEach(section => sectionObserver.observe(section));

// ── REVIEWS ──────────────────────────────────────────────────────

// Render approved reviews from reviews.js
function renderReviews() {
  const grid = document.getElementById('reviews-grid');
  if (!grid) return;
  const reviews = window.APPROVED_REVIEWS || [];

  if (!reviews.length) {
    grid.innerHTML = '<p class="reviews-empty">Be the first to leave a review below.</p>';
    return;
  }

  grid.innerHTML = reviews.map(r => {
    const initials = (r.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const stars = Array.from({ length: 5 }, (_, i) =>
      `<span class="review-star${i < r.stars ? '' : ' empty'}">★</span>`).join('');
    const meta = [r.role, r.company].filter(Boolean).join(' · ');
    return `
      <div class="review-card reveal">
        <div class="review-stars">${stars}</div>
        <p class="review-text">${r.text}</p>
        <div class="review-author">
          <div class="review-avatar">${initials}</div>
          <div class="review-author-info">
            <strong>${r.name}</strong>
            ${meta ? `<span>${meta}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

renderReviews();

// Star picker
const starPicks = document.querySelectorAll('.star-pick');
const starsInput = document.getElementById('review-stars-input');
const starsLabel = document.getElementById('stars-label');
const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
let selectedStars = 0;

starPicks.forEach(star => {
  star.addEventListener('mouseenter', () => {
    const val = parseInt(star.dataset.val);
    starPicks.forEach(s => s.classList.toggle('hovered', parseInt(s.dataset.val) <= val));
  });
  star.addEventListener('mouseleave', () => {
    starPicks.forEach(s => s.classList.remove('hovered'));
  });
  star.addEventListener('click', () => {
    selectedStars = parseInt(star.dataset.val);
    starsInput.value = selectedStars;
    starPicks.forEach(s => s.classList.toggle('selected', parseInt(s.dataset.val) <= selectedStars));
    if (starsLabel) starsLabel.textContent = labels[selectedStars] + ' (' + selectedStars + '/5)';
  });
});

// Review form submit
const reviewForm = document.getElementById('review-form');
if (reviewForm) {
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedStars) {
      starsLabel.textContent = '⚠ Please select a star rating';
      starsLabel.style.color = '#ef4444';
      return;
    }
    const btn = document.getElementById('review-submit-btn');
    const success = document.getElementById('review-success');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Sending...';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: new FormData(reviewForm)
      });
      if (res.ok) {
        reviewForm.reset();
        selectedStars = 0;
        starsInput.value = '';
        starPicks.forEach(s => s.classList.remove('selected', 'hovered'));
        if (starsLabel) starsLabel.textContent = 'Select your rating';
        if (success) success.style.display = 'flex';
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch {
      alert('Connection error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Submit Review';
    }
  });
}
