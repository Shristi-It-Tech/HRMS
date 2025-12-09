// src/pages/Dashboard/OwnerDashboard/OwnerDashboard.jsx
import React, { useState } from 'react';
import { showSwal } from '../../../utils/swal.js';

// ✨ Import SEMUA Sub-Komponen dari folder yang SAMA (OwnerDashboard/)
import OwnerSummary from './OwnerSummary.jsx'; 
import OwnerEmployeeManagement from './OwnerEmployeeManagement.jsx';
import OwnerManagerManagement from './OwnerManagerManagement.jsx';
import OwnerSupervisorManagement from './OwnerSupervisorManagement.jsx';
import OwnerMonthlyTarget from './OwnerMonthlyTarget.jsx';
import OwnerEmployeePerformance from './OwnerEmployeePerformance.jsx';
import OwnerPayrollReport from './OwnerPayrollReport.jsx';
import OwnerAttendanceDetailReport from './OwnerAttendanceDetailReport.jsx';
import OwnerAttendanceReport from './OwnerAttendanceReport.jsx';
import TimesheetsPage from '../../../components/Absensi/TimesheetsPage.jsx';
import ProjectAdmin from '../../../components/Projects/ProjectAdmin.jsx';

const OwnerDashboard = (props) => {
    // Memecah props dari App.jsx
    const { user, managers, setManagers, employees, setEmployees, activeTab = 'summary', onTabChange = () => {} } = props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const [supervisors, setSupervisors] = useState([]);

    // Combine all required props for sub-components
    const allProps = { 
        user,
        managers, 
        setManagers, 
        employees, 
        setEmployees, 
        supervisors, 
        setSupervisors 
    };

    // Tabs configuration
    const tabs = [
        { id: 'summary', label: 'Summary', icon: 'fa-chart-bar' },
        { id: 'emp', label: 'Employees', icon: 'fa-users' },
        { id: 'manager', label: 'Manager', icon: 'fa-user-tie' },
        { id: 'supervisor', label: 'Supervisor', icon: 'fa-user-shield' },
        { id: 'target', label: 'Target', icon: 'fa-crosshairs' },
        { id: 'performance', label: 'Performance', icon: 'fa-chart-line' },
        { id: 'payroll', label: 'Payroll', icon: 'fa-file-invoice-dollar' },
        { id: 'timesheets', label: 'Timesheets', icon: 'fa-clock' }
        ,{ id: 'projects', label: 'Projects', icon: 'fa-briefcase' }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'summary': return <OwnerSummary {...allProps} />;
            case 'emp': return <OwnerEmployeeManagement {...allProps} />;
            case 'manager': return <OwnerManagerManagement {...allProps} />;
            case 'supervisor': return <OwnerSupervisorManagement {...allProps} />;
            case 'target': return <OwnerMonthlyTarget {...allProps} />;
            case 'performance': return <OwnerEmployeePerformance {...allProps} />;
            case 'payroll': return <OwnerPayrollReport {...allProps} />;
            case 'timesheets': return <TimesheetsPage />;
            case 'projects': return <ProjectAdmin />;
            default: return <OwnerSummary {...allProps} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#D3DFFE] pt-16 lg:pt-22">
            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-20 left-4 z-50">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="bg-[#19183B] backdrop-blur-2xl rounded-2xl p-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border border-white/20 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.25)] transition-all duration-300"
                >
                    <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'} text-gray-700/90`}></i>
                </button>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="container mx-auto px-3 sm:px-4 py-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Sidebar */}
                    <div className={`
                        lg:w-64 transform transition-all duration-300 ease-in-out
                        ${sidebarOpen 
                            ? 'translate-x-0 opacity-100' 
                            : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'
                        }
                        fixed lg:static left-0 top-20 h-full lg:h-auto z-40 w-64 lg:w-auto
                    `}>
                        <div className="bg-white/30 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] p-4 lg:sticky lg:top-24 border border-white/20 h-full lg:h-auto overflow-y-auto">
                            {/* Close button for mobile */}
                            <div className="flex justify-between items-center mb-6 lg:hidden">
                                <h3 className="text-lg font-semibold text-gray-800/90">Owner Menu</h3>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-2 rounded-2xl hover:bg-white/20 transition-all duration-200"
                                >
                                    <i className="fas fa-times text-gray-600/80"></i>
                                </button>
                            </div>

                            {/* User Info */}
                            <div className="flex items-center mb-6 p-3 bg-white/20 backdrop-blur-xl backdrop-blur-xl rounded-2xl border border-white/30 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] text-left ">
                                <div className="relative">
                                    <img
                                        src={user?.profileImage || 'https://picsum.photos/seed/owner/48/48.jpg'}
                                        alt="Profile"
                                        className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-[0_4px_16px_0_rgba(31,38,135,0.2)]"
                                    />                
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-semibold text-gray-600/80 truncate max-w-[120px]">{user?.name || 'Owner'}</p>
                                    <p className="text-xs text-gray-600/80 capitalize">
                                        {user?.role?.toUpperCase() || 'OWNER'}
                                    </p>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="space-y-2 ">
                                {tabs.map((tab) => (
                                    <button
                                        type="button"
                                        key={tab.id}
                                        onClick={() => {
                                            onTabChange(tab.id);
                                            setSidebarOpen(false);
                                        }}
                                        className={`w-full flex items-center px-4 py-3 rounded-xl focus:outline-none ${
                                            activeTab === tab.id
                                                ? 'bg-[#708993] text-white shadow-md'
                                                : 'text-black'
                                        }`}
                                    >
                                        <i className={`fas ${tab.icon} mr-3 text-sm ${activeTab === tab.id ? 'text-white' : 'text-black-500'}`}></i>
                                        <span className={`text-sm font-medium ${activeTab === tab.id ? 'text-white' : 'text-gray-700'}`}>{tab.label}</span>
                                        {activeTab === tab.id && (
                                            <i className="fas fa-chevron-right ml-auto text-xs text-white"></i>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Quick Stats */}
                            <div className="mt-6 pt-4 border-t border-white/20">
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="bg-green-400/20 backdrop-blur-xl rounded-2xl p-2 border border-white/30 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)]">
                                        <i className="fas fa-building text-green-500/80 text-sm"></i>
                                        <p className="text-xs text-gray-600/80 mt-1">Company</p>
                                    </div>
                                    <div className="bg-blue-400/20 backdrop-blur-xl rounded-2xl p-2 border border-white/30 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)]">
                                        <i className="fas fa-chart-line text-blue-500/80 text-sm"></i>
                                        <p className="text-xs text-gray-600/80 mt-1">Active</p>
                                    </div>
                                </div>
                            </div>

                            {/* Current Date */}
                            <div className="mt-4 p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)]">
                                <p className="text-xs text-gray-600/80 text-center">
                                    {new Date().toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 lg:ml-0">
                        <div className="bg-white/30 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] p-4 sm:p-6 border border-white/20 min-h-[calc(100vh-6rem)]">
                            {/* Content Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800/90 tracking-tight text-left">
                                        {tabs.find(tab => tab.id === activeTab)?.label || 'Owner Dashboard'}
                                    </h2>
                                    <p className="text-sm text-gray-600/80 mt-1 text-left">
                                        HRIS company management control panel
                                    </p>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="mt-4">
                                {renderTabContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
