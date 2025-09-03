class SignLanguageApp {
    constructor() {
        this.handDetection = new HandDetection();
        this.gestureRecognition = new GestureRecognition();
        this.trainingManager = new TrainingManager(this.gestureRecognition);
        this.predictionHistory = [];
        this.maxHistoryLength = 10;
        
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.setupHandDetectionCallback();
        this.updateUI();
    }

    setupEventListeners() {
        const startCameraBtn = document.getElementById('startCamera');
        const stopCameraBtn = document.getElementById('stopCamera');
        const captureGestureBtn = document.getElementById('captureGesture');

        startCameraBtn.addEventListener('click', async () => {
            const success = await this.handDetection.startCamera();
            if (success) {
                startCameraBtn.disabled = true;
                stopCameraBtn.disabled = false;
                captureGestureBtn.disabled = false;
            }
        });

        stopCameraBtn.addEventListener('click', () => {
            this.handDetection.stopDetection();
            startCameraBtn.disabled = false;
            stopCameraBtn.disabled = true;
            captureGestureBtn.disabled = true;
            this.clearPrediction();
        });

        captureGestureBtn.addEventListener('click', () => {
            this.captureCurrentGesture();
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                this.captureCurrentGesture();
            }
        });
    }

    setupHandDetectionCallback() {
        this.handDetection.onResults = (features) => {
            if (features) {
                this.processGestureFeatures(features);
            } else {
                this.clearPrediction();
            }
        };
    }

    processGestureFeatures(features) {
        // Get prediction from gesture recognition
        const prediction = this.gestureRecognition.predict(features);
        
        if (prediction && prediction.confidence > 0.3) {
            this.updatePrediction(prediction.letter, prediction.confidence);
        } else {
            this.clearPrediction();
        }

        // If training mode is active, capture data
        if (this.trainingManager.isTraining) {
            this.trainingManager.captureTrainingData(features);
        }
    }

    updatePrediction(letter, confidence) {
        const predictedLetterEl = document.getElementById('predictedLetter');
        const confidenceFillEl = document.getElementById('confidenceFill');
        const confidencePercentageEl = document.getElementById('confidencePercentage');

        predictedLetterEl.textContent = letter;
        confidenceFillEl.style.width = `${confidence * 100}%`;
        confidencePercentageEl.textContent = `${Math.round(confidence * 100)}%`;

        // Add to history if it's a high-confidence prediction
        if (confidence > 0.6) {
            this.addToHistory(letter, confidence);
        }
    }

    clearPrediction() {
        const predictedLetterEl = document.getElementById('predictedLetter');
        const confidenceFillEl = document.getElementById('confidenceFill');
        const confidencePercentageEl = document.getElementById('confidencePercentage');

        predictedLetterEl.textContent = '-';
        confidenceFillEl.style.width = '0%';
        confidencePercentageEl.textContent = '0%';
    }

    addToHistory(letter, confidence) {
        const timestamp = new Date().toLocaleTimeString();
        const historyItem = {
            letter,
            confidence,
            timestamp
        };

        // Avoid duplicate consecutive entries
        const lastItem = this.predictionHistory[this.predictionHistory.length - 1];
        if (!lastItem || lastItem.letter !== letter) {
            this.predictionHistory.push(historyItem);

            // Limit history length
            if (this.predictionHistory.length > this.maxHistoryLength) {
                this.predictionHistory.shift();
            }

            this.updateHistoryDisplay();
        }
    }

    updateHistoryDisplay() {
        const historyListEl = document.getElementById('historyList');
        
        if (this.predictionHistory.length === 0) {
            historyListEl.innerHTML = '<div class="history-item">Ready to detect gestures...</div>';
            return;
        }

        historyListEl.innerHTML = '';
        
        // Show most recent items first
        const recentHistory = [...this.predictionHistory].reverse();
        
        recentHistory.forEach((item) => {
            const historyItemEl = document.createElement('div');
            historyItemEl.className = 'history-item';
            historyItemEl.innerHTML = `
                <span style="font-weight: 600; color: #fbbf24;">${item.letter}</span>
                <span style="font-size: 0.8rem; opacity: 0.7;">${Math.round(item.confidence * 100)}% - ${item.timestamp}</span>
            `;
            historyListEl.appendChild(historyItemEl);
        });
    }

    captureCurrentGesture() {
        const landmarks = this.handDetection.getCurrentLandmarks();
        if (!landmarks) {
            alert('No hand detected. Please show your hand to the camera.');
            return;
        }

        const features = this.handDetection.extractFeatures(landmarks);
        if (!features) {
            alert('Could not extract features from the current gesture.');
            return;
        }

        // Visual feedback
        const captureBtn = document.getElementById('captureGesture');
        const originalText = captureBtn.textContent;
        captureBtn.textContent = 'Captured!';
        captureBtn.style.background = 'linear-gradient(45deg, #10b981, #059669)';
        
        setTimeout(() => {
            captureBtn.textContent = originalText;
            captureBtn.style.background = 'linear-gradient(45deg, #f59e0b, #d97706)';
        }, 500);

        // Add some visual flair
        this.showCaptureEffect();
    }

    showCaptureEffect() {
        const canvas = document.getElementById('outputCanvas');
        const ctx = canvas.getContext('2d');
        
        // Save current state
        ctx.save();
        
        // Add flash effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Restore after a brief moment
        setTimeout(() => {
            ctx.restore();
        }, 100);
    }

    updateUI() {
        // Update training display
        this.trainingManager.updateTrainingDisplay();
    }

    // Method to get spelled word from history
    getSpelledWord() {
        return this.predictionHistory.map(item => item.letter).join('');
    }

    // Clear history
    clearHistory() {
        this.predictionHistory = [];
        this.updateHistoryDisplay();
    }

    // Get app statistics
    getStats() {
        return {
            totalPredictions: this.predictionHistory.length,
            averageConfidence: this.predictionHistory.length > 0 
                ? this.predictionHistory.reduce((sum, item) => sum + item.confidence, 0) / this.predictionHistory.length 
                : 0,
            uniqueLetters: new Set(this.predictionHistory.map(item => item.letter)).size,
            trainingData: this.gestureRecognition.getTrainingStats()
        };
    }
}

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('🤟 Sign Language Recognition System Starting...');
    window.signLanguageApp = new SignLanguageApp();
    console.log('✅ Application initialized successfully!');
});

// Add some helpful console commands for debugging
window.debugCommands = {
    getStats: () => window.signLanguageApp?.getStats(),
    clearHistory: () => window.signLanguageApp?.clearHistory(),
    getWord: () => window.signLanguageApp?.getSpelledWord(),
    trainModel: () => window.signLanguageApp?.trainingManager.trainModel()
};

console.log('Debug commands available:', Object.keys(window.debugCommands));