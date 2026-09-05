# 🚨 AI-Powered Smart Real-Time Emergency Response System

An intelligent, real-time emergency response and incident management platform designed to improve how emergency incidents are reported, assessed, assigned, monitored, and resolved.

The system connects **citizens, emergency responders, and authorized administrators** through a centralized web-based platform with real-time communication, secure authentication, incident management, SOS reporting, responder assignment, notifications, audit logging, and AI-assisted incident triage.

---

## 📌 Project Overview

Emergency situations require fast communication, accurate prioritization, and effective coordination between people reporting incidents and emergency responders.

This project provides a digital platform that helps emergency organizations:

* Receive emergency reports and SOS alerts.
* Assess and prioritize incidents.
* Assign incidents to available responders.
* Track incident status throughout the response process.
* Notify relevant users in real time.
* Maintain an auditable history of important system activities.
* Use AI-assisted triage to suggest incident categories and priorities.

The AI triage component is designed as an **advisory system**. It supports human decision-making rather than replacing emergency personnel.

---

## 🎯 Objectives

The system was developed to:

1. Provide a reliable platform for reporting emergency incidents.
2. Support rapid SOS emergency reporting.
3. Improve coordination between emergency organizations and responders.
4. Automatically suggest incident categories and priorities.
5. Enable responders to manage assigned incidents efficiently.
6. Provide real-time notifications and status updates.
7. Maintain an auditable activity trail.
8. Apply secure authentication and authorization.
9. Improve emergency response workflow efficiency.
10. Provide a foundation for future intelligent emergency-response capabilities.

---

# ✨ Key Features

## 🚨 Emergency Incident Reporting

Citizens can submit emergency reports containing relevant incident information.

The system supports the emergency workflow from initial reporting through response and resolution.

## 🆘 SOS Emergency Alerts

The system provides an SOS workflow for urgent emergency situations.

SOS incidents receive special priority handling to ensure that they are treated as critical emergency events.

## 🤖 AI Incident Triage

The system includes an AI-assisted incident triage engine that provides:

* Suggested incident category
* Suggested priority
* Confidence score
* Explainable reasoning
* Advisory recommendations

The current implementation uses a deterministic, explainable heuristic provider.

The AI architecture is provider-based, allowing a future machine-learning or external AI provider to be introduced without redesigning the entire application.

### AI Safety

AI suggestions do not prevent the emergency workflow from operating.

If the AI provider becomes unavailable, the system continues processing reports and SOS requests normally.

---

## 👨‍🚒 Responder Management

Responders can:

* Manage their availability.
* View assigned incidents.
* Accept and process emergency assignments.
* Update incident progress.
* Maintain responder profile information.

Responder availability helps the system coordinate emergency assignments more effectively.

---

## 📋 Incident Assignment

Authorized users can verify incidents and assign them to appropriate responders.

The workflow supports:

```text
Report/SOS
     ↓
AI Triage
     ↓
Verification
     ↓
Responder Assignment
     ↓
Response
     ↓
Status Updates
     ↓
Resolution
```

---

## 🔔 Real-Time Notifications

The system provides real-time communication for important emergency events and workflow changes.

Notifications can be generated for events such as:

* New emergency reports
* SOS alerts
* Incident verification
* Responder assignments
* Assignment updates
* Incident status changes
* Other important system activities

---

## 📝 Audit & Activity Trail

Important system activities are recorded to provide accountability and traceability.

The audit mechanism helps administrators understand:

* What happened
* When it happened
* Which operation occurred
* Which system/user action triggered the event

This provides an important accountability layer for emergency operations.

---

# 🔐 Security

Security is an important part of the system architecture.

The application includes security mechanisms such as:

* Authentication
* Authorization
* Role-based access control
* Protected backend routes
* Secure password handling
* JWT-based authentication
* Input validation
* Controlled access to emergency operations
* Audit logging

Sensitive configuration values are stored through environment variables rather than being committed directly to the repository.

> **Never commit real `.env` files, database passwords, JWT secrets, API keys, or other credentials to GitHub.**

---

# 🏗️ System Architecture

The application follows a modern full-stack architecture.

```text
┌───────────────────────────────┐
│          Frontend             │
│       React + Vite            │
│                               │
│ Citizen | Responder | Admin   │
└───────────────┬───────────────┘
                │
                │ HTTP / REST
                │ Real-Time Events
                ▼
┌───────────────────────────────┐
│           Backend             │
│       Node.js / Express       │
│                               │
│ Authentication                │
│ Incident Management           │
│ SOS Management                │
│ Assignment Management         │
│ Notifications                 │
│ AI Triage                     │
│ Audit Logging                 │
└───────────────┬───────────────┘
                │
                │ Prisma ORM
                ▼
┌───────────────────────────────┐
│          PostgreSQL           │
│           Database            │
└───────────────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

* React
* Vite
* JavaScript
* HTML
* CSS

## Backend

* Node.js
* Express.js
* JavaScript
* REST API
* Socket.IO / real-time communication
* JWT authentication

## Database

* PostgreSQL
* Prisma ORM
* Prisma Migrations

## Development Tools

* Visual Studio Code
* Git
* GitHub
* Git Bash
* Node.js
* npm

## AI

The current AI triage implementation uses an explainable heuristic provider.

The architecture uses a provider abstraction so that future implementations can use:

* Machine Learning models
* Python-based AI services
* External AI APIs
* Other intelligent classification systems

without requiring major changes to the emergency-response workflow.

---

# 📁 Project Structure

```text
emergency-response-system/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   │
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   │   └── ai/
│   │   └── ...
│   │
│   ├── prisma.config.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

# ⚙️ Requirements

Before running the project, install:

* Node.js
* npm
* PostgreSQL
* Git

You should also have a PostgreSQL database available for the backend.

---

# 🚀 Installation

## 1. Clone the repository

```bash
git clone https://github.com/abdulmajeedosman103-blip/emergency-response-system.git
```

Enter the project directory:

```bash
cd emergency-response-system
```

---

## 2. Install backend dependencies

```bash
cd backend
npm install
```

---

## 3. Configure environment variables

Create a `.env` file inside the `backend` directory using the provided example:

```bash
cp .env.example .env
```

Then configure the required database connection and application secrets.

For Windows users who are using Git Bash, the command above can be used directly.

---

## 4. Configure the database

Make sure PostgreSQL is running.

Then run the Prisma database commands required by the project.

For example:

```bash
npx prisma migrate dev
```

If the project requires seed data:

```bash
npm run seed
```

Use the project's actual package scripts where applicable.

---

## 5. Start the backend

From the `backend` directory:

```bash
npm run dev
```

---

## 6. Install frontend dependencies

Open another terminal:

```bash
cd frontend
npm install
```

---

## 7. Start the frontend

```bash
npm run dev
```

Vite will provide the local development address in the terminal.

---

# 🧪 Testing

The system was tested across multiple areas of the application.

The completed implementation included tests covering:

* AI triage engine
* AI API flows
* Regression testing
* Provider failure scenarios
* Recovery scenarios
* Database integrity
* Backend code validation
* Frontend build validation

The AI triage implementation was specifically tested for failure safety to ensure that an unavailable AI provider does not prevent emergency reports or SOS requests from being processed.

---

# 🧠 AI Triage Architecture

The AI component uses a provider-based architecture.

```text
                Incident / SOS
                       │
                       ▼
                AI Service
                       │
                       ▼
              Provider Factory
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
      Heuristic Provider    Future AI Provider
             │                   │
             └─────────┬─────────┘
                       ▼
              AI Recommendation
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          Category  Priority  Confidence
```

This architecture makes the AI component easier to extend and maintain.

---

# 🛡️ AI Failure Safety

AI is treated as an advisory component rather than a required dependency for emergency processing.

If an AI provider fails:

```text
AI Provider Failure
        ↓
Fallback / Safe Handling
        ↓
Emergency Workflow Continues
```

This is particularly important because emergency reporting should not become unavailable simply because an AI component experiences an error.

---

# 📊 System Roles

The system supports different operational responsibilities.

### Citizen

Can:

* Report incidents
* Submit SOS alerts
* View relevant incident information
* Receive notifications

### Responder

Can:

* Manage availability
* View assignments
* Respond to incidents
* Update response progress
* Receive relevant notifications

### Authorized Administrator/Operator

Can:

* Manage emergency incidents
* Verify reports
* Assign responders
* Monitor system activity
* Review operational information
* Access authorized administrative functions

---

# 🔄 Emergency Response Workflow

```text
┌─────────────┐
│   Citizen   │
└──────┬──────┘
       │
       │ Report / SOS
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ AI Triage   │
└──────┬──────┘
       │
       │ Category + Priority
       ▼
┌─────────────┐
│ Verification│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Assignment  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Responder  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Response   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Resolution  │
└─────────────┘
```

---

# 📈 Completed Development Milestones

The system was developed incrementally through **15 major milestones** covering the core emergency-response workflow.

The final milestone introduced:

> **AI Incident Triage & Priority Suggestion Engine**

The completed system integrates emergency reporting, SOS handling, verification, responder assignment, notifications, responder availability, activity auditing, and AI-assisted triage.

---

# 🔮 Future Enhancements

Possible future improvements include:

* Machine-learning-based incident classification
* Natural-language processing for emergency descriptions
* GPS-based responder recommendations
* Interactive emergency maps
* Ambulance/vehicle tracking
* Predictive emergency analytics
* Mobile applications
* SMS emergency notifications
* Voice-based emergency reporting
* Integration with external emergency agencies
* Advanced analytics dashboards
* Cloud deployment
* Automated CI/CD pipelines

---

# ⚠️ Important Security Notice

This repository contains example environment configuration files, but real credentials should never be committed.

Before deploying the application:

1. Create production environment variables.
2. Use strong secrets.
3. Restrict database access.
4. Enable HTTPS.
5. Review authentication and authorization.
6. Configure secure production logging.
7. Never expose private API keys or database credentials.

---

# 👨‍💻 Author

**Abdul-Majeed Osman**

Computer Science
Sunyani Technical University
Ghana

---

# 📄 Project Status

**Status: Completed — Milestones 1–15**

The current repository represents the completed development stage of the Emergency Response System.

Further development can focus on deployment, optimization, additional AI models, mobile support, and integration with real-world emergency services.

---

## ⭐ Repository

GitHub:

https://github.com/abdulmajeedosman103-blip/emergency-response-system

---

## 📜 License

This project was developed as an academic/software engineering project.

License terms can be added here if the project is later released under a specific open-source license.
