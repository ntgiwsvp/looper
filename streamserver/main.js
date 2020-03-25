'use strict';

var socket;

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  console.log("Adding event handlers to DOM.");
  document.getElementById("startServerButton").onclick = startServer;
}

function startServer()
{
  console.log("Creating connection to signaling server.");
  socket = new WebSocket("ws://localhost:8080/")
}

