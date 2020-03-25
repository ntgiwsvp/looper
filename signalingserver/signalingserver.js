"use strict";

var streamServerSocket;

startServer();

function startServer()
{
  console.log("Starting signaling server.");

  const WS = require("ws"); // See https://github.com/websockets/ws
  const server = new WS.Server({port: 8080});

  server.on("connection", initializeStreamServerConnection);

  console.log("Please start the stream server first, then the clients!");
}

function initializeStreamServerConnection(socket, request)
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
    streamServerSocket.onmessage = receiveClientMessage;
  }
}

function receiveStreamServerMessage(event)
{
  console.log("Message from stream server received.");
  //event.target.send("I totally agree with " + event.data);
}

function receiveClientMessage(event)
{
  console.log("Message from client.");
  //event.target.send("I totally agree with " + event.data);
}
