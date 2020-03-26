"use strict";

var sockets;

startServer();

function startServer()
{
  const WS = require("ws"); // See https://github.com/websockets/ws
  const server = new WS.Server({port: 8080});
  sockets = {};
  server.on("connection", initializeConnection);
  console.log("Ready to signal.");
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
