var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  if (!params.has('tutorial')) return;

  app.config = app.config || {};
  app.config.tutorial = true;
  document.documentElement.classList.add('is-tutorial');

  function memoryStore() {
    var data = {};
    return {
      get: function (key) {
        return Promise.resolve(key in data ? data[key] : null);
      },
      set: function (key, value) {
        data[key] = value;
        return Promise.resolve();
      },
    };
  }

  app.setup.storageObjects = function () {
    app.storagePuzzle = memoryStore();
    app.storageVariant = memoryStore();
    app.setup.storageObjectsDone();
  };

  app.setup.puzzleCompletionData = function () {
    app.setup.puzzleCompletionDataDone();
  };

  app.helpers.showPuzzleOrStart = function () {
    app.helpers.puzzleStart();
  };

  app.vue.methods.canPause = function () {
    return false;
  };

  app.helpers.applyParentAssists = function () {};

  app.helpers.tutorialPayload = function (extra) {
    var meta = (app.vue.data.source && app.vue.data.source.meta) || {};
    var tutorial = meta.tutorial || {};
    return Object.assign({ step: tutorial.step || null, steps: tutorial.steps || null }, extra || {});
  };

  app.helpers.showCompletionScreen = function () {};

  var showModal = app.vue.methods.showModal;
  app.vue.methods.showModal = function (modal) {
    if (modal === 'completeSuccess') return;
    return showModal.apply(this, arguments);
  };

  var gaveUp = false;
  document.addEventListener('puzzleended', function () {
    gaveUp = true;
  });

  app.helpers.checkAdmiredStatus = function (isStart, sendComplete) {
    if (!sendComplete) return;
    var progress = app.progress && app.progress.handlers.all();
    var status = (progress && progress.status) || {};
    var user = (progress && progress.user) || {};
    app.helpers.dispatchEvent(
      'tutorialcomplete',
      app.helpers.tutorialPayload({
        solved: !gaveUp,
        seconds: status.completed ? status.completed.seconds : null,
        cellsRevealed: user.cellsRevealed || 0,
        checksUsed: user.checksUsed || 0,
      })
    );
  };

  function toParent(type, payload) {
    if (!app.channel) return;
    app.channel.send(type, app.helpers.toFormattedOutgoingMessage(payload));
  }

  document.addEventListener('puzzleready', function () {
    toParent('tutorialready', app.helpers.tutorialPayload());
  });

  document.addEventListener('puzzlestart', function () {
    toParent('tutorialstart', app.helpers.tutorialPayload());
  });

  document.addEventListener('tutorialcomplete', function (e) {
    toParent('tutorialcomplete', e.detail);
  });

  document.addEventListener('puzzlelost', function () {
    toParent('tutorialcomplete', app.helpers.tutorialPayload({ solved: false }));
  });
})();
