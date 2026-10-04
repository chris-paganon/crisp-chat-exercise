# Exam instructions

- Goal: implement a P2P file transfer system for sending large files across 2 Crisp chats. But first, you'll need to implement the chat functionality.

- Preparation:
  - Build a chat with core functionality, connecting to a WebSocket server (can be Socket.IO or anything else)
  - Support 1 type of message (text)
  - You're responsible for the frontend + the backend signaling server
  - Chats should be exchanged between 2 same apps joining a common chat room (one party is operator, one is visitor)
  - Support failure cases (eg. message failed to send w/ retry, reconnect after network loss, etc.)
  - UI should be friendly & look good (apply your taste)
  - You can emulate the style of the message view of our chatbox — no need for the wrapper to be a floating chatbox (can be full-screen)
  - Frontend chat should be built w/ Vue.js in TS

- Actual feature:
  - For all files sent, P2P transfer protocol that asks permission to the receiving end to receive the file, and then start the transfer, and download to computer
    - We assume all files are "large files" here. So that you dont have to implement a S3 backend and inline files rendering for smaller files not requiring P2P.
  - Feature should be implemented w/o any external library, except for WebRTC if used/needed
  - Build for edge cases (support multiple // file transfers, what happens if a party closes the tab, etc?)
  - Support all major browsers, including mobile browsers — if mobile and on cellular, ask for permission before transferring the large file
  - A 2GB file must transfer without crashing the browser tab

- Post-implementation:
  - You need to be capable of explaining the code you produced

- Bonus features:
  - Resume transfer after disconnect and chat session resume (tab reload, page change, etc.)

- Timing:
  - Should take ~2 days maximum

Time spent will be paid, as for task 1.
