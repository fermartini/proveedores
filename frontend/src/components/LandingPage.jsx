/**
 * components/LandingPage.jsx
 * -------------------------
 * Landing Page de alto impacto visual (Ultra Premium).
 * Explica el servicio y detalla los planes de suscripción.
 */

import { motion } from "framer-motion";
import { 
  Zap, ShieldCheck, BarChart3, UploadCloud, 
  Check, ArrowRight, BrainCircuit, Sparkles 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const HERO_IMAGE = "/hero_invoice_saas_mockup.png";

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const pricingPlans = [
    {
      name: "Gratis",
      price: "0",
      feat: "Hasta 15 facturas/mes",
      desc: "Perfecto para autónomos y pruebas rápidas.",
      button: "Empezar Gratis",
      highlight: false
    },
    {
      name: "Básico",
      price: "1.200",
      feat: "Hasta 25 facturas/mes",
      desc: "Ideal para pequeños comercios en crecimiento.",
      button: "Elegir Básico",
      highlight: false
    },
    {
      name: "Pro",
      price: "2.500",
      feat: "Hasta 50 facturas/mes",
      desc: "Diseñado para PyMEs con flujo constante.",
      button: "Elegir Pro",
      highlight: true
    },
    {
      name: "Ilimitado",
      price: "5.000",
      feat: "Facturas ilimitadas",
      desc: "Potencia total para estudios contables y empresas.",
      button: "Contacto Ventas",
      highlight: false
    }
  ];

  return (
    <div className="min-h-screen bg-main overflow-x-hidden selection:bg-brand-primary/30">
      
      {/* --- Floating Gradient Backgrounds --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[50%] bg-violet-600/10 blur-[100px] rounded-full" />
      </div>

      {/* --- Navbar --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-base/50 bg-main/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap size={20} className="text-white fill-current" />
             </div>
             <span className="text-xl font-black tracking-tighter uppercase">Factura<span className="brand-gradient-text">Scan</span></span>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate("/login")}
              className="text-xs font-black uppercase tracking-widest text-dim hover:text-brand-primary transition-colors"
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => navigate("/login")}
              className="px-6 py-2.5 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
            >
              Comenzar Ahora
            </button>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20"
            >
              <Sparkles size={14} className="text-brand-primary" />
              <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Poder IA Generativa de Google </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black leading-[1] text-main tracking-tighter"
            >
              Audita tus facturas en <span className="brand-gradient-text italic">segundos.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-dim font-bold leading-relaxed max-w-xl"
            >
              Elimina la carga manual. Nuestra IA extrae datos con 100% de precisión y los sincroniza con tu flujo administrativo al instante.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button 
                onClick={() => navigate("/login")}
                className="px-10 py-5 bg-brand-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-indigo-500/30 flex items-center gap-3"
              >
                Empezar Auditoría Gratis
                <ArrowRight size={16} />
              </button>
              <button className="px-10 py-5 bg-surface border border-base text-main rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-surface-hover transition-all">
                Ver Demo
              </button>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full" />
            <img 
              src={HERO_IMAGE} 
              alt="Dashboard Preview" 
              className="relative rounded-[40px] border border-base/50 shadow-2xl backdrop-blur-sm"
            />
          </motion.div>
        </div>
      </section>

      {/* --- Features --- */}
      <section className="py-24 px-6 bg-surface/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
             <h2 className="text-xs font-black text-brand-primary uppercase tracking-[0.3em]">Eficiencia Extrema</h2>
             <p className="text-4xl md:text-5xl font-black text-main tracking-tight">Diseñado para contadores modernos</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: BrainCircuit, title: "Análisis con IA", desc: "Uso de Gemini 1.5 Flash para detectar facturas complejas sin QR." },
              { icon: ShieldCheck, title: "Seguridad Bancaria", desc: "Validación estricta de CUIT receptor para evitar fraudes." },
              { icon: BarChart3, title: "Dashboard en Vivo", desc: "Control total de montos, impuestos y autorizaciones en una sola vista." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="p-10 rounded-[32px] bg-surface border border-base hover:border-brand-primary/50 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-brand-primary mb-6 group-hover:scale-110 transition-transform">
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-black text-main mb-4">{f.title}</h3>
                <p className="text-dim text-sm font-bold leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Pricing Section --- */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
             <h2 className="text-xs font-black text-brand-primary uppercase tracking-[0.3em]">Planes de Suscripción</h2>
             <p className="text-4xl md:text-6xl font-black text-main tracking-tight italic">Escala tu <span className="brand-gradient-text italic">potencial.</span></p>
             <p className="text-dim font-bold mt-4">Precios transparentes adaptados a tu volumen de gestión.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan, i) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.02 }}
                className={`relative p-8 rounded-[40px] border flex flex-col ${
                  plan.highlight 
                    ? "bg-brand-primary text-white border-brand-primary shadow-2xl shadow-indigo-500/30 overflow-hidden" 
                    : "bg-surface border-base text-main"
                }`}
              >
                {plan.highlight && (
                   <div className="absolute top-5 right-5 bg-white/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                      Más Elegido
                   </div>
                )}
                
                <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${plan.highlight ? "text-white/80" : "text-dim"}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black">${plan.price}</span>
                  <span className={`text-xs font-bold ${plan.highlight ? "text-white/60" : "text-dim"}`}>/mes</span>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.highlight ? "bg-white/20" : "bg-brand-primary/10"}`}>
                       <Check size={12} className={plan.highlight ? "text-white" : "text-brand-primary"} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight">{plan.feat}</span>
                  </div>
                  <p className={`text-xs font-bold leading-relaxed ${plan.highlight ? "text-white/70" : "text-dim"}`}>
                    {plan.desc}
                  </p>
                </div>

                <button 
                  onClick={() => navigate("/login")}
                  className={`mt-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    plan.highlight 
                      ? "bg-white text-indigo-600 hover:bg-slate-100" 
                      : "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white"
                  }`}
                >
                  {plan.button}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Simple CTA --- */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto rounded-[60px] bg-brand-gradient p-1 bg-gradient-to-r">
          <div className="bg-main rounded-[58px] p-12 md:p-20 text-center space-y-8 overflow-hidden relative">
             <div className="absolute inset-0 bg-brand-primary/5 blur-3xl rounded-full" />
             <h2 className="text-4xl md:text-6xl font-black text-main tracking-tighter relative">¿Listo para modernizar tu <br className="hidden md:block"/> administración?</h2>
             <p className="text-dim font-bold text-lg max-w-xl mx-auto relative">Únete a cientos de empresas que ya automatizan sus procesos con nosotros.</p>
             <button 
              onClick={() => navigate("/login")}
              className="px-12 py-6 bg-brand-primary text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-indigo-500/40 relative"
             >
                Crear cuenta ahora
             </button>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="py-20 px-6 border-t border-base">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-3 grayscale opacity-70">
              <Zap size={20} className="text-dim" />
              <span className="text-lg font-black tracking-tighter uppercase text-dim">FacturaScan</span>
           </div>
           <p className="text-xs text-dim font-bold">© 2026 Arca Intelligence. Todos los derechos reservados.</p>
           <div className="flex gap-8">
              <a href="#" className="text-[10px] font-black text-dim hover:text-brand-primary transition-colors uppercase tracking-widest">Privacidad</a>
              <a href="#" className="text-[10px] font-black text-dim hover:text-brand-primary transition-colors uppercase tracking-widest">Términos</a>
           </div>
        </div>
      </footer>

    </div>
  );
}
