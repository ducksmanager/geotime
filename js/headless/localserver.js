var server = require('webserver').create(),
    fs = require('fs');
var serverUrl = '127.0.0.1:8888';

var workingDirectory = fs.workingDirectory.replace(/\//g, fs.separator);

function create() {
    var serverCreated = server.listen(serverUrl, function (request, response) {
        var cleanedUrl = request.url
            .replace(/\//g, fs.separator)
            .replace(/\?.*$/g, '');
        //console.log('Requesting ' + request.url + ', loading ' + cleanedUrl);
        var pagePath = workingDirectory + cleanedUrl;
        response.statusCode = 200;
        response.setHeader("Content-Type", "image/svg+xml");
        try {
            response.write(fs.read(pagePath));
        } catch(err) {
            console.error('Error while reading ' + cleanedUrl + '(requested URL : '+request.url+')');
            response.close();
            phantom.exit(1);
        }
        response.close();

    });

    if (!serverCreated) {
        console.error('Error while creating HTTP server');
        phantom.exit(1);
    }
}

function close() {
    server.close();
}

module.exports = {
    create: create,
    url: serverUrl,
    close: close
};