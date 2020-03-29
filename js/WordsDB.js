class WordsDB {

    /**
     * 
     * @param {String} topic The topic (file-name) for the words database
     */
    constructor(topic) {
        this.xhr = null;
        this.words = [];
        this.topic = topic;
    }

    /**
     * Set a new topic
     * @param {String} topic The topic (file-name) for the words database
     * @returns {Promise}
     */
    setTopic(topic) {
        this.topic = topic;
        return this.fetchWords();
    }

    /**
     * Fetch words for the given topics
     * @returns {Promise}
     */
    fetchWords() {
        return new Promise((resolve, reject) => {
            if (this.xhr) {
                this.xhr.abort();
            }
            this.xhr = new XMLHttpRequest();
            this.xhr.addEventListener('load', () => {
                let json = this.xhr.responseText;
                try {
                    json = JSON.parse(json);
                } catch (e) {
                    reject(e);
                    console.error(e);
                    return;
                }
                const words = [];
                for (const obj of json) {
                    words.push(obj.word);
                }
                this.words = words;
                resolve(this.words);
            });
            this.xhr.addEventListener('error', e => {
                reject(e);
                console.error(e);
            })
            this.xhr.open('GET', './words/' + encodeURIComponent(this.topic) + '.json');
            this.xhr.send();
        });
    }

}