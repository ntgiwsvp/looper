"use strict";

var https = require("https");
var pem = require("pem");
var express = require("express");

pem.createCertificate({days: 1, selfSigned: true}, callback);
    
function callback(err, keys)
{
  if (err) throw err;

  const app = express();
  app.use(express.static("../frontend"));

  https
    .createServer({key: keys.serviceKey, cert: keys.certificate}, app)
    .listen(4300);

  console.log("Listening on https://localhost:4300");
}
