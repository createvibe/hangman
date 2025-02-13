const headers = {
    "x-rapidapi-host": "wordsapiv1.p.rapidapi.com",
    "x-rapidapi-key": "c39b4cf749mshe05a2f63431f552p1f64a0jsn159668085eea"
};

class WordsAPI {

    fetch(word) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('load', () => {
                if (xhr.status === 404) {
                    reject(new Error('Cannot find word'));
                    return;
                }
                let json = xhr.responseText;
                try {
                    json = JSON.parse(json);
                } catch (e) {
                    console.error(e);
                    return;
                }
                if (!json.results || json.results.length === 0) {
                    console.log(json);
                    reject(new Error('Invalid Json Response'));
                    return;
                }
                let resultIndex = 0;
                if (json.results.length > 1) {
                    resultIndex = Math.floor(Math.random() * (json.results.length - 1));
                }
                resolve(json.results[resultIndex]);
            });
            xhr.addEventListener('error', err => {
                console.error(err);
                reject(err);
            });
            xhr.open('GET', 'https://wordsapiv1.p.rapidapi.com/words/' + encodeURIComponent(word));
            for (const header in headers) {
                xhr.setRequestHeader(header, headers[header]);
            }
            xhr.send();
        });
    }

}