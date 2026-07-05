# 🧠 Calmify — AI-Powered Mental Health Support Platform

<div align="center">
  <img src="frontend/public/calmifylogo.png" alt="Calmify Logo" width="180" />
  <p><strong>A comprehensive, secure, and modern mental health platform featuring AI-powered support, real-time peer & professional counseling, and standardized psychological assessments.</strong></p>
</div>

---

## 🔑 Test Credentials

Use these pre-configured accounts to log in and explore the role-based workflows:

| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@calmify.com` | `password123` | Chat with AI, request peer support/counseling, take health tests |
| **Peer Volunteer** | `peer@calmify.com` | `password123` | Accept pending support request sessions, chat with peers |
| **Professional Counselor** | `counselor@calmify.com` | `password123` | Accept clinical sessions, write patient notes & records |
| **Administrator** | `admin@calmify.com` | `password123` | View system analytics and platform moderation metrics |

*Note: Make sure to run the seed script (detailed below) to populate these users in your database.*

---

## ⚡ Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster or local MongoDB instance

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and set your variables (MongoDB URI, JWT Secrets, OpenAI configuration).
4. Seed the database with the test users:
   ```bash
   npm run seed
   ```
5. Start the development server (runs on port `5001`):
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` (points to `http://localhost:5001/api` by default).
4. Start the Vite development server (runs on port `8080`):
   ```bash
   npm run dev
   ```

---

## ✨ Core Features

- **AI-Powered Chatbot:** Empathic, context-aware AI psychology assistant using Azure OpenAI (CBT & DBT principles).
- **Crisis Detection & Mitigation:** Scans user inputs for suicide or self-harm keywords, automatically escalates to emergency state, and redirects to Indian national support networks.
- **Real-Time Counseling Chat:** Socket.io-driven chatrooms connecting patients with volunteers (peer support) and professionals (counselors).
- **Standardized Assessments:** Standardized mental wellness questionnaires including PHQ-9 (Depression), GAD-7 (Anxiety), and GHQ-12 (General Health).
- **Counselor Documentation:** Secured case record templates and session ratings.
