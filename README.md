# looper - make music together online in a loop

## Introduction

This project is about how people can make music together remotely.
One big challenge here is latency, which makes it impossible to play in sync
if latency is too high.  The nice solution for this is to build a low-latency
system, the approach followed e.g. on https://github.com/delude88/digitalstage.
(See the nice explanations on http://digital-stage.org/?page_id=51, the ambition
for the most advanced version is to have a end-to-end lateny of 30 ms.

This project follows more a low-barrier approach:  How can be hobby musicians
be enabled to play together and have fun, using their commodity hardware and
just a browser?  In this setup, ultra-low latencies cannot be achieved.  The
workaround chosen here is to play in a loop setting, similar to populer looper
guitar effects pedals:  This allows to hide latency up to the loop lenght.

## How to try

There is a hosted version running at
https://looperfrontend.z6.web.core.windows.net/index.html.  Direct your
browser there and follow the intructions.  Note that this currently only works
with Firefox (https://github.com/ntgiwsvp/looper/issues/2).

## How to have your own

To get started to experiment with the code, proceed as follows:

  * git clone https://github.com/ntgiwsvp/looper.git
  * Follow the instructions in frontend/snd/README.md to download the metronome
    click sound.
  * In folder webserver, run "build"
  * Add the file ca.crt to your browser's trusted certificates.
  * Run "node webserver.js"
  * Navigate to https://127.0.0.1:4300/.

This will allow you to play with the frontend code, but will still use the
hosted version of the signaling server.  If you want to play with the signaling
server, you need to adjust frontend/constants.js accordingly.

## How to contribute

You can contribute in many ways should you wish to do so, such as

  * Work on the issues listed on
    https://github.com/ntgiwsvp/looper/issues.
  * Test the project and add more issues you discover.
  * Add feature suggestions.  (Just use GitHub's issues page as linked above.)
  * Enjoy.

I am very open to any form of contribution.  Just contact me at tbliem@gmx.de
for any comments or inquiries.  Please note this is a hobby project and it might
take me a couple of days to reply.
