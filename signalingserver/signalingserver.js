"use strict";

console.log("Starting signaling server.");

const WebSocket = require('ws'); // see https://github.com/websockets/ws
const server = new WebSocket.Server({port: 8080});

server.on("connection", initializeConnection);
server.on("error",      (error) => console.error(error));

console.log("Listening on 8080.");

function initializeConnection(socket, request)
{
  console.log("Connection opened");

  socket.on("message", receiveMessage);
  socket.on("close",   closeConnection);
  socket.on("error",   (error) => console.error(error));
}

function receiveMessage(data)
{
  console.log("Message received: %s", data);
}

function closeConnection(code, reason)
{
  console.log("Connection closed.");
}
