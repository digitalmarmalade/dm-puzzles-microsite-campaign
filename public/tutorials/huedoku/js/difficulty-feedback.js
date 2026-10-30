var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

  var config = app.difficultyFeedback || {};
  var STEP = config.step || 5;
  var CAP = config.cap || 40;
  var MANY_REVEALS = config.manyReveals || 5;
  var HELP_SETTINGS = ['prefillletters', 'prefillpercent'];

  app.vue.data.difficultyFeedback = { stage: 'rate', level: null };

  app.helpers.currentAssists = function () {
    var settings = app.vue.data.userPuzzleSettings;
    return { prefillPercent: settings.prefillletters ? parseInt(settings.prefillpercent, 10) || 0 : 0 };
  };

  app.helpers.helpSettingsKey = function () {
    return 'help-' + String(app.config.variant || app.config.type || '').replace(/\s+/g, '').toLowerCase();
  };

  var loadSettings = app.helpers.loadPuzzleSettings;
  app.helpers.loadPuzzleSettings = function () {
    return Promise.resolve(loadSettings.apply(this, arguments))
      .then(function () {
        return app.storageVariant.get(app.helpers.helpSettingsKey());
      })
      .then(function (help) {
        var settings = app.vue.data.userPuzzleSettings;
        var source = help || app.helpers.getDefaultUserState().settings;
        HELP_SETTINGS.forEach(function (key) {
          if (key in source) settings[key] = source[key];
        });
      });
  };

  var saveSettings = app.helpers.savePuzzleState;
  app.helpers.savePuzzleState = function () {
    var result = saveSettings.apply(this, arguments);
    var settings = app.vue.data.userPuzzleSettings;
    var help = {};
    HELP_SETTINGS.forEach(function (key) {
      help[key] = settings[key];
    });
    app.storageVariant.set(app.helpers.helpSettingsKey(), help);
    return result;
  };

  app.helpers.hadStartingHelp = function () {
    var user = app.vue.data.user;
    return (user.prefilledCells || []).length > 0 || (app.config.assistLetters || []).length > 0;
  };

  app.helpers.usedManyReveals = function () {
    return (app.vue.data.user.cellsRevealed || 0) >= MANY_REVEALS;
  };

  app.helpers.inSite = function () {
    try {
      return window.parent !== window && !!window.parent.puzzleApp;
    } catch (e) {
      return false;
    }
  };

  app.helpers.applyParentAssists = function () {
    var assists = null;
    try {
      assists = window.parent !== window && window.parent.puzzleApp ? window.parent.puzzleApp.assists : null;
    } catch (e) {}
    if (assists && assists.type === 'letters') {
      app.config.assistLetters = (Array.isArray(assists.letters) ? assists.letters : []).map(function (letter) {
        return String(letter).toUpperCase();
      });
      return;
    }
    if (!assists || typeof assists.prefillPercent !== 'number') return;
    var pct = Math.max(0, Math.min(CAP, Math.round(assists.prefillPercent)));
    app.vue.data.userPuzzleSettings.prefillletters = pct > 0;
    if (pct > 0) app.vue.data.userPuzzleSettings.prefillpercent = pct;
  };

  app.helpers.reportDifficulty = function (rating) {
    var payload = { rating: rating };
    if (!app.helpers.inSite()) payload.assists = app.helpers.currentAssists();
    app.helpers.dispatchEvent('puzzledifficulty', payload);
  };

  app.vue.watch = app.vue.watch || {};
  app.vue.watch['userPuzzleSettings.prefillletters'] = function () {
    app.helpers.dispatchEvent('puzzleassists', { assists: app.helpers.currentAssists() });
  };

  app.vue.computed.showDifficultyStrip = function () {
    if (app.vue.data.difficultyFeedback.stage === 'thanks') return true;
    if (app.vue.data.user.difficultyRated) return false;
    return app.helpers.hadStartingHelp() || app.helpers.usedManyReveals();
  };

  app.vue.computed.difficultyNextOptions = function () {
    return app.vue.data.difficultyFeedback.stage === 'hard'
      ? ['same', 'more', 'alotmore']
      : ['none', 'fewer', 'same'];
  };

  app.vue.methods.rateDifficulty = function (level) {
    app.vue.data.difficultyFeedback.level = level;

    if (level === 'justright' || app.helpers.inSite()) {
      app.helpers.markDifficultyRated();
      app.helpers.reportDifficulty(level);
      app.vue.data.difficultyFeedback.stage = 'thanks';
    } else {
      app.vue.data.difficultyFeedback.stage = level;
    }
  };

  app.vue.methods.difficultyNext = function (change) {
    var settings = app.vue.data.userPuzzleSettings;
    var pct = parseInt(settings.prefillpercent, 10) || 0;

    if (change === 'none') {
      settings.prefillletters = false;
      app.helpers.savePuzzleState();
    } else if (change === 'fewer') {
      var half = Math.floor(pct / 2 / STEP) * STEP;
      if (half > 0) {
        app.helpers.setPrefillPercent(half);
      } else {
        settings.prefillletters = false;
        app.helpers.savePuzzleState();
      }
    } else if (change === 'more' || change === 'alotmore') {
      settings.prefillletters = true;
      app.helpers.setPrefillPercent(Math.min(pct + (change === 'more' ? STEP : STEP * 3), CAP));
    }

    app.helpers.markDifficultyRated();
    app.helpers.reportDifficulty(app.vue.data.difficultyFeedback.level);
    app.vue.data.difficultyFeedback.stage = 'thanks';
  };

  app.helpers.setPrefillPercent = function (pct) {
    app.vue.data.userPuzzleSettings.prefillpercent = Math.max(0, pct);
    app.helpers.savePuzzleState();
  };

  app.helpers.markDifficultyRated = function () {
    app.vue.data.user.difficultyRated = true;
    app.helpers.saveUserState();
  };
})();
