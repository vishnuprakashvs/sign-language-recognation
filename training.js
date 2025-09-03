class TrainingManager {
    constructor(gestureRecognition) {
        this.gestureRecognition = gestureRecognition;
        this.isTraining = false;
        this.currentLabel = '';
        this.trainingFeatures = [];
        this.sampleCount = 0;
        
        this.initializeEvents();
    }

    initializeEvents() {
        const startTrainingBtn = document.getElementById('startTraining');
        const saveModelBtn = document.getElementById('saveModel');
        const loadModelBtn = document.getElementById('loadModel');
        const gestureLabel = document.getElementById('gestureLabel');

        startTrainingBtn.addEventListener('click', () => {
            this.toggleTraining();
        });

        saveModelBtn.addEventListener('click', () => {
            this.saveModel();
        });

        loadModelBtn.addEventListener('click', () => {
            this.loadModel();
        });

        // Auto-uppercase gesture label
        gestureLabel.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    toggleTraining() {
        const gestureLabel = document.getElementById('gestureLabel');
        const startTrainingBtn = document.getElementById('startTraining');
        const recordingIndicator = document.getElementById('recordingIndicator');

        if (!this.isTraining) {
            const label = gestureLabel.value.trim();
            if (!label || label.length !== 1 || !/[A-Z]/.test(label)) {
                alert('Please enter a single letter (A-Z) for the gesture label.');
                return;
            }

            this.startTraining(label);
            startTrainingBtn.textContent = 'Stop Training';
            startTrainingBtn.classList.remove('btn-primary');
            startTrainingBtn.classList.add('btn-secondary');
            recordingIndicator.classList.add('active');
            
        } else {
            this.stopTraining();
            startTrainingBtn.textContent = 'Start Training';
            startTrainingBtn.classList.remove('btn-secondary');
            startTrainingBtn.classList.add('btn-primary');
            recordingIndicator.classList.remove('active');
        }
    }

    startTraining(label) {
        this.isTraining = true;
        this.currentLabel = label;
        console.log(`Started training for gesture: ${label}`);
    }

    stopTraining() {
        this.isTraining = false;
        this.currentLabel = '';
        console.log('Stopped training');
        this.updateTrainingDisplay();
    }

    captureTrainingData(features) {
        if (!this.isTraining || !features) return;

        this.gestureRecognition.addTrainingData(features, this.currentLabel);
        this.sampleCount++;
        
        // Show visual feedback
        this.showCaptureFeedback();
        this.updateTrainingDisplay();
        
        // Auto-stop after collecting enough samples
        if (this.sampleCount >= 50) {
            this.toggleTraining();
            this.showTrainingComplete();
        }
    }

    showCaptureFeedback() {
        const gestureLabel = document.getElementById('gestureLabel');
        const originalBg = gestureLabel.style.backgroundColor;
        
        gestureLabel.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
        setTimeout(() => {
            gestureLabel.style.backgroundColor = originalBg;
        }, 200);
    }

    showTrainingComplete() {
        alert(`Training complete! Collected ${this.sampleCount} samples for gesture "${this.currentLabel}". You can now train the model or continue with another gesture.`);
        this.sampleCount = 0;
    }

    updateTrainingDisplay() {
        const sampleCountEl = document.getElementById('sampleCount');
        const gestureSamplesEl = document.getElementById('gestureSamples');
        
        const totalSamples = this.gestureRecognition.trainingData.length;
        sampleCountEl.textContent = totalSamples;
        
        // Update gesture samples display
        const stats = this.gestureRecognition.getTrainingStats();
        gestureSamplesEl.innerHTML = '';
        
        Object.entries(stats).forEach(([letter, count]) => {
            const sampleDiv = document.createElement('div');
            sampleDiv.className = 'gesture-sample';
            sampleDiv.style.cssText = `
                background: rgba(16, 185, 129, 0.2);
                border: 1px solid rgba(16, 185, 129, 0.4);
                border-radius: 8px;
                padding: 8px 12px;
                color: #10b981;
                font-weight: 600;
                font-size: 0.9rem;
            `;
            sampleDiv.textContent = `${letter}: ${count}`;
            gestureSamplesEl.appendChild(sampleDiv);
        });
    }

    async trainModel() {
        if (this.gestureRecognition.trainingData.length < 10) {
            alert('Please collect at least 10 training samples before training the model.');
            return;
        }

        const startTrainingBtn = document.getElementById('startTraining');
        const saveModelBtn = document.getElementById('saveModel');
        
        // Disable buttons during training
        startTrainingBtn.disabled = true;
        saveModelBtn.disabled = true;
        
        startTrainingBtn.textContent = 'Training...';

        try {
            await this.gestureRecognition.trainModel();
            alert('Model trained successfully! You can now use it for predictions or save it.');
            saveModelBtn.disabled = false;
        } catch (error) {
            alert(`Training failed: ${error.message}`);
        } finally {
            startTrainingBtn.disabled = false;
            startTrainingBtn.textContent = 'Start Training';
        }
    }

    async saveModel() {
        try {
            await this.gestureRecognition.saveModel();
            alert('Model saved successfully! Check your downloads folder.');
        } catch (error) {
            alert(`Save failed: ${error.message}`);
        }
    }

    loadModel() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.json,.bin';
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            
            if (files.length < 2) {
                alert('Please select both model files (.json and .bin) and metadata file.');
                return;
            }
            
            try {
                const fileMap = {};
                files.forEach(file => {
                    if (file.name.includes('model.json')) {
                        fileMap.model = file;
                    } else if (file.name.includes('weights.bin')) {
                        fileMap.weights = file;
                    } else if (file.name.includes('metadata.json')) {
                        fileMap.metadata = file;
                    }
                });
                
                await this.gestureRecognition.loadModel(fileMap);
                this.updateTrainingDisplay();
                alert('Model loaded successfully!');
                
            } catch (error) {
                alert(`Load failed: ${error.message}`);
            }
        };
        
        input.click();
    }

    // Auto-train model when we have enough diverse data
    checkAutoTrain() {
        const stats = this.gestureRecognition.getTrainingStats();
        const uniqueGestures = Object.keys(stats).length;
        const totalSamples = this.gestureRecognition.trainingData.length;
        
        // Auto-train if we have at least 3 different gestures with 10+ samples each
        if (uniqueGestures >= 3 && totalSamples >= 30 && !this.gestureRecognition.model) {
            const autoTrain = confirm('You have collected enough training data. Would you like to train the model now?');
            if (autoTrain) {
                this.trainModel();
            }
        }
    }
}