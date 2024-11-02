import './style.css';
//import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, addDoc, updateDoc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';

//dotenv.config();



const firebaseConfig = {
  apiKey: "AIzaSyAbRzhqLE2X0Ri6DTjE_KjgaCAO9KujuBY",
  authDomain: "webrtc-demo1-2b9c0.firebaseapp.com",
  projectId: "webrtc-demo1-2b9c0",
  storageBucket: "webrtc-demo1-2b9c0.firebasestorage.app",
  messagingSenderId: "671271702684",
  appId: "1:671271702684:web:93fae360e59dcba3649d59",
  measurementId: "G-ZR0BKFN231",
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
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

// 1. Setup media sources

webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
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
  // Reference Firestore collections for signaling
  const callDoc = doc(collection(firestore, 'calls'));
  const offerCandidates = collection(callDoc, 'offerCandidates');
  const answerCandidates = collection(callDoc, 'answerCandidates');

  const shortId = shortenId();
  callInput.value = shortId;
  await saveMapping(callDoc.id, shortId);

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await setDoc(callDoc, { offer });

  // Listen for remote answer
  onSnapshot(callDoc, (snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  hangupButton.disabled = false;
};


// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const shortId = callInput.value;
  const callId = await restoreId(shortId);
  const callDoc = doc(collection(firestore, 'calls'), callId);
  const answerCandidates = collection(callDoc, 'answerCandidates');
  const offerCandidates = collection(callDoc, 'offerCandidates');

  // Set up ICE candidate gathering
  pc.onicecandidate = (event) => {
    event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
  };

  // Get the call data
  const callSnapshot = await getDoc(callDoc);
  const callData = callSnapshot.data();

  // Check if callData exists and has the offer
  if (!callData || !callData.offer) {
    console.error("No call data found or offer is missing in the document.");
    return; // Exit if there's no valid call data
  }

  // Set remote description
  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  // Create answer
  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  // Update call document with answer
  await updateDoc(callDoc, { answer });

  // Listen for offer candidates
  onSnapshot(offerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(candidateData));
      }
    });
  });
  hangupButton.disabled = false;
};

