import './style.css';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, addDoc, updateDoc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';


// API keys set to visible since running FireStore in a Browser requires explicit mentioning so:
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
let pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

let webcamButton = document.getElementById('webcamButton');
let webcamVideo = document.getElementById('webcamVideo');
let callButton = document.getElementById('callButton');
let callInput = document.getElementById('callInput');
let answerButton = document.getElementById('answerButton');
let remoteVideo = document.getElementById('remoteVideo');
let hangupButton = document.getElementById('hangupButton');

// 1. Setup media sources
webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = true;
};

const shortenId = () => {
  let shortId = document.getElementById('nameInput').value;
  return shortId;
};

const saveMapping = async (originalId, shortId) => {
  await setDoc(doc(collection(firestore, 'idMappings'), shortId), { originalId });
};

const restoreId = async (shortId) => {
  const docRef = doc(collection(firestore, 'idMappings'), shortId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data().originalId;
  } else {
    throw new Error('ID not found');
  }
};

// 2. Create an offer
callButton.onclick = async () => {
  const callDoc = doc(collection(firestore, 'calls'));
  const offerCandidates = collection(callDoc, 'offerCandidates');
  const answerCandidates = collection(callDoc, 'answerCandidates');

  const shortId = shortenId();
  callInput.value = shortId;
  await saveMapping(callDoc.id, shortId);

  pc.onicecandidate = (event) => {
    event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
  };

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await setDoc(callDoc, { offer });

  onSnapshot(callDoc, (snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });
  hangupButton.disabled = false;
  answerButton.disabled = true;
};

answerButton.onclick = async () => {
  const shortId = callInput.value;
  const callId = await restoreId(shortId);
  const callDoc = doc(collection(firestore, 'calls'), callId);
  const answerCandidates = collection(callDoc, 'answerCandidates');
  const offerCandidates = collection(callDoc, 'offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
  };

  const callSnapshot = await getDoc(callDoc);
  const callData = callSnapshot.data();

  if (!callData || !callData.offer) {
    console.error("No call data found or offer is missing in the document.");
    return;
  }

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  try {
    await pc.setLocalDescription(answerDescription);
  } catch (error) {
      console.error("Error setting local description:", error);
  }

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await updateDoc(callDoc, { answer });

  onSnapshot(offerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(candidateData));
      }
    });
  });
  hangupButton.disabled = false;
  callButton.disabled = true;
};

// 4. Hang up the call
hangupButton.onclick = () => {
  if (pc) {
    pc.close();
    pc = new RTCPeerConnection(servers);
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  webcamVideo.srcObject = null;
  remoteVideo.srcObject = null;

  webcamButton.disabled = false;
  callButton.disabled = true;
  answerButton.disabled = true;
  callInput.value = '';
  document.getElementById('nameInput').value = '';
};
