// src/ml/models.js
import * as tf from '@tensorflow/tfjs'; 
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl'; 
import '@mediapipe/face_mesh';
import { showSwal } from '../utils/swal'; // NEW PATH

let detector = null;

/**
 * Load the face detection model (TensorFlow.js MediaPipeFaceMesh).
 * The model follows a singleton pattern and is created once.
 */
export const loadFaceDetectionModel = async (setIsLoading) => {
    if (detector) return detector;
    
    setIsLoading(true);
    showSwal('Loading AI Model', 'Preparing the face detection model (TensorFlow.js)... This may take a few seconds.', 'info', 0);
    
    try {
        await tf.setBackend('webgl'); // Best backend for performance
        
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
            runtime: 'mediapipe',
            maxFaces: 1,
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/',
             // Solution path is required if the bundler cannot copy assets (e.g., CRA default)
             };
        
        detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
        setIsLoading(false);
        if (typeof Swal !== 'undefined' && Swal.isVisible()) Swal.close(); // Close the loading dialog
        return detector;
        
    } catch (error) {
        console.error("Failed to load face detection model:", error);
        setIsLoading(false);
        if (typeof Swal !== 'undefined' && Swal.isVisible()) Swal.close();
        showSwal('Failed to Load AI', 'Face detection model could not be loaded. Attendance may not work. Please refresh.', 'error', 0);
        return null;
    }
};

/**
 * Detect a face using the detector instance.
 */
export const detectFace = async (detectorInstance, video) => {
    console.log("🚀 Starting face detection...");
    // Ensure the detector and video source are ready
    if (!detectorInstance || !video || video.readyState !== 4) return null;
    
    try {
        // Detection logic carried over from the previous App.jsx implementation
        const faces = await detectorInstance.estimateFaces(video, { flipHorizontal: true });
        console.log("📸 Detection result:", faces.length);
        return faces.length > 0 ? faces[0] : null; // Return the first detected face
    } catch (e) {
        console.error("Error during face estimation:", e);
        return null;
    }
};
