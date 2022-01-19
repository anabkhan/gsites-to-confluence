const fetch = require('node-fetch');

const URL = "https://anabadnan.atlassian.net/wiki/rest/api";

const CONTENT_API = URL + '/content';

module.exports = {
    createPage : async (content, apiToken) => {
        // console.log('using token', apiToken)
        return fetch(CONTENT_API, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic YW5hYmFkbmFuMDA3QGdtYWlsLmNvbTpPR2FCTGhBb2Y4OGtiR1FiYVlyQTBENjY=',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        });
    }
}