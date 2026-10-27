/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, UserRole, SecurityLogEntry } from "../types";
import { 
  KeyRound, 
  Eye, 
  EyeOff, 
  UserCheck, 
  AlertCircle, 
  Sparkles, 
  ShieldAlert, 
  QrCode, 
  Clipboard, 
  Check, 
  ArrowLeft, 
  Timer, 
  ShieldCheck, 
  Lock 
} from "lucide-react";
import { motion } from "motion/react";
import { generateTOTP, verifyTOTP, getOtpauthURI, generateBase32Secret } from "../utils/totp";
import opaLogo from "../assets/images/opa_logo_1783021135190.jpg";
import provincialSeal from "../assets/images/pangasinan_seal_1783021151307.jpg";

interface LoginProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onAddSecurityLog: (log: SecurityLogEntry) => void;
}

export default function Login({ users, onLoginSuccess, onUpdateUser, onAddSecurityLog }: LoginProps) {
  // Credentials Screen States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRetrieveAccounts, setShowRetrieveAccounts] = useState(false);
  const [retrievedMessage, setRetrievedMessage] = useState<string | null>(null);
  const [forgotUsername, setForgotUsername] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // MFA Challenge Screen States
  const [loginStep, setLoginStep] = useState<"CREDENTIALS" | "MFA_CHALLENGE">("CREDENTIALS");
  const [mfaUser, setMfaUser] = useState<User | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Companion Simulator States
  const [currentSimulatedOTP, setCurrentSimulatedOTP] = useState("");
  const [simulatedCountdown, setSimulatedCountdown] = useState(30);

  // Background Live Generator for the Virtual Companion Simulator
  useEffect(() => {
    if (loginStep !== "MFA_CHALLENGE" || !mfaUser || !mfaUser.mfaSecret) return;
    
    let active = true;
    const updateOTP = async () => {
      if (!mfaUser.mfaSecret) return;
      const code = await generateTOTP(mfaUser.mfaSecret);
      if (active) {
        setCurrentSimulatedOTP(code);
        const sec = Math.floor(new Date().getTime() / 1000) % 30;
        setSimulatedCountdown(30 - sec);
      }
    };

    updateOTP();
    const interval = setInterval(updateOTP, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [loginStep, mfaUser]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnecting) return;
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Please fill in both username and password.");
      return;
    }

    // Find the user (case-insensitive for convenience)
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!foundUser) {
      setError("Username not found. Check retrieved accounts if unsure.");
      return;
    }

    if (!foundUser.isActive) {
      setError("This account is currently deactivated. Please contact an Administrator.");
      return;
    }

    // Verify password
    if (foundUser.passwordHash !== password) {
      setError("Incorrect password. Please try again or retrieve credentials.");
      return;
    }

    // Connect and direct to MFA step if enabled
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      
      if (foundUser.mfaEnabled) {
        // Prepare MFA user state, generating a secret if none exists
        const updatedUser = { ...foundUser };
        if (!updatedUser.mfaSecret) {
          updatedUser.mfaSecret = generateBase32Secret(16);
          onUpdateUser(updatedUser);
        }
        setMfaUser(updatedUser);
        setLoginStep("MFA_CHALLENGE");
        setMfaCode("");
        setMfaError(null);
      } else {
        // Standard authentication without MFA
        onLoginSuccess(foundUser);
      }
    }, 1200);
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaUser || !mfaUser.mfaSecret) return;
    setMfaError(null);

    const isValid = await verifyTOTP(mfaUser.mfaSecret, mfaCode);
    if (!isValid) {
      setMfaError("Invalid 6-digit security code. Verify synchronization with Google Authenticator.");
      return;
    }

    const timestamp = new Date().toISOString();

    if (!mfaUser.mfaEnrolled) {
      // Complete enrollment
      const enrolledUser: User = {
        ...mfaUser,
        mfaEnrolled: true
      };
      onUpdateUser(enrolledUser);

      // Audit Trail security log entry
      const log: SecurityLogEntry = {
        id: "sec-" + Date.now(),
        timestamp,
        actorId: mfaUser.id,
        actorName: mfaUser.employeeName,
        actorRole: mfaUser.role,
        targetId: mfaUser.id,
        targetName: mfaUser.employeeName,
        action: "Enrollment",
        details: "Google Authenticator Multi-Factor Authentication successfully enrolled and verified."
      };
      onAddSecurityLog(log);

      onLoginSuccess(enrolledUser);
    } else {
      // Log successful verification access
      onLoginSuccess(mfaUser);
    }
  };

  const handleQuickLogin = (user: User) => {
    setUsername(user.username);
    setPassword(user.passwordHash || "pass123");
    setError(null);
    setShowRetrieveAccounts(false);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) {
      setRetrievedMessage("Please enter your username.");
      return;
    }

    const found = users.find((u) => u.username.toLowerCase() === forgotUsername.trim().toLowerCase());
    if (found) {
      setRetrievedMessage(
        `Account Found! Password for user "${found.username}" is "${found.passwordHash}".`
      );
    } else {
      setRetrievedMessage("Username not found in our directory.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-slate-800">
      
      {/* Background Decorative Seals & Lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Frame */}
      <div className="w-full max-w-lg bg-white/95 border border-slate-200/80 rounded-3xl shadow-2xl p-8 z-10 backdrop-blur-sm transition-all duration-300">
        
        {/* Government Dual Logo Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-6 mb-4 relative">
            {/* Official Seal of Pangasinan */}
            <motion.img
              src={provincialSeal}
              alt="Official Seal of the Province of Pangasinan"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover shadow-md border border-slate-150"
              animate={
                isConnecting
                  ? {
                      rotate: 360,
                      scale: [1, 1.25, 1.2, 1.3, 0],
                      x: [0, 15, 10, 0, 0],
                      filter: [
                        "drop-shadow(0 0 0px rgba(245, 158, 11, 0))",
                        "drop-shadow(0 0 15px rgba(245, 158, 11, 0.8))",
                        "drop-shadow(0 0 25px rgba(245, 158, 11, 0.9))",
                        "drop-shadow(0 0 0px rgba(245, 158, 11, 0))",
                      ],
                    }
                  : { rotate: 0, scale: 1, x: 0 }
              }
              transition={{
                duration: 1.5,
                ease: "easeInOut",
              }}
              whileHover={{ scale: 1.05 }}
            />
            {/* Divider */}
            <motion.div
              className="h-10 w-[1px] bg-slate-300"
              animate={isConnecting ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            ></motion.div>
            {/* Office of the Provincial Accountant Badge Emblem */}
            <motion.img
              src={opaLogo}
              alt="Office of the Provincial Accountant Seal"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover shadow-md border border-slate-150"
              animate={
                isConnecting
                  ? {
                      rotate: -360,
                      scale: [1, 1.25, 1.2, 1.3, 0],
                      x: [0, -15, -10, 0, 0],
                      filter: [
                        "drop-shadow(0 0 0px rgba(30, 58, 138, 0))",
                        "drop-shadow(0 0 15px rgba(30, 58, 138, 0.8))",
                        "drop-shadow(0 0 25px rgba(30, 58, 138, 0.9))",
                        "drop-shadow(0 0 0px rgba(30, 58, 138, 0))",
                      ],
                    }
                  : { rotate: 0, scale: 1, x: 0 }
              }
              transition={{
                duration: 1.5,
                ease: "easeInOut",
              }}
              whileHover={{ scale: 1.05 }}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-800 block">
              Republic of the Philippines
            </span>
            <h1 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Province of Pangasinan
            </h1>
            <h2 className="text-xs font-bold text-amber-600 uppercase tracking-widest">
              Office of the Provincial Accountant
            </h2>
            <div className="h-[2px] w-24 bg-gradient-to-r from-blue-800 via-amber-500 to-blue-800 mx-auto my-3"></div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-display py-1">
              Provincial Reimbursement and Payroll Processing Tracker
            </h3>
          </div>
        </div>

        {/* Dynamic Step Router */}
        {loginStep === "CREDENTIALS" ? (
          /* Step 1: Standard Username & Password */
          !showForgotPassword ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Username / Credentials
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isConnecting}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-700 transition-all font-semibold disabled:opacity-60"
                    placeholder="Enter authorized username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Secure Password
                  </label>
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={() => {
                      setShowForgotPassword(true);
                      setRetrievedMessage(null);
                    }}
                    className="text-[10px] text-blue-700 hover:text-blue-800 font-bold focus:outline-none hover:underline disabled:opacity-50"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isConnecting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-700 transition-all font-semibold disabled:opacity-60"
                    placeholder="Enter secret passcode"
                  />
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                className={`w-full py-3 text-white rounded-xl text-xs font-bold transition-all focus:outline-none shadow-md uppercase tracking-wider border-b-2 border-amber-500 flex items-center justify-center gap-2 cursor-pointer ${
                  isConnecting
                    ? "bg-slate-700 border-slate-600 cursor-not-allowed opacity-90"
                    : "bg-blue-900 hover:bg-blue-800 hover:shadow-lg hover:translate-y-[-0.5px]"
                }`}
              >
                {isConnecting ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                    <span>Establishing Secure Link...</span>
                  </>
                ) : (
                  "Authorize Connection"
                )}
              </button>
            </form>
          ) : (
            /* Forgot Password Mode */
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Account Recovery Auditing</h4>
              <p className="text-[11px] text-slate-500">
                Enter your registered username to check credentials.
              </p>

              {retrievedMessage && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 italic">
                  {retrievedMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-700 font-semibold"
                  placeholder="e.g. jsmith"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold focus:outline-none transition-colors cursor-pointer"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold focus:outline-none transition-colors cursor-pointer"
                >
                  Query Database
                </button>
              </div>
            </form>
          )
        ) : (
          /* Step 2: MFA Challenge Verification */
          <div className="space-y-5 animate-fade-in text-slate-800">
            
            {/* MFA Section Title & Sub-header */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-800 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>MFA Verification Guard</span>
                  <span className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded uppercase">Google Authenticator</span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  Protecting account: <strong className="text-slate-600">{mfaUser?.employeeName}</strong> ({mfaUser?.username})
                </p>
              </div>
            </div>

            {mfaError && (
              <div className="p-3 bg-red-50 border border-red-150 rounded-xl flex items-start gap-2 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                <span>{mfaError}</span>
              </div>
            )}

            {/* If Not Enrolled: Show QR and Key Setup Instructions */}
            {!mfaUser?.mfaEnrolled ? (
              <div className="space-y-4 border-b border-slate-100 pb-5">
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-left">
                  <h5 className="text-[11px] font-bold text-blue-900 mb-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>First-Time MFA Enrollment Required</span>
                  </h5>
                  <p className="text-[10px] text-blue-800 leading-relaxed">
                    You must enroll this account in Google Authenticator to establish operational compliance. Follow the directions below.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {/* Google QR Code API Link */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-150 shadow-sm shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        getOtpauthURI(mfaUser?.username || "", mfaUser?.mfaSecret || "")
                      )}`}
                      alt="Google Authenticator MFA QR Code"
                      referrerPolicy="no-referrer"
                      className="w-[120px] h-[120px] block"
                    />
                  </div>

                  <div className="text-left space-y-2.5 flex-1 w-full">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Enrollment Step 1
                      </span>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Scan the QR code on the left using the Google Authenticator app on your phone.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Enrollment Step 2 (Manual)
                      </span>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Or enter this manual secret setup key into your authenticator:
                      </p>
                      
                      {/* Monospaced setup key container */}
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 pl-3 shadow-inner">
                        <code className="font-mono text-xs font-bold text-slate-800 flex-1 select-all select-none">
                          {mfaUser?.mfaSecret}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(mfaUser?.mfaSecret || "")}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg hover:text-slate-900 transition-colors focus:outline-none"
                          title="Copy setup key to clipboard"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clipboard className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Already Enrolled User Prompt */
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open the <strong>Google Authenticator</strong> app on your mobile device to view your active 6-digit verification code. Enter the code below to authorize connection.
                </p>
              </div>
            )}

            {/* MFA Verification Form */}
            <form onSubmit={handleVerifyMFA} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                  6-Digit MFA Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ""))}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-700 tracking-widest font-mono text-center text-lg font-bold"
                    placeholder="000 000"
                  />
                </div>
              </div>

              {/* Live Virtual Authenticator Sandbox Companion (Ensures effortless testing / preview in AI Studio sandbox) */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-left shadow-sm">
                <div className="flex items-start gap-2.5 text-amber-800">
                  <Timer className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 animate-pulse" />
                  <div className="text-xs w-full">
                    <span className="font-bold block text-amber-900 mb-0.5">Sandbox Virtual Authenticator Helper</span>
                    <p className="text-[10px] text-amber-700 leading-relaxed mb-3">
                      Do not have a physical device ready? Copy and use this live simulated security code matching Google Authenticator's exact algorithm:
                    </p>
                    <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl p-2 shadow-inner">
                      <span className="font-mono text-lg font-bold tracking-widest text-slate-950 flex-1 text-center">
                        {currentSimulatedOTP ? `${currentSimulatedOTP.substring(0, 3)} ${currentSimulatedOTP.substring(3)}` : "--- ---"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMfaCode(currentSimulatedOTP);
                          copyToClipboard(currentSimulatedOTP);
                        }}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[10px] rounded-lg transition-colors focus:outline-none cursor-pointer"
                      >
                        Autofill
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-amber-600/80 mt-1.5 font-mono px-1">
                      <span>Synchronized Live</span>
                      <span>Next rotation in: {simulatedCountdown}s</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep("CREDENTIALS");
                    setMfaUser(null);
                    setMfaCode("");
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold focus:outline-none transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold focus:outline-none transition-colors border-b-2 border-amber-500 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{!mfaUser?.mfaEnrolled ? "Verify & Enroll" : "Verify & Login"}</span>
                </button>
              </div>

            </form>

          </div>
        )}

        {/* Demo Simulator Account Retriever */}
        {loginStep === "CREDENTIALS" && (
          <div className="mt-6 pt-5 border-t border-slate-150 text-center">
            <button
              type="button"
              disabled={isConnecting}
              onClick={() => {
                setShowRetrieveAccounts(!showRetrieveAccounts);
                setRetrievedMessage(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-blue-800 hover:text-blue-900 font-bold focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Simulation Directory: Retrieve Demo Employee Accounts</span>
            </button>

            {showRetrieveAccounts && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left animate-slide-up max-h-[180px] overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2">
                  Pangasinan Provincial Accountant Accounts
                </span>
                <div className="space-y-1.5">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => !isConnecting && handleQuickLogin(u)}
                      className={`p-2.5 bg-white border border-slate-200 rounded-xl text-[11px] flex justify-between items-center transition-all ${
                        isConnecting
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-amber-50 cursor-pointer hover:border-amber-300"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 truncate block">{u.employeeName}</span>
                          {u.mfaEnabled && (
                            <span className="bg-emerald-100 text-emerald-800 font-bold text-[8px] px-1 rounded flex items-center gap-0.5 shrink-0" title="MFA Secured">
                              <Lock className="w-2 h-2" />
                              MFA
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">{u.role.split(" / ")[0]} ({u.position})</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-blue-900 block">{u.username}</span>
                        <span className="text-[9px] font-mono text-slate-400 block">PW: {u.passwordHash || "pass123"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer credits */}
      <span className="text-[10px] text-slate-500 mt-6 font-mono tracking-wider z-10 select-none">
        Provincial Government of Pangasinan • Provincial Accounting Information Systems Division
      </span>
    </div>
  );
}

