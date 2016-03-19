var express = require('express'),
  cors = require('cors'),
  multer = require('multer'),
  compression = require('compression'),
  isloggedin = require('./lib/isloggedin.js'),
  autocomplete = require('./lib/autocomplete.js');

// multi-part uploads 
var multipart = multer({ dest: process.env.TMPDIR, limits: { files: 1, fileSize: 100000000 }});
 
// cfenv provides access to your Cloud Foundry environment
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// compress all requests
app.use(compression());

// get the public UI
app.get("/", isloggedin(), function(req,res) {
  res.sendFile('./public/index.html');
});

// upload  CSV file containing strings to be indexed
app.post('/api/:name',  isloggedin(), multipart, function(req, res) {

  if (req.files && typeof req.files.file == 'object') {
    autocomplete.importFile(req.files.file.path, req.params.name, function(err, data) {
      res.send({ok:true, summary: data});
    });
  } else {
    res.status(404).send({ok: false});
  }

});

app.get("/api", isloggedin(), function(req,res) {
  autocomplete.list(function(err,data) {
    if (err) {
      return res.send([]);
    }
    res.send(data);
  });
});

app.get("/api/:name", cors(), function(req,res) {
  autocomplete.query(req.params.name, req.query.term, function(err, data) {
    if (err) {
      return res.send([]);
    } 
    res.send(data);
  }); 
});

app.delete("/api/:name", isloggedin(), function(req, res) {
  autocomplete.deleteIndex(req.params.name, function(err, data) {
    res.send({"ok": true});
  });
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
