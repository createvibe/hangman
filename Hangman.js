class Hangman {

    static initWithPrompt(node) {
        const word = prompt('Specify a word');
        const hint = prompt('Specify a hint for your word');
        if (!word || !hint) {
            return this.initWithPrompt(node);
        }
        return new Hangman(node, word, hint);
    }

    constructor(node, word, hint, maxIncorrectGuesses = 7) {
        // the root document element
        this.node = node;
        // the word to solve
        this.word = word.toUpperCase();
        // provide a hint to the user to solve the word
        this.hint = hint;
        // the max number of incorrect guesses allowed
        this.maxIncorrectGuesses = maxIncorrectGuesses;
        // keep track of how many incorrect guess attempts the user has made
        this.incorrectGuesses = 0;
        // know if the game is over
        this.isGameOver = false;
        /* create an object of letters representing each character in the given word
            - use an object so we can know if the user guessed each letter or not */
        this.lettersFound = (new Array(this.word.length)).fill(null).reduce((obj, v, n) => {
            const char = this.word.charAt(n);
            obj[char] = !/[A-Z]/.test(char);
            return obj;
        }, {});
        /* create an object of letters representing A-Z
            - use an object so we can know if the user guessed each letter or not
            - 65 is char code for 'A', array is 0 based, 65-90 are char codes for A-Z */
        this.letters = (new Array(26)).fill(0).reduce((obj, v, n) => {
            obj[String.fromCharCode(n + 65)] = false;
            return obj;
        }, {});
        // render the hangman
        this.clearGameBoard();
        this.render();
    }

    gameOver() {
        this.isGameOver = true;
        this.render();
    }

    guessLetter(char) {
        if (this.isGameOver) {
            return false;
        }
        if (this.letters[char]) {
            return true;
        }
        char = char.toUpperCase();
        let isCorrect = false;
        if (char in this.lettersFound) {
            isCorrect = true;
            this.lettersFound[char] = true;
            this.isWinner = this.isGameOver = Object.keys(this.lettersFound).every(char => !!this.lettersFound[char]);
        } else {
            this.incorrectGuesses += 1;
            this.isGameOver = (this.incorrectGuesses >= this.maxIncorrectGuesses);
        }
        this.letters[char] = true;
        this.render();
        return isCorrect;
    }

    clearGameBoard() {
        this.node.className = '';
        this.node.querySelector('.gallow.body').className = 'gallow body';
    }

    render() {
        if (this.isGameOver && this.node.className.indexOf('gameover') === -1) {
            this.node.className += ' gameover';
            if (this.isWinner) {
                this.node.className += ' winner';
            }
        }
        this.renderHint();
        this.renderHangman();
        this.renderLetters();
        this.renderABC();
    }

    renderHint() {
        this.node.querySelector('.hint-text').innerText = this.hint;
    }

    renderHangman() {
        if (this.incorrectGuesses > 0) {
            this.node.querySelector('.gallow.body').className = 'gallow body tries-' + this.incorrectGuesses;
        }
    }

    renderLetters() {
        const root = this.node.querySelector('.gallow.body .letters');
        root.innerHTML = '';

        for (let i = 0; i < this.word.length; i++) {
            const char = this.word.charAt(i);

            const div = document.createElement('div');
            div.className = 'char';

            const isNonAlpha = !/[A-Z]/.test(char);
            if (isNonAlpha) {
                div.className += ' non-alpha';
            }

            const span = document.createElement('span');

            if (char === ' ') {
                span.innerHTML = '&nbsp;';
            } else if (this.letters[char] || isNonAlpha) {
                span.innerText = char;
            } else {
                span.innerHTML = '&nbsp;';
            }

            div.appendChild(span);
            root.appendChild(div);
        }
    }

    renderABC() {
        const root = this.node.querySelector('.abc');
        root.innerHTML = '';

        const keys = Object.keys(this.letters);
        const numLetters = keys.length;
        for (let i = 0; i < numLetters; i++) {
            const char = keys[i];

            const div = document.createElement('div');
            div.className = 'char';

            
            const span = document.createElement('span');
            span.innerText = char;

            if (this.letters[char]) {
                div.className += ' used';

                if (char in this.lettersFound && this.lettersFound[char]) {
                    div.className += ' correct';
                } else {
                    div.className += ' incorrect';
                }
            } else if (this.isWinner && char in this.lettersFound) {
                div.className += ' correct';
            } else if (!this.isGameOver) {
                div.addEventListener('click', evt => this.guessLetter(char));
            }

            div.appendChild(span);
            root.appendChild(div);
        }
    }

};