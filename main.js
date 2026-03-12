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
