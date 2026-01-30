# Document AI Assistant - Setup Guide

## 🎨 Professional Dark Theme with Citations

A beautiful dark-themed chatbot UI inspired by Grok, featuring:
- **Citations Display**: Beautiful table showing document sources, pages, and relevance scores
- **Smart API Integration**: Simple POST request to your AWS API Gateway
- **Premium Design**: Glass-morphism effects, gradients, and smooth animations
- **Professional Typography**: Inter font for UI, JetBrains Mono for code

## 🚀 Quick Start

### 1. Configure API Endpoint

Edit `client/.env` file:

```env
VITE_API_ENDPOINT=https://y68ijdiww8.execute-api.us-east-1.amazonaws.com/prod
```

**Note**: Only the endpoint URL is needed - no API key required!

### 2. Start the Application

```bash
cd client
npm run dev
```

The app will start at: **http://localhost:3000**

## 📡 API Integration

### Request Format

Your chatbot sends POST requests to your AWS endpoint:

```json
POST https://your-endpoint.execute-api.us-east-1.amazonaws.com/prod

Headers:
  Content-Type: application/json

Body:
  {
    "query": "user question here"
  }
```

### Response Format

Your backend should return:

```json
{
  "answer": "The answer to the user's question...",
  "citations": [
    {
      "document": "tmpjlhzdsry.pdf",
      "pages": [29],
      "relevance": 0.74
    },
    {
      "document": "tmpjlhzdsry.pdf", 
      "pages": [3],
      "relevance": 0.74
    },
    {
      "document": "tmpjlhzdsry.pdf",
      "pages": [147, 148],
      "relevance": 0.73
    }
  ]
}
```

**Alternative response keys supported:**
- `answer` (preferred)
- `response`
- `message`

**Citations are optional** - if not provided, only the answer will be displayed.

## 🎯 Citations Feature

### Visual Display

Citations are shown as a beautiful table below each AI response:

- **Document Column**: File name with document icon
- **Pages Column**: Page numbers in styled badges
- **Relevance Column**: Visual progress bar + percentage

### Example Citation Display

```
📚 Citations
┌─────────────────────┬──────────────┬─────────────┐
│ Document            │ Pages        │ Relevance   │
├─────────────────────┼──────────────┼─────────────┤
│ 📄 document.pdf     │ [29]         │ ████ 74%    │
│ 📄 document.pdf     │ [3]          │ ████ 74%    │
│ 📄 document.pdf     │ [147] [148]  │ ███▌ 73%    │
└─────────────────────┴──────────────┴─────────────┘
📚 Found 3 relevant sources
```

### Features

- ✅ Hover effects on citation rows
- ✅ Color-coded relevance bars (green gradient)
- ✅ Multiple page support
- ✅ Source count summary
- ✅ Responsive table design

## 📦 Tech Stack

- **React 19** - Latest React with concurrent features
- **TypeScript** - Full type safety
- **Vite** - Lightning-fast build tool
- **Tailwind CSS 3** - Dark theme with custom styling
- **Inter Font** - Professional UI typography
- **JetBrains Mono** - Code and technical content
- **Axios** - HTTP client for API calls
- **React Markdown** - Rich text rendering
- **Lucide Icons** - Beautiful icons

## 🎨 Design Features

### Dark Theme
- **Background**: Deep black (`#0a0a0a`)
- **Glass Effects**: Semi-transparent panels with blur
- **Gradients**: Blue → Purple → Pink accents
- **Smooth Animations**: Fade-in, slide-in effects

### Typography
- **UI**: Inter font family
- **Code**: JetBrains Mono
- **Base Size**: 15px
- **Optimized Spacing**: Professional line-height

### Citations Styling
- **Table**: Dark borders with hover effects
- **Progress Bars**: Green gradient (emerald)
- **Page Badges**: Rounded with dark background
- **Icons**: Blue accents for documents

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run lint
```

## 📁 Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ChatInput.tsx       # Smart input
│   │   ├── Citations.tsx       # NEW: Citations table
│   │   ├── EmptyState.tsx      # Welcome screen
│   │   ├── Header.tsx          # App header
│   │   ├── LoadingIndicator.tsx
│   │   └── Message.tsx         # Messages + Citations
│   ├── services/
│   │   └── api.ts              # API integration
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   ├── App.tsx                 # Main app
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── .env                         # API configuration
└── package.json
```

## 🔧 Configuration

### Environment Variables

Only one variable needed in `.env`:

```env
VITE_API_ENDPOINT=https://your-api.execute-api.us-east-1.amazonaws.com/prod
```

### Customizing Citations

Edit `src/components/Citations.tsx` to customize:
- Table styling
- Progress bar colors
- Page badge appearance
- Icon styles

## 🎯 Features

### Chat Interface
- Real-time messaging
- Markdown support
- Copy-to-clipboard
- Auto-scroll
- Character counter
- Keyboard shortcuts

### Citations
- Automatic citation display
- Document name highlighting
- Multiple page support
- Relevance visualization
- Source count summary
- Responsive table layout

### User Experience
- Welcome screen with examples
- Clickable example questions
- Smooth animations
- Loading indicators
- Error handling
- Chat history persistence

## 📱 Responsive Design

- **Desktop** (1024px+): Full layout with max-width container
- **Tablet** (768px-1023px): Adaptive spacing
- **Mobile** (< 768px): Optimized for touch, scrollable tables

## 🐛 Troubleshooting

### API Not Working

1. Check `.env` file has correct endpoint URL
2. Verify backend is running
3. Open DevTools (F12) → Console for errors
4. Test endpoint with Postman:
   ```bash
   curl -X POST https://your-endpoint.com/prod \
     -H "Content-Type: application/json" \
     -d '{"query": "test question"}'
   ```
5. Check CORS configuration on AWS API Gateway

### Citations Not Showing

1. Verify response includes `citations` array
2. Check citation format matches expected structure
3. Inspect browser console for parsing errors
4. Ensure relevance is a number between 0 and 1

### Build Errors

```bash
cd client
rm -rf node_modules dist
npm install
npm run build
```

## 📊 Response Data Types

### TypeScript Interface

```typescript
interface Citation {
  document: string;      // File name
  pages: number[];       // Array of page numbers
  relevance: number;     // 0.0 to 1.0
}

interface ApiResponse {
  answer: string;        // AI response text
  citations?: Citation[]; // Optional citations
}
```

## 🎨 Customization

### Colors

Edit `tailwind.config.js` for color scheme changes.

### Citation Table

Edit `src/components/Citations.tsx`:
- Change table styling
- Modify progress bar colors
- Customize page badge appearance
- Add/remove columns

### API Format

Edit `src/services/api.ts` to match your exact backend format.

## 📄 License

Proprietary - For Government Use Only

---

**Need help?** Check browser console (F12) for detailed error messages.
