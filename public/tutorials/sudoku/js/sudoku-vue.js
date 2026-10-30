var app = window.app || {}
var vm = window.vm || {}
;(function () {

  app.vue.data.print.hasGridTextSize = true;

  app.vue.computed.isCompletionOverlayVisible = function () {
    if (!this.$root.isCompleted) {
      return false;
    }
    if (this.userPuzzleSettings.showCorrections) {
      return false;
    }
    var whenResult = app.helpers.tsThisBeforeThat('hideCompletionOverlay', 'letterEntered');
    return whenResult === 1 || whenResult === true;
  };

  app.vue.methods.setSource = function (data) {
    if (data.dimensions === undefined) {
      data.dimensions = {
        width: data.settings.colCount,
        height: data.settings.rowCount,
      };
    }

    const width = data.dimensions.width;
    const height = data.dimensions.height;
    const settings = data.settings || {};

    data.dimensions.isMini = width !== 9 || height !== 9;

    if (data.dimensions.isMini) {
      settings.boxColCount = settings.boxColCount || 2;
      settings.boxRowCount = settings.boxRowCount || 3;
    }

    data.dimensions.boxWidth = settings.boxColCount ? width / settings.boxColCount : Math.floor(Math.sqrt(width));
    data.dimensions.boxHeight = settings.boxRowCount ? height / settings.boxRowCount : Math.floor(Math.sqrt(height));
    data.dimensions.allowedValues = settings.allowedValues || '123456789'.slice(0, width);
    data.dimensions.isColour = ['colour', 'color'].includes(data.meta && data.meta.mode);

    if (data.puzzle === undefined) {
      data.puzzle = [];
      data.solution = data.settings.solution ? [] : null;

      for (let cellId = 0, row = 0; row < height; row++) {
        let rowData = [];
        let solutionRowData = [];

        for (let col = 0; col < width; col++, cellId++) {
          const cellValue = data.celldata ? data.celldata[cellId] : ' ';

          rowData.push(cellValue === ' ' ? 0 : Number.parseInt(cellValue));
          if (data.settings.solution) {
            solutionRowData.push(Number.parseInt(data.settings.solution[cellId]));
          }
        }

        data.puzzle.push(rowData);
        if (data.settings.solution) {
          data.solution.push(solutionRowData);
        }
      }
    }

    app.vue.data.source = data;

    if (!app.vue.data.source.meta.title) {
      app.vue.data.source.meta.title = app.vue.data.source.copy.title || app.vue.data.source.meta.variant;
    }

    if (!app.vue.data.source.meta.number) {
      app.vue.data.source.meta.number = app.vue.data.source.copy.number ?? '';
    }

    if (!app.vue.data.source.meta.difficulty) {
      app.vue.data.source.meta.difficulty = app.vue.data.source.copy.difficulty ?? '';
    }
    app.config.id = data.meta.id;
    app.config.slug = data.meta.slug;
    app.config.type = data.type || data.meta.type;
    app.config.variant = data.meta.variant;
    app.config.variantSlug = app.config.variant.split(' ').join('-').toLowerCase();
    app.config.related = data.meta.related || '';
    app.vue.methods.setShareLink(data);
  };

  app.vue.methods.shareResult = async function () {
    const url = app.vue.data.links.share;
    const { variant, numberLabel, difficulty } = app.vue.model.formattedMeta;

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

  app.vue.methods.clickAdmire = function () {
    app.vue.methods.hideModal();
    app.status.admired = true;
    app.vue.data.admired = true;
  };

  app.vue.methods.deleteCurrentLetter = function () {
    app.emitter.emit('keyup-delete', null, null);
  };

  app.vue.methods.getDOMValue = function (selector, value) {
    return app.helpers.getDOMValue(selector, value);
  };

  app.vue.computed.gridResizeClass = function () {
    return 'grid-resize-' + app.vue.data.userPuzzleSettings.gridResize ?? 0;
  };

  app.vue.computed.gridResizedClass = function () {
    return app.vue.data.userPuzzleSettings.gridResize > 0 ? 'grid-resized' : '';
  };

  app.vue.computed.higlightRowsAndColsClass = function () {
    return app.vue.data.userPuzzleSettings.highlightRowsAndColumns > 0 ? 'highlight-rows-and-cols' : '';
  };

  app.vue.methods.resizeGrid = function () {
    app.helpers.resizeGrid();
  };

  app.helpers.buildKeyboard = function (allowedValues) {
    const numbers = allowedValues.split('');
    const half = Math.ceil(numbers.length / 2);

    const multi = {
      code: 0,
      display: `
                  <svg class="icon" data-size="24" viewBox="0 0 50 50" fill="none" aria-hidden="true">
                      <rect opacity="0.5" width="25" height="25" fill="currentColor"/>
                      <rect opacity="0.5" x="25" y="25" width="25" height="25" fill="currentColor"/>
                      <rect x="24" width="2" height="50" fill="currentColor"/>
                      <rect y="24" width="50" height="2" fill="currentColor"/>
                      <rect x="1" y="1" width="48" height="48" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span class="sr-only">Multi-select</span>
              `,
      event: 'multiSelect',
    };

    const del = {
      code: 8,
      display: `
                  <svg class="icon" data-size="24" aria-hidden="true">
                      <use href="#iconDelete"></use>
                  </svg>
                  <span class="sr-only">Delete</span>
              `,
      event: 'delete',
    };

    const helper = {
      code: -1,
      display: `
                  <svg class="icon" data-size="24" viewBox="0 0 491.535 491.535" aria-hidden="true">
                      <use href="#iconHint"></use>
                  </svg>
              `,
      event: 'helper',
      label: 'action_hints_menu_item_next_step_button',
    };

    return [
      [helper, ...numbers.slice(0, half)],
      [multi, ...numbers.slice(half), del],
    ];
  };

  app.vue.data.keyboard = app.helpers.buildKeyboard('123456789');

	app.vue.data.keyMode = 'normal'
	app.vue.data.keyCode = null
	app.vue.data.multiSelect = false
	app.vue.data.selectedCells = []
	app.vue.data.celebrating = false
	app.vue.data.unitCelebrate = {}
	app.vue.data.lastEnteredCell = null
	app.vue.data.autoCheckPending = null
	app.vue.data.admired = false

	app.vue.data.user.notes = {}
	app.vue.data.modes.solution = false
	app.vue.data.modes.pencil = false
	app.vue.data.bigAppleCells = []
	app.vue.data.show.cellRightClass = false
	app.vue.data.show.gridRightClass = false
	app.vue.data.history = {}

	app.vue.computed.gridSizeClass = function () {
		if (app.puzzle !== undefined) {
			const rows = app.puzzle.grid.length
			const cols = app.puzzle.grid[0].length

			return `grid-${cols}-${rows}`
		}

		return ''
	}

	app.vue.computed.puzzleDateDisplay = function () {
		const raw = app.vue.data.source?.copy?.['date-publish'];
		if (!raw) return '';
		const datePart = raw.split(', ')[1] || '';
		return datePart.replace(/^0(\d)/, '$1');
	};

	app.vue.computed.variantClass = function () {
		return app.config.variant.replace(/\s+/g, '-').toLowerCase()
	}

	app.vue.computed.isKiller = function () {
		isKiller = false
		if(app.config.variant.replace(/\s+/g, '-').toLowerCase() == 'killer-sudoku') {
			isKiller = true
		}
		return isKiller
	}

	app.vue.computed.isMini = function () {
		return !!(app.puzzle && app.puzzle.isMini)
	}

	app.vue.computed.isColour = function () {
		return !!(app.puzzle && app.puzzle.isColour)
	}

	app.vue.computed.totalCellsCompleted = function () {
		return app.vue.data.user.answers.filter((answer, i) => answer && app.puzzle.clues[i] === 0).length
	}

	app.vue.computed.totalCellsPercent = function () {
		const playableCells = app.puzzle.clues.filter(c => c === 0).length
		return (this.totalCellsCompleted / playableCells) * 100
	}

	app.vue.computed.isCompleted = function () {
		return this.totalCellsPercent === 100
	}

	app.vue.computed.isCompletedWithErrors = function () {
		return this.isCompleted && !this.isCompletedWithoutErrors
	}

	app.vue.computed.isCompletedWithoutErrors = function () {
		return this.userString === app.puzzle.solutionString
	}

	app.vue.computed.isCompletedReadOnly = function () {
		return this.isCompletedWithoutErrors || this.isCompletedCompetition
	}

	app.vue.computed.competitionClass = function () {
		return this.isCompetition ? 'prize-mode' : 'not-prize-mode'
	}

	app.vue.computed.isCompetition = function () {
		return this.puzzle && this.puzzle.competition && !!this.puzzle.competition.active
	}

	app.vue.computed.isCompletedCompetition = function () {
		return (
			this.isCompleted &&
			this.isCompetition &&
			app.vue.data.competition &&
			app.vue.data.competition.status === 'entered'
		)
	}

	app.vue.computed.isClosedCompetition = function () {
		return this.isCompetition && app.vue.data.competition.status === 'closed'
	}

	app.vue.computed.isSubmittableCompetition = function () {
		return (
			this.isCompetition &&
			this.isCompleted &&
			['closed', 'entered'].every(s => s !== app.vue.data.competition.status)
		)
	}

	app.vue.computed.userString = function () {
		return (app.vue.data.user.answers || app.vue.data.source.celldata).join('')
	}

	app.vue.computed.emptyCellsAmount = function () {
		let totalEmptyCells = 0

		for (const row of app.puzzle.grid) {
			totalEmptyCells += row.filter(cell => cell.given === 0).length
		}

		return totalEmptyCells
	}

	app.vue.computed.emptyUserAnswer = function () {
		let totalEmptyCells = 0

		for (let i = 0; i < app.vue.data.user.answers.length; i++) {
			if (app.vue.data.user.answers[i] === 0) {
				totalEmptyCells += 1
			}
		}

		return totalEmptyCells
	}

	app.vue.computed.checkGridEmpty = function () {
		return this.emptyCellsAmount === this.emptyUserAnswer
	}

	app.vue.computed.listCellsError = function () {
		const answers = app.vue.data.user.answers;
		const width = app.puzzle.width;
		const height = app.puzzle.height;
		const boxWidth = app.puzzle.boxWidth;
		const boxHeight = app.puzzle.boxHeight;
		const errorCells = new Set();

		const checkGroup = (cellIds) => {
			const seen = {};
			for (const cellId of cellIds) {
				const val = answers[cellId];
				if (!val) continue;
				if (seen[val] !== undefined) {
					errorCells.add(cellId);
					errorCells.add(seen[val]);
				} else {
					seen[val] = cellId;
				}
			}
		};

		for (let row = 0; row < height; row++) {
			checkGroup(Array.from({ length: width }, (_, c) => row * width + c));
		}

		for (let col = 0; col < width; col++) {
			checkGroup(Array.from({ length: height }, (_, r) => r * width + col));
		}

		const boxCols = width / boxWidth;
		const boxRows = height / boxHeight;
		for (let boxRow = 0; boxRow < boxRows; boxRow++) {
			for (let boxCol = 0; boxCol < boxCols; boxCol++) {
				const ids = [];
				for (let r = 0; r < boxHeight; r++) {
					for (let c = 0; c < boxWidth; c++) {
						ids.push((boxRow * boxHeight + r) * width + (boxCol * boxWidth + c));
					}
				}
				checkGroup(ids);
			}
		}

		return errorCells.size > 0 ? errorCells : null;
	};

	app.vue.computed.usedNumbers = function () {
		if (app.puzzle && app.puzzle.isColour) return null; // Huedoku has no numbers
		if (!app.vue.data.userPuzzleSettings || !app.vue.data.userPuzzleSettings.showUsedNumbers) return null;

		const lang = this.lang || {};
		const allowedPlaceholder = app.puzzle.allowedValues.split('').map(ch => parseInt(ch, 10));

		const cellId = app.vue.data.active.cell;
		if (cellId === null || cellId === undefined) {
			const blank = () => allowedPlaceholder.map(value => ({ value, used: false }));
			return [
				{ key: 'row', label: lang.grid_used_row || 'Row', values: blank(), placeholder: true },
				{ key: 'column', label: lang.grid_used_column || 'Column', values: blank(), placeholder: true },
				{ key: 'block', label: lang.grid_used_block || 'Box', values: blank(), placeholder: true },
			];
		}

		const answers = app.vue.data.user.answers;
		const width = app.puzzle.width;
		const height = app.puzzle.height;
		const boxWidth = app.puzzle.boxWidth;
		const boxHeight = app.puzzle.boxHeight;
		const { row, col } = app.helpers.getColRowFromCellId(cellId);

		const rowUsed = new Set();
		const colUsed = new Set();
		const boxUsed = new Set();
		for (let c = 0; c < width; c++) rowUsed.add(answers[row * width + c]);
		for (let r = 0; r < height; r++) colUsed.add(answers[r * width + col]);
		const boxRow = Math.floor(row / boxHeight) * boxHeight;
		const boxCol = Math.floor(col / boxWidth) * boxWidth;
		for (let r = boxRow; r < boxRow + boxHeight; r++) {
			for (let c = boxCol; c < boxCol + boxWidth; c++) {
				boxUsed.add(answers[r * width + c]);
			}
		}

		const allowed = app.puzzle.allowedValues.split('').map(ch => parseInt(ch, 10));
		const build = set => allowed.map(value => ({ value, used: set.has(value) }));

		return [
			{ key: 'row', label: lang.grid_used_row || 'Row', values: build(rowUsed) },
			{ key: 'column', label: lang.grid_used_column || 'Column', values: build(colUsed) },
			{ key: 'block', label: lang.grid_used_block || 'Box', values: build(boxUsed) },
		];
	};

	app.vue.computed.cellNotes = function () {
		if (app.puzzle && app.puzzle.isColour) return null; // Huedoku has no notes
		if (!app.vue.data.userPuzzleSettings || !app.vue.data.userPuzzleSettings.notesZoom) return null;

		const cellId = app.vue.data.active.cell;
		if (cellId === null || cellId === undefined) return null;

		const user = app.vue.data.user;
		if (!user || !user.notes || !user.notes[cellId]) return null;

		const notes = user.notes[cellId];
		const entered = app.puzzle.allowedValues
			.split('')
			.map(ch => parseInt(ch, 10))
			.filter(value => notes[value - 1]);

		return entered.length ? entered : null;
	};

	app.vue.computed.notesZoomShown = function () {
		if (app.puzzle && app.puzzle.isColour) return false; // Huedoku has no notes
		if (!app.vue.data.userPuzzleSettings || !app.vue.data.userPuzzleSettings.notesZoom) return false;
		const cellId = app.vue.data.active.cell;
		return cellId !== null && cellId !== undefined;
	};

	app.vue.computed.notesZoomReserved = function () {
		if (app.puzzle && app.puzzle.isColour) return false; // Huedoku has no notes
		return !!(app.vue.data.userPuzzleSettings && app.vue.data.userPuzzleSettings.notesZoom);
	};

	app.vue.computed.inspectCalculation = function () {
		if (
			!['Killer', 'Killer Sudoku', 'Extra Killer Sudoku', 'Extra Killer'].includes(
				app.vue.data.source.meta.variant,
			)
		) {
			return null
		}

		const cage = app.helpers.getCageByCellId(app.vue.data.active.cell)
		const firstId = Number.parseInt(cage.group[0], 10) - 1
		const total = Number.parseInt(
			app.puzzle.grid.flat().find(c => c.id === firstId).clusterTotal,
			10,
		)
		const size = cage.group.length
		const used = cage.group
			.map(id => Number.parseInt(app.vue.data.user.answers[id - 1], 10))
			.filter(Boolean)
		const combos = app.helpers.getCombosForInspect(size, total)

		return {
			title: `${total} as the sum of ${size} digits`,
			combos: combos.map(combo => {
				const els = combo.map(i => ({
					value: i,
					isUsed: used && used.includes(Number.parseInt(i, 10)),
				}))

				const matches = els.filter(el => el.isUsed).length
				const isPossible = !used || matches === used.length

				return {
					els,
					matches,
					isPossible,
				}
			}),
		}
	}

	app.vue.methods.getCandidatesForCell = function () {
		const targets = app.helpers.getInputTargets();
		if (!targets.length) return;

		targets.forEach(cellId => {
			if (app.helpers.isCellGiven(cellId)) return;
			if (app.vue.data.user.answers[cellId]) return;

			const candidates = app.helpers.getCandidatesForCell(cellId);
			const notes = Array(app.puzzle.width).fill(false);
			candidates.forEach(n => { notes[n - 1] = true; });
			app.vue.data.user.notes[cellId] = notes;
		});

		app.helpers.saveUserState();
		app.helpers.saveUserNotes();
		app.helpers.historySave();
		app.helpUsed('hint', 'candidates');
	};

	app.vue.methods.revealAllCandidates = function () {
		const width = app.puzzle.width;
		const total = width * app.puzzle.height;

		for (let id = 0; id < total; id++) {
			if (app.helpers.isCellGiven(id)) continue;
			if (app.vue.data.user.answers[id]) continue;

			const candidates = app.helpers.getCandidatesForCell(id);
			const notes = Array(width).fill(false);
			candidates.forEach(n => { notes[n - 1] = true; });
			app.vue.data.user.notes[id] = notes;
		}

		app.helpers.saveUserState();
		app.helpers.saveUserNotes();
		app.helpers.historySave();
		app.helpUsed('hint', 'candidates');
	};

	app.vue.computed.hintsUsed = function () {
		return (app.vue.data.user.cellsRevealed || 0) > 0
			|| (app.vue.data.user.checksUsed || 0) > 0
			|| (app.vue.data.user.hintsShown || 0) > 0;
	};

	app.vue.computed.hintsSummary = function () {
		const user = app.vue.data.user;
		const line = (n, one, other) => (this.lang[n === 1 ? one : other] || '').replaceAll('[[n]]', n);
		const parts = [];
		if (user.cellsRevealed > 0) parts.push(line(user.cellsRevealed, 'modal_completed_correct_hints_reveals_one', 'modal_completed_correct_hints_reveals_other'));
		if (user.checksUsed > 0) parts.push(line(user.checksUsed, 'modal_completed_correct_hints_checks_one', 'modal_completed_correct_hints_checks_other'));
		if (user.hintsShown > 0) parts.push(line(user.hintsShown, 'modal_completed_correct_hints_hints_one', 'modal_completed_correct_hints_hints_other'));
		return parts.join(', ');
	};

	app.vue.methods.checkLetter = function () {
		app.helpUsed('check', 'cell')
		app.vue.data.check.letter = app.vue.data.active.cell

		const { row, col } = app.helpers.getColRowFromCellId(app.vue.data.active.cell)

		if (app.helpers.isCellGiven(app.vue.data.active.cell)) {
			return null
		}

		if (
			app.puzzle.grid[row][col].answer ===
			app.vue.data.user.answers[app.vue.data.active.cell]

		) {
			app.vue.data.blind.letterCorrect = true
			setTimeout(() => { app.vue.data.blind.letterCorrect = false }, 2000)
		}
	}

	app.vue.methods.checkGrid = function () {
		app.helpUsed('check', 'grid')
		app.vue.data.check.grid = true

		if (!app.vue.model.checkErrors.length && !app.vue.model.checkGridEmpty) {
			app.vue.data.blind.gridCorrect = true
			setTimeout(() => { app.vue.data.blind.gridCorrect = false }, 2000)
		}
	}

	app.vue.computed.checkErrors = function () {
		if (!app.vue.data.check.grid) return []

		return app.puzzle.grid.flat()
			.filter(c => c.given === 0 && app.vue.data.user.answers[c.id] && !app.helpers.isCellCorrect(c.id))
			.map(c => c.id)
	}

	app.vue.computed.removeErrorsShown = function () {
		return this.checkErrors.length > 0 && !this.helper.open && !this.isCompletedReadOnly
	}

	app.vue.methods.removeErrors = function () {
		app.vue.model.checkErrors.forEach(id => app.helpers.setUserAnswer(id, 0, false))
		app.helpers.historySave()
		app.vue.methods.hideBlind()
		app.vue.methods.resetActions()
	}

	app.vue.methods.deleteClicked = function () {
		if (app.vue.model.isCompletedWithoutErrors !== false) return

		const targets = app.helpers.getInputTargets()
		if (!targets.length) return

		targets.forEach(id => {
			if (app.helpers.isCellGiven(id)) return
			if (!Boolean(app.vue.data.user.answers[id])) {
				app.helpers.deleteNotes(id)
			}
			app.helpers.setUserAnswer(id, 0, false)
		})
		app.helpers.historySave()
	}

	app.vue.methods.keyArrow = function (e, code, direction) {
		switch (direction) {
			case 'down':
				app.helpers.nextRow()
				break
			case 'left':
				app.helpers.prevCell()
				break
			case 'right':
				app.helpers.nextCell()
				break
			case 'up':
				app.helpers.prevRow()
				break
		}

		if (app.vue.data.keyMode === 'paint') {
			const keyCode = app.vue.data.keyCode

			if (keyCode >= 48 && keyCode <= 57) {
				app.vue.methods.numberClicked(keyCode - 48)
			}
		}
	}

	app.vue.methods.getPuzzleObject = function () {
		var puzzle = app.vue.data.source
		var obj = {
			allowedValues: puzzle.dimensions.allowedValues || '123456789',
			width: puzzle.dimensions.width,
			height: puzzle.dimensions.height,
			boxWidth: puzzle.dimensions.boxWidth || 3,
			boxHeight: puzzle.dimensions.boxHeight || 3,
			isMini: !!puzzle.dimensions.isMini,
			isColour: !!puzzle.dimensions.isColour,
			title: puzzle.title,
			grid: [],
			counts: {
				cells: {
					active: 0,
					given: 0,
					total: 0,
				},
			},
			meta: puzzle.meta,
			copy: puzzle.copy || null,
			number: puzzle.meta.number || null,
			clues: [].concat.apply([], puzzle.puzzle),
			notes: [],
			history: [],
			solution: puzzle.solution,
			solutionString: [].concat.apply([], puzzle.solution).join(''),
			previousSolution: puzzle.settings?.previous_solution || null,

			showOperators: puzzle.showoperators || false,
			cageBorder: puzzle.cageborder || null,
			cages: null,
		}

		if (puzzle.competition !== undefined) {
			obj.competition = puzzle.competition

			if (
				(obj.competition.closes &&
					Math.floor(Date.now() / 1000) > obj.competition.closes) ||
				(obj.competition.expired && obj.competition.expired === 0)
			) {
				app.vue.data.competition.status = 'closed'
				app.helpers.toast.add({
					message: 'This competition sudoku is now closed for entries',
				})
			}
		}

		obj = app.vue.methods.setPuzzleGrid(obj, puzzle)
		obj = app.vue.methods.setPuzzleNumber(obj, puzzle)
		obj = app.vue.methods.setPuzzleCages(obj, puzzle)

		app.vue.data.keyboard = app.helpers.buildKeyboard(obj.allowedValues)

		return obj
	}

	app.vue.methods.setPuzzleGrid = function (obj, puzzle) {
		const width = puzzle.dimensions.width
		const height = puzzle.dimensions.height

		for (let cellId = 0, row = 0; row < height; row++) {
			for (let col = 0; col < width; col++, cellId++) {
				const cell = {
					id: cellId,
					col: col,
					row: row,
					answer: obj.solution ? obj.solution[row][col] : null,
					given: puzzle.puzzle[row][col],

					operator: null,
					clusterTotal: null,
					cageBorders: null,
					cageCorners: null,
					cageId: null,
				}

				obj.grid[row] = obj.grid[row] || []
				obj.grid[row][col] = cell

				obj.notes[cellId] = obj.notes[cellId] || []
				for (let noteId = 0; noteId < width; noteId++) {
					obj.notes[cellId][noteId] = false
				}

				if (puzzle.puzzle[row][col] === 0) {
					obj.counts.cells.active++
				} else {
					obj.counts.cells.given++
				}
				obj.counts.cells.total++
			}
		}

		return obj
	}

	app.vue.methods.setPuzzleCages = function (obj, puzzle) {
		if (puzzle.groupdata !== undefined && puzzle.grouptotals !== undefined) {
			const groupTotals = puzzle.grouptotals.split(',')
			const groupData = puzzle.groupdata.split(';')

			puzzle.cages = []
			groupData.forEach(cellsData => {
				const cells = cellsData.split(',')
				const cage = {
					value: 0,
					operator: '',
					cells: [],
				}
				cells.forEach(cellId => {
					const x = ((cellId - 1) % obj.width) + 1
					const y = Math.floor((cellId - 1) / obj.width) + 1

					cage.cells.push([x, y])

					if (groupTotals[cellId - 1]) {
						cage.value = groupTotals[cellId - 1]
					}
				})
				puzzle.cages.push(cage)
			})
		}

		if (puzzle.cages !== undefined) {
			obj.cages = Array(obj.width * obj.height)

			for (let cageId = 0; cageId < puzzle.cages.length; cageId++) {
				obj = app.vue.methods.setPuzzleCage(obj, puzzle.cages[cageId], cageId + 1)
			}

			const maxCellId = obj.width * obj.height - 1
			for (let cellId = 0, row = 0; row < obj.height; row++) {
				for (let col = 0; col < obj.width; col++, cellId++) {
					const cell = obj.grid[row][col]

					obj.grid[row][col] = app.vue.methods.setPuzzleCellCage(
						cellId,
						obj.grid[row][col],
						obj,
						col,
						maxCellId,
					)
				}
			}
		}

		return obj
	}

	app.vue.methods.setPuzzleCellCage = function (cellId, cell, obj, col, maxCellId) {
		if (cell.cageId) {
			const cageId = cell.cageId
			const topId = cellId - obj.width
			const bottomId = cellId + obj.width
			const leftId = cellId - 1
			const rightId = cellId + 1

			const isFirstCol = col === 0
			const isLastCol = col === obj.width - 1
			const isTopRow = topId < 0
			const isBottomRow = bottomId > maxCellId

			const isSameCageTop = this.isSameCage(topId, cageId, obj)
			const isSameCageBottom = this.isSameCage(bottomId, cageId, obj)
			const isSameCageLeft = this.isSameCage(leftId, cageId, obj)
			const isSameCageRight = this.isSameCage(rightId, cageId, obj)

			if (isTopRow || !isSameCageTop) {
				cell.cageBorders.push('killer-border-t')
			}

			if (isBottomRow || !isSameCageBottom) {
				cell.cageBorders.push('killer-border-b')
			}

			if (isFirstCol || !isSameCageLeft) {
				cell.cageBorders.push('killer-border-l')
			}

			if (isLastCol || !isSameCageRight) {
				cell.cageBorders.push('killer-border-r')
			}

			const topLeftId = topId - 1
			const topRightId = topId + 1
			const bottomLeftId = bottomId - 1
			const bottomRightId = bottomId + 1
			const isSameCageTopLeft = this.isSameCage(topLeftId, cageId, obj)
			const isSameCageTopRight = this.isSameCage(topRightId, cageId, obj)
			const isSameCageBottomLeft = this.isSameCage(bottomLeftId, cageId, obj)
			const isSameCageBottomRight = this.isSameCage(bottomRightId, cageId, obj)

			if (
				!isFirstCol &&
				!isTopRow &&
				isSameCageLeft &&
				isSameCageTop &&
				!isSameCageTopLeft
			) {
				cell.cageBorders.push('has-killer-corner-t-l')
				cell.cageCorners.push('killer-corner-t-l')
			}

			if (
				!isLastCol &&
				!isTopRow &&
				isSameCageRight &&
				isSameCageTop &&
				!isSameCageTopRight
			) {
				cell.cageBorders.push('has-killer-corner-t-r')
				cell.cageCorners.push('killer-corner-t-r')
			}

			if (
				!isFirstCol &&
				!isBottomRow &&
				isSameCageLeft &&
				isSameCageBottom &&
				!isSameCageBottomLeft
			) {
				cell.cageBorders.push('has-killer-corner-b-l')
				cell.cageCorners.push('killer-corner-b-l')
			}

			if (
				!isLastCol &&
				!isBottomRow &&
				isSameCageRight &&
				isSameCageBottom &&
				!isSameCageBottomRight
			) {
				cell.cageBorders.push('has-killer-corner-b-r')
				cell.cageCorners.push('killer-corner-b-r')
			}
		}

		return cell
	}

	app.vue.methods.isSameCage = function (cellId, cageId, obj) {
		return obj.cages[cellId] === cageId
	}

	app.vue.methods.setPuzzleCage = function (obj, cage, cageId) {
		let [col1, row1] = cage.cells[0]
		let row = row1 - 1
		let col = col1 - 1
		let cellId = row * obj.width + col

		if (cage.cells.length === 1) {
			obj.grid[row][col].given = cage.value
			obj.clues[cellId] = cage.value

			obj.grid[row][col].cageId = cageId
			obj.grid[row][col].cageBorders = []
			obj.cages[cellId] = cageId
		} else {
			obj.grid[row][col].clusterTotal = cage.value
			obj.grid[row][col].operator = cage.operator

			for (let cageCellId = 0; cageCellId < cage.cells.length; cageCellId++) {
				;[col1, row1] = cage.cells[cageCellId]
				row = row1 - 1
				col = col1 - 1
				cellId = row * obj.width + col

				obj.grid[row][col].cageId = cageId
				obj.grid[row][col].cageBorders = []
				obj.grid[row][col].cageCorners = []
				obj.cages[cellId] = cageId
			}
		}

		return obj
	}

	app.vue.methods.setPuzzleNumber = function (obj, puzzle) {
		const number = Number(obj.number)

		if (number) {
			obj.number = number.toLocaleString()
		}

		return obj
	}

	app.vue.methods.toggleMultiSelect = function () {
		app.vue.data.multiSelect = !app.vue.data.multiSelect
		app.vue.data.selectedCells = []
		app.vue.data.active.cell = null
		app.vue.data.active.row = null
		app.vue.data.active.col = null
		app.vue.data.keyMode = 'normal'
		app.vue.data.keyCode = null
		app.emitter.emit('longpress', null)
	}

	app.vue.methods.toggleCellSelection = function (cellId) {
		const sel = app.vue.data.selectedCells
		const index = sel.indexOf(cellId)
		if (index === -1) {
			sel.push(cellId)
		} else {
			sel.splice(index, 1)
		}
	}

	app.vue.methods.numberClicked = function (number) {
		if (app.vue.data.modes.pencil) {
			app.helpers.setNotes(app.vue.data.active.cell, number)
		} else {
			if (
				app.vue.methods.getOccurrence(Object.values(app.vue.data.user.answers), number) >=
				app.puzzle.width
			) {
				app.vue.data.keyMode = 'normal'
				app.vue.data.keyCode = null

				return false
			}

			app.helpers.setUserAnswer(app.vue.data.active.cell, number)

			if (
				app.vue.data.keyMode === 'paint' &&
				app.vue.methods.getOccurrence(Object.values(app.vue.data.user.answers), number) >=
					app.puzzle.width
			) {
				app.vue.data.keyMode = 'normal'
				app.vue.data.keyCode = null
				app.emitter.emit('longpress', null)
			}

			if (app.vue.model.isCompletedWithErrors) {
				app.vue.watch.isCompletedWithErrors.handler.call(app.vue.model, true)
			}
		}

		app.helpers.historySave()
	}

	app.vue.methods.getOccurrence = function (array, value) {
		return array.filter(v => v === value).length
	}

	app.vue.methods.resetGrid = function () {
		if (app.vue.model.isCompletedCompetition) return

		app.helpers.historyReset()
		app.helpers.resetUserState()
		app.helpers.historySave()

		app.helpers.dispatchEvent('puzzlereset', app.status)

		if (app.vue.data.config.hasTimer && !app.vue.model.isCompetition) {
			app.timer.restart()
			app.helpers.saveUserTime()
		}

		app.vue.methods.hideModal()
	}

	app.vue.methods.setActiveClue = function (id) {
		app.vue.methods.setActiveItem('cell', id)
	}

	app.vue.methods.getPuzzleHeight = function (el) {
		return el.getBoundingClientRect().height
	}

	app.vue.methods.historyUndo = function () {
		if (!app.vue.model.isCompletedWithoutErrors) {
			app.helpers.historyUndo()
		}
	}

	app.vue.methods.historyRedo = function () {
		if (!app.vue.model.isCompletedWithoutErrors) {
			app.helpers.historyRedo()
		}
	}

	app.vue.methods.revealLetter = function () {
		const targets = app.helpers.getInputTargets()
		if (!targets.length) return

		targets.forEach(id => app.helpers.revealCell(id, true))
		app.helpers.historySave()
		app.helpers.tsSet('letterEntered')

		setTimeout(() => {
			app.vue.methods.resetActions('reveal.letter')
		}, 0)
	}

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

	app.vue.methods.setActiveItem = function (key, id) {
		app.vue.data.active[key] = id
		app.vue.data.reveal.grid = false
		app.helpers.saveActiveState()
	}

	app.vue.methods.enterCompetition = async function (e) {
		const ERROR_MESSAGE = `Failed to submit competition sudoku, please try again`

		try {
			const URL =
				app.puzzle.competition.entryUrl || '@_API_SERVER_@/api/puzzles/submissions/submit'
			const formData = new FormData(e.target)

			formData.append('d', app.helpers.getUserAnswerString(app.puzzle))
			formData.append('i', app.config.id)
			formData.append('t', 'sudoku')

			const res = await fetch(URL, {
				method: 'post',
				body: formData,
			})

			if (!res.ok) {
				throw new Error(ERROR_MESSAGE)
			}

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

			app.timer.stop()
			app.helpers.checkAdmiredStatus(false, app.helpers.checkCompletedStatus())
		}
	}

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

	app.vue.watch['userPuzzleSettings.showUsedNumbers'] = function () {
		setTimeout(() => app.helpers.resizeGrid(), 0)
	}
	app.vue.watch.usedNumbers = function (val, old) {
		if (!!val !== !!old) {
			setTimeout(() => app.helpers.resizeGrid(), 0)
		}
	}
	app.vue.watch['userPuzzleSettings.notesZoom'] = function () {
		setTimeout(() => app.helpers.resizeGrid(), 0)
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

				const isFreshCompletion = !app.status.completed
				if (isFreshCompletion) {
					const stepMs = 50
					const cellMs = 300
					const maxStep =
						(app.puzzle.width - 1) + (app.puzzle.height - 1)
					const totalMs = maxStep * stepMs + cellMs + 150

					app.vue.data.celebrating = true
					setTimeout(() => {
						app.vue.data.celebrating = false
						app.vue.methods.completePuzzle(false)
					}, totalMs)
				} else {
					app.vue.methods.completePuzzle(false)
				}
			}
		},
		immediate: true,
	}

	app.vue.created = function () {
		app.emitter.on('keyup-arrow', app.vue.methods.keyArrow)
	}

	app.vue.mounted = function () {
		app.helpers.initTheme();

		window.addEventListener('keydown', e => {
			const code = e.keyCode || e.which

			if (
				!app.vue.model.isCompletedWithoutErrors &&
				!app.vue.data.modals.visible.length
			) {
				if (code === 8 || code === 46) {
					app.emitter.emit('keyup-delete', e, code)
					app.vue.methods.deleteClicked()
				}

				if ((code >= 49 && code <= 57) || (code >= 97 && code <= 105)) {
					app.emitter.emit('keyup-19', e, code, e.key)
				}
			}

			if (code === 13) {
				app.emitter.emit('keyup-enter', e, code)
			}

			if (code >= 37 && code <= 40) {
				e.preventDefault()
				app.emitter.emit(
					'keyup-arrow',
					e,
					code,
					['left', 'up', 'right', 'down'][code - 37],
				)
			}

			app.emitter.emit('keyup', code)
		})

		app.helpers.mountUiHelpers()

		app.emitter.emit('mounted')

		app.helpers.mounted(this)
	}
})()
