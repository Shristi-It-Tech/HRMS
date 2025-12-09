import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { showSwal } from '../../utils/swal';

const Card = ({ children }) => (
    <div className="bg-white/90 border border-[#708993]/10 shadow-lg rounded-3xl p-5 mb-6">
        {children}
    </div>
);

const Input = ({ label, ...rest }) => (
    <label className="flex flex-col gap-2 text-xs text-gray-700 font-semibold">
        <span>{label}</span>
        <input
            className="px-4 py-3 rounded-2xl border border-[#708993]/40 focus:border-[#708993] focus:ring-2 focus:ring-[#708993]/20 transition duration-200 text-sm"
            {...rest}
        />
    </label>
);

const Select = ({ label, children, ...rest }) => (
    <label className="flex flex-col gap-2 text-xs text-gray-700 font-semibold">
        <span>{label}</span>
        <select
            className="px-4 py-3 rounded-2xl border border-[#708993]/40 focus:border-[#708993] focus:ring-2 focus:ring-[#708993]/20 transition duration-200 text-sm"
            {...rest}
        >
            {children}
        </select>
    </label>
);

const Button = ({ children, ...props }) => (
    <button
        className="mt-3 px-5 py-3 rounded-2xl bg-[#708993] text-white font-semibold text-sm hover:bg-[#5a727a] transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        {...props}
    >
        {children}
    </button>
);

const defaultDivisions = ['Tech', 'Marketing', 'Finance', 'HR', 'Operations'];

const UserCreatorForm = ({
    allowedRoles = ['manager', 'employee'],
    divisions = defaultDivisions,
    defaultDivision = 'Operations',
    defaultRole,
    onCreated = () => {},
}) => {
    const { apiFetch } = useAuth();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: defaultRole || allowedRoles[allowedRoles.length - 1],
        division: defaultDivision,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiFetch) {
            showSwal('Backend unavailable', 'Please start the backend server first.', 'warning');
            return;
        }
        if (!form.name || !form.email || !form.password) {
            showSwal('Validation', 'Name, email, and password are required.', 'warning');
            return;
        }
        setIsLoading(true);
        try {
            const payload = await apiFetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            showSwal('Created', `${payload.name} (${payload.role}) can now login with the provided credentials.`, 'success');
            onCreated(payload);
            setForm({
                name: '',
                email: '',
                password: '',
                role: defaultRole || allowedRoles[allowedRoles.length - 1],
                division: defaultDivision,
            });
        } catch (error) {
            showSwal('Error', error?.payload?.message || error.message || 'Failed to create user', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Create New Account</h3>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
                <Input label="Name" name="name" value={form.name} onChange={handleChange} placeholder="Full name" required />
                <Input label="Email (will be login ID)" type="email" name="email" value={form.email} onChange={handleChange} placeholder="owner@hrms.local" required />
                <Input label="Password" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Set a password" required />
                <Select label="Role" name="role" value={form.role} onChange={handleChange}>
                    {allowedRoles.map((role) => (
                        <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                    ))}
                </Select>
                <Select label="Division" name="division" value={form.division} onChange={handleChange}>
                    {divisions.map((division) => (
                        <option key={division} value={division}>
                            {division}
                        </option>
                    ))}
                </Select>
                <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Account'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};

export default UserCreatorForm;
