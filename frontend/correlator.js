"use strict";

var max, argmax, initialPlaybackTime, callBackFunction, clickBufferDuration,
  sampleRate; // should be in class

export default class Correlator
{
  constructor(audioContext, inputNode, clickBuffer, callBack, inputNodeOutput = 0)
  {
    console.log("Creating convolver node.");
    clickBufferDuration = clickBuffer.duration;
    sampleRate = audioContext.sampleRate;
    const reverseBuffer = revertBuffer(audioContext, clickBuffer);
    const convolverNode = new ConvolverNode(audioContext, {buffer: reverseBuffer});
    callBackFunction = callBack;
    inputNode.connect(convolverNode, inputNodeOutput);

    console.log("Creating script processor.");
    const scriptProcessor = audioContext.createScriptProcessor(16384, 1, 1);
    scriptProcessor.onaudioprocess = processAudio;
    convolverNode.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
    // Need to connect script processor to destination, otherwise
    // onaudioprocess would not be fired in Chrome.  See
    // https://stackoverflow.com/q/27324608
  }
}

function revertBuffer(audioContext, buffer)
{
  var i;

  const reverseBuffer = audioContext.createBuffer(buffer.numberOfChannels,
      buffer.length, buffer.sampleRate);

  const array = new Float32Array(buffer.length);
  
  for (i = 0; i < buffer.numberOfChannels; i++)
  {
    buffer.copyFromChannel(array, i, 0);
    array.reverse();
    reverseBuffer.copyToChannel(array, i, 0);
  }

  return reverseBuffer;
}

function processAudio(event)
{
  var array, i, networkLatency, bufferSize, bufferDuration;
  var startSecond, endSecond, boundarySample, currentPlaybackTime;
  var playbackTimeAdjustment;

  array          = event.inputBuffer.getChannelData(0);
  bufferSize     = event.inputBuffer.length;
  bufferDuration = event.inputBuffer.duration;
  startSecond    = Math.floor(event.playbackTime);
  endSecond      = Math.floor(event.playbackTime + bufferDuration);

  if (!max) max = argmax = -1;

  // Dirty trick
  currentPlaybackTime = Math.round(event.playbackTime*sampleRate) % 16384;
  if (!initialPlaybackTime) initialPlaybackTime = currentPlaybackTime;
  playbackTimeAdjustment = (currentPlaybackTime - initialPlaybackTime) % 16384;

  if (startSecond == endSecond) // Buffer contained within one second
  {
    for (i = 0; i < bufferSize; i++) if (array[i] > max)
    {
      argmax = frac(event.playbackTime + i/sampleRate);
      max    = array[i];
    }
  }
  else // Buffer spans two seconds
  {
    // Process part of buffer in start second
    boundarySample = Math.round((endSecond - event.playbackTime)*sampleRate);

    for (i = 0; i < boundarySample; i++) if (array[i] > max)
    {
      argmax = frac(event.playbackTime + i/sampleRate);
      max = array[i];
    }

    // Perform calculation
    networkLatency = frac(argmax - clickBufferDuration - bufferDuration
      - (playbackTimeAdjustment - 1)/sampleRate);
    if (networkLatency > 16384/sampleRate) networkLatency -= 16384/sampleRate;

    callBackFunction(networkLatency);

    // Process part of buffer in end second
    max = argmax = -1;
    for (i = boundarySample; i < bufferSize; i++) if (array[i] > max)
    {
      argmax = frac(event.playbackTime + i/sampleRate);
      max = array[i];
    }
  }
}

function frac(x)
{
  return x - Math.floor(x);
}
