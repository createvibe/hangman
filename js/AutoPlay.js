class AutoPlay {

    constructor(node, topics = [], maxIncorrectGuesses = 7) {
        this.node = node;
        this.hangman = null;
        this.wordIndex = 0;
        this.topics = topics;
        this.datamuse = new DataMuse(this.topics);
        this.wordsapi = new WordsAPI();
        this.timeout = 90000;
        this.level = 1;
        this.score = 0;
        this.maxIncorrectGuesses = maxIncorrectGuesses;
        this.init();
    }

    init() {
        this.datamuse.fetch().then(() => {
        
            this.randomizeWords();
            this.newGame();
        
        }).catch(console.error);
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
        const word = this.datamuse.words[this.wordIndex];
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
                this.wordIndex += 1;
                console.error(e);
                return this.newGame();
            });
    }

    getHintsFromWordData(word, data) {
        let hints = [];
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
        let hint = data.definition;
        if (data.partOfSpeech) {
            hint = data.partOfSpeech + ': ' + hint;
        }
        // 1 handicap for every 3 levels
        const numHandicaps = Math.min(this.maxIncorrectGuesses, Math.floor(this.level / 3));
        this.node.querySelector('.info .category .value').innerText = this.topics.join(', ');
        this.node.querySelector('.info .level .value').innerText = this.level;
        this.node.querySelector('.info .score .value').innerText = this.score;
        this.node.querySelector('.info .handicap .time').innerText = '';
        this.node.querySelector('.info .handicap .value').innerText = numHandicaps === 0 ? 'None' : numHandicaps;
        this.hangman = new Hangman(this.node, word, hint, this.timeout, this.maxIncorrectGuesses, numHandicaps, hints.length);
        this.hangman.level = this.level;
        this.hangman.onGameOver = () => {
            if (this.handicapTimeIntv) {
                clearInterval(this.handicapTimeIntv);
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
        };
        this.hangman.onLoser = () => {
            setTimeout(() => this.startGame(word, data), 3000);
        };
    }

}