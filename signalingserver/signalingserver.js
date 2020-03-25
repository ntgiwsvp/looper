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

  socket.onclose   = closeConnection;
  socket.onmessage = receiveMessage;
  socket.onerror   = ((error) => console.error(error));
}

function closeConnection(event)
{
  console.log("Connection closed.");
}

function receiveMessage(event)
{
  console.log("Message event received: %s", event.data);
  event.target.send("I totally agree with " + event.data);
}
