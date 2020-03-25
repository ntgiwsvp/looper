"use strict";

var streamServerSocket, clientSocket;

startServer();

function startServer()
{
  const WS = require("ws"); // See https://github.com/websockets/ws
  const server = new WS.Server({port: 8080});

  server.on("connection", initializeConnection);

  console.log("Ready to signal.");
}

function initializeConnection(socket, request)
{
  if (!streamServerSocket)
  {
    console.log("Stream server connected.");
    streamServerSocket = socket;
    streamServerSocket.onmessage = receiveStreamServerMessage;  
  }
  else
  {
    console.log("Client connected.");
    clientSocket = socket;
    clientSocket.onmessage = receiveClientMessage;
  }
}

function receiveStreamServerMessage(event)
{
  console.log("Message from stream server to client: %s", event.data);
  clientSocket.send(event.data);
}

function receiveClientMessage(event)
{
  console.log("Message from client to stream server: %s", event.data);
  streamServerSocket.send(event.data);
}
