class DataMuse {

    /**
     * 
     * @param {Array} topics List of topics the words you want to fetch should be related to
     */
    constructor(topics = []) {
        this.xhr = null;
        this.words = [];
        this.topics = topics;
    }

    /**
     * Set a new topic
     * @param {Array} topics List of topics the words you want to fetch should be related to
     * @returns {Promise}
     */
    setTopic(topics) {
        this.topics = topics;
        return this.fetch();
    }

    /**
     * Fetch words for the given topics
     * @returns {Promise}
     */
    fetch() {
        return new Promise((resolve, reject) => {
            if (this.xhr) {
                this.xhr.abort();
            }
            let queryString = '';
            if (this.topics.length !== 0) {
                queryString = '?topics=' + this.topics.map(s => encodeURIComponent(s)).join(',');
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
            this.xhr.addEventListener('error', () => {
                reject(e);
                console.error(e);
            })
            this.xhr.open('GET', 'https://api.datamuse.com/words' + queryString);
            this.xhr.send();
        });
    }

}