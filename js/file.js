
'use strict';

const fileInput = document.querySelector('input#fileInput');
const abortButton = document.querySelector('button#abortButton');
const downloadAnchor = document.querySelector('a#download');
const sendProgress = document.querySelector('progress#sendProgress');
const receiveProgress = document.querySelector('progress#receiveProgress');
const sendFileButton = document.querySelector('button#sendFile');

let receivedFile;
let receiveBuffer = [];
let receivedSize = 0;
let sentSize = 0;

let pc;
let dataChannel;
let fileReader;

let host = "127.0.0.1:12345";
if (window.location.hostname !== "127.0.0.1") {
  host ="192.168.101.86:12345";
}
let httpAddr = "http://" + host;
let wsAddr = "ws://" + host + "/ws";

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
      // A second tab joined. This tab will enable the buttons unless in a call already.
      if (pc) {
        console.log('already in call, ignoring');
        return;
      }
      startConnect();
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

sendFileButton.onclick = () => {sendData()}
abortButton.onclick = () => {
  if (fileReader && fileReader.readyState === 1) {
    console.log('Abort read!');
    fileReader.abort();
  }
}

async function startConnect(){
	await createPeerConnection();
	dataChannel = pc.createDataChannel("sendDataChannel");
	dataChannel.binaryType = 'arraybuffer';

	dataChannel.addEventListener("open", () => {
		onReceiveChannelStateChange();
		sendFileButton.disabled = false;
		abortButton.disabled = false;
	});
	dataChannel.addEventListener("close", () => {
		onReceiveChannelStateChange();
		closeDataChannels();
		sendFileButton.disabled = true;
		abortButton.disabled = true;
	});
	dataChannel.addEventListener("message", (e) => {
		onReceiveMessageCallback(e);
	});

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({type: 'offer', sdp: offer.sdp}));	
}

async function createPeerConnection(){
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
	} 
}

async function handleOffer(offer) {
	if (pc) {
		return
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
		return
	}

	await pc.setRemoteDescription(answer);
}

async function handleCandidate(candidate){
	if (!pc) {
		return
	}

  if (!candidate.candidate) {
    // All candidates have been sent
    await pc.addIceCandidate(null);
  } else {
    await pc.addIceCandidate(candidate);
  }
}

async function onReceiveChannelStateChange(){
  if (dataChannel) {
    const readyState = dataChannel.readyState;
    console.log(`Receive channel state is: ${readyState}`);
  }
}

function receiveChannelCallback(e){
	dataChannel = e.channel;
	dataChannel.binaryType = 'arraybuffer';
	dataChannel.addEventListener("open", () => {
		onReceiveChannelStateChange();
		sendFileButton.disabled = false;
		abortButton.disabled = false;
	});
	dataChannel.addEventListener("close", () => {
		onReceiveChannelStateChange();
		closeDataChannels();
		sendFileButton.disabled = true;
		abortButton.disabled = true;
	});
	dataChannel.addEventListener("message", (e) => {
		onReceiveMessageCallback(e);
	});

	receivedSize = 0;
  downloadAnchor.textContent = '';
  downloadAnchor.removeAttribute('download');
  if (downloadAnchor.href) {
    URL.revokeObjectURL(downloadAnchor.href);
    downloadAnchor.removeAttribute('href');
  }
}

function onReceiveMessageCallback(e) {
	if (typeof(e.data) === "string") {
		receivedFile = JSON.parse(e.data);
		console.log(receivedFile);
	  receiveProgress.max = receivedFile.size;
		return
	}

  console.log(`Received bytes ${e.data.byteLength}`);
  receiveBuffer.push(e.data);
  receivedSize += e.data.byteLength;
  receiveProgress.value = receivedSize;

  if (receivedSize === receivedFile.size) {
  	console.log("received complete file")
    const received = new Blob(receiveBuffer);

    downloadAnchor.href = URL.createObjectURL(received);
    downloadAnchor.download = receivedFile.name;
    downloadAnchor.textContent =`Click to download '${receivedFile.name}' (${receivedFile.size} bytes)`;
    downloadAnchor.style.display = 'block';

    receiveBuffer = [];
  	receivedSize = 0;
  }
}

function closeDataChannels(){
	if (dataChannel) {
		dataChannel.close();
		console.log("Closed send channel");
	}
	dataChannel = null;
	pc.close();
	pc = null;
	console.log("Closed peer connection");
}

function sendData(){
	const file = fileInput.files[0];
 
  if (!file || file.size === 0) {
    console.log('File is empty, please select a non-empty file');
    return;
  }
 	
  console.log(`File is`, file);

  dataChannel.send(JSON.stringify({
	  type: 'file',
	  name: file.name,
	  size: file.size,
	  type: file.type
	}));

  sendProgress.max = file.size;
  
  const chunkSize = 16 * 1024;
  fileReader = new FileReader();
  let offset = 0;
  fileReader.addEventListener('error', error => console.error('Error reading file:', error));
  fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
  fileReader.addEventListener('load', e => {
    dataChannel.send(e.target.result);
    offset += e.target.result.byteLength;
    sendProgress.value = offset;
    console.log('send slice ', offset);
    
    if (offset < file.size) {
      readSlice(offset);
    } else {
  		console.log("done")
    }
  });

  const readSlice = o => {
    const slice = file.slice(offset, o + chunkSize);
    fileReader.readAsArrayBuffer(slice);
  };

  readSlice(0);
}
