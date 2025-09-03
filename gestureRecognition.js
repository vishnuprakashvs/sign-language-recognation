class GestureRecognition {
    constructor() {
        this.model = null;
        this.isTraining = false;
        this.trainingData = [];
        this.labels = [];
        this.labelMap = new Map();
        this.reverseMap = new Map();
        this.currentPrediction = null;
        this.confidence = 0;
        
        // Initialize with basic ASL gestures
        this.initializeBasicModel();
    }

    initializeBasicModel() {
        // Create basic rules for common ASL letters
        this.basicRules = {
            'A': (features) => this.detectA(features),
            'B': (features) => this.detectB(features),
            'C': (features) => this.detectC(features),
            'D': (features) => this.detectD(features),
            'L': (features) => this.detectL(features),
            'O': (features) => this.detectO(features),
            'Y': (features) => this.detectY(features)
        };
    }

    // Rule-based detection for basic gestures
    detectA(features) {
        if (!features || features.length < 63) return 0;
        
        // A: Closed fist with thumb extended
        const thumbTip = this.getFingerPosition(features, 0); // Thumb
        const indexTip = this.getFingerPosition(features, 1); // Index
        const middleTip = this.getFingerPosition(features, 2); // Middle
        
        // Check if fingers are closed (low distance from base)
        const indexClosed = this.getFingerDistance(features, 1) < 0.15;
        const middleClosed = this.getFingerDistance(features, 2) < 0.15;
        const ringClosed = this.getFingerDistance(features, 3) < 0.15;
        const pinkyClosed = this.getFingerDistance(features, 4) < 0.15;
        
        if (indexClosed && middleClosed && ringClosed && pinkyClosed) {
            return 0.8;
        }
        return 0.1;
    }

    detectB(features) {
        if (!features || features.length < 63) return 0;
        
        // B: Four fingers extended upward, thumb folded
        const indexExtended = this.getFingerDistance(features, 1) > 0.2;
        const middleExtended = this.getFingerDistance(features, 2) > 0.2;
        const ringExtended = this.getFingerDistance(features, 3) > 0.2;
        const pinkyExtended = this.getFingerDistance(features, 4) > 0.2;
        const thumbFolded = this.getFingerDistance(features, 0) < 0.15;
        
        if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbFolded) {
            return 0.75;
        }
        return 0.1;
    }

    detectC(features) {
        if (!features || features.length < 63) return 0;
        
        // C: Curved hand forming C shape
        const curvature = this.calculateCurvature(features);
        if (curvature > 0.3 && curvature < 0.8) {
            return 0.7;
        }
        return 0.1;
    }

    detectD(features) {
        if (!features || features.length < 63) return 0;
        
        // D: Index finger extended, others closed
        const indexExtended = this.getFingerDistance(features, 1) > 0.2;
        const middleClosed = this.getFingerDistance(features, 2) < 0.15;
        const ringClosed = this.getFingerDistance(features, 3) < 0.15;
        const pinkyClosed = this.getFingerDistance(features, 4) < 0.15;
        
        if (indexExtended && middleClosed && ringClosed && pinkyClosed) {
            return 0.75;
        }
        return 0.1;
    }

    detectL(features) {
        if (!features || features.length < 63) return 0;
        
        // L: Index and thumb extended forming L
        const indexExtended = this.getFingerDistance(features, 1) > 0.2;
        const thumbExtended = this.getFingerDistance(features, 0) > 0.15;
        const middleClosed = this.getFingerDistance(features, 2) < 0.15;
        const ringClosed = this.getFingerDistance(features, 3) < 0.15;
        const pinkyClosed = this.getFingerDistance(features, 4) < 0.15;
        
        // Check angle between thumb and index
        const angle = this.getFingerAngle(features, 0, 1);
        const rightAngle = Math.abs(angle - Math.PI/2) < 0.5;
        
        if (indexExtended && thumbExtended && middleClosed && ringClosed && pinkyClosed && rightAngle) {
            return 0.8;
        }
        return 0.1;
    }

    detectO(features) {
        if (!features || features.length < 63) return 0;
        
        // O: All fingers curved forming circle
        const curvature = this.calculateCurvature(features);
        const allFingersMoved = this.getFingerDistance(features, 1) > 0.1 &&
                               this.getFingerDistance(features, 2) > 0.1 &&
                               this.getFingerDistance(features, 3) > 0.1 &&
                               this.getFingerDistance(features, 4) > 0.1;
        
        if (curvature > 0.6 && curvature < 0.9 && allFingersMoved) {
            return 0.7;
        }
        return 0.1;
    }

    detectY(features) {
        if (!features || features.length < 63) return 0;
        
        // Y: Thumb and pinky extended
        const thumbExtended = this.getFingerDistance(features, 0) > 0.15;
        const pinkyExtended = this.getFingerDistance(features, 4) > 0.15;
        const indexClosed = this.getFingerDistance(features, 1) < 0.15;
        const middleClosed = this.getFingerDistance(features, 2) < 0.15;
        const ringClosed = this.getFingerDistance(features, 3) < 0.15;
        
        if (thumbExtended && pinkyExtended && indexClosed && middleClosed && ringClosed) {
            return 0.75;
        }
        return 0.1;
    }

    // Helper methods for feature extraction
    getFingerPosition(features, fingerIndex) {
        const tipIndices = [4, 8, 12, 16, 20];
        const tipIndex = tipIndices[fingerIndex] * 3;
        return {
            x: features[tipIndex],
            y: features[tipIndex + 1],
            z: features[tipIndex + 2] || 0
        };
    }

    getFingerDistance(features, fingerIndex) {
        const tipIndices = [4, 8, 12, 16, 20];
        const baseIndices = [2, 5, 9, 13, 17];
        
        const tipIndex = tipIndices[fingerIndex] * 3;
        const baseIndex = baseIndices[fingerIndex] * 3;
        
        const tipX = features[tipIndex];
        const tipY = features[tipIndex + 1];
        const baseX = features[baseIndex];
        const baseY = features[baseIndex + 1];
        
        return Math.sqrt(Math.pow(tipX - baseX, 2) + Math.pow(tipY - baseY, 2));
    }

    getFingerAngle(features, finger1, finger2) {
        const pos1 = this.getFingerPosition(features, finger1);
        const pos2 = this.getFingerPosition(features, finger2);
        
        return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
    }

    calculateCurvature(features) {
        if (!features || features.length < 63) return 0;
        
        let totalCurvature = 0;
        const fingerTips = [4, 8, 12, 16, 20];
        
        fingerTips.forEach((tipIndex) => {
            const baseIndex = tipIndex === 4 ? 2 : tipIndex - 3;
            const midIndex = tipIndex - 1;
            
            const tip = {
                x: features[tipIndex * 3],
                y: features[tipIndex * 3 + 1]
            };
            const mid = {
                x: features[midIndex * 3],
                y: features[midIndex * 3 + 1]
            };
            const base = {
                x: features[baseIndex * 3],
                y: features[baseIndex * 3 + 1]
            };
            
            // Calculate angle at mid point
            const angle1 = Math.atan2(base.y - mid.y, base.x - mid.x);
            const angle2 = Math.atan2(tip.y - mid.y, tip.x - mid.x);
            const angleDiff = Math.abs(angle2 - angle1);
            
            totalCurvature += Math.min(angleDiff, 2 * Math.PI - angleDiff);
        });
        
        return totalCurvature / fingerTips.length;
    }

    predict(features) {
        if (!features) {
            this.currentPrediction = null;
            this.confidence = 0;
            return null;
        }

        let bestPrediction = null;
        let bestConfidence = 0;

        // Try rule-based detection first
        for (const [letter, detector] of Object.entries(this.basicRules)) {
            const confidence = detector(features);
            if (confidence > bestConfidence && confidence > 0.5) {
                bestConfidence = confidence;
                bestPrediction = letter;
            }
        }

        // Use trained model if available
        if (this.model && this.trainingData.length > 0) {
            try {
                const tensor = tf.tensor2d([features]);
                const prediction = this.model.predict(tensor);
                const probabilities = prediction.dataSync();
                tensor.dispose();
                prediction.dispose();

                const maxIndex = probabilities.indexOf(Math.max(...probabilities));
                const mlConfidence = probabilities[maxIndex];
                const mlPrediction = this.reverseMap.get(maxIndex);

                if (mlConfidence > bestConfidence) {
                    bestConfidence = mlConfidence;
                    bestPrediction = mlPrediction;
                }
            } catch (error) {
                console.warn('ML prediction failed:', error);
            }
        }

        this.currentPrediction = bestPrediction;
        this.confidence = bestConfidence;

        return {
            letter: bestPrediction,
            confidence: bestConfidence
        };
    }

    addTrainingData(features, label) {
        if (!features || !label) return;

        this.trainingData.push([...features]);
        this.labels.push(label.toUpperCase());

        // Update label mappings
        if (!this.labelMap.has(label.toUpperCase())) {
            const index = this.labelMap.size;
            this.labelMap.set(label.toUpperCase(), index);
            this.reverseMap.set(index, label.toUpperCase());
        }

        console.log(`Added training sample for ${label.toUpperCase()}. Total samples: ${this.trainingData.length}`);
    }

    async trainModel() {
        if (this.trainingData.length < 10) {
            throw new Error('Need at least 10 training samples');
        }

        this.isTraining = true;

        try {
            // Prepare data
            const xs = tf.tensor2d(this.trainingData);
            const ys = tf.oneHot(this.labels.map(label => this.labelMap.get(label)), this.labelMap.size);

            // Create model
            this.model = tf.sequential({
                layers: [
                    tf.layers.dense({
                        inputShape: [this.trainingData[0].length],
                        units: 128,
                        activation: 'relu'
                    }),
                    tf.layers.dropout({ rate: 0.3 }),
                    tf.layers.dense({
                        units: 64,
                        activation: 'relu'
                    }),
                    tf.layers.dropout({ rate: 0.3 }),
                    tf.layers.dense({
                        units: this.labelMap.size,
                        activation: 'softmax'
                    })
                ]
            });

            // Compile model
            this.model.compile({
                optimizer: 'adam',
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            // Train model
            await this.model.fit(xs, ys, {
                epochs: 50,
                batchSize: 8,
                validationSplit: 0.2,
                shuffle: true,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
                    }
                }
            });

            // Clean up tensors
            xs.dispose();
            ys.dispose();

            console.log('Model training completed!');
            this.isTraining = false;
            return true;

        } catch (error) {
            console.error('Training failed:', error);
            this.isTraining = false;
            throw error;
        }
    }

    async saveModel() {
        if (!this.model) {
            throw new Error('No model to save');
        }

        try {
            await this.model.save('downloads://gesture-model');
            
            // Also save metadata
            const metadata = {
                labelMap: Object.fromEntries(this.labelMap),
                trainingData: this.trainingData,
                labels: this.labels
            };
            
            const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'gesture-model-metadata.json';
            a.click();
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            throw error;
        }
    }

    async loadModel(files) {
        try {
            // Load model
            if (files.model && files.weights && files.metadata) {
                this.model = await tf.loadLayersModel(tf.io.browserFiles([files.model, files.weights]));
                
                // Load metadata
                const metadataText = await files.metadata.text();
                const metadata = JSON.parse(metadataText);
                
                this.trainingData = metadata.trainingData || [];
                this.labels = metadata.labels || [];
                this.labelMap = new Map(Object.entries(metadata.labelMap || {}));
                this.reverseMap = new Map();
                this.labelMap.forEach((value, key) => {
                    this.reverseMap.set(value, key);
                });
                
                console.log('Model loaded successfully!');
                return true;
            }
            
            throw new Error('Missing required model files');
        } catch (error) {
            console.error('Load failed:', error);
            throw error;
        }
    }

    getTrainingStats() {
        const stats = {};
        this.labels.forEach(label => {
            stats[label] = (stats[label] || 0) + 1;
        });
        return stats;
    }

    clearTrainingData() {
        this.trainingData = [];
        this.labels = [];
        this.labelMap.clear();
        this.reverseMap.clear();
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
    }
}