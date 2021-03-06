// express is the server that forms part of the nodejs program
var express = require('express');
var path = require('path');
var app = express();


// 19-4-3 @ 16;51 adding required database connectivity code and set up a database connection

var fs = require('fs');
var pg = require('pg');
var configtext = "" + fs.readFileSync("/home/studentuser/certs/postGISConnection.js");

// now convert the configruation file into the correct format
// -i.e. a name/value pair array
var configarray = configtext.split(",");
var config = {};
for (var i = 0; i < configarray.length; i++) {
    var split = configarray[i].split(':');
    config[split[0].trim()] = split[1].trim();
}

var pool = new pg.Pool(config)



// Add the body-parser so as to be able to process the uploaded data
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// add an http server to serve files to the Edge browser
// due to certificate issues it rejects the https files
// if they are not directly called in a typed URL
var http = require('http');
var httpServer = http.createServer(app);
httpServer.listen(4480);


// modify the code for to “cross origin request - ie requests for data from this server -
//via another server (the PhoneGap server).

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});







app.get('/', function (req, res) {
    res.send("hello world from the HTTP server");
});


//19-3-4 adding simple app.get tp test connecgtivity

app.get('/postgistest', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }

        client.query('SELECT name FROM london_poi', function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

//19-4-5 new get function for fixed table names, column names and columns


app.get('/getFormData/:port_id', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        // use inbuilt geoJSON functionality
        // and create the required geoJSON format using a query adapted from here:
        // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4thJanuary2018
        // note that query needs to be a single string with no line breaks
        // so built it up bit by bit
        var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM ";
        querystring = querystring + "(SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, ";
        querystring = querystring + "row_to_json((SELECT l FROM (SELECT name,surname, port_id) As l ";
        querystring = querystring + "    )) As properties";
        querystring = querystring + "   FROM formdata  As lg where lg.port_id = '" + req.params.port_id + "' limit 100 ) As f ";
        console.log(querystring);
        client.query(querystring, function (err, result) {
            //call `done()` to release the client back to the pool
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    })
    ;
})
;





// make geojson server more flexible to generate geojson from any spatial table
app.get('/getGeoJSON/:tablename/:geomcolumn/:portNumber?', function(req,res){

    pool.connect(function(err,client,done){
        // if unable to connect
        if (err){
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }

        var colnames = "";
        // get list of columns in the table
        // use string_agg to generate csv list that can then be pasted into next query
         var tablename = req.params.tablename;
        var geomcolumn = req.params.geomcolumn;
        var querystring = "select string_agg(colname,',') from ( select column_name as colname ";
        querystring = querystring + " FROM information_schema.columns as colname ";
        querystring = querystring + " where table_name   =$1";
        querystring = querystring + " and column_name <> $2 and data_type <> 'USER-DEFINED') as cols ";
        console.log("Query string 1: " + querystring);

        // run the query
        client.query(querystring,[tablename, geomcolumn], function(err,result){
            done(); // call done() to release client back to the pool
            // raise error
            if (err){
                console.log(err);
                res.status(400).send(err);
            }
            thecolnames = result.rows[0].string_agg;
            colnames = thecolnames;
            console.log("the colnames " + thecolnames); // log colnames in console

            // use the inbuilt geoJSON functionality
            // and create the required geoJSON format using a query adapted from here: http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
            // note that query needs to be a single string with no line breaks so built it up bit by bit
            var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
            querystring = querystring + "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg." + req.params.geomcolumn + ")::json As geometry, ";
            querystring = querystring + "row_to_json((SELECT l FROM (SELECT " + colnames + ") As l      )) As properties";

            // depending on whether we have a port number, do different things
            // if we have a portNumber
            if (req.params.portNumber) {
                querystring = querystring + "   FROM " + req.params.tablename + "As lg where lg.port_id = '" + req.params.portNumber + "' limit 100  ) As f ";
            }
            else {
                querystring = querystring + "    FROM " + req.params.tablename + " As lg limit 100 ) As f ";
            }

            console.log("Query string 2: " + querystring);

            // run the 2nd query
            client.query(querystring, function(err, result){
                done(); // release client back to the pool
                if (err){
                    console.log(err);
                    res.status(400).send(err);
                }
                res.status(200).send(result.rows);
            });
        });
    });
});


// add POST request to studentServer.js
app.post('/reflectData', function (req, res) {
    // note that we are using POST here as we are uploading data
    // so the parameters form part of the BODY of the request
    // rather than the RESTful API
    console.dir(req.body);

    // for now, just echo the request back to the client
    res.send(req.body);
});

// 19-3-5 POST a command to connect to database and insert recodr into formData table.

app.post('/uploadData', function (req, res) {
    // note that we are using POST here as we are uploading data
    // so the parameters form part of the BODY of the request
    // rather than the RESTful API
    console.dir(req.body);
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        var name = req.body.name;
        var surname = req.body.surname;
        var module = req.body.module;
        var portnum = req.body.port_id;
        
        var language = req.body.language;
        var modulelist = req.body.modulelist;
        var lecturetime = req.body.lecturetime;
        var geometrystring = "st_geomfromtext('POINT(" + req.body.longitude + " " + req.body.latitude + ")')";
        var querystring = "INSERT into formdata (name,surname,module, port_id,language, modulelist, lecturetime, geom) values ($1,$2,$3,$4,$5,$6,$7,";
        var querystring = querystring + geometrystring + ") ";
            console.log(querystring);
            client.query(querystring, [name, surname, module, portnum], function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send("row inserted");
        });
    });
});


app.post('/uploadQuestion',function(req,res){
    // note that we are using POST here as we are uploading data
    // so the parameters form part of the BODY of the request rather than the RESTful API
    console.dir(req.body);

    pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
      // pull the geometry component together
      // note that well known text requires the points as longitude/latitude !
      // well known text should look like: 'POINT(-71.064544 42.28787)'
      var param1 = req.body.question_title;
      var param2 = req.body.question_text;
      var param3 = req.body.answer_1;
      var param4 = req.body.answer_2;
      var param5 = req.body.answer_3;
      var param6 = req.body.answer_4;
      var param7 = req.body.port_id;
      var param8 =req.body.correct_answer ; 
     
      var geometrystring = "st_geomfromtext('POINT("+req.body.longitude+ " "+req.body.latitude +")',4326)";
      var querystring = "INSERT into public.quizquestion (question_title,question_text,answer_1,answer_2, answer_3, answer_4,port_id,correct_answer,location) values ";
      querystring += "($1,$2,$3,$4,$5,$6,$7,$8,";
      querystring += geometrystring + ")";
                console.log(querystring);
                client.query( querystring,[param1,param2,param3,param4,param5,param6,param7,param8],function(err,result) {
                done();
                if(err){
                     console.log(err);
                     res.status(400).send(err);
                }
                else {
                  res.status(200).send("Question "+ req.body.question_text+ " has been inserted");
                }
             });
      });
});



app.post('/uploadAnswer',function(req,res){
  // note that we are using POST here as we are uploading data
  // so the parameters form part of the BODY of the request rather than the RESTful API
  console.dir(req.body);

  pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }

var param1 =  req.body.port_id ;
var param2 =  req.body.question_id ;
var param3 =  req.body.answer_selected;
var param4 =  req.body.correct_answer ;


var querystring = "INSERT into public.quizanswers (port_id, question_id, answer_selected, correct_answer) values (";
querystring += "$1,$2,$3,$4)";
        console.log(querystring);
        client.query(querystring,[param1,param2,param3,param4],function(err,result) {
          done();
          if(err){
               console.log(err);
               res.status(400).send(err);
          }
          res.status(200).send("Answer inserted for user "+req.body.port_id);
       });
    });
});

app.get('/getQuizPoints/:port_id', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
          var colnames = "id, question_title, question_text, answer_1,";
          colnames = colnames + "answer_2, answer_3, answer_4, port_id, correct_answer";
          console.log("colnames are " + colnames);

          // now use the inbuilt geoJSON functionality
          // and create the required geoJSON format using a query adapted from here:
          // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
          // note that query needs to be a single string with no line breaks so built it up bit by bit
         var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
          querystring += "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, ";
          querystring += "row_to_json((SELECT l FROM (SELECT "+colnames + " ) As l      )) As properties";
          querystring += "   FROM public.quizquestion As lg ";
         querystring += " where port_id = $1 limit 100  ) As f ";
          console.log(querystring);
          var port_id = req.params.port_id; //
          // run the second query
          client.query(querystring,[port_id],function(err,result){
            //call `done()` to release the client back to the pool
            done();
            if(err){
                  console.log(err);
                  res.status(400).send(err);
             }
            res.status(200).send(result.rows);
        });
    });

});



// serving text
app.get('/', function(req, res){
    // server-side code
    console.log("The server has received a request.");
    res.send("hello world from the HTTP server");
});


// adding functionality to log the requests
app.use(function (req, res, next) {
    var filename = path.basename(req.url);
    var extension = path.extname(filename);
    console.log("The file " + filename + " was requested.");
    next();
});


// Using Express Static Routes to
// serve static files - e.g. html, css
// this should always be the last line in the server file
app.use(express.static(__dirname));