"use strict";

const https   = require("https");
const pem     = require("pem");
const express = require("express");

const app = express();
app.use(express.static("../frontend"));
pem.createCertificate({days: 1, selfSigned: true}, callback);
    
function callback(err, keys)
{
  if (err) throw err;

  https
    .createServer({key: keys.serviceKey, cert: keys.certificate}, app)
    .listen(4300);

  console.log("Listening on https://localhost:4300");
}
