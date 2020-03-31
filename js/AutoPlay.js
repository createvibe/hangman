class AutoPlay {

    constructor(node, topics = [], maxIncorrectGuesses = 7) {
        this.node = node;
        this.hangman = null;
        this.wordIndex = 0;
        this.topics = topics;
        this.wordsapi = new WordsAPI();
        this.timeout = 90000;
        this.level = 1;
        this.score = 0;
        this.maxIncorrectGuesses = maxIncorrectGuesses;
        this.bpmEvent = null;
        this._init = false;
        this.isCustomGame = false;
        this.customHint = null;
        this.init();
    }

    toJson() {
        return {
            hangman: this.hangman.toJson(),
            wordIndex: this.wordIndex,
            topics: this.topics,
            timeout: this.timeout,
            level: this.level,
            score: this.score,
            maxIncorrectGuesses: this.maxIncorrectGuesses
        };
    }

    init() {
        if (neubpm) {
            neubpm.stopwatch.ensureStopped();
            neubpm.stopwatch.flush();
            this.bpmEvent = null;
        }
        if (this.hangman) {
            this.hangman.stopTimers();
        }
        this.datamuse = new DataMuse(this.topics);
        this.datamuse.fetch().then(() => {

            neubpm && neubpm.profiler.tag('category', this.topics.join(', '));
        
            this.randomizeWords();
            this.newGame();

            this._init = true;
        
        }).catch(console.error);
        if (this._init) {
            return;
        }
        this.initDOMEvents();
    }

    initDOMEvents() {
        this.node.querySelector('.info .category').addEventListener('click', evt => {
            if (this.isCustomGame) {
                return;
            }
            const category = prompt('Enter a new category:', this.topics.join(','));
            if (!category) {
                return;
            }
            const topics = category.split(',').map(str => str.replace(/^\s*|\s*$/g, ''));
            if (topics.length === 0) {
                return;
            }
            this.topics = topics;
            this.init();
        });
        this.node.querySelector('.menu .skip-word').addEventListener('click', evt => {
            if (this.isCustomGame) {
                return;
            }
            if (this.hangman) {
                this.hangman.stopTimers();
            }
            this.wordIndex += 1;
            if (neubpm) {
                neubpm.stopwatch.ensureStopped();
                neubpm.stopwatch.flush();
                neubpm.profiler.addEvent(new Event('skip-word'), 'hangman');
                this.bpmEvent = null;
            }
            this.newGame();
        });
        this.node.querySelector('.menu .custom-game').addEventListener('click', evt => {
            const word = prompt('What word would you like to play against?');
            const hint = prompt('What is a good, but subtle hint to help someone guess your word?');
            if (!word || !hint) {
                return;
            }
            this.isCustomGame = true;
            this.word = word;
            this.customHint = hint;
            if (neubpm) {
                neubpm.stopwatch.ensureStopped();
                neubpm.stopwatch.flush();
                neubpm.profiler.addEvent(new Event('custom-game'), 'hangman');
            }
            this.newGame();
        });
        this.node.querySelector('.menu .auto-play').addEventListener('click', evt => {
            this.customHint = null;
            this.isCustomGame = false;
            if (neubpm) {
                neubpm.stopwatch.ensureStopped();
                neubpm.stopwatch.flush();
                neubpm.profiler.addEvent(new Event('auto-play'), 'hangman');
            }
            this.init();
        });
    }

    randomizeWords() {
        const words = this.datamuse.words;
        
        let currentIndex = words.length;
        let temporaryValue;
        let randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = words[currentIndex];
            words[currentIndex] = words[randomIndex];
            words[randomIndex] = temporaryValue;
        }

        return words;
    }

    newGame() {
        if (this.handicapTimeIntv) {
            clearInterval(this.handicapTimeIntv);
            this.handicapTimeIntv = null;
        }
        if (this.wordIndex >= this.datamuse.words.length) {
            this.wordIndex = 0;
        }
        const word = this.isCustomGame ? this.word : this.datamuse.words[this.wordIndex];
        if (!word) {
            if (this.wordIndex > this.words.length) {
                this.wordIndex = 0;
            } else {
                this.wordIndex += 1;
            }
            return Promise.reject(new Error('Invalid Word'));
        }
        return this.wordsapi.fetch(word)
            .then(data => this.startGame(word, data || {}))
            .catch(e => {
                if (this.isCustomGame) {
                    this.startGame(word, {});
                    return;
                }
                this.wordIndex += 1;
                console.error(e);
                return this.newGame();
            });
    }

    getHintsFromWordData(word, data) {
        let firstHint = data.definition || '';
        if (data.partOfSpeech) {
            firstHint = data.partOfSpeech + ': ' + firstHint;
        }
        let hints = [];
        if (firstHint.length !== 0) {
            hints.push(firstHint);
        }
        if (data.synonyms) {
            const syn = data.synonyms.reduce((arr, w) => {
                if (w.toUpperCase() !== word.toUpperCase()) {
                    arr.push(w);
                }
                return arr;
            }, []);
            if (syn.length !== 0) {
                hints.push('Synonyms: ' + syn.join(', '));
            }
        }
        if (data.typeOf) {
            const typeOf = data.typeOf.reduce((arr, w) => {
                if (w.toUpperCase() !== word.toUpperCase()) {
                    arr.push(w);
                }
                return arr;
            }, []);
            if (typeOf.length !== 0) {
                hints.push('As in: ' + typeOf.join(', '));
            }
        }
        if (data.hasTypes && data.hasTypes.length !== 0) {
            hints.push('Related: ' + data.hasTypes.join(', '));
        }
        if (data.derivation) {
            hints = hints.concat('Comes From: ' + data.derivation.join(', '));
        }
        if (data.examples && data.examples.length !== 0) {
            hints = hints.concat(data.examples);
        }
        return hints;
    }

    startGame(word, data) {
        if (!word || !data) {
            this.wordIndex += 1;
            return this.newGame();
        }
        const hints = this.getHintsFromWordData(word, data);
        if (this.isCustomGame) {
            hints.unshift(this.customHint);
        }
        let hint = hints.shift();
        if (this.hangman) {
            this.hangman.stopTimers();
        }
        // 1 handicap for every 3 levels
        const numHandicaps = Math.min(this.maxIncorrectGuesses, Math.floor(this.level / 3));
        this.node.querySelector('.info .category .value').innerText = this.isCustomGame ? 'Custom Game' : this.topics.join(', ');
        this.node.querySelector('.info .level .value').innerText = this.level;
        this.node.querySelector('.info .score .value').innerText = this.score;
        this.node.querySelector('.info .handicap .time').innerText = '';
        this.node.querySelector('.info .handicap .value').innerText = numHandicaps === 0 ? 'None' : numHandicaps;
        const gameCount = this.hangman ? this.hangman.score.games : 0;
        this.hangman = new Hangman(this.node, word, hint, this.timeout, this.maxIncorrectGuesses, numHandicaps, hints.length);
        this.hangman.score.games = gameCount + 1;
        this.hangman.level = this.level;
        this.hangman.onGameStart = () => {
            if (neubpm) {
                if (this.bpmEvent) {
                    this.bpmEvent.lap();
                } else {
                    this.bpmEvent = neubpm.stopwatch.start('game', 'hangman');
                }
                neubpm.profiler.addEvent(new Event('start'), 'hangman', this.toJson());
            }
        };
        this.hangman.onGameOver = () => {
            if (this.handicapTimeIntv) {
                clearInterval(this.handicapTimeIntv);
            }
            if (neubpm) {
                neubpm.profiler.addEvent(new Event('stop'), 'hangman', this.toJson());
            }
        };
        this.hangman.onHintTime = () => {
            if (hints.length !== 0) {
                this.hangman.addHint(hints.shift());
                this.hangman.numHints = hints.length;
            }
        };
        this.hangman.onHandicapStart = () => {
            if (this.handicapTimeIntv) {
                clearInterval(this.handicapTimeIntv);
            }
            let timeLeft = this.hangman.handicapIntervalTime;
            const count = this.hangman.score.getHandicapCount();
            this.node.querySelector('.info .handicap .value').innerText = count === 0 ? 'None' : count;
            const timeNode = this.node.querySelector('.info .handicap .time');
            timeNode.innerText = '(' + (timeLeft / 1000).toFixed(1) + ')';
            this.handicapTimeIntv = setInterval(() => {
                if (timeLeft <= 0) {
                    clearInterval(this.handicapTimeIntv);
                    this.handicapTimeIntv = null;
                    timeNode.innerText = '';
                    return;
                }
                timeLeft -= 100;
                timeNode.innerText = '(' + (timeLeft / 1000).toFixed(1) + ')';
            }, 100);
        };
        this.hangman.onHandicap = () => {
            const count = this.hangman.score.getHandicapCount();
            this.node.querySelector('.info .handicap .value').innerText = count === 0 ? 'None' : count;
            this.node.querySelector('.info .handicap .time').innerText = '';
            if (count > 0) {
                clearInterval(this.handicapTimeIntv);
                this.hangman.onHandicapStart();
            }
            neubpm && neubpm.profiler.addEvent(new Event('handicap'), 'hangman', this.toJson());
        };
        this.hangman.onWinner = () => {
            this.level += 1;
            this.hangman.level = this.level;
            this.wordIndex += 1;
            const score = this.hangman.score.computeScore();
            this.node.querySelector('.info .score .value').innerText = this.score + ' + ' + score;
            this.score += score;
            if (this.wordIndex % 2 === 0) {
                this.timeout = Math.max(20000, this.timeout - 5000);
            }
            setTimeout(() => this.newGame(), 4000);
            if (neubpm) {
                if (this.level % 5 === 0) {
                    neubpm.profiler.tag('level', this.level);
                }
                neubpm.profiler.addEvent(new Event('winner'), 'hangman', this.toJson());
                neubpm.stopwatch.ensureStopped();
                neubpm.stopwatch.flush();
                this.bpmEvent = null;
            }
        };
        this.hangman.onLoser = () => {
            this.hangman.score.games += 1;
            setTimeout(() => this.startGame(word, data), 3000);
            neubpm && neubpm.profiler.addEvent(new Event('loser'), 'hangman', this.toJson());
        };
        // start the game
        this.hangman.startGame();
    }

}