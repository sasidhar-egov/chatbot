const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// POST /api/gemini - Handles text input and gets response from Gemini API
app.post('/api/gemini', async (req, res) => {
  const { text } = req.body;
  console.log('Received text:', text);

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not set in .env' });
  }

  try {
    // Using the correct Gemini model name and API structure
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { 
                text: `You are Rev, a helpful assistant that only answers questions about Revolt Motors and its products. If asked about anything else, politely redirect the conversation to Revolt Motors.

User: ${text}` 
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the generated text from the response
    const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    console.log('Generated text:', generatedText);
    
    res.json({ 
      response: generatedText,
      fullResponse: response.data // Optional: include full response for debugging
    });

  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error communicating with Gemini API', 
      details: error.response?.data || error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});