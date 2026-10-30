var app = window.app || {};
var vm = window.vm || {};

/*
 * Unobtrusive onboarding: a small "New here?" card on a first visit, an optional
 * How to Play slideshow, a feature tour, and one-off context tips.
 *
 * Each puzzle configures it in its setup file (slides and tour may also be functions returning the list):
 *   app.guide = {
 *     slides: [{ text, image }],
 *     tour:   [{ target, title, body, open, requires, outline }],   // target: selector or list; none = centred
 *             // or, for something that isn't a menu: { enter, leave, press, available } — enter opens it,
 *             // leave closes it, press returns the element shown being tapped, available says if it can run
 *     tips:   { id: { target, text } },
 *     idleTip: { tip, after },                  // seconds of play without a letter entered
 *     prepare: fn,                              // runs before the welcome card (e.g. starter letters)
 *     onLetter: fn,                             // runs after each letter entered, for context tips
 *     events: { letter, cell },                 // the puzzle's entry/tap event names, if not letterentered/cellclick
 *   }
 */
(function () {
  'use strict';

  app.guide = app.guide || {};

  app.vue.data.guide = {
    welcome: null,
    slide: 0,
    tour: {
      active: false,
      index: 0,
      total: 0,
      ready: false,
      placement: 'below',
      rect: { top: 0, left: 0, width: 0, height: 0 },
      tipTop: 0,
      tipLeft: 0,
      press: null,
    },
    tip: null,
  };

  var saved = { welcomed: false, tips: {} };
  var started = false;
  var held = false;
  var idle = 0;
  var tipTimer = null;
  var tourSteps = [];
  var swipe = null;

  app.helpers.guideList = function (list) {
    return (typeof list === 'function' ? list() : list) || [];
  };

  app.helpers.guideSave = function () {
    app.storageVariant && app.storageVariant.set('guide', saved);
  };

  // The first visit holds the clock until the player answers the card or starts playing.
  app.helpers.guideHold = function () {
    if (app.timer && app.timer.status === 'active') {
      app.timer.pause();
      app.helpers.saveUserTime && app.helpers.saveUserTime();
      held = true;
    }
  };

  app.helpers.guideRelease = function () {
    if (!started) {
      started = true;
      app.helpers.puzzleStart();
      return;
    }
    if (held) {
      held = false;
      app.timer && app.timer.start(app.vue.data.time);
    }
  };

  app.helpers.showPuzzleOrStart = function () {
    Promise.all([
      app.storageVariant.get('guide'),
      // Players who went through the old onboarding count as welcomed.
      app.storageVariant.get('onboarding'),
    ]).then(function (results) {
      saved = Object.assign({ welcomed: results[1] !== null, tips: {} }, results[0] || {});
      app.helpers.guideListen();

      var joining = location.params && location.params.gid;
      if (saved.welcomed || joining || app.vue.model.isCompletedReadOnly) {
        app.helpers.guideRelease();
        return;
      }

      app.guide.prepare && app.guide.prepare();
      app.vue.data.guide.welcome = 'new';
    });
  };

  app.helpers.guideListen = function () {
    var events = Object.assign({ letter: 'letterentered', cell: 'cellclick' }, app.guide.events);

    // Registered after the puzzle's own handlers, so the letter is already in place.
    document.addEventListener(events.letter, function () {
      idle = 0;
      if (app.vue.data.guide.welcome) app.vue.methods.guideWelcomeClose();
      app.guide.onLetter && app.guide.onLetter();
    });

    document.addEventListener(events.cell, function () {
      if (app.vue.data.guide.welcome) app.vue.methods.guideWelcomeClose();
    });

    document.addEventListener('keydown', app.helpers.guideKeydown, true);
    window.addEventListener('resize', app.helpers.guideReposition);
  };

  app.helpers.guideKeydown = function (e) {
    var guide = app.vue.data.guide;

    if (app.vue.model.guideHowToPlayOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      app.vue.methods.guideSlideTo(guide.slide + (e.key === 'ArrowRight' ? 1 : -1));
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (guide.tour.active) {
      var inTour = e.target && e.target.closest && e.target.closest('.guide-tour');
      if (e.key === 'Escape') app.vue.methods.guideTourFinish();
      else if (e.key === 'Tab' || inTour) return;
      else if (e.key === 'ArrowRight' || e.key === 'Enter') app.vue.methods.guideTourNext();
      else if (e.key === 'ArrowLeft') app.vue.methods.guideTourBack();
      // Keep typing out of the grid while the tour is up.
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key === 'Escape' && guide.tip) app.vue.methods.guideTipClose();
  };

  /* Welcome card */

  app.vue.methods.guideWelcomeYes = function () {
    app.vue.data.guide.welcome = 'rules';
  };

  app.vue.methods.guideWelcomeClose = function () {
    app.vue.data.guide.welcome = null;
    saved.welcomed = true;
    app.helpers.guideSave();
    app.helpers.guideRelease();
  };

  app.helpers.guideWelcomeDone = function () {
    if (!app.vue.data.guide.welcome) return;
    app.vue.data.guide.welcome = null;
    saved.welcomed = true;
    app.helpers.guideSave();
  };

  app.vue.methods.guideKnowsRules = function () {
    app.vue.methods.guideTourStart();
  };

  app.vue.methods.guideLearnRules = function () {
    app.vue.methods.guideHowToPlay();
  };

  app.vue.computed.guidePuzzleName = function () {
    var meta = this.source.meta || {};
    return String(meta.variant || (this.formattedMeta && this.formattedMeta.title) || '').trim();
  };

  /* How to play */

  app.vue.computed.guideSlides = function () {
    return app.helpers.guideList(app.guide.slides);
  };

  app.vue.computed.guideHowToPlayOpen = function () {
    return this.modals.visible.indexOf('guideHowToPlay') >= 0;
  };

  app.vue.methods.guideHowToPlay = function () {
    app.helpers.guideWelcomeDone();
    app.vue.methods.guideTipClose();
    app.helpers.guideHold();
    app.vue.data.guide.slide = 0;
    app.vue.methods.hideModal();
    app.vue.methods.showModal('guideHowToPlay');
  };

  // Settings → How to play, and the parent's onboarding.run().
  app.vue.methods.showModalHelp = function () {
    app.vue.methods.guideHowToPlay();
  };

  app.vue.methods.guideSlideTo = function (index) {
    var guide = app.vue.data.guide;
    var last = app.vue.model.guideSlides.length - 1;
    index = Math.max(0, Math.min(last, index));
    guide.slide = index;
  };

  app.vue.methods.guideSwipeStart = function (e) {
    swipe = { x: e.clientX, y: e.clientY };
  };

  app.vue.methods.guideSwipeEnd = function (e) {
    if (!swipe || e.type === 'pointercancel') {
      swipe = null;
      return;
    }

    var dx = e.clientX - swipe.x;
    var dy = e.clientY - swipe.y;
    swipe = null;

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      app.vue.methods.guideSlideTo(app.vue.data.guide.slide + (dx < 0 ? 1 : -1));
    }
  };

  app.vue.methods.guidePlay = function () {
    app.vue.methods.hideModal('guideHowToPlay');
  };

  app.vue.methods.guideHowToPlayTour = function () {
    app.vue.data.guide.tour.active = true;
    app.vue.methods.hideModal('guideHowToPlay');
    app.vue.methods.guideTourStart();
  };

  app.vue.watch = app.vue.watch || {};

  // Covers every way out: the buttons, the close button and an overlay tap.
  app.vue.watch.guideHowToPlayOpen = function (open) {
    if (!open && !this.guide.tour.active) app.helpers.guideRelease();
  };

  /* Feature tour */

  app.vue.computed.guideTourStep = function () {
    return this.guide.tour.total ? tourSteps[this.guide.tour.index] : null;
  };

  app.vue.computed.guideTourCount = function () {
    return (this.lang.guide_tour_count || '[[n]] of [[total]]')
      .replace('[[n]]', this.guide.tour.index + 1)
      .replace('[[total]]', this.guide.tour.total);
  };

  app.vue.computed.guideTourLast = function () {
    return this.guide.tour.index >= this.guide.tour.total - 1;
  };

  app.vue.computed.guideOutlineStyle = function () {
    var r = this.guide.tour.rect;
    return { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px' };
  };

  app.vue.computed.guidePressStyle = function () {
    var p = this.guide.tour.press;
    return p ? { top: p.top + 'px', left: p.left + 'px' } : {};
  };

  app.vue.computed.guideTourTipStyle = function () {
    if (this.guide.tour.placement === 'dock' || this.guide.tour.placement === 'centre') return {};
    return { top: this.guide.tour.tipTop + 'px', left: this.guide.tour.tipLeft + 'px' };
  };

  app.helpers.guideVisible = function (el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // Union of every visible element the step points at (e.g. a button and its open menu).
  app.helpers.guideRect = function (target) {
    var selectors = Array.isArray(target) ? target : [target];
    var rect = null;

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        if (!app.helpers.guideVisible(el)) return;
        var r = el.getBoundingClientRect();
        rect = rect
          ? {
              top: Math.min(rect.top, r.top),
              left: Math.min(rect.left, r.left),
              bottom: Math.max(rect.bottom, r.bottom),
              right: Math.max(rect.right, r.right),
            }
          : { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
      });
    });

    return rect;
  };

  // A step that opens a menu `requires` its button, since the menu is still closed.
  app.helpers.guideStepAvailable = function (step) {
    if (step.available) return step.available();
    if (!step.target) return true;
    var selector = step.requires || (Array.isArray(step.target) ? step.target[0] : step.target);
    return app.helpers.guideVisible(document.querySelector(selector));
  };

  app.helpers.guideTourPosition = function () {
    var tour = app.vue.data.guide.tour;
    var step = tourSteps[tour.index];
    if (!tour.active || !step) return;

    if (!step.target) {
      tour.placement = 'centre';
      tour.ready = true;
      return;
    }

    // A target inside a scrolling menu may be out of sight on short screens.
    var selectors = Array.isArray(step.target) ? step.target : [step.target];
    var matches = document.querySelectorAll(selectors[selectors.length - 1]);
    if (matches.length) matches[matches.length - 1].scrollIntoView({ block: 'nearest', inline: 'nearest' });

    var r = app.helpers.guideRect(step.target);
    if (!r) return;

    var pad = 6;
    var vh = window.innerHeight;
    var vw = window.innerWidth;

    tour.rect = {
      top: r.top - pad,
      left: r.left - pad,
      width: r.right - r.left + pad * 2,
      height: r.bottom - r.top + pad * 2,
    };

    var tipHeight = 200;
    var tipHalf = Math.min(160, (vw - 32) / 2);
    var gap = pad + 12;

    tour.tipLeft = Math.max(16 + tipHalf, Math.min(vw - 16 - tipHalf, (r.left + r.right) / 2));
    tour.tipTop = Math.max(16 + tipHeight / 2, Math.min(vh - 16 - tipHeight / 2, (r.top + r.bottom) / 2));

    if (vh - r.bottom - gap >= tipHeight) {
      tour.placement = 'below';
      tour.tipTop = r.bottom + gap;
    } else if (r.top - gap >= tipHeight) {
      tour.placement = 'above';
      tour.tipTop = r.top - gap;
    } else if (vw - r.right - gap >= tipHalf * 2 + 16) {
      tour.placement = 'side';
      tour.tipLeft = r.right + gap + tipHalf;
    } else if (r.left - gap >= tipHalf * 2 + 16) {
      tour.placement = 'side';
      tour.tipLeft = r.left - gap - tipHalf;
    } else {
      // No room around the target (e.g. a full-screen menu), so dock at the bottom.
      tour.placement = 'dock';
    }

    tour.ready = true;
  };

  app.helpers.guideTourShow = function (index) {
    var tour = app.vue.data.guide.tour;
    var previous = tourSteps[tour.index];
    var next = tourSteps[index];

    if (!next) return;
    if (previous && previous.open && previous.open !== next.open) app.vue.methods.hideModal(previous.open);
    if (previous && previous !== next && previous.leave) previous.leave();

    tour.index = index;

    if ((next.open && !app.vue.methods.stateModal(next.open)) || next.enter) {
      tour.ready = false;

      // Show the button or square being tapped, so it's clear where the menu came from.
      var button = next.press ? next.press() : next.requires && document.querySelector(next.requires);
      var r = button && button.getBoundingClientRect();
      tour.press = r ? { top: r.top + r.height / 2, left: r.left + r.width / 2 } : null;

      setTimeout(function () {
        tour.press = null;
        if (!tour.active || tour.index !== index) return;
        if (next.enter) next.enter();
        else app.vue.methods.showModal(next.open);
        // Let the menu finish opening before measuring it.
        setTimeout(app.helpers.guideTourPosition, 400);
      }, r ? 450 : 0);
    } else {
      requestAnimationFrame(app.helpers.guideTourPosition);
    }
  };

  app.vue.methods.guideTourStart = function () {
    var tour = app.vue.data.guide.tour;

    app.helpers.guideWelcomeDone();
    app.vue.methods.guideTipClose();
    app.vue.methods.hideModal();

    // Only the features on this screen (no keyboard on desktop, no clue list on mobile).
    tourSteps = app.helpers.guideList(app.guide.tour).filter(app.helpers.guideStepAvailable);
    tour.total = tourSteps.length;
    tour.index = 0;

    if (!tourSteps.length) {
      tour.active = false;
      app.helpers.guideRelease();
      return;
    }

    app.helpers.guideHold();
    tour.active = true;
    requestAnimationFrame(function () {
      app.helpers.guideTourShow(0);
    });
  };

  app.vue.methods.guideTourNext = function () {
    var tour = app.vue.data.guide.tour;
    if (tour.index >= tour.total - 1) app.vue.methods.guideTourFinish();
    else app.helpers.guideTourShow(tour.index + 1);
  };

  app.vue.methods.guideTourBack = function () {
    app.helpers.guideTourShow(app.vue.data.guide.tour.index - 1);
  };

  app.vue.methods.guideTourFinish = function () {
    var tour = app.vue.data.guide.tour;
    var step = tourSteps[tour.index];
    if (step && step.open) app.vue.methods.hideModal(step.open);
    if (step && step.leave) step.leave();

    tour.active = false;
    tour.ready = false;
    tour.total = 0;
    app.helpers.guideRelease();
  };

  /* Context tips — each one shows once per player, ever. */

  app.vue.computed.guideTipStyle = function () {
    var tip = this.guide.tip;
    return tip ? { top: tip.top + 'px', left: tip.left + 'px', '--guide-tip-arrow': tip.arrow + 'px' } : {};
  };

  app.vue.computed.guideTipRingStyle = function () {
    var r = this.guide.tip && this.guide.tip.rect;
    return r ? { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px' } : {};
  };

  app.helpers.guideTipBlocked = function () {
    var data = app.vue.data;
    return (
      !started ||
      data.guide.welcome ||
      data.guide.tour.active ||
      data.guide.tip ||
      data.modals.visible.length ||
      data.state.isPaused ||
      data.mp_game ||
      app.vue.model.isCompleted
    );
  };

  app.helpers.guideTipPosition = function () {
    var tip = app.vue.data.guide.tip;
    if (!tip) return;

    var el = document.querySelector(tip.target);
    if (!app.helpers.guideVisible(el)) {
      app.vue.methods.guideTipClose();
      return;
    }

    var r = el.getBoundingClientRect();
    var vw = window.innerWidth;
    var half = Math.min(140, (vw - 32) / 2);
    var centre = (r.left + r.right) / 2;
    var pad = 4;

    tip.rect = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
    // Targets near the bottom (e.g. a keypad key) get the bubble above them.
    tip.above = r.bottom + pad + 10 + 90 > window.innerHeight;
    tip.top = tip.above ? r.top - pad - 10 : r.bottom + pad + 10;
    tip.left = Math.max(16 + half, Math.min(vw - 16 - half, centre));
    tip.arrow = centre - tip.left;
  };

  // Returns true if the tip was shown.
  app.helpers.guideTip = function (id) {
    var config = (app.guide.tips || {})[id];
    if (!config || saved.tips[id] || app.helpers.guideTipBlocked()) return false;
    if (!app.helpers.guideVisible(document.querySelector(config.target))) return false;

    saved.tips[id] = true;
    app.helpers.guideSave();

    app.vue.data.guide.tip = { id: id, target: config.target, text: config.text, top: 0, left: 0, arrow: 0, rect: null, above: false };
    app.helpers.guideTipPosition();

    // Pressing the thing the tip points at answers it (keys swallow click, so listen for the press).
    document.querySelector(config.target).addEventListener('pointerdown', app.vue.methods.guideTipClose, { once: true });

    clearTimeout(tipTimer);
    tipTimer = setTimeout(app.vue.methods.guideTipClose, 15000);
    return true;
  };

  app.helpers.guideTipSeen = function (id) {
    return !!saved.tips[id];
  };

  app.vue.methods.guideTipClose = function () {
    clearTimeout(tipTimer);
    app.vue.data.guide.tip = null;
  };

  app.helpers.guideReposition = function () {
    if (app.vue.data.guide.tour.active) app.helpers.guideTourPosition();
    if (app.vue.data.guide.tip) app.helpers.guideTipPosition();
  };

  // Using the feature the tip points at answers it.
  app.vue.watch['modals.visible'] = {
    handler: function (visible) {
      if (this.guide.tip && visible.length) app.vue.methods.guideTipClose();
    },
    deep: true,
  };

  // `time` only ticks while the puzzle is being played, so pauses and hidden tabs don't count.
  app.vue.watch.time = function () {
    var idleTip = app.guide.idleTip;
    if (!idleTip || app.helpers.guideTipSeen(idleTip.tip)) return;

    idle++;
    if (idle >= idleTip.after) app.helpers.guideTip(idleTip.tip);
  };
})();
