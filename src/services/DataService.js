import { showSwal } from '../utils/swal'; 

// Geolocation and selfie capture are disabled; return a placeholder location.
export const getCurrentLocation = () => Promise.resolve({ coordinates: '-', address: 'Location capture disabled' });

// Handle the overall attendance flow without camera or location requirements.
export const handleAttendanceClock = async (user, type) => {
    const normalizedType = type === 'Clock In' || type === 'In' ? 'Clock In' : 'Clock Out';
    const action = normalizedType === 'Clock In' ? 'IN' : 'OUT';

    try {
        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const dateString = now.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const isLate = normalizedType === 'Clock In' && (now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 0));

        const newRecord = { 
            id: Date.now(), 
            date: dateString, 
            type: normalizedType, 
            time: timeString, 
            location: 'Attendance recorded (location disabled)', 
            late: isLate, 
            photo: null 
        };
        
        const newPhotoRecord = { 
            id: Date.now(), 
            date: dateString, 
            time: timeString, 
            type: normalizedType, 
            photo: null, 
            location: 'Attendance recorded (location disabled)', 
            employeeId: user.id, 
            employeeName: user.name, 
            division: user.division || 'N/A', 
            employeeEmail: user.email || 'N/A', 
            employeePhone: user.phone || 'N/A', 
        };
        
        showSwal( 
            'Attendance Successful!', 
            `You successfully <strong>Clock ${action}</strong> at <strong>${timeString}</strong>.`, 
            'success', 
            2500 
        );

        return { success: true, newRecord, newPhotoRecord };

    } catch (error) {
        console.error('Error handling attendance clock:', error);
        showSwal(
            'Attendance Failed!',
            'There was a problem processing your attendance. Please try again later.',
            'error',
            3000
        );
        return { success: false, error };
    }
};

// Additional service helpers (updateEmployeeProfile, approveLeave, etc.) can live here later.
export default {
    getCurrentLocation,
    handleAttendanceClock,
};
