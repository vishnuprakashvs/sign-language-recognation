class HandDetection {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.videoElement = document.getElementById('videoElement');
        this.outputCanvas = document.getElementById('outputCanvas');
        this.canvasCtx = this.outputCanvas.getContext('2d');
        this.isDetecting = false;
        this.onResults = null;
        this.landmarks = null;
        
        this.initializeHands();
    }

    initializeHands() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => {
            this.processResults(results);
        });
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: 640, 
                    height: 480,
                    facingMode: 'user'
                }
            });
            
            this.videoElement.srcObject = stream;
            this.videoElement.onloadedmetadata = () => {
                this.setupCanvas();
                this.startDetection();
            };
            
            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera. Please make sure you have granted camera permissions.');
            return false;
        }
    }

    setupCanvas() {
        const video = this.videoElement;
        this.outputCanvas.width = video.videoWidth;
        this.outputCanvas.height = video.videoHeight;
        this.outputCanvas.style.width = '100%';
        this.outputCanvas.style.height = '100%';
    }

    startDetection() {
        if (this.isDetecting) return;
        
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 640,
            height: 480
        });
        
        this.camera.start();
        this.isDetecting = true;
    }

    stopDetection() {
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }
        
        if (this.videoElement.srcObject) {
            const tracks = this.videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
        
        this.isDetecting = false;
        this.clearCanvas();
    }

    processResults(results) {
        // Clear canvas
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.landmarks = results.multiHandLandmarks[0];
            
            // Draw hand landmarks
            this.drawHandLandmarks(results.multiHandLandmarks[0]);
            
            // Extract features for gesture recognition
            const features = this.extractFeatures(results.multiHandLandmarks[0]);
            
            // Trigger callback if set
            if (this.onResults) {
                this.onResults(features);
            }
        } else {
            this.landmarks = null;
            if (this.onResults) {
                this.onResults(null);
            }
        }
        
        this.canvasCtx.restore();
    }

    drawHandLandmarks(landmarks) {
        // Draw landmarks
        this.canvasCtx.fillStyle = '#00ff00';
        this.canvasCtx.strokeStyle = '#00ff00';
        this.canvasCtx.lineWidth = 2;

        // Draw points
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * this.outputCanvas.width;
            const y = landmark.y * this.outputCanvas.height;
            
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
            this.canvasCtx.fill();
            
            // Add landmark number
            this.canvasCtx.fillStyle = '#ffffff';
            this.canvasCtx.font = '10px Arial';
            this.canvasCtx.fillText(index.toString(), x + 5, y - 5);
            this.canvasCtx.fillStyle = '#00ff00';
        });

        // Draw hand connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],  // Index
            [5, 9], [9, 10], [10, 11], [11, 12], // Middle
            [9, 13], [13, 14], [14, 15], [15, 16], // Ring
            [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [0, 17] // Palm
        ];

        this.canvasCtx.strokeStyle = '#ff6b6b';
        this.canvasCtx.lineWidth = 2;
        
        connections.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end]) {
                const startX = landmarks[start].x * this.outputCanvas.width;
                const startY = landmarks[start].y * this.outputCanvas.height;
                const endX = landmarks[end].x * this.outputCanvas.width;
                const endY = landmarks[end].y * this.outputCanvas.height;
                
                this.canvasCtx.beginPath();
                this.canvasCtx.moveTo(startX, startY);
                this.canvasCtx.lineTo(endX, endY);
                this.canvasCtx.stroke();
            }
        });
    }

    extractFeatures(landmarks) {
        if (!landmarks || landmarks.length < 21) return null;

        const features = [];
        
        // Normalize landmarks relative to wrist (index 0)
        const wrist = landmarks[0];
        
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            features.push(landmark.x - wrist.x);
            features.push(landmark.y - wrist.y);
            features.push(landmark.z || 0);
        }
        
        // Add finger distances and angles
        const fingerTips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
        const fingerBases = [2, 5, 9, 13, 17]; // Finger base joints
        
        fingerTips.forEach((tip, index) => {
            const base = fingerBases[index];
            const tipPoint = landmarks[tip];
            const basePoint = landmarks[base];
            
            // Distance from base to tip
            const distance = Math.sqrt(
                Math.pow(tipPoint.x - basePoint.x, 2) +
                Math.pow(tipPoint.y - basePoint.y, 2)
            );
            features.push(distance);
            
            // Angle relative to wrist
            const angle = Math.atan2(
                tipPoint.y - wrist.y,
                tipPoint.x - wrist.x
            );
            features.push(angle);
        });
        
        return features;
    }

    getCurrentLandmarks() {
        return this.landmarks;
    }

    clearCanvas() {
        if (this.canvasCtx) {
            this.canvasCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        }
    }
}