import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ArrowRight, Mail, Lock, UserPlus, LogOut, Globe, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginView() {
  const { 
    currentUser, 
    cuit: userCuit, 
    loginWithGoogle, 
    loginWithEmail, 
    signupWithEmail, 
    saveCompanyData,
    logOut,
    isFetchingFirestore 
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-bg">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-lg mx-6"
      >
        <div className="glass-card p-10 md:p-14 relative overflow-hidden border-2 border-indigo-500/10">
          <div className="flex justify-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/20 ring-4 ring-indigo-500/10 scale-110">
              <Building2 className="text-white w-10 h-10" />
            </div>
          </div>

          {isFetchingFirestore ? (
            <div className="py-12 flex flex-col items-center gap-6">
              <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
              <div className="text-center">
                 <p className="text-main font-black uppercase tracking-widest text-xs">Sincronizando</p>
                 <p className="text-dim text-sm font-medium mt-1">Configurando tu entorno de trabajo...</p>
              </div>
            </div>
          ) : !currentUser ? (
            <>
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-black text-main tracking-tight mb-3">
                  Factura<span className="brand-gradient-text">Scan</span>
                </h1>
                <p className="text-muted text-base font-medium">
                  Gestión inteligente de comprobantes corporativos.
                </p>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-2xl p-4 text-center">
                  {error}
                </motion.div>
              )}

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="btn-ghost w-full bg-surface border-base hover:border-brand-primary py-3.5 mb-8 flex justify-center gap-4 text-base font-black shadow-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar con Google
              </button>

              <div className="relative flex items-center mb-8">
                <div className="flex-grow border-t border-base"></div>
                <span className="flex-shrink-0 mx-4 text-dim text-[10px] font-black uppercase tracking-[0.2em]">O ingresá manualmente</span>
                <div className="flex-grow border-t border-base"></div>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dim" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email corporativo"
                    className="input-base pl-12 py-3.5"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dim" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="input-base pl-12 py-3.5"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-4 text-base mt-4 shadow-xl"
                >
                  {isLoginActive ? "Iniciar Sesión" : "Registrar Empresa"}
                </button>
              </form>

              <div className="mt-10 text-center">
                <button 
                  type="button" 
                  onClick={() => { setIsLoginActive(!isLoginActive); setError(""); }}
                  className="text-dim hover:text-brand-primary text-sm font-bold transition-colors uppercase tracking-widest"
                >
                  {isLoginActive ? "¿Sos nuevo? Creá tu cuenta" : "¿Ya sos usuario? Entrá acá"}
                </button>
              </div>
            </>
          ) : (
            <AnimatePresence mode="wait">
              {!userCuit && (
                <motion.div
                  key="onboarding"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={formVariants}
                >
                  <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 mb-6 shadow-inner border border-emerald-500/20">
                      <UserPlus className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-main mb-2">Completar Registro</h2>
                    <p className="text-muted text-sm font-medium">
                      Hola <span className="text-main font-bold">{currentUser.email?.split('@')[0]}</span>, configurá los datos de tu empresa para comenzar.
                    </p>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-2xl p-4 text-center">
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleLinkCompany} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ml-1">
                        CUIT Corporativo
                      </label>
                      <input
                        type="text"
                        value={cuitInput}
                        onChange={(e) => setCuitInput(e.target.value)}
                        placeholder="Ej: 30123456789"
                        className="input-base py-3.5"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ml-1">
                        Razón Social
                      </label>
                      <input
                        type="text"
                        value={nombreInput}
                        onChange={(e) => setNombreInput(e.target.value)}
                        placeholder="Ej: Tech Solutions S.A."
                        className="input-base py-3.5"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full py-4 text-base mt-2 shadow-2xl"
                    >
                      Configurar y Comenzar
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                  </form>

                  <div className="mt-10 text-center">
                     <button 
                       onClick={logOut}
                       className="text-dim hover:text-red-500 text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-colors uppercase tracking-widest"
                     >
                       <LogOut className="w-4 h-4" />
                       Cerrar sesión actual
                     </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        
        <p className="text-center text-dim text-xs font-medium mt-8 flex items-center justify-center gap-2">
           <Globe size={12} /> Desplegado en entorno de producción seguro
        </p>
      </motion.div>
    </div>
  );
}
