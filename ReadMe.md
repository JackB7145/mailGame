# MailGame

MailGame is a simple web game built with **React**, **Phaser**, **Firebase**, and a **FastAPI backend**.  
It lets you move a character around a 2D space, interact with mailboxes, and send/receive mail between users.  
Messages are stored in Firestore, and you can view both your **Inbox** and **Outbox**.

---

## Features

- 2D Phaser-based game world:
  - Red mailbox → compose and send a letter
  - Blue mailbox → open your inbox
- Compose letters with subject and body text
- View inbox with the ability to delete mail
- View outbox (sent messages)
- Firebase anonymous authentication
- FastAPI backend that:
  - Verifies Firebase ID tokens
  - Stores mail in Firestore
  - Provides endpoints for sending, reading, and deleting mail

---

## Tech Stack

- **Frontend**
  - React + Vite
  - Phaser (game engine)
  - Firebase JS SDK (auth + Firestore client for user setup)

- **Backend**
  - FastAPI (Python)
  - Firebase Admin SDK (Firestore + Auth verification)

---

## Running Locally

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.11+
- Firebase project with Firestore enabled
- Firebase Admin service account key (`serviceAccount.json`)

### Frontend

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
