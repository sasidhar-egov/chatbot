import React, { useState, useRef } from 'react';

const VoiceInterface = () => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recognitionRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Start continuous listening using Web Speech API
    const startListening = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Speech Recognition is not supported in this browser.');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US'; // You can make this dynamic for multi-language

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            // Auto-restart unless we are speaking
            if (!isSpeaking) startListening();
        };
        recognition.onerror = (e) => {
            console.error('Speech recognition error:', e);
            setIsListening(false);
            if (!isSpeaking) {
                // Add a small delay before restarting to prevent rapid restarts
                setTimeout(() => startListening(), 1000);
            }
        };
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join(' ');
            if (transcript.trim()) {
                handleUserSpeech(transcript);
            }
        };
        recognitionRef.current = recognition;
        recognition.start();
    };

    // Stop listening
    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // Handle user speech: stop bot, send to backend, play response
    const handleUserSpeech = async (text) => {
        console.log('User said:', text);

        // If bot is speaking, interrupt
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }

        stopListening();

        // Abort any previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Send to backend
        try {
            const response = await fetch('http://localhost:5000/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Backend response:', data);

            // Updated response handling - the backend now returns the text directly in data.response
            if (data && data.response) {
                const botText = data.response;
                speakBot(botText);
            } else {
                console.error('No response text found in:', data);
                speakBot("Sorry, I didn't receive a proper response.");
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error calling backend:', err);
                speakBot("Sorry, there was an error processing your request.");
            }
        }
    };

    // Speak bot response and return to listening
    const speakBot = (text) => {
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            startListening(); // Still restart listening even if TTS fails
            return;
        }

        const utterance = new window.SpeechSynthesisUtterance(text);

        // Optional: Set voice properties for better experience
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            console.log('Bot started speaking:', text);
            setIsSpeaking(true);
        };

        utterance.onend = () => {
            console.log('Bot finished speaking');
            setIsSpeaking(false);
            startListening(); // Return to listening after speaking
        };

        utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            setIsSpeaking(false);
            startListening();
        };

        window.speechSynthesis.speak(utterance);
    };

    // Initial mic click: start listening
    const handleMicClick = () => {
        if (!isListening) {
            startListening();
        } else {
            stopListening();
        }
    };

    return (
        <div className="center-container">
            <div className="rev-logo">REVOLT</div>
            <div className="toggle-switch">
                <label className="switch">
                    <input type="checkbox" disabled />
                    <span className="slider round"></span>
                </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="bot-logo">🤖</div>
                <div className="talk-title">Talk to Rev</div>
                <button
                    onClick={handleMicClick}
                    className="mic-btn"
                    style={{
                        background: isListening ? '#43a047' : (isSpeaking ? '#ff9800' : '#1976d2'),
                        transition: 'background-color 0.3s ease'
                    }}
                >
                    <svg width="36" height="36" fill="#fff" viewBox="0 0 24 24">
                        <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-2.08A7 7 0 0 0 17 12z" />
                    </svg>
                </button>
                <div style={{ marginTop: 16, color: '#888', fontSize: 16 }}>
                    {isListening ? 'Listening...' : (isSpeaking ? 'Speaking...' : 'Click to start')}
                </div>
            </div>
        </div>
    );
};

export default VoiceInterface;