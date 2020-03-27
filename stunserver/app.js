'use strict';

const stun = require("stun"); // https://github.com/nodertc/stun

const server = stun.createServer({type: "udp4"});
server.on(stun.constants.STUN_EVENT_BINDING_REQUEST, respond);
server.listen(19302);

function respond(request, rinfo)
{
  console.log("Responding to request from %s:%d.", rinfo.address, rinfo, port);

  const response = stun.createMessage(stun.constants.STUN_BINDING_RESPONSE,
    request.transactionId);

  response.addXorAddress(rinfo.address, rinfo.port);

  server.send(response, rinfo.port, rinfo.address);
};
