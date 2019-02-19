// express is the server that forms part of the nodejs program 

var express = require('express');
var path = require("path");
var app = express();
// add an http server to serve files to the Edge browser
// due to certificate issues it rejects the https files if they are not // directly called in a typed URL
var http = require('http');
var httpServer = http.createServer(app); 
httpServer.listen(4480);

// 19_2_19 12:44 code to cal for anyfile
app.get('/:fileName', function(req, res){
	// run server side code
	var fileName = req.params,fileName;
	console.log(fileName+'requested');
	// __dirname = gives path to where file is located
	res.sendFile(__dirname + '/'+fileName):
})
})

app.get('/',function (req,res) {
	res.send("hello world from the HTTP server"); 
});



// adding functionality to log the requests 
app.use(function (req, res, next) {
	var filename = path.basename(req.url);
	var extension = path.extname(filename); 
	console.log("The file " + filename + " was requested."); next();
});


