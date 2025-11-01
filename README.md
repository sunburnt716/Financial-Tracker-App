# **AI-Powered Personal Finance Tracker**

A modern **React-based financial dashboard** designed to simplify how individuals and organizations manage money.  
This application goes beyond basic expense tracking by integrating **AI, automation, and data analysis** to provide meaningful financial insights.

---

## **Overview**

The Financial Tracker is a web application that allows users to monitor income and expenses, analyze trends, and plan for better financial decisions.  
Future updates aim to incorporate **artificial intelligence**, **automated email parsing**, and **computer vision** to make financial tracking seamless and intelligent.

---

## **Current Features**

### **Dashboard Overview**
- Displays key financial summaries: **Total Revenue**, **Total Expenses**, and **Revenue Growth**
- Provides quick-glance metrics to visualize overall financial health

### **Transaction Management**
- Add, view, and manage transactions (name, price, and date)
- Automatically calculates totals using JavaScript **filter()** and **reduce()**

### **Filtering and Sorting**
- Filter transactions by type or date range
- Clear filters to return to the complete list

---

## **Upcoming Features**

### **Email Parsing Bot**
- Integrates with **Gmail API**
- Automatically identifies and parses transaction-related emails (receipts, bank alerts)
- Extracts key info (merchant, amount, date) and adds to transaction list

### **Receipt Scanner (Computer Vision)**
- Upload or scan paper receipts
- Uses **OCR** via **Tesseract.js** or **Google Vision API**
- Extracted data is auto-added as transactions

### **AI Financial Advisor**
- Incorporates a **language model** to analyze spending and predict outcomes
- Provides insights such as:
  - Spending trends over time
  - Predictions for savings goals
  - Recommendations to improve financial health
- Designed for both **personal** and **organizational** use

---

## **Project Goals**

- Automate financial tracking with AI and OCR  
- Provide **actionable insights** from real financial data  
- Build a scalable foundation for **personal and enterprise analytics**

---

## **Tech Stack**

- **Frontend:** React (Hooks, Components)
- **Styling:** CSS / Tailwind
- **AI and Data Tools:**
  - Gmail API for email parsing
  - OpenAI API or local LLM for financial insights
  - Tesseract.js / Google Vision API for OCR
- **Backend (Planned):** Node.js + Express
- **Database (Planned):** MongoDB or Firebase

---

## **Future Roadmap**

- ✅ Core transaction tracking and dashboard  
- 🚧 Gmail parsing integration  
- 🚧 OCR receipt scanning  
- 🚧 AI-based financial insights module  
- 🚧 User authentication and cloud sync  
- 🚧 Predictive analytics and financial forecasting  

---

## **Setup Instructions**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   cd <repo-name>
