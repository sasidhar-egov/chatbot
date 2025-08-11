import React, { useState, useRef, useEffect } from 'react';
import './index.css'; // Import the CSS file
import { Mic } from 'lucide-react';


const VoiceInterface = () => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [status, setStatus] = useState('Click to start');
    const recognitionRef = useRef(null);
    const abortControllerRef = useRef(null);
    const isManuallyStoppedRef = useRef(false);
    const skipAutoRestartRef = useRef(false);
    const [darkMode, setDarkMode] = useState(false);  // <-- dark mode state
    const handleToggleChange = (e) => {
        setDarkMode(e.target.checked);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Start continuous listening using Web Speech API
    const startListening = () => {
        // Don't start if already listening or manually stopped
        if (isListening || isManuallyStoppedRef.current) {
            return;
        }

        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Speech Recognition is not supported in this browser.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            if (!isSpeaking) {
                setStatus('Listening...');
            }
            console.log('Started listening');
        };

        recognition.onend = () => {
            console.log('Recognition ended');
            setIsListening(false);

            if (skipAutoRestartRef.current) {
                console.log('Skipping auto-restart due to recent bot speech end');
                skipAutoRestartRef.current = false; // reset flag for next time
                return;
            }

            if (!isManuallyStoppedRef.current && status !== 'Processing...') {
                console.log('Auto-restarting recognition');
                setTimeout(() => {
                    if (!isManuallyStoppedRef.current) {
                        startListening();
                    }
                }, 300);
            }
        };


        recognition.onerror = (e) => {
            // Ignore aborted errors (they're expected when stopping)
            if (e.error === 'aborted') {
                console.log('Recognition aborted (expected)');
                return;
            }

            console.error('Speech recognition error:', e.error);
            setIsListening(false);

            // Only restart on non-aborted errors
            if (e.error !== 'aborted' && !isManuallyStoppedRef.current) {
                setStatus('Recognition error, restarting...');
                setTimeout(() => startListening(), 1000);
            }
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Interrupt bot if user speaks while bot is speaking
            if (isSpeaking) {
                const userSpeech = interimTranscript.trim() || finalTranscript.trim();
                if (userSpeech.length > 1) {
                    console.log('🛑 INTERRUPTION DETECTED! User said:', userSpeech);

                    // Cancel bot speech immediately
                    window.speechSynthesis.cancel();
                    console.log("speech cnaceled");

                    setIsSpeaking(false);
                    setStatus('Interrupted! Continue speaking...');

                    // Make sure recognition is listening NOW
                    isManuallyStoppedRef.current = false; // allow startListening
                    if (!isListening) {
                        startListening();
                    }

                    return; // Don't process further here
                }
            }


            // Process final transcript only when bot is NOT speaking
            if (finalTranscript.trim() && !isSpeaking) {
                console.log('Processing user input:', finalTranscript.trim());
                handleUserSpeech(finalTranscript.trim());
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    // Stop listening
    const stopListening = () => {
        if (recognitionRef.current) {
            isManuallyStoppedRef.current = true;
            recognitionRef.current.onend = null; // Prevent auto-restart
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setIsListening(false);
            setStatus('Stopped listening');
        }
    };

    // Stop speaking function
    const stopSpeaking = () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setStatus('Click to start');

            console.log('Speech synthesis stopped');
        }
    };

    // Handle user speech with improved interruption
    const handleUserSpeech = async (text) => {
        console.log('Processing user speech:', text);
        setStatus('Processing...');

        // Stop any ongoing speech immediately
        stopSpeaking();

        // Stop listening during processing
        stopListening();

        // Abort any previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

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

            if (data && data.response) {
                speakBot(data.response);
            } else {
                console.error('No response text found in:', data);
                speakBot("Sorry, I didn't receive a proper response.");
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error calling backend:', err);
                speakBot("Sorry, there was an error processing your request.");
            } else {
                // Request was aborted, restart listening
                setTimeout(() => startListening(), 500);
            }
        }
    };

    // FIXED: Enhanced speech synthesis with SINGLE onstart handler
    const speakBot = (text) => {
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            setTimeout(() => startListening(), 500);
            return;
        }

        // Clear any existing speech
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        const utterance = new window.SpeechSynthesisUtterance(text);

        // Voice settings for better experience
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to get a better voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice =>
            voice.lang.includes('en') && voice.name.includes('Google')
        ) || voices.find(voice => voice.lang.includes('en'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        // FIXED: SINGLE onstart handler - no duplicates!
        utterance.onstart = () => {
            console.log('Bot started speaking:', text.substring(0, 50) + '...');
            setIsSpeaking(true);
            setStatus('Speaking... (interrupt anytime)');

            // Start listening IMMEDIATELY for interruptions
            console.log('Starting IMMEDIATE listening for interruptions');
            isManuallyStoppedRef.current = false; // Allow listening to start
            startListening();
        };

        utterance.onend = () => {
            console.log('Bot finished speaking normally');
            setIsSpeaking(false);
            setStatus('Listening...');

            skipAutoRestartRef.current = true; // tell recognition.onend to skip restarting once

            if (!isListening) {
                setTimeout(() => startListening(), 200);
            }
        };


        utterance.onerror = () => {
            setIsSpeaking(false);

            setTimeout(() => startListening(), 500);
        };

        window.speechSynthesis.speak(utterance);
    };

    // Mic button click handler
    const handleMicClick = () => {
        if (isSpeaking) {
            // If speaking, stop and start listening
            stopSpeaking();
            stopListening();
            setStatus('Click to start');


        } else if (isListening) {
            // If listening, stop
            stopListening();
            setStatus('Click to start');
        } else {
            // If idle, start listening
            isManuallyStoppedRef.current = false; // Allow listening to start
            startListening();
        }
    };

    // Get button class based on state
    const getButtonClass = () => {
        if (isSpeaking) return 'mic-button speaking';
        if (isListening) return 'mic-button listening';
        return 'mic-button idle';
    };

    return (
        <div className={`voice-interface-container${darkMode ? ' dark' : ''}`}>
            <div className="revolt-logo">REVOLT</div>

            <div className="toggle-container">
                <span className="toggle-label">Dark Mode</span>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={darkMode}
                        onChange={handleToggleChange}
                        className="toggle-input"
                    />
                    <span className="toggle-slider">
                        <span className="toggle-slider-inner"></span>
                    </span>
                </label>
            </div>

            <div className="main-content">
                {/* The rest remains unchanged */}
                <div className="bot-emoji">🤖</div>
                <div className="talk-title">Talk to Rev</div>

                <button onClick={handleMicClick} className={getButtonClass()}>
                    <Mic className="mic-icon" />


                </button>

                <div className="status-text">{status}</div>

                {(isListening || isSpeaking) && (
                    <div className="hint-text">
                        {isSpeaking ? '🎤 Speak anytime to interrupt' : 'Say something...'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceInterface;
