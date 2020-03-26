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
  if (!sockets.server)
  {
    console.log("\nStream server connected.");
    sockets["server"] = socket;
  }
  else
  {
    console.log("\nClient connected.");
    sockets["client"] = socket;
  }
  socket.onmessage = receiveMessage;
}

function receiveMessage(event)
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

  console.log("\nForwarding message to %s: %s", message.to, event.data);
  sockets[message.to].send(event.data);
}
