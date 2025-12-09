import React, { useState } from 'react';
import { PrimaryButton2 } from '../components/UI/Buttons';

// --- COMPONENT DEFINITIONS AND CONSTANTS FOR ERROR RESOLUTION ---

const COLORS = {
    Primary: '#000000ff', // Blue-500
};

const PrimaryButton = ({ children, className = '', disabled, ...props }) => {
    // Using bracket notation for dynamic Tailwind color
    return (
        <button
            className={`
                px-6 py-3 font-semibold text-white rounded-2xl 
                bg-[${COLORS.Primary}] hover:bg-blue-600 
                shadow-lg shadow-blue-500/50 
                transition-all duration-300 ease-in-out 
                transform hover:scale-[1.02] active:scale-[0.98] 
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''} 
                ${className}
            `}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

const GlassCard = ({ children, className = '' }) => {
    return (
        <div 
            className={`
                p-8 rounded-[30px] border border-white/50 
                bg-white/20 backdrop-blur-md shadow-xl 
                ${className}
            `}
        >
            {children}
        </div>
    );
};

// --- END OF DEFINITIONS ---


const LoginPage = ({ handleLogin, isLoading }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('password');
    const [showPassword, setShowPassword] = useState(false);
    
    // STATE FOR CONTROLLING INPUT FOCUS
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    // PASSWORD VALIDATION FLAG (TRUE if >= 8 characters)
    const isPasswordValid = password.length >= 8;

    const handleSubmit = (e) => {
        e.preventDefault();
        // Also validate password length before login (optional)
        if (password.length < 8) {
            console.error("Password must be at least 8 characters.");
            return;
        }
        handleLogin(email, password);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#D3DFFE] p-4">
            <GlassCard className="w-full max-w-sm text-center transform transition-all duration-500 ">
                <div className="flex flex-col items-center mb-8">
                    {/* Using the Lucide "User" icon as a human silhouette */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#708993" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user mb-4">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <h1 className="text-2xl font-bold text-gray-800">HRMS</h1>
                    <p className="text-gray-500 text-sm mt-1">Human Resource Management System</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Field */}
                    <div>
                        <div className="relative">
                            <i className="fas fa-user absolute left-3 top-1/2 transform -translate-y-1/2 text-black"></i>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setIsEmailFocused(true)}
                                onBlur={() => setIsEmailFocused(false)}
                                required
                                className={`
                                    w-full pl-10 pr-4 py-3 border rounded-2xl 
                                    bg-white/50 backdrop-blur-sm shadow-sm 
                                    placeholder-gray-600 text-gray-800 focus:outline-none 
                                    ${!isEmailFocused ? 'border-white/50' : ''} 
                                    ${isEmailFocused ? 'border-green-500' : ''}
                                `}
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <div className="relative">
                            <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-black"></i>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                                required
                                className={`
                                    w-full pl-10 pr-12 py-3 border rounded-2xl 
                                    bg-white/50 backdrop-blur-sm shadow-sm 
                                    placeholder-gray-600 text-gray-800 focus:outline-none 
                                    ${!isPasswordFocused ? 'border-white/50' : ''}

                                    ${isPasswordFocused && !isPasswordValid ? 'border-red-500 ' : ''}
                                    ${isPasswordFocused && isPasswordValid ? 'border-green-500' : ''}
                                `}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200 bg-transparent focus:outline-none border-none"
                                onClick={togglePasswordVisibility}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                        {/* Optional: Show password validation message below input when focused */}
                        {isPasswordFocused && password.length > 0 && (
                            <p className={`mt-1 text-xs text-left ${isPasswordValid ? 'text-green-600' : 'text-red-600'}`}>
                                {isPasswordValid ? '' : `Minimum 8 characters. ${8 - password.length} characters remaining.`}
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <PrimaryButton2 type="submit" className="w-full mt-6" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <i className="fas fa-spinner fa-spin mr-2"></i> Processing...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-sign-in-alt mr-2"></i> Sign In
                            </>
                        )}
                    </PrimaryButton2>
                </form>

                <div className="mt-8 p-4 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/30">
                    <p className="text-xs text-gray-600 font-medium mb-2">Try logging in as:</p>
                    <div className="space-y-1 text-xs text-left">
                        <p className="text-gray-700">
                            <span className="font-medium">Employee:</span> <code className="bg-white/50 px-2 py-1 rounded">employee@example.com / password</code>
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Manager:</span> <code className="bg-white/50 px-2 py-1 rounded">manager@example.com / password</code>
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Supervisor:</span> <code className="bg-white/50 px-2 py-1 rounded">supervisor@example.com / password</code>
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Owner:</span> <code className="bg-white/50 px-2 py-1 rounded">owner@example.com / password</code>
                        </p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default LoginPage;
