'use strict';

// Set this to true to shortcut the channel and work with a fixed
// latency instead.
const test = false;

const f0 = 2000;

// 13 test frequencies - using basically the same ones as jack-delay,
// just there they are specified relative to the sample rate, here
// we just set fixed values.  f0 = 3000 corresponds to jack-delay's values at
// 48000 Hz.
const f = [        f0,
            1/   2*f0,
            3/   4*f0,
            5/   8*f0,
            9/  16*f0,
           17/  32*f0,
           17/  64*f0,
           41/ 128*f0,
           97/ 256*f0,
          225/ 512*f0,
          833/1024*f0,
         1793/2048*f0,
         3841/4096*f0];

// Amplitude of each of the 13 test frequencies.  For now just use 1/13 for
// each.  Other options: Could put higher ones to the frequencies where
// the channel is expected to have more loss.  Or, as jack-delay, boost f_0
// on the expense of the other ones.
const R = [0.0768, 0.0768, 0.0768, 0.0768, 0.0768,
           0.0768, 0.0768, 0.0768, 0.0768, 0.0768,
           0.0768, 0.0768, 0.0768];

// For filter
const alpha = 0.99999;
         
document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startButton").onclick = start;
  document.getElementById("printButton").onclick = print;
}

var audioContext, f_s, dataArray;
// f_s = sample rate should be a local variable to start eventually.
// Currently just need it global to print the latency in no. of samples
// in the print function.  Should anyway move to ms.

async function start()
{
  var mediaStream, audioContext;
  var tmp, REF_0deg, REF_90deg, X, Y0, Y90, Y0F, Y90F, i, analyser, merger;

  audioContext = new AudioContext();

  f_s = audioContext.sampleRate;
  console.log("Corner freqency: %.2f Hz.", -f_s*Math.log(alpha)/(2*Math.PI));
  

  // Dusan Ponikvar's STM32F407 project, see
  // https://www.fmf.uni-lj.si/~ponikvar/STM32f407.htm, Chapter 23.
  // (He also has a PDF
  // https://www.fmf.uni-lj.si/~ponikvar/PDFji/Phase%20angle%20measurements.pdf
  // with similar content, not read this one yet.)

  tmp       = [];
  REF_0deg  = [];
  REF_90deg = [];
  Y0        = [];
  Y90       = [];
  Y0F       = [];
  Y90F      = [];

  mediaStream =  await navigator.mediaDevices.getUserMedia({audio: {
    echoCancellation: false,
    noiseSuppression: false,
    channelCount:     1}});
  console.log(mediaStream);
  X = new MediaStreamAudioSourceNode(audioContext, {mediaStream});

  if (test) X = new DelayNode(audioContext, {delayTime: 0.1234});

  merger = new ChannelMergerNode(audioContext, {numberOfInputs: 26});

  analyser   = audioContext.createScriptProcessor(0, 26, 0);
  dataArray = new Float32Array(26);
  analyser.onaudioprocess = savePhaseValues;

  merger.connect(analyser);

  for (i = 0; i < 13; i++)
  {
    tmp      [i] = new OscillatorNode(audioContext, {frequency:   f[i]       });           
    REF_0deg [i] = new GainNode      (audioContext, {gain:        R[i]       });
    REF_90deg[i] = new DelayNode     (audioContext, {delayTime:   0.25/f[i]  });
    Y0       [i] = new GainNode      (audioContext, {gain:        0          });
    Y90      [i] = new GainNode      (audioContext, {gain:        0          });
    Y0F      [i] = new IIRFilterNode (audioContext, {feedforward: [1 - alpha],
                                                     feedback:    [1, -alpha]});
    Y90F     [i] = new IIRFilterNode (audioContext, {feedforward: [1 - alpha],
                                                     feedback:    [1, -alpha]});

              REF_0deg [i].connect(audioContext.destination);
    if (test) REF_0deg [i].connect(X                       );
              tmp      [i].connect(REF_0deg [i]            );
              REF_0deg [i].connect(REF_90deg[i]            );
              REF_0deg [i].connect(Y0       [i].gain       );
              REF_90deg[i].connect(Y90      [i].gain       );
              X           .connect(Y0       [i]            );
              X           .connect(Y90      [i]            );
              Y0       [i].connect(Y0F      [i]            );
              Y90      [i].connect(Y90F     [i]            );
              Y0F      [i].connect(merger                  , 0,      i);
              Y90F     [i].connect(merger                  , 0, 13 + i);

    tmp[i].start();
  }
}

function savePhaseValues(event)
{
  var i;

  for (i = 0; i < event.inputBuffer.numberOfChannels; i++)
    dataArray[i] = event.inputBuffer.getChannelData(i)[0]
}

function print()
{
  var i, A, phi, phase, shift, latency, difference1, difference2, potentialAdjustment;

  console.group("Latency detection");

  for (i = 0; i < 13; i++)
  {
    A     = 2/R[i]*Math.sqrt(dataArray[i]**2 + dataArray[13+i]**2);
    phi   = Math.atan2(dataArray[13+i], dataArray[i]);
    phase = frac(phi/(2*Math.PI));
    shift = phase/f[i];
  
    console.group("%d. Determining latency mod %.2f ms", i, 2**i*1000/f[0]);
    console.log("Test frequency %.0f Hz, period %.2f ms", f[i], 1000/f[i]);
    console.log("Gain: %.3f", A/R[i]);
    console.log("Shift: %.2f ms", 1000*shift);

    if (i == 0)
    {
      latency = shift;
    }
    else
    {
      potentialAdjustment = 2**(i - 1)/f[0];
      console.log("Candidates are %.2f and %.2f",
        1000*latency,
        1000*(latency + potentialAdjustment));
      
      difference1 = cmod(latency                       - shift, 1/f[i]);
      difference2 = cmod(latency + potentialAdjustment - shift, 1/f[i]);

      console.log("Differences are %.2f ms and %.2f ms, respectively",
        1000*difference1, 1000*difference2);

      if (Math.abs(difference2) < Math.abs(difference1))
        latency += potentialAdjustment;
    }
    console.log("Latency is %.2f ms mod %.2f ms.",
      1000 * latency, 1000 * 2**i / f[0])
    console.groupEnd();
  }
  console.log("Final latency estimate: %.2f ms", 1000*latency);
  console.groupEnd();  

  document.getElementById("outputSpan").innerHTML =
    (1000 * latency).toFixed() + " ms";
}

// The representative in [0, 1) of x + Z
function frac(x)
{
  return x - Math.floor(x);
}

function mod(x, m)
{
  return m*frac(x/m);
}

function cfrac(x)
{
  return frac(x + 1/2) - 1/2;
}

function cmod(x, m)
{
  return m*cfrac(x/m);
}

