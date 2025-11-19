# 🏔️ My Health Summit

A beautiful, thoughtful health planning application designed to help individuals climb to their health summit with purpose, not just a plan.

## 🏔️ Overview

My Health Summit guides users through a structured 4-step framework using a mountain climbing metaphor. The app helps you define your vision, assess your resources, map your route, and create an actionable plan to reach your health goals.

## ✨ Features

### Core Journey
- **Beautiful Landing Page**: Introduces the mountain climbing metaphor with animated elements
- **4-Step Guided Journey**:
  1. **Vision Setting** (1-2 years): Define your ideal health state and why it matters
  2. **Base Camp**: Assess your non-negotiables, strengths, energizers, and gaps
  3. **Map the Ascent**: Rate current health, identify obstacles and skills needed
  4. **Capacity & Support**: Define time capacity, readiness, and support systems

### Smart Features
- **Suggestion Chips**: Quick-start prompts on 9 different questions to help overcome writer's block
- **Rule-Based Action Plan Generator**: Creates personalized weekly actions based on:
  - Time capacity and readiness level
  - Selected barriers and habits
  - Habit sequencing (foundational → intermediate → advanced)
  - Barrier-specific strategies
- **✨ AI-Powered Personalization** (Optional): 
  - Enhances rule-based plan with context-specific recommendations
  - Provides "why this works" and practical tips for each action
  - Toggle between AI-enhanced and original plan
- **Tab Navigation**: Switch between Action Plan and full Summary
- **PDF Download**: Export complete plan with green-themed formatting
- **Calendar Reminders**: Download .ics files with full plan details
- **Print Functionality**: Clean, printer-friendly layout

### Design
- **Consistent Green Theme**: Unified color palette throughout the app
- **Mountain Climbing Icons**: Flag, Backpack, TrendingUp, Clock icons
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile
- **Modern UI**: Built with React, Tailwind CSS, and Lucide icons

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/health-summit.git
cd health-summit
```

2. Install dependencies:
```bash
npm install
```

3. **(Optional) Set up AI Enhancement**:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key: `VITE_OPENAI_API_KEY=sk-your-key-here`
   - See `AI_SETUP.md` for detailed instructions

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5174`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## 🎨 Design Philosophy

The app uses a warm, earthy color palette (stone and amber tones) to create a grounded, focused experience. The mountain climbing metaphor is reinforced throughout the UI with elevation-themed language and outdoor adventure icons.

## 📱 Usage

1. **Start on the Landing Page**: Review the framework and understand the mountain climbing metaphor
2. **Begin Your Ascent**: Click "Begin Your Ascent" to start the guided process
3. **Complete Each Step**: Work through the 4 steps at your own pace (approximately 30 minutes total)
4. **Review Your Vision**: View your complete health vision on the summary page
5. **Save & Revisit**: Print or download your vision and review it every 3-6 months

## 🛠️ Technology Stack

- **React 18**: Modern UI library
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful, consistent icons
- **jsPDF**: PDF generation
- **OpenAI API**: Optional AI-powered personalization (GPT-4o-mini)
- **PostCSS**: CSS processing

## 📄 License

This project is open source and available for personal and professional use.

## 🤝 Contributing

Feel free to fork this project and adapt it to your needs. Suggestions and improvements are welcome!

## 💡 Tips for Best Results

- Set aside uninterrupted time to complete the framework
- Be honest and specific in your responses
- Think long-term for your Summit Vision, but be practical for your first 90-day steps
- Review and update your health vision quarterly
- Share with a health coach or accountability partner for feedback

---

**Remember**: Your health journey is like climbing a mountain. This vision helps you prepare, plan your route, and take one step at a time toward your summit.
