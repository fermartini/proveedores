import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ArrowRight, Chrome, Mail, Lock, UserPlus, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginView() {
  const { 
    currentUser, 
    cuit: userCuit, 
    loginWithGoogle, 
    loginWithEmail, 
    signupWithEmail, 
    saveCompanyData,
    logOut 
  } = useAuth();
  
  const [isLoginActive, setIsLoginActive] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Paso 2: Configurar CUIT
  const [cuitInput, setCuitInput] = useState("");
  const [nombreInput, setNombreInput] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError("Error al iniciar sesión con Google.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor ingresá tu email y contraseña.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (isLoginActive) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message.includes("invalid-credential") 
        ? "Credenciales inválidas o el usuario no existe." 
        : err.message.includes("email-already-in-use") 
        ? "Este email ya está registrado." 
        : "Error en la autenticación.");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCompany = async (e) => {
    e.preventDefault();
    setError("");

    if (!cuitInput || cuitInput.length < 10) {
      setError("Por favor, ingresá un CUIT válido.");
      return;
    }
    if (!nombreInput.trim()) {
      setError("Por favor, ingresá la Razón Social.");
      return;
    }

    setLoading(true);
    try {
      await saveCompanyData(cuitInput.replace(/[^0-9]/g, ""), nombreInput.trim());
    } catch (err) {
      setError("Error al ligar la empresa con tu cuenta.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Elementos de fondo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500 rounded-full blur-[120px] opacity-30 mix-blend-screen" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] opacity-20 mix-blend-screen" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-md p-8 rounded-3xl bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl relative overflow-hidden"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20 shadow-inner">
            <Building2 className="text-brand-400 w-8 h-8" />
          </div>
        </div>

        {/* Paso 1: Auth Base */}
        {!currentUser ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                Ingresar a <span className="brand-gradient-text">FacturaScan</span>
              </h1>
              <p className="text-slate-400 text-sm">
                Iniciá sesión para gestionar tus comprobantes
              </p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 text-center">
                {error}
              </motion.div>
            )}

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-white text-slate-800 hover:bg-slate-100 font-medium rounded-xl px-4 py-3 flex items-center justify-center gap-3 transition-all mb-6 disabled:opacity-50"
            >
              <Chrome className="w-5 h-5 text-blue-500" />
              Continuar con Google
            </button>

            <div className="relative flex items-center py-2 mb-6">
              <div className="flex-grow border-t border-slate-700"></div>
              <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-widest">O usa email</span>
              <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@empresa.com"
                    className="w-full bg-slate-900/50 border border-slate-700/50 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="w-full bg-slate-900/50 border border-slate-700/50 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoginActive ? "Iniciar Sesión" : "Crear Cuenta"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                type="button" 
                onClick={() => { setIsLoginActive(!isLoginActive); setError(""); }}
                className="text-brand-400 hover:text-brand-300 text-sm transition-colors"
              >
                {isLoginActive ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Iniciá sesión"}
              </button>
            </div>
          </>
        ) : (
          /* Paso 2: Onboarding / Completar Datos Empresa */
          <AnimatePresence mode="wait">
            {!userCuit && (
              <motion.div
                key="onboarding"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={formVariants}
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Completar Perfil</h2>
                  <p className="text-slate-400 text-sm">
                    Hola <strong>{currentUser.email}</strong>, definí tu empresa para comenzar a procesar facturas.
                  </p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 text-center">
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleLinkCompany} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest pl-1">
                      CUIT de la Empresa
                    </label>
                    <input
                      type="text"
                      value={cuitInput}
                      onChange={(e) => setCuitInput(e.target.value)}
                      placeholder="Ej: 30123456789"
                      className="w-full bg-slate-900/50 border border-slate-700/50 text-white rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest pl-1">
                      Razón Social
                    </label>
                    <input
                      type="text"
                      value={nombreInput}
                      onChange={(e) => setNombreInput(e.target.value)}
                      placeholder="Ej: Acme S.A."
                      className="w-full bg-slate-900/50 border border-slate-700/50 text-white rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 disabled:opacity-50"
                  >
                    Guardar y Entrar
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-6 text-center">
                   <button 
                     onClick={logOut}
                     className="text-slate-500 hover:text-slate-300 text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
                   >
                     <LogOut className="w-3 h-3" />
                     Cambiar de cuenta
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
