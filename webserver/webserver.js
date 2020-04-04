"use strict";

const https   = require("https");
const pem     = require("pem");
const express = require("express");
const fs      = require("fs");

const app = express();
app.use(express.static("../frontend"));
pem.createCertificate({
  days:               1,
  commonName:         "127.0.0.1",
  serviceCertificate: fs.readFileSync("ca.crt"),
  serviceKey:         fs.readFileSync("ca.key")}, callback);
    
function callback(err, keys)
{
  if (err) throw err;

  https
    .createServer({key: keys.clientKey, cert: keys.certificate}, app)
    .listen(4300);

  console.log("Listening on https://127.0.0.1:4300");
}
