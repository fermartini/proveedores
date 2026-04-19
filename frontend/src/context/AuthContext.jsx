import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [cuit, setCuit] = useState("");
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [loading, setLoading] = useState(true);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Buscar datos de la empresa en Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setCuit(data.company_cuit || "");
          setNombreEmpresa(data.company_name || "");
        } else {
          setCuit("");
          setNombreEmpresa("");
        }
      } else {
        setCuit("");
        setNombreEmpresa("");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signupWithEmail = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    return signOut(auth);
  };

  // Función para vincular la cuenta en Firestore con el CUIT
  const saveCompanyData = async (newCuit, newNombre) => {
    if (!currentUser) throw new Error("No hay usuario autenticado");
    
    // Guardar en Firestore
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, {
      company_cuit: newCuit,
      company_name: newNombre,
      email: currentUser.email,
      created_at: new Date().toISOString()
    }, { merge: true });

    // Actualizar estado local inmediatamente
    setCuit(newCuit);
    setNombreEmpresa(newNombre);
  };

  const value = {
    currentUser,
    cuit,
    nombreEmpresa,
    loading,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logOut,
    saveCompanyData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
