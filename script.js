/* ═══════════════════════════════════════════════════════════════════════════
   Sharjah Motor Driving School — Main Script
   3D Scroll Animation Engine + Site Interactions
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────────────────
  const TOTAL_FRAMES = 192;
  const FRAME_PATH = (n) => {
    // Relative path to the 3d frames folder (from oFFICE/index.html → ../3d/)
    const padded = String(n).padStart(3, '0');
    return `../3d/ezgif-frame-${padded}.jpg`;
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let isReady = false;
  let currentFrame = 0;
  let rafId = null;

  // ── DOM References ─────────────────────────────────────────────────────────
  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const heroOverlay = document.getElementById('heroOverlay');
  const carRevealText = document.getElementById('carRevealText');
  const scrollHint = document.getElementById('scrollHint');
  const carSliderDOM = document.getElementById('carSlider');
  const heroSection = document.getElementById('hero');
  const loadBar = document.querySelector('.load-bar');
  const loadingOverlay = document.getElementById('loadingOverlay');

  // ── Loading Overlay Injection ──────────────────────────────────────────────
  function injectLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `
      <div class="load-logo">SMDS</div>
      <div class="load-bar-track"><div class="load-bar" id="loadBar"></div></div>
      <div class="load-text">Loading Experience...</div>
    `;
    document.body.appendChild(overlay);
  }

  // ── Canvas Setup ───────────────────────────────────────────────────────────
  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (isReady && images[currentFrame]?.complete) {
      drawFrame(currentFrame);
    }
  }

  function drawFrame(index) {
    if (!ctx || !canvas) return;
    const img = images[index];
    if (!img?.complete || !img.naturalWidth) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cover fit — center the image and scale to fill viewport
    const w = canvas.width;
    const h = canvas.height;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = w / h;

    let drawW, drawH, drawX, drawY;

    if (w <= 768) {
      // Mobile view: Zoom out so the complete 3D car is visible without severe cropping
      drawW = w * 1.5; // Show 150% of screen width (much less cropped than default cover)
      drawH = drawW / imgAspect;
      drawX = (w - drawW) / 2;
      // Push car slightly towards the lower half so text at top is totally clear
      drawY = h * 0.55 - drawH * 0.5;
    } else {
      // Desktop view: Full cover
      if (imgAspect > canvasAspect) {
        drawH = h;
        drawW = drawH * imgAspect;
      } else {
        drawW = w;
        drawH = drawW / imgAspect;
      }
      drawX = (w - drawW) / 2;
      drawY = (h - drawH) / 2;
    }

    if (w <= 768) {
      // On mobile, filling the empty top/bottom edges by smearing edge pixels
      if (drawY > 0) {
        ctx.drawImage(img, 0, 0, img.naturalWidth, 1, 0, 0, w, drawY + 2);
      }
      if (drawY + drawH < h) {
        ctx.drawImage(img, 0, img.naturalHeight - 1, img.naturalWidth, 1, 0, drawY + drawH - 2, w, h - (drawY + drawH) + 2);
      }
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  // ── Image Preloader ────────────────────────────────────────────────────────
  function preloadImages() {
    injectLoadingOverlay();
    const loadBarEl = document.getElementById('loadBar');

    // Load first frame immediately so it shows fast
    const firstImg = new Image();
    firstImg.src = FRAME_PATH(1);
    firstImg.onload = () => {
      images[0] = firstImg;
      drawFrame(0);
    };

    // Load all frames
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      images[i - 1] = img;

      img.onload = () => {
        loadedCount++;
        const pct = (loadedCount / TOTAL_FRAMES) * 100;
        if (loadBarEl) loadBarEl.style.width = pct + '%';

        if (loadedCount >= TOTAL_FRAMES * 0.3 && !isReady) {
          // We have 30% — enough to start smoothly
          isReady = true;
          const overlay = document.getElementById('loadingOverlay');
          if (overlay) {
            setTimeout(() => overlay.classList.add('done'), 400);
          }
          initScrollAnimation();
        }
      };

      img.onerror = () => {
        loadedCount++;
      };
    }
  }

  // ── Scroll-Driven Animation ────────────────────────────────────────────────
  function initScrollAnimation() {
    if (!heroSection) return;

    let targetFrame = 0;
    let animFrame = 0;

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function onScroll() {
      if (!heroSection) return;

      const scrollTop = window.scrollY;
      const heroTop = heroSection.offsetTop;
      const heroHeight = heroSection.offsetHeight;
      const viewportH = window.innerHeight;

      // How far through the hero scroll section are we? (0 to 1)
      const scrollProgress = Math.max(0, Math.min(1,
        (scrollTop - heroTop) / (heroHeight - viewportH)
      ));

      // Map progress → frame index
      targetFrame = Math.round(scrollProgress * (TOTAL_FRAMES - 1));
      targetFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, targetFrame));

      // Overlay opacity: fade out as we scroll (0→25% scroll)
      const overlayOpacity = Math.max(0, 1 - scrollProgress * 5);
      if (heroOverlay) {
        heroOverlay.style.opacity = overlayOpacity;
        heroOverlay.style.transform = `translateY(${scrollProgress * -80}px)`;
      }

      // Scroll hint: fade quickly
      if (scrollHint) {
        scrollHint.style.opacity = Math.max(0, 1 - scrollProgress * 15);
      }

      // Car Slider: fade out as we scroll
      if (carSliderDOM) {
        const sliderOpacity = Math.max(0, 1 - scrollProgress * 10);
        carSliderDOM.style.opacity = sliderOpacity;
        if (window.innerWidth > 900) {
          carSliderDOM.style.transform = `translateY(-50%) translateX(${scrollProgress * 100}px)`;
        } else {
          carSliderDOM.style.transform = `translateX(calc(50% + ${scrollProgress * 40}px))`;
        }
      }

      // Car reveal text: appear around 30%–70% scroll
      if (carRevealText) {
        const revealProgress = scrollProgress;
        if (revealProgress > 0.2 && revealProgress < 0.8) {
          const revealOpacity = Math.min(1, (revealProgress - 0.2) / 0.15) * Math.min(1, (0.8 - revealProgress) / 0.1);
          carRevealText.classList.add('visible');
          carRevealText.style.opacity = revealOpacity;
        } else {
          carRevealText.classList.remove('visible');
          carRevealText.style.opacity = 0;
        }
      }
    }

    function animate() {
      // Smooth lerp from current frame to target
      animFrame = lerp(animFrame, targetFrame, 0.12);
      const frameIdx = Math.round(animFrame);

      if (frameIdx !== currentFrame) {
        currentFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIdx));
        if (images[currentFrame]?.complete) {
          drawFrame(currentFrame);
        }
      }

      rafId = requestAnimationFrame(animate);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Initialize on load
    animate();
  }

  // ── Nav Scroll Effect + Active Link Highlighting ───────────────────────────
  function initNav() {
    const nav = document.getElementById('nav');
    const menuBtn = document.getElementById('menuBtn');
    const navLinks = document.getElementById('navLinks');
    const allNavLinks = document.querySelectorAll('.nav-link');

    // Scrolled class for heavier glass
    if (nav) {
      window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
      }, { passive: true });
    }

    // Mobile menu toggle
    if (menuBtn && navLinks) {
      menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
        // Animate hamburger bars
        const bars = menuBtn.querySelectorAll('span');
        const isOpen = navLinks.classList.contains('mobile-open');
        if (bars.length === 3) {
          bars[0].style.transform = isOpen ? 'translateY(7px) rotate(45deg)' : '';
          bars[1].style.opacity = isOpen ? '0' : '';
          bars[2].style.transform = isOpen ? 'translateY(-7px) rotate(-45deg)' : '';
        }
      });

      navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('mobile-open');
          menuBtn.querySelectorAll('span').forEach(b => {
            b.style.transform = '';
            b.style.opacity = '';
          });
        });
      });
    }

    // Active link via IntersectionObserver — highlights current section
    const sections = document.querySelectorAll('section[id], header[id]');
    if (sections.length && allNavLinks.length) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            allNavLinks.forEach(link => {
              const href = link.getAttribute('href');
              const isActive = href === `#${id}`;
              link.classList.toggle('active', isActive);
            });
          }
        });
      }, {
        rootMargin: '-40% 0px -55% 0px', // trigger when section is in middle viewport
        threshold: 0
      });

      sections.forEach(sec => sectionObserver.observe(sec));
    }
  }

  // ── Animated Number Counters ───────────────────────────────────────────────
  function animateCounter(el, target, suffix, duration) {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        start = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(start).toLocaleString() + suffix;
    }, 16);
  }

  function initCounters() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const target = parseInt(entry.target.dataset.target, 10);
        const suffix = entry.target.dataset.suffix || '';
        animateCounter(entry.target, target, suffix, 1800);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-target]').forEach(el => observer.observe(el));
  }

  // ── Scroll Reveal Cards ────────────────────────────────────────────────────
  function initRevealCards() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => {
          entry.target.classList.add('revealed');
        }, entry.target.dataset.delay || 0);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal-card').forEach((el, i) => {
      el.dataset.delay = i * 80;
      observer.observe(el);
    });
  }

  // ── Testimonials Carousel ─────────────────────────────────────────────────
  const testimonialsData = [
    { name: 'Mohammed Al Rashidi', role: 'Recent Graduate', text: 'Passed my road test on the first attempt! The instructors at Sharjah Motor Driving School are incredibly patient and professional. They made me feel confident behind the wheel.' },
    { name: 'Priya Sharma', role: 'Light Vehicle License', text: 'As a woman learning to drive, I felt completely safe and comfortable here. My instructor spoke Hindi and was so supportive throughout the entire journey. Highly recommended!' },
    { name: 'Ahmed Hassan', role: 'Heavy Vehicle License', text: 'I upgraded from light to heavy vehicle license here. The training was thorough and the instructors really know their stuff. The process was smooth and stress-free.' },
    { name: 'Fatima Al Zarooni', role: 'First-Time Driver', text: 'I was terrified to learn driving but the team here completely changed my perspective. Within weeks I was driving confidently on Sharjah roads. Amazing experience.' },
    { name: 'Rajesh Kumar', role: 'Manual Transmission', text: 'The manual transmission course was excellent. The instructors explained every step clearly. The vehicles are brand new and well-maintained. Worth every dirham!' },
    { name: 'Sarah Johnson', role: 'Refresher Course', text: 'After 5 years without driving, I was nervous. The refresher course was perfectly tailored to my needs. I passed my evaluation in just 2 weeks. Fantastic school!' },
  ];

  function initTestimonials() {
    const track = document.getElementById('testimonialsTrack');
    const dotsContainer = document.getElementById('testDots');
    if (!track || !dotsContainer) return;

    let activeIndex = 0;
    const extendedData = [...testimonialsData, ...testimonialsData, ...testimonialsData];
    const offset = testimonialsData.length;

    // Render cards
    extendedData.forEach((t, i) => {
      const card = document.createElement('div');
      card.className = 'test-card';
      
      let starsHtml = '';
      for (let s = 0; s < 5; s++) {
        starsHtml += '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
      }

      card.innerHTML = `
        <div class="test-stars">${starsHtml}</div>
        <p class="test-text">"${t.text}"</p>
        <div class="test-author">
          <div class="test-avatar">${t.name[0]}</div>
          <div>
            <div class="test-name">${t.name}</div>
            <div class="test-role">${t.role}</div>
          </div>
        </div>
      `;
      track.appendChild(card);
    });

    // Render dots
    testimonialsData.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'test-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    });

    function updateTrack(idx) {
      const realIdx = idx + offset;
      // Dynamically read actual card width (respects clamp() in CSS)
      const firstCard = track.querySelector('.test-card');
      const cardW = firstCard ? firstCard.offsetWidth : Math.min(360, window.innerWidth * 0.8);
      const gap = 24;
      const totalCardW = cardW + gap;
      const centerOffset = window.innerWidth / 2 - cardW / 2;
      track.style.transform = `translateX(${-realIdx * totalCardW + centerOffset}px)`;

      document.querySelectorAll('.test-card').forEach((c, i) => {
        c.classList.toggle('active', i === realIdx);
      });

      document.querySelectorAll('.test-dot').forEach((d, i) => {
        d.classList.toggle('active', i === idx);
      });
    }

    function goTo(idx) {
      activeIndex = ((idx % testimonialsData.length) + testimonialsData.length) % testimonialsData.length;
      updateTrack(activeIndex);
    }

    updateTrack(0);

    // Auto-advance
    setInterval(() => {
      activeIndex = (activeIndex + 1) % testimonialsData.length;
      updateTrack(activeIndex);
    }, 5000);

    // Recalculate on resize / orientation change
    window.addEventListener('resize', () => updateTrack(activeIndex), { passive: true });
  }

  // ── Enroll Form ────────────────────────────────────────────────────────────
  function initEnrollForm() {
    const form = document.getElementById('enrollForm');
    const btn = document.getElementById('enrollBtn');
    const success = document.getElementById('formSuccess');

    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (btn) {
        btn.textContent = 'Sending...';
        btn.disabled = true;
      }
      setTimeout(() => {
        form.querySelectorAll('input, select').forEach(el => el.value = '');
        if (btn) btn.style.display = 'none';
        if (success) success.style.display = 'flex';
      }, 1200);
    });
  }

  // ── Car Slider Interactivity ─────────────────────────────────────────────────
  function initCarSlider() {
    const slider = document.getElementById('carSlider');
    if (!slider) return;

    slider.style.touchAction = 'pan-y'; // Allows vertical scroll, but captures horizontal swipe

    let isDragging = false;
    let currentPos = 50;
    let direction = 1;

    function updateSlider(e) {
      const rect = slider.getBoundingClientRect();
      if (rect.width === 0) return;

      let clientX;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
      } else {
        clientX = e.clientX;
      }
      
      if (clientX === undefined) return;

      let xPos = clientX - rect.left;
      xPos = Math.max(0, Math.min(xPos, rect.width));

      currentPos = (xPos / rect.width) * 100;
      slider.style.setProperty('--clip-pos', `${currentPos}%`);
    }

    function autoAnimate() {
      if (!isDragging) {
        // Only auto-animate if the slider is in viewport (optimization)
        const rect = slider.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          currentPos += 0.15 * direction;
          if (currentPos >= 90) direction = -1;
          if (currentPos <= 10) direction = 1;
          slider.style.setProperty('--clip-pos', `${currentPos}%`);
        }
      }
      requestAnimationFrame(autoAnimate);
    }
    
    // Start auto animation
    requestAnimationFrame(autoAnimate);

    const handle = document.getElementById('carSliderHandle');

    // Mouse Events
    if (handle) {
      handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateSlider(e);
      });
    }
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) updateSlider(e);
    });

    // Touch Events
    if (handle) {
      handle.addEventListener('touchstart', (e) => {
        isDragging = true;
        updateSlider(e);
      }, { passive: true });
    }
    
    window.addEventListener('touchend', () => { isDragging = false; });
    window.addEventListener('touchcancel', () => { isDragging = false; });
    
    slider.addEventListener('touchmove', (e) => {
      if (isDragging) {
        if (e.cancelable) e.preventDefault();
        updateSlider(e);
      }
    }, { passive: false });
  }

  // ── Pricing Modal ──────────────────────────────────────────────────────────
  function initPricingModal() {
    const modal = document.getElementById('pricingModal');
    const closeBtn = document.getElementById('pricingModalClose');
    const modalContent = document.getElementById('pricingModalContent');
    const buttons = document.querySelectorAll('.view-details-btn');
    
    if (!modal || !modalContent) return;

    const tableData = {
      emirati: {
        title: "Emirati National Course",
        desc: "Complete breakdown of fees for UAE Nationals.",
        headers: ["Stage", "No. Of Classes", "Classes Fee", "Registration", "Training Card", "Vat 5%", "Total", "Test Fee", "Grand Total"],
        rows: [
          ["1st Time", "10 Classes", "600 AED", "100 AED", "105 AED", "20 AED", "525 AED", "300 AED", "825 AED"],
          ["2nd Time", "10 Classes", "600 AED", "100 AED", "105 AED", "20 AED", "525 AED", "300 AED", "825 AED"]
        ],
        totalRowConfig: { label: "Total Cost", colspan: 8, val: "1650 AED" },
        additionalNotes: [
          "5% VAT is strictly applicable on all driving classes and RTA fees.",
          "Additional charges apply for mandatory RTA Eye Test and Medical.",
          "Additional fees apply for extra classes required due to test failure."
        ]
      },
      beginner: {
        title: "Comprehensive Beginner Course",
        desc: "All-inclusive structure for first-time drivers.",
        headers: ["Stage", "No. Of Classes", "Classes Fee", "Registration", "Training Card", "Vat 5%", "Total", "Test Fee", "Grand Total"],
        rows: [
          ["Parking", "30", "1800 AED", "100 AED", "105 AED", "25 AED", "525 AED", "300 AED", "825 AED"],
          ["Assessment", "15", "900 AED", "200 AED", "105 AED", "55 AED", "1260 AED", "400 AED", "1660 AED"],
          ["Final", "10", "600 AED", "200 AED", "105 AED", "40 AED", "945 AED", "300 AED", "1245 AED"]
        ],
        initialFees: [
          ["Eye Test", "100 AED"],
          ["File Opening", "240 AED"],
          ["Theory Test and Classes", "552.5 AED"]
        ],
        totalRowConfig: { label: "Total Complete Package (Including Initial Fees)", colspan: 8, val: "4622.5 AED" },
        additionalNotes: [
          "5% VAT is strictly applicable on all driving classes and RTA fees.",
          "In case of road test failure, mandatory refresher classes (additional classes fee) and re-test booking fee will apply."
        ]
      },
      license: {
        title: "License Holder Course",
        desc: "For those who hold a prior driving license from another country.",
        headers: ["Stage", "No. Of Classes", "Classes Fee", "Registration", "Training Card", "Vat 5%", "Total", "Test Fee", "Grand Total"],
        rows: [
          ["1st Time", "5", "300 AED", "250 AED", "105 AED", "27.5 AED", "682.5 AED", "N/A", "682.5 AED"],
          ["2nd Time (Fail Case)", "5", "300 AED", "250 AED", "105 AED", "27.5 AED", "577.5 AED", "300 AED", "877.5 AED"]
        ],
        totalRowConfig: null,
        additionalNotes: [
          "5% VAT is strictly applicable on all driving classes and RTA fees.",
          "Additional charges apply for mandatory RTA Eye Test and File Opening.",
          "Any required extensions beyond 5 classes will incur standard class fees."
        ]
      }
    };

    function renderTable(key) {
      const data = tableData[key];
      if(!data) return "";
      
      let headerHtml = data.headers.map(th => `<th>${th}</th>`).join('');
      
      let rowsHtml = data.rows.map(row => 
        `<tr>
          ${row.map((cell, idx) => `<td data-label="${data.headers[idx]}">${cell}</td>`).join('')}
        </tr>`
      ).join('');

      // Add extra initial fees block if present (for beginner)
      let initialFeesHtml = "";
      if (data.initialFees) {
        initialFeesHtml = data.initialFees.map(fee => 
          `<tr style="background: rgba(255,255,255,0.02);">
            <td colspan="${data.headers.length - 1}" data-label="Initial Fee Item" style="text-align: right; font-weight: 500;">${fee[0]}</td>
            <td data-label="Amount" style="font-weight: 600; color: var(--yellow);">${fee[1]}</td>
          </tr>`
        ).join('');
      }

      let totalRowHtml = "";
      if (data.totalRowConfig) {
        totalRowHtml = `
          <tr class="total-row">
            <td colspan="${data.totalRowConfig.colspan}" data-label="Summary" style="text-align: right;">${data.totalRowConfig.label}</td>
            <td data-label="Amount">${data.totalRowConfig.val}</td>
          </tr>
        `;
      }
      
      let notesHtml = "";
      if (data.additionalNotes && data.additionalNotes.length > 0) {
        notesHtml = `
          <div style="margin-bottom: 24px;">
            <strong style="color: var(--yellow); font-size: 14px;">Additional Charges & Notes:</strong>
            <ul style="color: var(--text-muted); font-size: 13px; padding-left: 20px; margin-top: 8px;">
              ${data.additionalNotes.map(note => `<li>${note}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      return `
        <h3>${data.title}</h3>
        <p>${data.desc}</p>
        <div class="pricing-table-wrapper">
          <table class="pricing-modal-table">
            <thead>
              <tr>${headerHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${initialFeesHtml}
              ${totalRowHtml}
            </tbody>
          </table>
        </div>
        ${notesHtml}
        <div style="display: flex; justify-content: flex-end;">
          <a href="#enroll" class="btn-primary" onclick="document.getElementById('pricingModal').classList.remove('active'); document.body.style.overflow = '';">Enroll Now</a>
        </div>
      `;
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = btn.getAttribute('data-modal');
        modalContent.innerHTML = renderTable(key);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    preloadImages();
    initNav();
    initCounters();
    initRevealCards();
    initTestimonials();
    initEnrollForm();
    initCarSlider();
    initPricingModal();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
