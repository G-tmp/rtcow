
'use strict';

const startButton = document.getElementById('startButton');
const closeButton = document.getElementById('closeButton');
const sendButton = document.getElementById('sendButton');
sendButton.onclick = sendData;

const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');

let pc;
let sendChannel;
let receiveChannel;

let host = "127.0.0.1:12345";
if (window.location.hostname !== "127.0.0.1") {
  host ="192.168.101.75:12345";
}
let httpAddr = "http://" + host;
let wsAddr = "ws://" + host + "/ws";

// httpAddress.href = httpAddr;
// httpAddress.innerHTML = httpAddr;
const ws = new WebSocket(wsAddr, "json");

ws.onmessage = e => {
  let data = JSON.parse(e.data)
  
  switch (data.type) {
    case 'offer':
      handleOffer(data);
      break;
    case 'answer':
      handleAnswer(data);
      break;
    case 'candidate':
      handleCandidate(data);
      break;
    case 'ready':
      // A second tab joined. This tab will enable the start button unless in a call already.
      if (pc) {
        console.log('already in call, ignoring');
        return;
      }
      startButton.disabled = false;
      break;
    case 'bye':
      if (pc) {
        hangup();
      }
      break;
    default:
      console.log('unhandled', e);
      break;
  }
};

ws.onopen = () => {
  ws.send(JSON.stringify({type: 'ready'}));
}

startButton.onclick = async () => {
  startButton.disabled = true;
  closeButton.disabled = false;

  await createPeerConnection();
  sendChannel = pc.createDataChannel('sendDataChannel');

  sendChannel.onopen = () => {
    console.log('Send channel state is: open');
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    sendButton.disabled = false;
    closeButton.disabled = false;
  };

  sendChannel.onmessage = (e) => {
    console.log('Received Message');
    dataChannelReceive.value = e.data;
  };
  
  sendChannel.onclose = () => {
    console.log('Send channel state is: open');
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  };

  const offer = await pc.createOffer();
  ws.send(JSON.stringify({type: 'offer', sdp: offer.sdp}));
  await pc.setLocalDescription(offer);
};

closeButton.onclick = async () => {
  hangup();
  ws.send(JSON.stringify({type: 'bye'}));
};

async function hangup() {
  if (pc) {
    pc.close();
    pc = null;
  }
  sendChannel = null;
  receiveChannel = null;
  console.log('Closed peer connections');
  startButton.disabled = false;
  sendButton.disabled = true;
  closeButton.disabled = true;
  dataChannelSend.value = '';
  dataChannelReceive.value = '';
  dataChannelSend.disabled = true;
};

function createPeerConnection() {
  pc = new RTCPeerConnection();
  pc.onicecandidate = e => {
    const message = {
      type: 'candidate',
      candidate: null,
    };
    if (e.candidate) {
      message.candidate = e.candidate.candidate;
      message.sdpMid = e.candidate.sdpMid;
      message.sdpMLineIndex = e.candidate.sdpMLineIndex;
    }
    ws.send(JSON.stringify(message));
  };
}

async function handleOffer(offer) {
  if (pc) {
    console.error('existing peerconnection');
    return;
  }

  await createPeerConnection();
  pc.ondatachannel = receiveChannelCallback;
  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  ws.send(JSON.stringify({type: 'answer', sdp: answer.sdp}));
  await pc.setLocalDescription(answer);
}

async function handleAnswer(answer) {
  if (!pc) {
    console.error('no peerconnection');
    return;
  }
  await pc.setRemoteDescription(answer);
}

async function handleCandidate(candidate) {
  if (!pc) {
    console.error('no peerconnection');
    return;
  }
  if (!candidate.candidate) {
    await pc.addIceCandidate(null);
  } else {
    await pc.addIceCandidate(candidate);
  }
}

function sendData() {
  const data = dataChannelSend.value;
  if (sendChannel) {
    sendChannel.send(data);
  } else {
    receiveChannel.send(data);
  }
  console.log('Sent Data: ' + data);
}

function receiveChannelCallback(event) {
  console.log('Receive Channel Callback');
  receiveChannel = event.channel;

  receiveChannel.onmessage = (e) => {
    console.log('Received Message');
    dataChannelReceive.value = e.data;
  };

  receiveChannel.onopen = () => {
    console.log(`Receive channel state is: open`);
    dataChannelSend.disabled = false;
    sendButton.disabled = false;
    closeButton.disabled = false;
  };

  receiveChannel.onclose = () => {
    console.log(`Receive channel state is: close`);
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  };
}
