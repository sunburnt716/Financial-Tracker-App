# Trackly (Version 1.0)

**AI-Powered Personal Finance Tracker**

Trackly is a modern, React-based financial management application designed to simplify how individuals and organizations monitor and manage money. Beyond basic expense tracking, Trackly integrates AI and automation tools to provide intelligent, actionable insights into financial data.

---

## Overview

Trackly allows users to securely track transactions, upload and scan receipts or documents, and maintain a detailed record of their income and expenses. This first version focuses on creating a robust foundation with secure user authentication, seamless transaction management, and an OCR-powered document input system via Google Cloud DocumentAI.  

Future versions (v1.1 and beyond) will introduce features like dashboards, Excel exports, predictive analytics, and enhanced AI-based insights.

---

## Current Features

### User Authentication
- Sign-up and login system using secure JWT tokens.
- Passwords are hashed with bcrypt for privacy and security.
- Private transaction data is tied to individual users in MongoDB.
- Login-required banners inform users of their authenticated session status.

### Transaction Management
- Add, edit, view, and delete transactions (name, price, date).
- Transactions are securely associated with the logged-in user.
- Pagination implemented to efficiently manage transaction lists.
- Integration with **Google DocumentAI** enables OCR-based extraction from receipts and documents.
- Automatic normalization of transaction data for consistent database storage.

### Backend Implementation
- Node.js + Express backend with RESTful API for transactions:
  - `GET /api/transactions` → fetch user transactions (with pagination)
  - `POST /api/transactions` → create new transactions
  - `PUT /api/transactions/:id` → edit transaction
  - `DELETE /api/transactions/:id` → delete transaction
  - `POST /api/transactions/extract` → upload documents/receipts for AI parsing
- MongoDB used for storing users and transactions securely.
- Middleware ensures all transaction routes are protected with authentication.

### Frontend Implementation
- React application with functional components and Hooks.
- Real-time state updates on adding, editing, or deleting transactions.
- Forms for manual transaction entry and scanned document upload.
- Login and logout pages integrated with authentication system.

---

## Key Learnings

From building Trackly, the following insights and skills were gained:

- **Engineering Design Process**: Planning features before coding saves time and reduces errors. This project emphasized system design before implementation to build a scalable foundation.
- **System Design**: Learned to structure backend models, middleware, and API routes for efficiency and security.
- **Prompt Engineering & AI Integration**: Began exploring how AI models and tools like DocumentAI can enhance software features.
- **User Authentication & Security**: Implemented JWT-based authentication and password hashing to protect private data.
- **Frontend-Backend Communication**: Managed state effectively and integrated secure API requests.
- **Areas for Improvement**: In future versions, planning will be more detailed to improve AI and software development efficiency.

---

## Upcoming Features (v1.1)

- **Excel Exporting**: Users will be able to export transaction data to Excel for integration with other financial software.
- **Dashboard Analytics**: Visual financial summaries, spending trends, and insights.
- **Predictive AI Insights**: Forecasting spending, savings, and providing recommendations.
- **Enhanced DocumentAI Integration**: Improved parsing and error handling for receipts and statements.
- **Cloud Sync & Multi-Device Support**: Access your Trackly account seamlessly across devices.

---

## Tech Stack

- **Frontend**: React (Hooks, Components), CSS/Tailwind  
- **Backend**: Node.js + Express, RESTful API  
- **Database**: MongoDB (users & transactions)  
- **AI & Data Tools**: Google Cloud DocumentAI for OCR, planned integration with AI models for insights  
- **Authentication & Security**: JWT tokens, bcrypt password hashing  

---

Trackly (v1.0) establishes a strong foundation for a secure, AI-driven personal finance tracker. The focus on user authentication, secure transaction management, and AI-based document processing sets the stage for a more intelligent and feature-rich financial dashboard in future updates.
