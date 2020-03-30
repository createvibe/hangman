class GameScore {

    constructor(hangman) {
        this.hangman = hangman;
        this.numHandicaps = this.hangman.numHandicaps;
        this.usedHandicaps = 0;
        this.score = 0;
        this.games = 1;
    }

    getHandicapCount() {
        return this.numHandicaps - this.usedHandicaps;
    }

    useHandicap() {
        this.usedHandicaps += 1;
    }

    addScore(points) {
        this.score += points;
    }

    computeScore() {
        // 5 points for every handicap not used
        const handicapScore = this.getHandicapCount() * 3;

        // 3 points for every hint not used
        const hintScore = Math.floor(this.hangman.numHints / 3);

        // 3 point for every 5 seconds still remaining
        const pointScore = Math.floor(this.hangman.timeLeft / 5000);

        // 1.5 points for every level beyond the first
        const levelScore = Math.floor(1.5 * Math.max(this.hangman.level - 1, 0));

        // 1 point for every 3 letters in the word
        const wordScore = Math.floor(this.hangman.word.length / 3);

        // 0.75 points reduced for every incorrect guess
        const incorrectScore = -1 * Math.floor(this.hangman.incorrectGuesses * 0.75);

        // 1.75 points reduced fo revery incorrect game
        const gameOverScore = -1 * (this.games - 1) * 1.75;

        this.score += Math.max(0, 
                    handicapScore 
                    + hintScore 
                    + pointScore 
                    + levelScore 
                    + wordScore
                    + incorrectScore
                    + gameOverScore);
    
        return this.score;
    }

}