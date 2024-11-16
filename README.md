# anoCon : A WebRTC Video Call Application

## Overview

This project is a simple WebRTC video call application that enables real-time audio and video communication between users. It uses Firebase Firestore for signaling and ID mapping, allowing users to connect by sharing unique identifiers.

## Hosting

A working model has been hosted on https://anoconsession.vercel.app/ 

**Steps to start a video call session:**
- **Step-1**: Click the start webcam button and allow the video and audio access permission.
- **Step-2(Call offer)**: One of the peers can initiate a call by entering a code in the "Create New Call" text space and clicking the Create Call Button.
- **Step-3(Answer the call)**: Using the same code a receiver can access the call by entering the same ID to the Answer Call text space and clicking the Answer Call Button afterwards.
- **Step-4(Hang-Up)**: Click on the Hang Up button when necessary to end the call.

## Features

- **WebRTC Video and Audio**: Real-time video and audio communication using WebRTC.
- **Firebase Firestore**: Utilizes Firestore for signaling to manage offers and answers between peers.
- **ID Mapping**: Allows users to connect via a shortened unique ID, which maps to a call document in Firestore.

## Technologies Used

- **WebRTC**: For peer-to-peer audio/video streaming.
- **Firebase**: For backend services including Firestore for data storage and signaling.
- **HTML/CSS/JS**: Basic web technologies for the user interface.

## Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Glitch-Aswin/anoCon-backend.git
   cd anoCon-backend
   ```
2. **Firebase Configuration**:
   -Create a .env file in the root of your project and add your Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

3. **Install and Run**
    ```js
    npm install i
    npm run dev
    ```

3. **Connect!**
    - Give WebCam and Microphone access.
    - Start Webcam.
    - Type in your Secret Code
    - Create the call!
    - Ask your call partner to input same secret key in the Join call section, after turning on their WebCam and Mic
    - Enjoy Talking!

## Developers:
- [M S Aswin](https://github.com/glitch-aswin/)
- [Pranav M](https://github.com/trulyPranav/)
- [Rigzin Angtak](https://github.com/Rigzin00/)

<br>

```
Build during: Useless Projects @TinkerSpace by TinkerHub
```
