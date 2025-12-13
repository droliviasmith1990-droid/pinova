'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationRule {
    validate: (value: string) => boolean;
    message: string;
}

interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    rules?: ValidationRule[];
    validateOnBlur?: boolean;
    validateOnChange?: boolean;
    showSuccessIcon?: boolean;
    hint?: string;
    error?: string;
}

// Common validation rules
export const validationRules = {
    required: (message = 'This field is required'): ValidationRule => ({
        validate: (value) => value.trim().length > 0,
        message,
    }),
    email: (message = 'Please enter a valid email'): ValidationRule => ({
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message,
    }),
    minLength: (length: number, message?: string): ValidationRule => ({
        validate: (value) => value.length >= length,
        message: message || `Must be at least ${length} characters`,
    }),
    maxLength: (length: number, message?: string): ValidationRule => ({
        validate: (value) => value.length <= length,
        message: message || `Must be no more than ${length} characters`,
    }),
    url: (message = 'Please enter a valid URL'): ValidationRule => ({
        validate: (value) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        },
        message,
    }),
    pattern: (regex: RegExp, message: string): ValidationRule => ({
        validate: (value) => regex.test(value),
        message,
    }),
};

export function ValidatedInput({
    label,
    value,
    onChange,
    rules = [],
    validateOnBlur = true,
    validateOnChange = false,
    showSuccessIcon = true,
    hint,
    error: externalError,
    type = 'text',
    className,
    ...props
}: ValidatedInputProps) {
    const [touched, setTouched] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const validate = useCallback((val: string): string | null => {
        for (const rule of rules) {
            if (!rule.validate(val)) {
                return rule.message;
            }
        }
        return null;
    }, [rules]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

        if (validateOnChange || touched) {
            setInternalError(validate(newValue));
        }
    };

    const handleBlur = () => {
        setTouched(true);
        if (validateOnBlur) {
            setInternalError(validate(value));
        }
    };

    const error = externalError || internalError;
    const isValid = touched && !error && value.length > 0;
    const showError = touched && error;

    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {rules.some(r => r.message.includes('required')) && (
                        <span className="text-red-500 ml-0.5">*</span>
                    )}
                </label>
            )}

            <div className="relative">
                <input
                    type={inputType}
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={cn(
                        "w-full px-4 py-3 rounded-xl border-2 text-base transition-all duration-200",
                        "focus:ring-4 focus:outline-none",
                        showError
                            ? "border-red-400 focus:border-red-500 focus:ring-red-100 pr-12"
                            : isValid
                                ? "border-green-400 focus:border-green-500 focus:ring-green-100 pr-12"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-100",
                        isPassword && "pr-20",
                        className
                    )}
                    aria-invalid={showError ? 'true' : 'false'}
                    aria-describedby={showError ? `${props.id}-error` : undefined}
                    {...props}
                />

                {/* Status icons */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors touch-target"
                            tabIndex={-1}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                            ) : (
                                <Eye className="w-5 h-5" />
                            )}
                        </button>
                    )}

                    {showError && (
                        <X className="w-5 h-5 text-red-500 animate-scale-in" />
                    )}

                    {isValid && showSuccessIcon && (
                        <Check className="w-5 h-5 text-green-500 animate-scale-in" />
                    )}
                </div>
            </div>

            {/* Hint text */}
            {hint && !showError && (
                <p className="text-sm text-gray-500">{hint}</p>
            )}

            {/* Error message */}
            {showError && (
                <p
                    id={`${props.id}-error`}
                    className="flex items-center gap-1.5 text-sm text-red-600 animate-fade-in-up"
                    role="alert"
                >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </p>
            )}
        </div>
    );
}

// Password strength indicator
interface PasswordStrengthProps {
    password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
    const getStrength = (pass: string): { score: number; label: string; color: string } => {
        let score = 0;

        if (pass.length >= 8) score++;
        if (pass.length >= 12) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[a-z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
        if (score <= 4) return { score: 2, label: 'Fair', color: 'bg-yellow-500' };
        if (score <= 5) return { score: 3, label: 'Good', color: 'bg-blue-500' };
        return { score: 4, label: 'Strong', color: 'bg-green-500' };
    };

    if (!password) return null;

    const strength = getStrength(password);

    return (
        <div className="space-y-1.5 animate-fade-in-up">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                    <div
                        key={level}
                        className={cn(
                            "h-1.5 flex-1 rounded-full transition-colors",
                            level <= strength.score ? strength.color : 'bg-gray-200'
                        )}
                    />
                ))}
            </div>
            <p className={cn(
                "text-xs font-medium",
                strength.score <= 1 ? "text-red-600" :
                    strength.score <= 2 ? "text-yellow-600" :
                        strength.score <= 3 ? "text-blue-600" :
                            "text-green-600"
            )}>
                Password strength: {strength.label}
            </p>
        </div>
    );
}
