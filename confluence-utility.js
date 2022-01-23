const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs')
const request = require('request');

const URL = "https://anabadnan.atlassian.net/wiki/rest/api";

const CONTENT_API = URL + '/content';

module.exports = {
    createPage: async (content, apiToken) => {
        // console.log('using token', apiToken)
        return fetch(CONTENT_API, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic token',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        });
    },

    uploadAttachement: async (pageID, imagePath, fileName) => {

        // var formdata = new FormData();
        // formdata.append("file", fileName, imagePath);

        var formdata = {
            name: 'file',
            file: {
                value: fs.createReadStream(imagePath),
                options: {
                    filename: fileName,
                    contentType: 'image/png'
                }
            }
        };

        request.post({
            url: `${CONTENT_API}/${pageID}/child/attachment`, formData: formdata, headers: {
                'Authorization': 'Basic token',
                'X-Atlassian-Token': 'nocheck'
            }
        },
            function cb(err, httpResponse, body) {
                if (err) {
                    return console.error('upload failed:', err);
                }
                console.log('Upload successful!  Server responded with:', body);
            }
        );
    }
}