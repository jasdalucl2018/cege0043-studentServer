// express is the server that forms part of the nodejs program 

var express = require('express');
var path = require("path");
var app = express();
// add an http server to serve files to the Edge browser
// due to certificate issues it rejects the https files if they are not // directly called in a typed URL
var http = require('http');
var httpServer = http.createServer(app); 
httpServer.listen(4480);

// 19-2-19 11;24 modifying app.get code lines 13 to 17 ammended
app.get('/test',function (req,res) {
	// run some server.side code
	console.log('test.html requested');
	// note that the _dirname gives the path to theb student~server.js file
	res.sendFile(_dirname+'/test.html'); 
});

// adding functionality to log the requests 
app.use(function (req, res, next) {
	var filename = path.basename(req.url);
	var extension = path.extname(filename); 
	console.log("The file " + filename + " was requested."); next();
});