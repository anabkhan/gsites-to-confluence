const fetch = require('node-fetch');

const URL = "https://anabadnan.atlassian.net/wiki/rest/api";
const API_TOKEN = 'Basic YW5hYmFkbmFuMDA3QGdtYWlsLmNvbTpHWldXUDBJWUtKSGd6MkhpOXZNVTQ5QkQ=';

const CONTENT_API = URL + '/content';

module.exports = {
    createPage : async (content) => {
        return fetch(CONTENT_API, {
            method: 'POST',
            headers: {
                'Authorization': API_TOKEN,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        });
    }
}