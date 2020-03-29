class AutoPlay {

    constructor(node, topics = []) {
        this.node = node;
        this.hangman = null;
        this.wordIndex = 0;
        this.datamuse = new DataMuse(topics);
        this.wordsapi = new WordsAPI();
        this.timeout = 90000;
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
                return this.newGame();
            });
    }

    startGame(word, data) {
        if (!word || !data) {
            return this.newGame();
        }
        let hints = [];
        let hint = data.definition;
        if (data.partOfSpeech) {
            hint = data.partOfSpeech + ': ' + hint;
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
        this.hangman = new Hangman(this.node, word, hint, this.timeout);
        this.hangman.onHintTime = () => {
            if (hints.length !== 0) {
                this.hangman.addHint(hints.shift());
            }
        };
        this.hangman.onWinner = () => {
            this.wordIndex += 1;
            if (this.wordIndex % 2 === 0) {
                this.timeout = Math.max(45000, this.timeout - 5000);
            }
            setTimeout(() => this.newGame(), 3000);
        };
        this.hangman.onLoser = () => {
            setTimeout(() => this.startGame(word, data), 3000);
        };
    }

}