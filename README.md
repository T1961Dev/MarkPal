# Marking AI V2

A modern, AI-powered exam marking assistant that helps students get instant feedback on their answers.

## Features

- **Image Upload Support**: Upload images of exam questions and mark schemes for automatic text extraction
- **AI-Powered Analysis**: Get detailed feedback on your answers using OpenAI's GPT-4
- **Interactive UI**: Beautiful, modern interface with smooth animations
- **Real-time Feedback**: Instant analysis with highlighted strengths and weaknesses
- **Multi-modal Input**: Support for both text input and image uploads

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file in the app directory with:
   ```env
   # OpenAI Configuration (Required for AI analysis)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Supabase Configuration (Optional, for user authentication)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Get OpenAI API Key**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Add it to your `.env.local` file

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Usage

1. **Upload or Enter Question**: Either type your exam question or upload an image of it
2. **Upload or Enter Mark Scheme**: Provide the official mark scheme or upload an image
3. **Write Your Answer**: Enter your response to the question
4. **Get AI Feedback**: Receive detailed analysis with scores and improvement suggestions

## How It Works

- **Image Processing**: Uses OpenAI's GPT-4 Vision to extract text from uploaded images
- **AI Analysis**: Compares your answer against the mark scheme using advanced language models
- **Smart Scoring**: Provides accurate scores based on mark scheme criteria
- **Detailed Feedback**: Highlights strengths, weaknesses, and specific improvement areas

## Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **AI**: OpenAI GPT-4 (Vision + Text)
- **Authentication**: Supabase (optional)
- **Styling**: Custom CSS with modern design system

## API Endpoints

- `POST /api/analyze` - Analyzes student answers using AI

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
