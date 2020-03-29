class Hangman {

    static initWithPrompt(node) {
        const word = prompt('Specify a word');
        const hint = prompt('Specify a hint for your word');
        if (!word || !hint) {
            return this.initWithPrompt(node);
        }
        return new Hangman(node, word, hint);
    }

    constructor(node, word, hint, timeout = 60000, maxIncorrectGuesses = 7) {
        // the root document element
        this.node = node;
        // the word to solve
        this.word = word.toUpperCase();
        // provide a hint to the user to solve the word
        this.hint = hint;
        // the max number of incorrect guesses allowed
        this.maxIncorrectGuesses = maxIncorrectGuesses;
        // the game timeout, in milliseconds
        this.timeout = timeout;
        // event listeners
        this.onGameOver = null;
        this.onWinner = null;
        this.onLoser = null;
        this.onHintTime = null;
        // render the hangman
        this.startGame();
    }

    addHint(hint) {
        this.hint += '<br /><br />' + hint;
        this.renderHint();
    }

    startGame() {
        // clear any previous state
        this.node.className = '';
        this.node.querySelector('.gallow.body').className = 'gallow body';
        this.node.querySelector('.gallow.body .timer').innerHTML = '';

        // keep track of how many incorrect guess attempts the user has made
        this.incorrectGuesses = 0;
        
        // know if the game is over
        this.isGameOver = false;

        // know how much time is left
        this.timeLeft = this.timeout;
        
        /* create an object of letters representing each character in the given word
            - use an object so we can know if the user guessed each letter or not */
        this.lettersFound = (new Array(this.word.length)).fill(null).reduce((obj, v, n) => {
            const char = this.word.charAt(n);
            obj[char] = !/[A-Z0-9]/.test(char);
            return obj;
        }, {});

        /* create an object of letters representing A-Z
            - use an object so we can know if the user guessed each letter or not
            - 65 is char code for 'A', array is 0 based, 65-90 are char codes for A-Z */
        this.letters = (new Array(36)).fill(0).reduce((obj, v, n) => {
            if (n < 26) {
                obj[String.fromCharCode(n + 65)] = false;
            } else {
                obj[n - 26] = false;
            }
            return obj;
        }, {});

        // sort the numbers after the letters
        this.abcChars = Object.keys(this.letters).sort((a,b) => {
            const typeA = isNaN(a) ? 'number' : 'string';
            const typeB = isNaN(b) ? 'number' : 'string';
            if (typeA === 'number' && typeB === 'string') {
                return -1;
            }
            if (typeA === 'string' && typeB === 'number') {
                return 1;
            }
            if (typeA === typeB) {
                return a - b;
            }
            return -1;
        });

        setTimeout(() => this.startTimers(), 2000);
        this.render();
    }

    startTimers() {
        if (this.timeoutInterval) {
            clearInterval(this.timeoutInterval);
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.hintTimeInterval) {
            clearInterval(this.hintTimeInterval);
        }
        this.timeoutInterval = setInterval(() => {
            if (this.isGameOver) {
                clearInterval(this.timeoutInterval);
                this.timeoutInterval = null;
                return;
            }
            this.incorrectGuesses += 1;
            this.isGameOver = (this.incorrectGuesses >= this.maxIncorrectGuesses);
            this.render();
        }, this.timeLeft / this.maxIncorrectGuesses);  // TODO: - correctGuesses
        this.timerInterval = setInterval(() => {
            if (this.isGameOver) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                return;
            }
            this.timeLeft -= 1000;
            this.node.querySelector('.gallow.body .timer').innerHTML = (this.timeLeft / 1000);
            if (this.timeLeft <= 0) {
                this.isGameOver = true;
                this.render();
            }
        }, 1000);
        this.hintTimeInterval = setInterval(() => {
            if (this.isGameOver) {
                clearInterval(this.hintTimeInterval);
                this.hintTimeInterval = null;
                return;
            }
            if (typeof this.onHintTime === 'function') {
                this.onHintTime();
            }
        }, this.timeout / 8);
        this.node.querySelector('.gallow.body .timer').innerHTML = (this.timeLeft / 1000);
    }

    gameOver() {
        this.isGameOver = true;
        this.render();
    }

    guessLetter(char) {
        if (this.isGameOver) {
            return false;
        }
        char = char.toUpperCase();
        if (this.letters[char]) {
            return true;
        }
        let isCorrect = false;
        if (char in this.lettersFound) {
            isCorrect = true;
            this.lettersFound[char] = true;
            this.isWinner = this.isGameOver = Object.keys(this.lettersFound).every(char => !!this.lettersFound[char]);
            this.timeLeft = Math.min(this.timeout, this.timeLeft + 3000);
            this.startTimers();
        } else {
            this.incorrectGuesses += 1;
            this.isGameOver = (this.incorrectGuesses >= this.maxIncorrectGuesses);
        }
        this.letters[char] = true;
        this.render();
        return isCorrect;
    }

    render() {
        if (this.isGameOver && this.node.className.indexOf('gameover') === -1) {
            this.node.className += ' gameover';
            if (this.isWinner) {
                this.node.className += ' winner';
                if (typeof this.onWinner === 'function') {
                    this.onWinner();
                }
            } else if (typeof this.onLoser === 'function') {
                this.onLoser();
            }
            if (typeof this.onGameOver === 'function') {
                this.onGameOver();
            }
        }
        this.renderHint();
        this.renderHangman();
        this.renderLetters();
        this.renderABC();
    }

    renderHint() {
        this.node.querySelector('.hint-text').innerHTML = this.hint;
        
        const hintNode = this.node.querySelector('.hint');
        hintNode.scrollTop = hintNode.scrollHeight;
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

            const isAlphaNumeric = /[A-Z0-9]/.test(char);
            if (!isAlphaNumeric) {
                div.className += ' non-alpha';
            }

            const span = document.createElement('span');

            if (char === ' ') {
                span.innerHTML = '&nbsp;';
            } else if (this.letters[char] || !isAlphaNumeric) {
                span.innerText = char;
            } else {
                span.innerHTML = '&nbsp;';
            }

            div.appendChild(span);
            root.appendChild(div);
        }
    }

    renderABC() {
        const numLetters = this.abcChars.length;
        const root = this.node.querySelector('.abc');
        root.innerHTML = '';
        for (let i = 0; i < numLetters; i++) {
            const char = this.abcChars[i];

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
            } else if (!this.isGameOver) {
                div.addEventListener('click', evt => this.guessLetter(char));
            }

            div.appendChild(span);
            root.appendChild(div);
        }
    }

}