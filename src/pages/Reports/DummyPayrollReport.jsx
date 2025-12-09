import React, { useState, useRef, useEffect } from 'react';
import { Camera, ClipboardList, TrendingUp, DollarSign, X } from 'lucide-react';

// Dummy data to simulate payroll report entries
const dummyReports = [
    { id: 1, name: 'Bambang Sudarsono', role: 'Manager', salary: 15000000, deductions: 1200000, net: 13800000, status: 'Completed' },
    { id: 2, name: 'Siti Nurhaliza', role: 'Marketing Staff', salary: 7500000, deductions: 500000, net: 7000000, status: 'Pending' },
    { id: 3, name: 'Joko Widodo', role: 'IT Support Staff', salary: 8200000, deductions: 650000, net: 7550000, status: 'Completed' },
];

// Formats a number into Indonesian Rupiah currency
const formatRupiah = (number) => {
    if (number === undefined || number === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(number);
};

// Main component (named `App` previously for sandbox compatibility)
const ManagerReports = () => {
    const [reports, setReports] = useState(dummyReports);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraStatus, setCameraStatus] = useState('Idle: Click the button to start attendance.');
    const videoRef = useRef(null);
    const streamRef = useRef(null); // Keep a reference so the stream can be stopped

    // Start the camera stream
    const startCamera = async () => {
        // Validate if MediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraStatus('Failed: This browser does not support camera access (MediaDevices API not found).');
            setIsCameraActive(false);
            return;
        }
        
        setCameraStatus('Requesting camera access...');
        setIsCameraActive(true);

        try {
            // Request video feed with an ideal resolution
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 640 }, 
                    height: { ideal: 480 }
                } 
            });
            
            // Display the stream on the <video> element
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Ensure playback starts
                videoRef.current.play().catch(e => console.error("Video play failed:", e));
            }
            streamRef.current = stream; // Keep stream reference
            setCameraStatus('Live camera feed is active. Time to check in!');

        } catch (error) {
            console.error("Failed to access camera:", error);
            setIsCameraActive(false);
            
            let errorMessage = 'An unexpected error occurred while starting the camera.';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Access Failed: Please allow camera usage (permission denied by browser).';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'Failed: No camera devices were found on this device.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Failed: The camera is currently used by another application.';
            }

            setCameraStatus(errorMessage);
        }
    };

    // Stop the camera stream
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
        setCameraStatus('Camera access stopped.');
    };

    // Clean up the stream on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // Toggle handler for the camera/attendance button
    const handlePresensiClick = () => {
        if (!isCameraActive) {
            startCamera();
        } else {
            stopCamera();
        }
    };

    // Card component to display the camera status and controls
    const CameraCard = () => (
        <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-3 text-indigo-700 flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                Attendance System
            </h3>
            
            <button
                onClick={handlePresensiClick}
                className={`w-full py-3 px-4 mb-3 rounded-lg font-bold transition duration-300 transform hover:scale-[1.02] ${
                    isCameraActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                }`}
            >
                {isCameraActive ? 'Stop Camera' : 'Start Attendance (Camera Access)'}
            </button>

            {/* Video element for showing the camera feed */}
            {/* Aspect ratio is locked to keep the preview stable */}
            <div className={`w-full aspect-video overflow-hidden rounded-lg bg-gray-900 border-4 border-gray-700 transition-all duration-300 ${isCameraActive ? 'block' : 'hidden'}`}>
                {isCameraActive && (
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }} // Mirror the video feed
                    />
                )}
            </div>

            {/* Informative camera status */}
            <p className={`mt-4 text-sm font-medium text-center p-2 rounded-lg w-full ${
                cameraStatus.includes('Access Failed') || cameraStatus.includes('Failed:') || cameraStatus.toLowerCase().includes('no camera')
                    ? 'bg-red-100 text-red-700' 
                    : isCameraActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
                {cameraStatus}
            </p>
            {(cameraStatus.toLowerCase().includes('permission denied') || cameraStatus.toLowerCase().includes('not support')) && (
                <p className="text-xs text-red-500 mt-1 text-center">
                    Please allow camera permissions in the browser pop-up or verify your device settings.
                </p>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                    <ClipboardList className="w-8 h-8 mr-2 text-indigo-600" />
                    Employee Payroll & Access System
                </h1>
                <p className="text-gray-500">Dummy data for payroll reports and integrated camera attendance.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Camera & attendance */}
                <div className="lg:col-span-1">
                    <CameraCard />
                </div>

                {/* Column 2: Payroll summary */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
                            <TrendingUp className="w-6 h-6 mr-2 text-green-600" />
                            Payroll Report Summary (October 2025 Period)
                        </h2>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Employee Name', 'Position', 'Base Salary', 'Deductions', 'Net Salary', 'Status'].map(header => (
                                            <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reports.map((report) => (
                                        <tr key={report.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.role}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{formatRupiah(report.salary)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">{formatRupiah(report.deductions)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-bold">{formatRupiah(report.net)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    report.status === 'Completed' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
                This data is for demo purposes and the camera feed relies on the Web Media API.
            </footer>
        </div>
    );
};

export default ManagerReports;
