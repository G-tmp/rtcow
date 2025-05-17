
'use strict';

const startButton = document.getElementById('startButton');
const closeButton = document.getElementById('closeButton');
const sendButton = document.getElementById('sendButton');
sendButton.onclick = sendData;

const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');

let pc;
let dataChannel;

let wsPort = ":12345";
let host = window.location.hostname + wsPort;
let httpAddr = "http://" + host;
let wsAddr = "ws://" + host + "/ws";

// httpAddress.href = httpAddr;
// httpAddress.innerHTML = httpAddr;
const ws = new WebSocket(wsAddr);

ws.onmessage = e => {
  let data = JSON.parse(e.data)
  console.log(data)
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

  await createPeerConnection();
  dataChannel = pc.createDataChannel('sendDataChannel');

  dataChannel.onopen = () => {
    console.log('Send channel state is: open');
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    startButton.disabled = true;
    sendButton.disabled = false;
    closeButton.disabled = false;
  };

  dataChannel.onmessage = (e) => {
    console.log('Received Message');
    dataChannelReceive.value = e.data;
  };
  
  dataChannel.onclose = () => {
    console.log('Send channel state is: closed');
    hangup();
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({type: 'offer', sdp: offer.sdp}));
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

  dataChannel = null;
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
  // fire when pc call setLocalDescription()
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
  await pc.setLocalDescription(answer);
  ws.send(JSON.stringify({type: 'answer', sdp: answer.sdp}));
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
    // All candidates have been sent
    await pc.addIceCandidate(null);
  } else {
    await pc.addIceCandidate(candidate);
  }
}

function sendData() {
  const data = dataChannelSend.value;
  dataChannelSend.value = "";
  if (dataChannel) {
    dataChannel.send(data);
  }
  console.log('Sent Data: ' + data);
}

function receiveChannelCallback(event) {
  console.log('Receive Channel Callback');
  dataChannel = event.channel;

  dataChannel.onmessage = (e) => {
    console.log('Received Message');
    dataChannelReceive.value = e.data;
  };

  dataChannel.onopen = () => {
    console.log(`Receive channel state is: open`);
    dataChannelSend.disabled = false;
    startButton.disabled = true;
    sendButton.disabled = false;
    closeButton.disabled = false;
  };

  dataChannel.onclose = () => {
    console.log(`Receive channel state is: close`);
    dataChannelSend.disabled = true;
    startButton.disabled = false;
    sendButton.disabled = true;
    closeButton.disabled = true;
  };
}
