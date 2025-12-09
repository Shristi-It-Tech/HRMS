// src/App.jsx (patch)
import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth.js'; // PATH BARU
import Header from './components/Shared/Header.jsx'; // PATH BARU
import LogoutModal from './components/Shared/Modals/LogoutModal.jsx'; // PATH BARU
import LoginPage from './pages/LoginPage.jsx'; // PATH BARU
import EmployeeDashboard from './pages/Dashboard/EmployeeDashboard.jsx'; // PATH BARU
import ManagerDashboard from './pages/Dashboard/ManagerDashboard.jsx'; // PATH BARU
import OwnerDashboard from './pages/Dashboard/OwnerDashboard/OwnerDashboard.jsx';
import SupervisorDashboard from './pages/Dashboard/SupervisorDashboard.jsx'; // PATH BARU
import { DotLottieReact } from '@lottiefiles/dotlottie-react';


const App = () => {
  const { 
    authUser, 
    isLoading, 
    employees, 
    setEmployees, 
    managers, 
    setManagers, 
    pendingLeave, 
    setPendingLeave, 
    isLogoutModalOpen, 
    setIsLogoutModalOpen, 
    handleLogin, 
    handleLogout, 
    handleLogoutClick,
    setAuthUser
  } = useAuth();

  const safeParse = (key, fallback) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      localStorage.removeItem(key);
      return fallback;
    }
  };

  const [pendingProfileChanges, setPendingProfileChanges] = useState(() =>
    safeParse("pendingProfileChanges", [])
  );

  // NEW: pendingTasks + pendingAttendance managed at App level
  const [pendingTasks, setPendingTasks] = useState(() =>
    safeParse("pendingTasks", [])
  );

  const [pendingAttendance, setPendingAttendance] = useState(() =>
    safeParse("pendingAttendance", [])
  );
    
  useEffect(() => {
    localStorage.setItem("pendingProfileChanges", JSON.stringify(pendingProfileChanges));
  }, [pendingProfileChanges]);

  // persist pendingTasks & pendingAttendance
  useEffect(() => {
    localStorage.setItem("pendingTasks", JSON.stringify(pendingTasks));
  }, [pendingTasks]);

  useEffect(() => {
    localStorage.setItem("pendingAttendance", JSON.stringify(pendingAttendance));
  }, [pendingAttendance]);

  // Simple client-side routing without external dependencies
  const [routePath, setRoutePath] = useState(() => window.location.pathname || '/');

  useEffect(() => {
    const handler = () => setRoutePath(window.location.pathname || '/');
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const navigate = (path) => {
    if (path === routePath) return;
    window.history.pushState({}, '', path);
    setRoutePath(path);
  };

  const roleTabs = {
    employee: ['profile', 'leave', 'permission', 'performance', 'loginHistory', 'timesheets'],
    manager: ['summary', 'emp', 'performance', 'approval', 'permissionApproval', 'profileApproval', 'myLeave', 'payroll', 'mysalary', 'report', 'timesheets', 'projects', 'profile'],
    owner: ['summary', 'emp', 'manager', 'supervisor', 'target', 'performance', 'payroll', 'timesheets', 'projects'],
    supervisor: ['summary', 'taskApproval', 'attendanceApproval', 'performance', 'profile'],
  };

  useEffect(() => {
    if (!authUser) {
      // If not logged in, always send to root (login)
      if (routePath !== '/') navigate('/');
      return;
    }

    const segments = routePath.split('/').filter(Boolean);
    const currentRole = segments[0];
    const currentTab = segments[1];
    const allowedTabs = roleTabs[authUser.role] || [];
    const defaultTab = allowedTabs[0] || '';

    // If role unknown or no allowed tabs, go to login/root to avoid blank screens
    if (!allowedTabs.length || !authUser.role) {
      navigate('/');
      return;
    }

    // If no tab in URL, push default
    if (!currentTab) {
      navigate(`/${authUser.role}/${defaultTab}`);
      return;
    }

    // If role mismatch or tab not allowed, correct the URL
    if (currentRole !== authUser.role || !allowedTabs.includes(currentTab)) {
      navigate(`/${authUser.role}/${defaultTab}`);
    }
  }, [authUser, routePath]);

  const getActiveTab = () => {
    const segments = routePath.split('/').filter(Boolean);
    return segments[1] || '';
  };

  const activeTab = getActiveTab();


 return (
    <div className="min-h-screen bg-gray-50">
        {isLoading && (
            // Using backdrop-blur for a more modern look
            <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
                <div className="flex flex-col items-center justify-center"> 
                    <div className="h-48 w-48 mb-4">
                        <DotLottieReact
                            src="https://lottie.host/9581a0e7-e2e2-4ac9-afbd-7d4cface4c28/O3EfZ0vhqK.lottie"
                            loop
                            autoplay
                        />
                    </div>
                    
                    <p className="mt-2 text-lg font-bold text-[#708993] tracking-wider text-shadow-sm">
                        LOADING...
                    </p>
                </div>
            </div>
        )}
      {!authUser ? (
        <LoginPage handleLogin={handleLogin} isLoading={isLoading} />
      ) : (
        <>
          <Header user={authUser} handleLogoutClick={handleLogoutClick} />
          <main className="pt-4 ">
            {authUser.role === "employee" && (
              <EmployeeDashboard
                user={authUser}
                employees={employees}
                setEmployees={setEmployees}
                pendingLeave={pendingLeave}
                setAuthUser={setAuthUser}
                pendingProfileChanges={pendingProfileChanges}
                setPendingProfileChanges={setPendingProfileChanges}
                activeTab={activeTab}
                onTabChange={(tab) => navigate(`/${authUser.role}/${tab}`)}
              />
            )}

            {authUser.role === "manager" && (
              <ManagerDashboard
                user={authUser}
                employees={employees}
                setEmployees={setEmployees}
                pendingLeave={pendingLeave}
                setPendingLeave={setPendingLeave}
                pendingProfileChanges={pendingProfileChanges}
                setPendingProfileChanges={setPendingProfileChanges}
                activeTab={activeTab}
                onTabChange={(tab) => navigate(`/${authUser.role}/${tab}`)}
              />
            )}

            {authUser.role === "owner" && (
              <OwnerDashboard
                user={authUser}
                managers={managers}
                setManagers={setManagers}
                employees={employees}
                setEmployees={setEmployees}
                activeTab={activeTab}
                onTabChange={(tab) => navigate(`/${authUser.role}/${tab}`)}
              />
            )}

            {authUser.role === "supervisor" && (
              <SupervisorDashboard
                user={authUser}
                employees={employees}
                setEmployees={setEmployees}
                pendingTasks={pendingTasks}
                setPendingTasks={setPendingTasks}
                pendingAttendance={pendingAttendance}
                setPendingAttendance={setPendingAttendance}
                pendingProfileChanges={pendingProfileChanges}
                setPendingProfileChanges={setPendingProfileChanges}
                setAuthUser={setAuthUser}
                activeTab={activeTab}
                onTabChange={(tab) => navigate(`/${authUser.role}/${tab}`)}
              />
            )}
          </main>
        </>
      )}

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default App;
