# A webrtc demo using RTCPeerConnection api, communication between two devices in LAN



## dev

* SDP contain ICE candicates, ICE server is unneeded in LAN

* ```mediaDevices.getUserMedia``` must using HTTPS or the file:/// URL scheme, or a page loaded from localhost

*  HTTPS connect to insecure ws will be blocked by many browsers due to security problems, if using HTTPS then must using wss

*  self-signed SSL CA certificates by [mkcert](https://github.com/FiloSottile/mkcert)

* ```sigs``` is a signaling server writen by golang gorilla websocket

* websocket server serve a / route for SSL warning, wss connection from 192.168.101.* will be blocked, accept untrusted certificate before connect to wss



## reference

* [Basic peer connection demo between two tabs](https://webrtc.github.io/samples/src/content/peerconnection/channel/)

* [Signaling and video calling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)

* [https://webrtc.github.io/samples/](https://webrtc.github.io/samples/)

* [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

* [Why does my wss:// (WebSockets over SSL/TLS) connection immediately disconnect without giving any errors?](https://stackoverflow.com/questions/23404160/why-does-my-wss-websockets-over-ssl-tls-connection-immediately-disconnect-w)

* [Secure websockets with self-signed certificate](https://stackoverflow.com/questions/5312311/secure-websockets-with-self-signed-certificate)

* firefox webrtc status ```about:webrtc```