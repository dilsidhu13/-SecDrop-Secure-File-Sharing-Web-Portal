import React, { useState, useRef } from 'react';
import { io } from 'socket.io-client';

export default function P2PFileTransfer() {
  const [role, setRole] = useState('sender');
  const [transferId, setTransferId] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const channelRef = useRef(null);
  const metaRef = useRef(null);
  const buffersRef = useRef([]);

  const connectSocket = id => {
    if (socketRef.current) return;
    socketRef.current = io(process.env.REACT_APP_P2P_URL || 'http://localhost:5000');
    socketRef.current.emit('join', id);
    socketRef.current.on('signal', async data => {
      const pc = pcRef.current;
      if (!pc) return;
      if (data.type === 'offer' || data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        if (data.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit('signal', { room: id, data: pc.localDescription });
        }
      } else if (data.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
      }
    });
  };

  const createPeerConnection = id => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pc.onicecandidate = e => {
      if (e.candidate) socketRef.current.emit('signal', { room: id, data: { candidate: e.candidate } });
    };
    pc.ondatachannel = e => {
      channelRef.current = e.channel;
      channelRef.current.onmessage = handleReceive;
    };
    pcRef.current = pc;
  };

  const startSend = async () => {
    if (!file) { setStatus('Select a file'); return; }
    const id = crypto.randomUUID();
    setTransferId(id);
    setStatus('Waiting for receiver…');
    createPeerConnection(id);
    connectSocket(id);
    const channel = pcRef.current.createDataChannel('file');
    channelRef.current = channel;
    channel.onopen = sendFile;
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketRef.current.emit('signal', { room: id, data: offer });
  };

  const sendFile = async () => {
    const channel = channelRef.current;
    const chunkSize = 16 * 1024;
    channel.send(JSON.stringify({ filename: file.name, size: file.size }));
    let offset = 0;
    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize);
      channel.send(await slice.arrayBuffer());
      offset += slice.size;
      setStatus(`Sent ${Math.round((offset / file.size) * 100)}%`);
    }
    channel.send(JSON.stringify({ done: true }));
    setStatus('File sent! Share ID: ' + transferId);
  };

  const startReceive = async () => {
    if (!transferId) { setStatus('Enter transfer ID'); return; }
    createPeerConnection(transferId);
    connectSocket(transferId);
    setStatus('Connecting…');
  };

  const handleReceive = e => {
    if (typeof e.data === 'string') {
      try {
        const msg = JSON.parse(e.data);
        if (msg.filename) {
          metaRef.current = msg;
          buffersRef.current = [];
        } else if (msg.done) {
          const blob = new Blob(buffersRef.current);
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = metaRef.current.filename || 'download';
          a.click();
          setStatus('File received!');
          buffersRef.current = [];
          metaRef.current = null;
        }
      } catch {
        // ignore
      }
    } else {
      buffersRef.current.push(e.data);
      if (metaRef.current && metaRef.current.size) {
        const received = buffersRef.current.reduce((acc, b) => acc + b.byteLength, 0);
        setStatus(`Received ${Math.round(received / metaRef.current.size * 100)}%`);
      }
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '1rem auto', textAlign: 'center' }}>
      <h2>P2P File Transfer</h2>
      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input type="radio" checked={role === 'sender'} onChange={() => setRole('sender')} /> Sender
        </label>
        <label style={{ marginLeft: '1rem' }}>
          <input type="radio" checked={role === 'receiver'} onChange={() => setRole('receiver')} /> Receiver
        </label>
      </div>
      {role === 'sender' ? (
        <div>
          <input type="file" onChange={e => setFile(e.target.files[0])} />
          <button onClick={startSend} style={{ marginLeft: '1rem' }}>Start Send</button>
          {transferId && <p>Share ID with receiver: {transferId}</p>}
        </div>
      ) : (
        <div>
          <input value={transferId} onChange={e => setTransferId(e.target.value)} placeholder="Enter ID" />
          <button onClick={startReceive} style={{ marginLeft: '1rem' }}>Connect</button>
        </div>
      )}
      <p style={{ marginTop: '1rem' }}>{status}</p>
    </div>
  );
}