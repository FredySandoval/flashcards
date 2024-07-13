function notFound(req, res, next) {
    res.status(404);
    const error = new Error('Not Found - ' + req.originalUrl);
    next(error);
}

function errorHandler(err, req, res, next) {
    res.status(res.statusCode || 500);
    res.json({
        message: err.message,
        stack: err.stack
    });
};
function get_local_IP_address() {
    var interfaces = require('os').networkInterfaces(), localhostIP;
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            let ipFamily = interfaces[k][k2].family;
            if (ipFamily === 'IPv4' || ipFamily === 4 && !interfaces[k][k2].internal) {
                localhostIP = interfaces[k][k2].address;
            }
        }
    }
    return localhostIP;
}
module.exports = { notFound, errorHandler, get_local_IP_address };