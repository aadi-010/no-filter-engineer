(() => {
  'use strict';

  const hero = document.getElementById('hero');
  const stage = document.getElementById('stage');
  const sheet = document.getElementById('sheet');
  const hint = document.getElementById('hint');

  // Modal / Drawer elements
  const ctaBtn = document.getElementById('cta-learn-more');
  const drawer = document.getElementById('drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerBackdrop = document.getElementById('drawer-backdrop');

  if (!hero || !stage || !sheet) return;

  const ctx = stage.getContext('2d', { alpha: false });
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let totalFrames = parseInt(sheet.getAttribute('data-frames'), 10) || 45;
  let centerFrame = Math.floor((totalFrames - 1) / 2);
  let currentFrame = centerFrame;
  let targetFrame = centerFrame;
  let isAnimating = false;
  let isReady = false;
  let hasInteracted = false;
  let isDrawerOpen = false;

  // Track pointer coordinates
  let mouseX = 0.5;
  let mouseY = 0.5;

  /**
   * Resize canvas taking into account device pixel ratio for maximum sharpness
   */
  function resizeCanvas() {
    const rect = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (stage.width !== targetW || stage.height !== targetH) {
      stage.width = targetW;
      stage.height = targetH;
    }

    if (isReady) {
      render(currentFrame);
    }
  }

  /**
   * Render the frame onto canvas using object-fit: cover logic
   */
  function render(frameIdx) {
    if (!sheet.complete || !sheet.naturalWidth) return;

    const clamped = Math.max(0, Math.min(totalFrames - 1, Math.round(frameIdx)));
    const frameW = sheet.naturalWidth / totalFrames;
    const frameH = sheet.naturalHeight;

    const sx = clamped * frameW;
    const sy = 0;

    const cw = stage.width;
    const ch = stage.height;

    const frameAspect = frameW / frameH;
    const canvasAspect = cw / ch;

    let dw, dh, dx, dy;

    if (canvasAspect > frameAspect) {
      // Canvas is wider than frame
      dw = cw;
      dh = cw / frameAspect;
      dx = 0;
      dy = (ch - dh) / 2;
    } else {
      // Canvas is taller than frame
      dh = ch;
      dw = ch * frameAspect;
      dx = (cw - dw) / 2;
      dy = 0;
    }

    ctx.drawImage(sheet, sx, sy, frameW, frameH, dx, dy, dw, dh);
  }

  /**
   * Animation loop with lerp (linear interpolation) for organic head turns
   */
  function step() {
    if (prefersReducedMotion) {
      currentFrame = targetFrame;
      render(currentFrame);
      isAnimating = false;
      return;
    }

    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.015) {
      currentFrame += diff * 0.16;
      render(currentFrame);
      requestAnimationFrame(step);
    } else {
      currentFrame = targetFrame;
      render(currentFrame);
      isAnimating = false;
    }
  }

  function setTarget(frame) {
    targetFrame = Math.max(0, Math.min(totalFrames - 1, frame));
    if (!isAnimating) {
      isAnimating = true;
      requestAnimationFrame(step);
    }
  }

  function markInteracted() {
    if (!hasInteracted) {
      hasInteracted = true;
      hero.classList.add('touched');
    }
  }

  /**
   * Pointer & Mouse Interaction
   */
  function handlePointerMove(e) {
    if (isDrawerOpen) return;
    markInteracted();
    const rect = hero.getBoundingClientRect();
    mouseX = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
    mouseY = Math.min(Math.max(0, (e.clientY - rect.top) / rect.height), 1);

    // Update CSS custom properties for radial lighting
    hero.style.setProperty('--mx', `${(mouseX * 100).toFixed(2)}%`);
    hero.style.setProperty('--my', `${(mouseY * 100).toFixed(2)}%`);
    hero.classList.add('active');

    // Map horizontal mouse position (0 to 1) directly to frames (0 to totalFrames - 1)
    setTarget(mouseX * (totalFrames - 1));
  }

  function handlePointerLeave() {
    if (isDrawerOpen) return;
    hero.classList.remove('active');
    // Smoothly return eyes/head to center when cursor exits the viewport
    setTarget(centerFrame);
  }

  /**
   * Touch Interaction (drag sideways)
   */
  let touchStartX = 0;
  let touchStartFrame = centerFrame;

  function handleTouchStart(e) {
    if (isDrawerOpen || e.touches.length !== 1) return;
    markInteracted();
    const touch = e.touches[0];
    const rect = hero.getBoundingClientRect();
    touchStartX = touch.clientX;
    touchStartFrame = currentFrame;

    mouseX = Math.min(Math.max(0, (touch.clientX - rect.left) / rect.width), 1);
    mouseY = Math.min(Math.max(0, (touch.clientY - rect.top) / rect.height), 1);
    hero.style.setProperty('--mx', `${(mouseX * 100).toFixed(2)}%`);
    hero.style.setProperty('--my', `${(mouseY * 100).toFixed(2)}%`);
    hero.classList.add('active');
  }

  function handleTouchMove(e) {
    if (isDrawerOpen || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = hero.getBoundingClientRect();
    const currentX = touch.clientX;
    const deltaX = currentX - touchStartX;

    // Sensitivity factor for horizontal dragging
    const deltaRatio = deltaX / (rect.width * 0.7);
    const newFrame = touchStartFrame + deltaRatio * (totalFrames - 1);

    mouseX = Math.min(Math.max(0, (touch.clientX - rect.left) / rect.width), 1);
    mouseY = Math.min(Math.max(0, (touch.clientY - rect.top) / rect.height), 1);
    hero.style.setProperty('--mx', `${(mouseX * 100).toFixed(2)}%`);
    hero.style.setProperty('--my', `${(mouseY * 100).toFixed(2)}%`);

    setTarget(newFrame);
  }

  function handleTouchEnd() {
    hero.classList.remove('active');
  }

  /**
   * Keyboard Navigation
   */
  function handleKeyDown(e) {
    if (isDrawerOpen) {
      if (e.key === 'Escape') {
        closeDrawer();
      }
      return;
    }

    const STEP_FRAMES = 2.5;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        markInteracted();
        setTarget(targetFrame - STEP_FRAMES);
        break;
      case 'ArrowRight':
        e.preventDefault();
        markInteracted();
        setTarget(targetFrame + STEP_FRAMES);
        break;
      case 'Home':
        e.preventDefault();
        markInteracted();
        setTarget(0);
        break;
      case 'End':
        e.preventDefault();
        markInteracted();
        setTarget(totalFrames - 1);
        break;
      case ' ':
      case 'Enter':
        if (e.target === hero) {
          e.preventDefault();
          markInteracted();
          setTarget(centerFrame);
        }
        break;
    }
  }

  /**
   * Drawer Open / Close
   */
  function openDrawer() {
    if (!drawer) return;
    isDrawerOpen = true;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    ctaBtn?.setAttribute('aria-expanded', 'true');
    drawerCloseBtn?.focus();
  }

  function closeDrawer() {
    if (!drawer) return;
    isDrawerOpen = false;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    ctaBtn?.setAttribute('aria-expanded', 'false');
    hero?.focus();
  }

  if (ctaBtn) {
    ctaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDrawer();
    });
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeDrawer);
  }

  /**
   * Initialize
   */
  function onSheetReady() {
    if (isReady) return;
    isReady = true;

    // Auto-detect total frames if not specified
    if (sheet.naturalWidth > 0 && sheet.naturalHeight > 0) {
      const estimatedFrames = Math.round(sheet.naturalWidth / (sheet.naturalHeight * (16 / 9)));
      if (estimatedFrames > 10) {
        totalFrames = estimatedFrames;
        centerFrame = Math.floor((totalFrames - 1) / 2);
        currentFrame = centerFrame;
        targetFrame = centerFrame;
      }
    }

    resizeCanvas();
    render(centerFrame);

    // Trigger ready state transition
    requestAnimationFrame(() => {
      hero.classList.add('ready');
    });
  }

  // Attach event listeners
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('mouseleave', handlePointerLeave, { passive: true });

  hero.addEventListener('touchstart', handleTouchStart, { passive: true });
  hero.addEventListener('touchmove', handleTouchMove, { passive: true });
  hero.addEventListener('touchend', handleTouchEnd, { passive: true });
  hero.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  window.addEventListener('keydown', handleKeyDown);

  // Check if sheet is already cached/complete
  if (sheet.complete && sheet.naturalWidth > 0) {
    onSheetReady();
  } else {
    sheet.addEventListener('load', onSheetReady);
    sheet.addEventListener('error', () => {
      console.error('Failed to load sprite sheet from', sheet.src);
    });
  }
})();
