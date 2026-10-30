var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

  app.helpers.getMostRecentUnplayedPuzzleOfType = function (type) {
    var archive = app.puzzle.archive;

    var puzzles = archive.puzzles,
      ids = archive.variants[type] || [];

    for (var i = 0; i < ids.length; i++) {
      var puzzle = puzzles[ids[i]];
      var storage = new DMStorage(type.toLowerCase() + '-' + puzzle.id);
      var status = storage.get('status');
      var completed =
        status !== null && status.completed !== undefined && status.completed !== null;
      if (completed) {
        continue;
      }
      return puzzle.url;
    }

    return null;
  };

  app.helpers.addEventListeners = function () {
    document.addEventListener(
      'CellClick',
      e => {
        app.handlers.cellClick(e.detail.item, e);
      },
      false
    );
    document.addEventListener(
      'ClueClick',
      e => {
        app.handlers.clueClick(e.detail.item, e);
      },
      false
    );
    document.addEventListener(
      'LetterEntered',
      e => {
        app.handlers.letterEntered(e.detail.item, e);
      },
      false
    );
    document.addEventListener(
      'LetterDeleted',
      e => {
        app.handlers.letterDeleted(e.detail.item, e);
      },
      false
    );
    window.addEventListener('resize', () => {
      app.handlers.onResize();
    });
    var AUTO_RESUME_WITHIN_MS = 3000;
    var hiddenAt = null;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        app.helpers.sendProgressUpdate();
        app.vue.methods.pauseGame?.(true);
        return;
      }

      var awayFor = hiddenAt === null ? Infinity : Date.now() - hiddenAt;
      hiddenAt = null;

      if (awayFor < AUTO_RESUME_WITHIN_MS && app.vue.data.state.wasAutoPaused) {
        app.vue.methods.resumeGame?.();
      }
    });
    screen.orientation.addEventListener('change', () => {
      app.handlers.onOrientationChange();
    });
    window.addEventListener('pagehide', () => {
      app.helpers.sendProgressUpdate();
    });
  };

  app.helpers.getDefaultUserState = function () {
    return {
      solution: app.puzzle.solution,
      settings: {},
      currentWord: '',
      found: [],
      isEnded: false,
      rank: {
        current: 1,
      },
      ranks: [],
      rankNames: ['Beginner', 'Learner', 'Proficient', 'Specialist', 'Expert', 'Virtuoso'],
      ranksPercentage: [],
      reveal: {
        solution: false,
        hint: false,
      },
      hintTimes: 0,
      shownHint: '',
      shuffleMode: false,
      letters: app.puzzle.letters,
      orderAdded: [],
      timer: true,
      overwriteCount: null,
    };
  };

  app.helpers.isPointsScoring = function () {
    return app.vue.data.source?.settings?.scoring === 'letters';
  };

  app.helpers.isReuseLetters = function () {
    return app.vue.data.source?.settings?.reuseLetters === true;
  };

  app.helpers.timeLimit = function () {
    const limit = parseInt(app.vue.data.source?.settings?.timeLimit, 10);
    return limit > 0 ? limit : 0;
  };

  app.helpers.isTimed = function () {
    return app.helpers.timeLimit() > 0;
  };

  app.helpers.isOutOfTime = function () {
    return app.helpers.isTimed() && app.vue.data.time >= app.helpers.timeLimit();
  };

  app.helpers.wordPoints = function (word) {
    return app.helpers.isPointsScoring() ? (word || '').length : 1;
  };

  app.helpers.scoreOf = function (words) {
    return (words || []).reduce(
      (sum, w) => sum + app.helpers.wordPoints(typeof w === 'string' ? w : w?.word),
      0
    );
  };

  app.helpers.score = function () {
    return app.helpers.scoreOf(app.vue.data.user.found);
  };

  app.helpers.maxScore = function () {
    return app.helpers.scoreOf(app.vue.data.user.solution);
  };

  app.helpers.setLetterUsed = function (letter, status) {
    var objIndex = app.vue.data.user.letters.findIndex(obj => obj.id == letter.id);

    if (status) app.vue.data.user.orderAdded.push(letter);
    else app.vue.data.user.orderAdded.splice(-1, 1);

    app.vue.data.user.letters[objIndex].used = status && !app.helpers.isReuseLetters();
  };

  app.helpers.capitalise = function (word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  };

  app.helpers.convertToTitleCase = function (str) {
    str = str.toLowerCase().split(' ');

    for (let i = 0; i < str.length; i++) {
      str[i] = app.helpers.capitalise(str[i]);
    }

    return str.join(' ');
  };

  app.helpers.addLetterToWord = function (letter) {
    let prevWord = [app.vue.data.user.currentWord];
    prevWord.push(letter.text);
    app.vue.data.user.currentWord = prevWord.toString().replaceAll(',', '');
  };

  app.helpers.removeLetterFromWord = function () {
    app.vue.data.user.currentWord = app.vue.data.user.currentWord.slice(0, -1);
  };

  app.helpers.updateProgress = function () {
    app.status.progress = Math.floor(app.vue.model.totalCellsPercent);
  };

  app.helpers.sendProgressUpdate = function () {
    if (app.status.started === null) return;
    if (app.vue.model && app.vue.model.isCompleted) return;
    app.helpers.updateProgress();
    app.helpers.dispatchEvent('puzzleprogress', app.progress?.handlers.all());
  };

  app.helpers.checkHalfwayComplete = function () {
    if (app.status.halfwayComplete) return;
    var total = app.helpers.maxScore();
    if (total === 0) return;
    if (app.helpers.score() / total < 0.5) return;
    app.status.halfwayComplete = true;
    app.helpers.saveUserPlayStatus();
    app.helpers.dispatchEvent('puzzlecomplete', app.progress?.handlers.all());
  };

  app.helpers.checkCompletedStatus = function () {
    if (app.status.completed === null) {
      setTimeout(() => app.helpers.showConfetti, 100);

      app.status.completed = {
        when: Date.now(),
        time: app.vue.model.timerDisplay,
        seconds: app.vue.data.config.hasTimer ? app.timer.get() : null,
      };

      app.helpers.dispatchEvent('puzzlecomplete', app.progress?.handlers.all());
      app.helpers.setRank(app.vue.data.user.found);
      app.helpers.saveUserPlayStatus();

      return true;
    }

    return false;
  };

  app.helpers.checkAdmiredStatus = function (isStart, sendComplete) {
    app.vue.data.admired = !!app.status.admired && !isStart;

    if (app.status.admired && !isStart) {
      app.vue.data.reveal.solution = true;
    } else {
      if (sendComplete) {
        app.helpers.dispatchEvent('puzzlecomplete', app.progress?.handlers.all());
      }

      app.helpers.showCompletionScreen(isStart);
    }
  };

  app.helpers.puzzleStart = function (vm) {
    if (!app.status.completed && app.helpers.isOutOfTime()) {
      app.vue.methods.timeUp(false);
    } else if (!app.status.completed && app.vue.data.config.hasTimer) {
      app.timer.start(app.vue.data.time);
      app.helpers.saveUserTime();
    } else if (app.status.completed) {
      app.helpers.puzzleCompletedSuccessfully(true);
    }

    app.helpers.setRank(app.vue.data.user.found);
  };

  app.helpers.timerUpdate = function (count) {
    app.vue.data.time = count;
    app.helpers.saveUserTime();
    if (app.helpers.isTimed() && app.helpers.timeLimit() - count === 10) navigator.vibrate?.(60);
    if (app.helpers.isOutOfTime()) app.vue.methods.timeUp();
  };

  app.helpers.enterNewWord = function (word) {
    app.vue.data.user.currentWord = word;
    app.vue.methods.enterWord();
    app.helpers.setRank(app.vue.data.user.found);
  };

  app.helpers.getDefaultUserPlayStatus = function () {
    return {
      first: Date.now(),
      last: Date.now(),
      started: null,
      completed: null,
      playedBefore: false,
      halfwayComplete: false,
    };
  };

  app.helpers.resetUserState = function () {
    app.vue.data.user = app.helpers.getDefaultUserState();

    app.vue.data.user.letters.forEach(function (l) { l.used = false; });

    if (app.vue.data.config.hasTimer) {
      app.timer.restart();
    }

    app.helpers.saveUserState();
    app.status.started = null;
    app.status.completed = null;
    app.status.admired = false;
    app.status.halfwayComplete = false;
    app.vue.data.admired = false;
    app.helpers.saveUserPlayStatus();
  };

  app.helpers.tock = function () {
    if (app.media.supports.audio && app.vue.data.userPuzzleSettings.soundskeyboard) {
      new Audio('mp3/tock.mp3').play();
    }
  };

  app.helpers.puzzleCompletedUnsuccessfully = function () {
    app.vue.data.check.gridIncorrect = true;

    setTimeout(() => {
      app.vue.data.check.gridIncorrect = false;
    }, 2000);
  };

  app.helpers.setUserAnswer = function (cellId, answer, moveToNextCell) {
    var str = app.vue.data.user.answers || app.vue.data.source.celldata;
    app.vue.data.user.answers = str.substr(0, cellId) + answer + str.substr(cellId + 1);
    app.helpers.saveUserState();
    app.helpers.tock();

    if (moveToNextCell !== false) {
      app.helpers.nextCell();
    }
  };


  app.helpers.getRankLadder = function (clues) {
    clues = clues ?? app.vue.model.puzzle.clues;

    let real = Array.isArray(clues) ? [...clues] : clues.split(',').map(n => parseInt(n));
    if (real[0] !== 0) real = [0, ...real];
    const total = app.vue.data.user.solution.length;
    if (real[real.length - 1] !== total) real.push(total);
    real = [...new Set(real)];

    let realNames;
    switch (real.length) {
      case 4:
        realNames = app.vue.data.user.rankNames.filter(r => r !== 'Learner' && r !== 'Specialist');
        break;
      case 5:
        realNames = app.vue.data.user.rankNames.filter(r => r !== 'Learner');
        break;
      default:
        realNames = [...app.vue.data.user.rankNames];
        break;
    }

    const firstReal = real[1];
    const extras = [
      { at: 3, name: 'Beginner' },
      { at: Math.round(firstReal / 2), name: 'Rising' },
    ]
      .filter(e => e.at > 0 && e.at < firstReal)
      .sort((a, b) => a.at - b.at);

    const seen = new Set([0]);
    const landmarks = [0];
    const names = ['Start'];

    extras.forEach(e => {
      if (seen.has(e.at)) return;
      seen.add(e.at);
      landmarks.push(e.at);
      names.push(e.name);
    });

    for (let i = 1; i < real.length; i++) {
      landmarks.push(real[i]);
      names.push(realNames[i]);
    }

    if (!app.helpers.isPointsScoring()) return { landmarks, names };

    const max = app.helpers.maxScore();
    const scaled = { landmarks: [], names: [] };
    landmarks.forEach((mark, i) => {
      const at = i === landmarks.length - 1 ? max : Math.round((mark / total) * max);
      if (scaled.landmarks.length && at <= scaled.landmarks[scaled.landmarks.length - 1]) return;
      scaled.landmarks.push(at);
      scaled.names.push(names[i]);
    });

    return scaled;
  };

  app.helpers.setRank = function (foundWords) {
    const { landmarks, names } = app.helpers.getRankLadder();
    const score = app.helpers.scoreOf(foundWords);
    const rankPos =
      foundWords.length === app.vue.model.puzzle.solution.length
        ? landmarks.length - 1
        : Math.max(0, landmarks.findIndex(l => l > score) - 1);

    const rankObj = {
      current: rankPos + 1,
      maximum: landmarks.length,
      name: names[rankPos],
    };

    rankObj.percent = (rankObj.current / rankObj.maximum) * 100;

    app.vue.data.user.rank = rankObj;
    app.helpers.saveUserState();
  };

  app.helpers.setWordLengthRank = function (foundWords) {
    const allWords = app.vue.model.puzzle.solution;
    const wordLengthRank = {};

    for (let awidx in allWords) {
      const length = allWords[awidx].length;

      wordLengthRank[length] = wordLengthRank[length] || {
        current: 0,
        maximum: 0,
        percent: 0,
      };

      wordLengthRank[length].maximum++;
    }

    for (let fwidx in foundWords) {
      const length = foundWords[fwidx].word.length;
      wordLengthRank[length].current++;
      wordLengthRank[length].percent =
        (wordLengthRank[length].current / wordLengthRank[length].maximum) * 100;
    }

    app.vue.data.user.wordLengthRank = wordLengthRank;
    app.helpers.saveUserState();
  };

  app.helpers.showCompletionScreen = function (isStart) {
    if (isStart) {
      app.vue.model.showModal('completeSuccess');
      app.helpers.showConfetti();
      app.vue.data.reveal.solution = true;
    } else if (!app.vue.model.stateModal('completeSuccess')) {
      setTimeout(() => {
        app.vue.model.showModal('completeSuccess');
        app.helpers.showConfetti();
      }, 500);
    }
  };

  app.helpers.processLandmarks = function (clues) {
    return app.helpers.getRankLadder(clues).landmarks;
  };

  app.helpers.resizeGrid = function () {
    const mq = window.matchMedia('(min-width: 720px)');
    const gameplayContainer = document.getElementById('gameplayContainer');
    const gameplay = document.getElementById('gameplay');
    const gridWrapper = document.getElementById('gridWrapper');
    const svg = document.getElementById('pinch-zoom-image');

    gridWrapper.setAttribute('style', '');
    foundWordsWrapper.setAttribute('style', '');
    svg.setAttribute('style', '');

    let adjustedSize;

    if (gameplay.scrollHeight > gameplayContainer.clientHeight) {
      const heightDifference = gameplayContainer.clientHeight / gameplay.scrollHeight;

      adjustedSize = gridWrapper.clientWidth * heightDifference;
      gridWrapper.style.inlineSize = adjustedSize + 'px';
      svg.style.inlineSize = adjustedSize + 'px';
      svg.style.blockSize = adjustedSize + 'px';

      const isEnough = () =>
        Math.floor(gameplay.scrollHeight) <= Math.floor(gameplayContainer.clientHeight);

      while (!isEnough() && adjustedSize > 0) {
        adjustedSize -= 1;
        gridWrapper.style.inlineSize = adjustedSize + 'px';
        svg.style.inlineSize = adjustedSize + 'px';
        svg.style.blockSize = adjustedSize + 'px';
      }
    }

    if (mq.matches) {
      const gameActions = document.getElementById('gameActions');
      const foundWordsWrapper = document.getElementById('foundWordsWrapper');

      const { bottom: gameActionsBottom } = gameActions.getBoundingClientRect();
      const { bottom: foundWordsWrapperBottom } = foundWordsWrapper.getBoundingClientRect();

      if (gameActionsBottom > foundWordsWrapperBottom) {
        foundWordsWrapper.style.blockSize =
          foundWordsWrapper.clientHeight + (gameActionsBottom - foundWordsWrapperBottom) + 'px';
      }
    }
  };
})();
