'use strict';

document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startButton").onclick = startMetronome;
}

function startMetronome()
{
  var audioContext, oscillatorNode, gainNode, modulatorNode;

  console.log("Starting metronome.");

  console.log("Creating audio contect.");
  audioContext = new AudioContext(); // Use OfflineAudioContext for server!

  console.log("Creating audio nodes.");
  oscillatorNode = new OscillatorNode(audioContext);
  gainNode       = new GainNode      (audioContext);
  modulatorNode  = new OscillatorNode(audioContext, {frequency: 2,
                                                     type:      "square"});

  console.log("Connecting audio nodes.");
  modulatorNode.connect(gainNode.gain);
  oscillatorNode.connect(gainNode);
  gainNode.connect(audioContext.destination);

  console.log("Starting nodes.")
  modulatorNode.start();
  oscillatorNode.start();
}
