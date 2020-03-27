"use strict";

var sockets;
const http = require("http");
const WebSocket = require("ws"); // See https://github.com/websockets/ws

const port = process.env.PORT || 8080;

startServer();

function startServer()
{
  var server, wss;

  server = http.createServer(dummyStatusMessage);
  wss = new WebSocket.Server({server: server});
  sockets = {};
  wss.on("connection", initializeConnection);
  server.listen(port);
}

function dummyStatusMessage(request, response)
{
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end("Signaling server is running.");
}

function initializeConnection(socket, request)
{
  var clientId;

  clientId = Math.floor(Math.random()*1000000000);
  console.log("\nNew client connected.  Assigning ID %d.", clientId)
  socket.onmessage = forwardMessage;
  sockets[clientId] = socket;
  socket.send(JSON.stringify({id: clientId}));
}

function forwardMessage(event)
{
  var message;

  message = JSON.parse(event.data);

  if (!message.to)
  {
    console.log("\nDiscarding message without recipient.");
    return;
  }

  if (!sockets[message.to])
  {
    console.log("\nDiscarding message to unknown recipient %s.", message.to);
    return;
  }

  console.log("\nForwarding message from %s to %s: %s",
    message.from, message.to, event.data);
  sockets[message.to].send(event.data);
}
