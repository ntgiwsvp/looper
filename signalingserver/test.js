"use strict";

const WebSocket = require("ws"); // See https://github.com/websockets/ws
const signalingServerUrl = "ws://127.0.0.1:8080/";

var signalingChannel1, signalingChannel2, id1, id2;

signalingChannel1 = new WebSocket(signalingServerUrl);
signalingChannel1.onmessage = receiveMessage1;
setTimeout(() => message(timeout), 2000);

function receiveMessage1(message)
{
  const data = JSON.parse(message.data);

  if (data.id)
  {
    id1 = data.id;
    console.log("A received id message")
    signalingChannel2 = new WebSocket(signalingServerUrl);
    signalingChannel2.onmessage = receiveMessage2;
  }
  else if (data.content)
  {
    console.log("A received content message");
    if (data.to      != id1) error("Wrong recipient");
    if (data.from    != id2) error("Wrong sender");
    if (data.content != 123) error("Wrong content");
    process.exit(0);
  }
  else
  {
    error("A received unknown message type.");
  }
}

function receiveMessage2(message)
{
  const data = JSON.parse(message.data);

  if (data.id)
  {
    console.log("B received id message");
    id2 = data.id;
    signalingChannel2.send(JSON.stringify({to: id1, content: 123, from: id2}));
  }
  else
  {
    error("B received unknown message type.");
  }
}

function error(message)
{
  console.log(message);
  process.exit(1);
}