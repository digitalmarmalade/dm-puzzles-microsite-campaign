var app = window.app || {};
var vm = window.vm || {};

(function () {
  'use strict';

  app.vue.data.print.hasGridTextSize = true;

  app.vue.data.print.hasClueTextSize = true;

  app.vue.methods.canPause = function () {
    if (app.status.completed || app.vue.data.state.isPaused) return false;
    if (app.vue.methods.stateModal('help')) return false;
    if (app.vue.methods.timerIsBlocked()) return false;
    if (app.vue.data.config.hasTimer) return app.timer?.status === 'active';
    return !!app.status.started;
  };

  app.vue.methods.resumeGame = function () {
    if (!app.vue.data.state.isPaused) return;

    app.vue.data.state.isPaused = false;
    app.vue.data.state.wasAutoPaused = false;
    app.vue.methods.hideModal('paused');

    if (app.vue.data.config.hasTimer && !app.status.completed && app.timer && !app.vue.methods.timerIsBlocked()) {
      app.timer.resume();
      app.helpers.saveUserTime();
    }
  };

  app.vue.methods.revealGrid = function () {
    app.vue.data.reveal.grid = true;
    app.helpUsed('reveal', 'grid');
    app.helpers.recordCellsRevealed(app.vue.model.puzzle.counts.cells.active - app.vue.model.totalCellsCompleted);
  };

  app.vue.methods.wrapperClicked = function (e) {
    if (app.vue.data.state.suppressWrapperClick || app.vue.methods.stateModal('help')) {
      return;
    }

    app.vue.data.state.suppressWrapperClick = true;

    if (app.vue.data.reveal.grid) {
      app.vue.data.reveal.grid = false;
    }

    const visibleModals = app.vue.data.modals.visible;

    if (visibleModals.length) {
      const modalNodes = visibleModals.map((modal) => app.vue.model.$refs[modal]);

      if (!modalNodes.includes(e.target) && !modalNodes.some((modal) => modal?.contains(e.target))) {
        app.vue.methods.resetActions();

        if (!app.vue.model.isCompletedWithoutErrors) {
          app.vue.methods.hideModal('checkMenu');
          app.vue.methods.hideModal('revealMenu');
          app.vue.methods.hideModal('revealGridConfirm');
          app.vue.methods.hideModal('layoutMenu');
          app.vue.methods.hideModal('settings');
        } else {
          app.vue.methods.hideModal();
        }
      }
    }

    setTimeout(() => {
      app.vue.data.state.suppressWrapperClick = false;
    }, 0);
  };

  app.vue.methods.getEventData = function (item, type, extra) {
    return {
      detail: {
        item,
        type,
        ...(extra || {}),
      },
    };
  };

  app.vue.methods.shareResult = async function () {
    const url = app.vue.methods.buildResultShareUrl();
    let { variant, numberLabel, difficulty } = app.vue.model.formattedMeta;

    const title = [variant, numberLabel, difficulty].filter(Boolean).join(' ');
    const text = `⏱️ I completed ${title} in ${this.timerDisplay}`;

    let file = null;
    try {
      const blob = app.helpers.generateShareImage && (await app.helpers.generateShareImage());
      if (blob) file = new File([blob], `${title}.png`, { type: 'image/png' });
    } catch (err) {
      console.warn('share image failed', err);
    }

    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title, text });
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        console.error(err);
      }
    }

    if (file) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = `${title}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      app.helpers.dispatchEvent('puzzleshare', { data: {} });
      return;
    }

    if (!navigator.share) {
      app.vue.methods.copyToClipboard(`${text} ${url}`);
      app.helpers.dispatchEvent('puzzleshare', { data: {} });
      return;
    }

    navigator
      .share({ title, text, url })
      .then(() => {
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
      })
      .catch((err) => {
        app.vue.methods.copyToClipboard(`${text} ${url}`);
        app.helpers.dispatchEvent('puzzleshare', { data: {} });
        console.error(err);
      });
  };

  app.vue.methods.timerIsBlocked = function () {
    return (
      app.vue.data.modals.visible.indexOf('competitionEntry') >= 0 ||
      app.vue.data.modals.visible.indexOf('welcomeScreen') >= 0
    );
  };

  app.vue.methods.buildResultShareUrl = function () {
    const inIframe = window.self !== window.top;
    let url;

    if (inIframe) {
      try {
        url = window.top.location.href;
      } catch (e) {
        url = document.referrer || window.location.href;
      }
    } else {
      url = window.location.href;
    }

    try {
      const u = new URL(url);
      u.searchParams.delete('gid');
      return u.toString();
    } catch (e) {
      return url;
    }
  };

  app.vue.methods.changeGridResize = function (value) {
    if (value < 0 || value > 5) {
      return;
    }

    app.vue.data.userPuzzleSettings.gridResize = value;

    setTimeout(() => {
      app.helpers.resizeGrid();
    }, 0);
  };

  app.vue.methods.changeTextSize = function (value) {
    if (value < 0 || value > 5) {
      return;
    }

    app.vue.data.userPuzzleSettings.textSize = value;

    setTimeout(() => {
      app.helpers.resizeGrid();
    }, 100);
  };

  app.vue.computed.cluesOverflowingClass = function () {
    return app.vue.data.user.cluesOverflowing ? 'clues-overflowing' : '';
  };

  app.vue.methods.deleteCurrentLetter = function () {
    app.emitter.emit('keyup-delete', null, null);
  };

  app.vue.computed.gridResizeClass = function () {
    return 'grid-resize-' + app.vue.data.userPuzzleSettings.gridResize;
  };

  app.vue.computed.gridResizedClass = function () {
    return app.vue.data.userPuzzleSettings.gridResize > 0 ? 'grid-resized' : '';
  };

  app.vue.methods.toggleLayout = function () {
    app.vue.data.modes.grid = !app.vue.data.modes.grid;

    requestAnimationFrame(() => {
      app.helpers.resizeGrid();
    });
  };

  app.vue.methods.getDOMValue = function (selector, value) {
    return app.helpers.getDOMValue(selector, value);
  };

  app.vue.methods.resizeGrid = function () {
    app.helpers.resizeGrid();
  };

  app.vue.data.user.notesInLetters = {};
  app.vue.data.state.isAdmired = false;
  app.vue.data.themeMode = 'light';
  app.vue.data.celebrating = false;
  app.vue.data.lastEnteredCell = null;


  app.vue.computed.activeClue = function () {
    return this.puzzle.clues[this.activeWord];
  };

  app.vue.computed.activeWord = function () {
    return this.puzzle.cells[this.active.cell][this.active.direction];
  };

  app.vue.computed.activeWordCompleted = function () {
    var isCompleted = true;
    var word = this.activeWord;
    var cells = this.$root.puzzle.words[word].cells;

    for (var r = 0; r < cells.length; r++) {
      var id = cells[r].id;
      var answer = this.$root.user.answers['cell_' + (id - 1)];
      if (answer === ' ') {
        isCompleted = false;
      }
    }
    return isCompleted;
  };

  app.vue.computed.gridSizeClass = function () {
    if (this.puzzle !== undefined) {
      let rows = this.puzzle.grid.length;
      let cols = this.puzzle.grid[0].length;

      return 'grid-' + cols + '-' + rows;
    }

    return '';
  };

  app.vue.computed.isStandaloneClass = function () {
    return '';
  };

  app.vue.computed.allowScrollClass = function () {
    if (this.isCompleted && this.isCompletedWithoutErrors) {
      this.$root.$el.parentElement.classList.add('allow-scroll');

      return 'allow-scroll';
    }

    return false;
  };

  app.vue.computed.competitionClass = function () {
    return this.isCompetition ? 'prize-mode' : 'not-prize-mode';
  };

  app.vue.computed.isCompetition = function () {
    return this.puzzle !== undefined && this.puzzle.competition !== false;
  };

  app.vue.computed.isCompletedWithErrors = function () {
    return this.isCompleted && !this.isCompletedWithoutErrors && !this.isCompetition;
  };

  app.vue.computed.isCompletedWithoutErrors = function () {
    return (
      app.helpers.getUserAnswerString(app.puzzle) === app.vue.data.source.copy.settings.solution
    );
  };

  app.vue.computed.isCompletedReadOnly = function () {
    return this.isCompletedWithoutErrors || this.isCompletedCompetition;
  };

  app.vue.computed.isCompletedCompetition = function () {
		return (
			this.isCompleted &&
			this.isCompetition &&
			app.vue.data.competition &&
			app.vue.data.competition.status === 'entered'
		)
	}

  app.vue.computed.isClosedCompetition = function () {
		return (
			this.isCompetition &&
			app.vue.data.competition &&
			app.vue.data.competition.status === 'closed'
		)
	}

  app.vue.computed.isSubmittableCompetition = function () {
		return (
			this.isCompetition &&
			this.isCompleted &&
			['closed', 'entered'].every(s => s !== app.vue.data.competition.status)
		)
	}

  app.vue.methods.revealLetter = function () {
    if (app.vue.model.isCompletedWithoutErrors === false) {
      app.helpUsed('reveal', 'cell');
      app.vue.data.lastEnteredCell = app.vue.data.active.cell;
      app.helpers.revealCell(app.vue.data.active.cell);
      app.helpers.tsSet('letterEntered');
    }
  };

  app.vue.methods.revealWord = function () {
    if (app.vue.model.isCompletedWithoutErrors === false) {
      app.helpUsed('reveal', 'word');
      app.vue.data.lastEnteredCell = app.vue.data.active.cell;

      const cells = app.puzzle.words[app.vue.model.activeWord].cells;

      for (let r = 0; r < cells.length; r++) {
        app.helpers.revealCell(cells[r].id);
      }

      app.helpers.tsSet('letterEntered');
    }
  };

  app.vue.methods.showCompetitionModal = function () {
		app.vue.methods.showModal('competitionEntry')
		app.timer && app.timer.pause()
	}

	app.vue.methods.closeCompetitionModal = function () {
		app.vue.methods.hideModal('competitionEntry')

		if (app.vue.model.isSubmittableCompetition) {
			app.timer && app.timer.start(app.vue.data.time)
		}
	}

  app.vue.methods.onOverlayClick = function () {
		if (app.vue.data.modals.visible.indexOf('competitionEntry') > -1) {
			app.vue.methods.closeCompetitionModal()
		} else if (
			!['completeSuccess', 'completeFailure', 'welcomeScreen'].some(
				m =>
					app.vue.data.modals.visible.includes(m) &&
					!app.vue.data.active.onboarding &&
					app.vue.data.modals.visible.length === 1,
			)
		) {
			app.vue.methods.hideModal()
		}
	}

	app.vue.methods.resetGrid = function () {
		if (app.vue.model.isCompletedCompetition) return

		app.helpers.resetUserState()
		app.vue.methods.setActiveClue(1)

		app.helpers.dispatchEvent('puzzlereset', app.status)

		if (app.vue.data.config.hasTimer && !app.vue.model.isCompetition) {
			app.timer.restart()
			app.helpers.saveUserTime()
		}

		app.vue.methods.hideModal()
	}

  app.vue.created = function () {
    app.emitter.on('keyup-arrow', this.keyArrow);
    app.emitter.on('keyup-enter', this.keyEnter);
    app.emitter.on('keyup', this.keySpace);
  };


  app.vue.data.keyAccents = null;

  app.vue.data.keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    [
      'Z',
      'X',
      'C',
      'V',
      'B',
      'N',
      'M',
      {
        code: 8,
        display: `
                    <svg class="icon" data-size="24" aria-hidden="true">
                        <use href="#iconDelete"></use>
                    </svg>
                    <span class="sr-only">Delete</span>
                `,
        event: 'delete',
      },
    ],
  ];

  app.vue.data.modes.grid = true;


  app.vue.methods.getPuzzleObject = function () {
    let puzzle = app.vue.data.source;
    let obj = {
      cells: [],
      clues: [],
      cluesets: [],
      copy: {},
      competition: false,
      counts: {
        cells: {
          active: 0,
          blank: 0,
          total: 0,
        },
      },
      feedback: puzzle.feedback || {},
      grid: [],
      meta: puzzle.meta,
      number: puzzle.meta.number || null,
      words: [],
    };

    obj.copy.title = puzzle.copy.title;

    if (puzzle.competition !== undefined) {
			obj.competition = puzzle.competition

			if (
				(obj.competition.closes &&
					Math.floor(Date.now() / 1000) > obj.competition.closes) ||
				(obj.competition.expired && obj.competition.expired === 0)
			) {
				app.vue.data.competition.status = 'closed'
				app.helpers.toast('This competition crossword is now closed for entries')
			}
		}

    obj = app.vue.methods.setPuzzleGrid(obj, puzzle);
    obj = app.vue.methods.setPuzzleNumber(obj, puzzle);
    obj = app.vue.methods.getClues(obj, puzzle);
    app.vue.methods.addDemarcation(obj, obj.cluesets);

    return obj;
  };

  app.vue.methods.addDemarcation = function (obj, cluesets) {
    var clues_across = cluesets[0].directions[0].clues;
    var clues_down = cluesets[0].directions[1].clues;

    this.setDemarcationOnCells(obj, clues_across, 'across');
    this.setDemarcationOnCells(obj, clues_down, 'down');
  };

  app.vue.methods.addDemarcation = function (obj, cluesets) {
    const [across, down] = cluesets[0].directions;

    app.vue.methods.setDemarcationOnCells(obj, across.clues, 'across');
    app.vue.methods.setDemarcationOnCells(obj, down.clues, 'down');
  };

  app.vue.methods.setDemarcationOnCells = function (obj, clues, direction) {
    const delimiterSuffixes = { across: '-right', down: '-bottom' };

    for (let i = 0; i < clues.length; ++i) {
      const demarcationArr = app.vue.methods.getDemarcationClassFromClue(clues[i]);

      if (!demarcationArr || !demarcationArr.length) continue;

      for (let j = 0; j < demarcationArr.length; ++j) {
        try {
          const cellId = obj.words[clues[i].word].cells[demarcationArr[j].letterIdx].id;
          const siblingCellId = obj.words[clues[i].word].cells[demarcationArr[j].letterIdx + 1].id;

          obj.cells[cellId].delimiters = [
            ...((obj.cells[cellId] && obj.cells[cellId].delimiters) || []),
            `${demarcationArr[j].delimiter}${delimiterSuffixes[direction]}`,
          ];

          obj.cells[siblingCellId].delimiterSiblings = [
            ...((obj.cells[siblingCellId] && obj.cells[siblingCellId].delimiterSiblings) || []),
            `${demarcationArr[j].delimiter}${delimiterSuffixes[direction]}-sibling`,
          ];
        } catch (err) {
          console.warn(err?.message, obj, demarcationArr[j]);
        }
      }
    }
  };

  app.vue.methods.getDemarcationClassFromClue = function (clue) {
    const chunks = clue.format.split(/[-,]/);

    if (chunks.length <= 1) return false;

    const delimiters = clue.format.match(/[-,]/g);

    let letterIdx = -1;
    let delimiterIdx = -1;

    for (let j = 0; j < chunks.length - 1; ++j) {
      letterIdx += parseInt(chunks[j], 10);
      delimiterIdx += parseInt(chunks[j], 10) + 1;

      return [
        {
          letterIdx,
          delimiter: delimiters.shift() === '-' ? 'dmark-hyphen' : 'dmark',
          delimiterIdx,
          cellNumber: clue.number,
          answer: clue.answer,
        },
      ];
    }
  };

  app.vue.methods.langOrientation = function (text) {
    let key = 'grid_orientation_' + text.toLowerCase();

    return this.lang[key] ?? text;
  };

  app.vue.methods.setPuzzleGrid = function (obj, puzzle) {
    let grid = puzzle.grid;
    for (let row = 0; row < grid.length; row++) {
      obj.grid[row] = [];
      for (let col = 0; col < grid[row].length; col++) {
        let cell = grid[row][col];

        obj.grid[row][col] = app.helpers.getCellObject(cell);
        obj.cells[cell.SquareID] = obj.grid[row][col];

        if (cell.WordAcrossID !== '') {
          obj.words[cell.WordAcrossID] = obj.words[cell.WordAcrossID] || { cells: [] };
          obj.words[cell.WordAcrossID].cells.push(obj.grid[row][col]);
        }

        if (cell.WordDownID !== '') {
          obj.words[cell.WordDownID] = obj.words[cell.WordDownID] || { cells: [] };
          obj.words[cell.WordDownID].cells.push(obj.grid[row][col]);
        }

        if (obj.grid[row][col].isBlank) {
          obj.counts.cells.blank++;
        } else {
          obj.counts.cells.active++;
        }
        obj.counts.cells.total++;
      }
    }

    for (let wordId = 0; wordId < puzzle.copy.words.length; wordId++) {
      obj.words[puzzle.copy.words[wordId].id].solution = puzzle.copy.words[wordId].solution;
    }

    return obj;
  };

  app.vue.methods.setPuzzleNumber = function (obj, puzzle) {
    let number = Number(obj.number);

    if (number) {
      obj.number = number.toLocaleString();
    }

    return obj;
  };

  app.vue.methods.getClues = function (obj, puzzle) {
    let clues = puzzle.copy.clues;
    let cluesetname = '';
    let cluesetidx = 0;
    let hideFormat = [].includes(puzzle.meta.variant);

    for (let i = 0; i < clues.length; i++) {
      if (cluesetname !== '' && cluesetname !== clues[i].name) {
        cluesetidx++;
      }
      obj.cluesets[cluesetidx] = obj.cluesets[cluesetidx] || {
        name: clues[i].name,
        directions: [],
      };
      obj.cluesets[cluesetidx].directions.push({
        name: clues[i].title,
        clues: app.helpers.getCluesArray(clues[i].clues, clues[i].title, cluesetidx),
      });
      for (var j = 0; j < clues[i].clues.length; j++) {
        let clue = clues[i].clues[j];
        let wordId = clue.word;

        obj.clues[wordId] = clue;
        if (obj.clues[wordId].answer !== undefined) {
          obj.clues[wordId].answer = obj.clues[wordId].answer.toUpperCase().replace(/[^A-Z]/g, '');
          obj.clues[wordId].solution = obj.words[wordId].solution;
        }

        obj.clues[wordId].formatNumber = this.formatClueNumber(clue);
        obj.clues[wordId].formatNumberSingle = this.formatSingleClueNumber(clue);

        if (hideFormat) {
          delete obj.clues[wordId].format;
        }
      }

      cluesetname = clues[i].name;
    }

    return obj;
  };

  app.vue.methods.isWordCompleted = function (id) {
    if (app.puzzle.words[id] === undefined) {
      return null;
    }

    let isCompleted = true;
    const cells = app.puzzle.words[id].cells;

    for (let r = 0; r < cells.length; r++) {
      const id = cells[r].id;
      const answer = app.vue.data.user.answers[`cell_${(id - 1)}`];

      if (answer === ' ') {
        isCompleted = false;
      }
    }

    return isCompleted;
  };

  app.vue.methods.keyArrow = function (event, code, direction) {
    switch (direction) {
      case 'down':
        app.helpers.setCellActiveDown(false);
        break;
      case 'left':
        app.helpers.setCellActiveLeft(false);
        break;
      case 'right':
        app.helpers.setCellActiveRight(false);
        break;
      case 'up':
        app.helpers.setCellActiveUp(false);
        break;
    }
  };

  app.vue.methods.keyEnter = function (e, code) {
    if (!e.shiftKey) {
      app.vue.methods.nextClue();
    } else {
      app.vue.methods.prevClue();
    }
  };

  app.vue.methods.keySpace = function (code) {
    if (code === 32) {
      app.vue.methods.manuallySetClueDirection(
        app.vue.data.active.direction === 'across' ? 'down' : 'across'
      );
    }
  };

  app.vue.methods.manuallySetClueDirection = function (direction) {
    const currentCell = app.vue.data.active.cell;

    if (app.vue.model.puzzle.cells[currentCell][direction]) {
      app.vue.data.active.direction = direction;

      return true;
    }

    const lastCell = app.vue.data.last[`cell-${direction}`];

    if (lastCell !== undefined) {
      app.vue.data.active.cell = app.vue.data.last[`cell-${direction}`];
      app.vue.data.active.direction = direction;

      return true;
    }

    if (lastCell === undefined) {
      const cells = app.vue.model.puzzle.cells;

      for (let i = 1; i <= cells.length; i++) {
        if (cells[i][direction]) {
          app.vue.data.active.cell = i;
          app.vue.data.active.direction = direction;

          return true;
        }
      }
    }
  };

  app.vue.methods.formatClueNumber = function (clue) {
    if (clue.links !== undefined) {
      let ary = [clue.number];
      let lastIndex = clue.links.length - 1;

      for (let i = 0; i < lastIndex; i++) {
        ary.push(clue.links[i].number + ' ' + clue.links[i].direction);
      }

      return (
        ary.join(', ') +
        ' and ' +
        clue.links[lastIndex].number +
        ' ' +
        clue.links[lastIndex].direction
      );
    }

    return clue.number;
  };

  app.vue.methods.formatSingleClueNumber = function (clue) {
    if (clue.links !== undefined) {
      let ary = [clue.number + '(' + clue.direction[0] + ')'];

      for (let i = 0; i < clue.links.length; i++) {
        ary.push(clue.links[i].number + '(' + clue.links[i].direction[0] + ')');
      }

      return ary.join(', ').toLowerCase();
    }

    return clue.number;
  };

  app.vue.methods.nextClue = function () {
    app.vue.methods.nextClueInDirection(false);
  };

  app.vue.methods.nextClueInDirection = function (reverse) {
    const directions = app.puzzle.cluesets?.[0]?.directions;
    if (!directions || directions.length < 2) return;

    const activeDirection = app.vue.data.active.direction;
    const currentDir = directions.find(
      d => d.clues?.[0]?.direction === activeDirection,
    );
    const otherDir = directions.find(d => d !== currentDir);
    if (!currentDir || !otherDir || !currentDir.clues?.length) return;

    const activeWord = app.vue.model.activeWord;
    const currentIdx = currentDir.clues.findIndex(c => c.word === activeWord);

    let nextClue;
    if (reverse) {
      if (currentIdx > 0) {
        nextClue = currentDir.clues[currentIdx - 1];
      } else {
        nextClue = otherDir.clues[otherDir.clues.length - 1];
      }
    } else {
      if (currentIdx >= 0 && currentIdx < currentDir.clues.length - 1) {
        nextClue = currentDir.clues[currentIdx + 1];
      } else {
        nextClue = otherDir.clues[0];
      }
    }

    if (!nextClue) return;

    app.vue.methods.resetActions();
    app.vue.methods.setActiveClue(nextClue.word);
  };

  app.vue.methods.prevClue = function () {
    app.vue.methods.nextClueInDirection(true);
  };

  app.vue.methods.setActiveClue = function (id) {
    app.vue.model.active.cell = app.helpers.getFirstCellOfWord(
      id,
      app.vue.data.userPuzzleSettings.cellsskipfilled === true
    );

    app.vue.model.active.direction = app.vue.model.puzzle.clues[id].direction;
  };

  app.vue.methods.enterCompetition = async function (e) {
		const ERROR_MESSAGE = `Failed to submit competition crossword, please try again`

		try {
			const URL =
				(app.puzzle && app.puzzle.competition && app.puzzle.competition.entryUrl) ||
				'@_API_SERVER_@/api/puzzles/submissions/submit'

			const formData = new FormData(e.target)

            formData.append('solution', app.helpers.getUserAnswerString(app.puzzle))

			const res = await fetch(URL, {
				method: 'post',
				body: formData,
			})

			if (!res.ok) {
				throw new Error(ERROR_MESSAGE)
			}

      const debug = Object.fromEntries(formData.entries())
      console.log(debug)

      console.log('Status:', res.status)
      console.log('OK:', res.ok)

			app.vue.methods.completePuzzle(true)
		} catch (err) {
			app.helpers.toast.error(err.message || ERROR_MESSAGE)
			console.error(err)
		}
	}

  app.vue.methods.completePuzzle = function (isCompetition) {
		if (isCompetition || app.helpers.useModelOrThis('isCompletedWithoutErrors')) {
			if (isCompetition) {
				app.vue.data.competition.status = 'entered'
				app.vue.methods.hideModal('competitionEntry')
			}

			app.timer && app.timer.stop()
			app.helpers.checkAdmiredStatus(false, app.helpers.checkCompletedStatus())
		}
	}

  app.vue.methods.checkSimilarity = function (str1, str2) {
		var equivalency = 0
		var minLength = str1.length > str2.length ? str2.length : str1.length
		var str1count = 0

		for (var s = 0; s < str1.length; s++) {
			if (str1.charAt(s) !== ' ') {
				str1count++
			}
		}

		for (var i = 0; i < minLength; i++) {
			if (str1.charAt(i) !== ' ' || str2.charAt(i) !== ' ') {
				if (str1.charAt(i) === str2.charAt(i)) {
					equivalency++
				}
			}
		}

		return (equivalency / str1count) * 100
	}

  app.vue.computed.userString = function () {
    const answers = app.vue.data.user.answers;
    const str = Object.keys(answers)
      .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
      .map(item => answers[item])
      .join('')
      .replace(/\s/g, ' ');

    return str;
  };

  app.vue.computed.solutionStrings = function () {
    var answers = [];
    for (var cell = 0; cell < this.puzzle.cells.length; cell++) {
      if (this.puzzle.cells[cell] !== undefined) {
        if (this.puzzle.cells[cell].isBlank) {
          answers.push(' ');
        } else {
          answers.push(this.puzzle.cells[cell].letter);
        }
      }
    }

    return answers.join('');
  };

  app.vue.computed.mp_body_classes = function () {
    return []
  }


  app.vue.watch.activeWord = function (word) {
    app.helpers.scrollToClue(word);
    app.helpers.scrollToRow();
    app.vue.data.last[`cell-${app.vue.data.active.direction}`] = app.vue.data.active.cell;
  };

  app.vue.watch.isCompleted = {
		handler(val) {
			if (
				val &&
				this.isCompetition &&
				this.isSubmittableCompetition &&
				!app.status.completed
			) {
				app.vue.methods.showCompetitionModal()
			}
		},
		immediate: true,
	}

  app.vue.watch.isCompletedWithErrors = {
		handler(val) {
			if (val && !this.isCompetition) {
				app.helpers.puzzleCompletedUnsuccessfully()
			}
		},
		immediate: true,
	}

  app.vue.watch.isCompletedWithoutErrors = {
		handler(val) {
			if (val && !this.isCompetition) {
				app.vue.methods.hideModal()

				if (!app.status.completed) {
					const stepMs = 32
					const flashMs = 500
					const maxStep = (this.puzzle.grid[0].length - 1) + (this.puzzle.grid.length - 1)

					app.vue.data.celebrating = true
					setTimeout(() => {
						app.vue.data.celebrating = false
						app.vue.methods.completePuzzle(false)
					}, maxStep * stepMs + flashMs)
				} else {
					app.vue.methods.completePuzzle(false)
				}
			}
		},
		immediate: true,
	}

  app.vue.watch.userSettings = function () {
    app.helpers.savePuzzleState();
  };

  app.vue.watch['check.grid'] = function (val) {
    if (val) {
      setTimeout(() => {
        if (
          app.vue.methods.checkSimilarity(
            app.vue.model.userString,
            app.vue.model.solutionStrings
          ) === 100
        ) {
          app.vue.data.blind.gridCorrect = true;

          setTimeout(() => {
            app.vue.data.blind.gridCorrect = false;
          }, 2000);
        }
      }, 0);
    }
  };

  app.vue.computed.checkErrors = function () {
    if (!app.vue.data.check.grid || app.vue.data.mp_game) return [];

    const answers = app.vue.data.user.answers;
    return Object.values(app.puzzle.cells)
      .filter((cell) => {
        const value = answers[`cell_${cell.id - 1}`];
        return cell && !cell.isBlank && value && value.trim() && value !== cell.letter;
      })
      .map((cell) => cell.id);
  };

  app.vue.computed.removeErrorsShown = function () {
    return this.checkErrors.length > 0 && !this.isCompletedReadOnly;
  };

  app.vue.methods.removeErrors = function () {
    app.vue.model.checkErrors.forEach((id) => {
      app.vue.data.user.answers[`cell_${id - 1}`] = ' ';
      app.vue.data.user.notes[`cell_${id - 1}`] = 0;
      app.helpers.mpWriteUserCell?.(id, '');
    });

    app.helpers.updateProgress();
    app.helpers.saveUserPlayStatus();
    app.helpers.saveUserState();
    app.vue.methods.hideBlind();
    app.vue.methods.resetActions();
  };

  app.vue.watch['check.letter'] = function (val) {
    const userLetter = app.vue.data.user.answers[`cell_${(app.vue.data.active.cell - 1)}`];
    const letter = app.puzzle.cells[app.vue.data.active.cell].letter;
    const noLetterEntered = !userLetter.length;

    if (val) {
      setTimeout(() => {
        if (userLetter === ' ' || letter !== userLetter || noLetterEntered) return;
        app.vue.data.blind.letterCorrect = true;

        setTimeout(() => {
          app.vue.data.blind.letterCorrect = false;
        }, 4000);
      }, 0);
    }
  };

  app.vue.watch['check.word'] = function (val) {
    if (val) {
      setTimeout(() => {
        const word = app.puzzle.words[app.vue.model.activeClue.word].solution;
        const userWord = app.helpers.getUserAnswerWord(app.vue.model.activeClue.word);

        if (!userWord.length || userWord === ' ' || userWord !== word) return;

        app.vue.data.blind.wordCorrect = true;

        setTimeout(() => {
          app.vue.data.blind.wordCorrect = false;
        }, 4000);
      }, 0);
    }
  };

  app.vue.beforeMount = function () {
    app.helpers.handleTheme(app.vue.data.state.theme);
  };

  app.vue.mounted = function () {
    window.addEventListener('keydown', e => {
      const code = e.keyCode || e.which;
      const tag = e.target?.tagName;
      const inFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (code === 9) {
        if (!inFormField) {
          e.preventDefault();
          app.vue.model?.nextClueInDirection?.(e.shiftKey);
        }
        return;
      }

      if (inFormField) return;

      if (!app.vue.model.isCompletedReadOnly) {
        if (code === 8) {
          app.emitter.emit('keyup-delete', e, code);
        }

        if (code === 46) {
          app.emitter.emit('keyup-delete', e, code);
        }

        if (app.helpers.isAccentLetter(e.key)) {
          e.preventDefault();
          app.helpers.enterLetter(e.key);
        } else if (code >= 65 && code <= 90) {
          app.emitter.emit('keyup-az', e, code, String.fromCharCode(code));
        }
      }

      if (code === 13) {
        app.emitter.emit('keyup-enter', e, code);
      }

      if (code >= 37 && code <= 40) {
        app.emitter.emit('keyup-arrow', e, code, ['left', 'up', 'right', 'down'][code - 37]);
      }

      app.emitter.emit('keyup', code);
    });

    app.helpers.initTheme();

    app.helpers.mountUiHelpers();
    app.emitter.emit('mounted');
    app.helpers.mounted(this);
  };

  app.vue.methods.clickAdmire = function () {
    app.vue.methods.hideModal();
    app.status.admired = true;
    app.vue.data.state.isAdmired = true;
  };
})();
