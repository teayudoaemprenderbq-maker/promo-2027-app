import React, { useState, useEffect } from 'react';
import { fetchSheetData, postData } from './googleService';

export default function App() {
  const [tab, setTab] = useState('ingresos');
  const [estudiantes, setEstudiantes] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [filtroEstudiante, setFiltroEstudiante] = useState('');
  const [presupuestoDetallado, setPresupuestoDetallado] = useState([]);
  const [anioVista, setAnioVista] = useState(2026);

  const PIN_CORRECTO = '1234';

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [estData, ingData, gasData, preData] = await Promise.all([
        fetchSheetData('getEstudiantes'),
        fetchSheetData('getIngresos'),
        fetchSheetData('getGastos'),
        fetchSheetData('getPresupuesto')
      ]);
      setEstudiantes(estData || []);
      setIngresos(ingData || []);
      setGastos(gasData || []);
      setPresupuestoDetallado(preData || []);
    } catch (e) { console.error("Error cargando datos", e); }
    setLoading(false);
  };

  useEffect(() => { cargarTodo(); }, []);

  // --- FUNCIÓN DE NAVEGACIÓN CORREGIDA ---
  const manejarCambioTab = (nuevoTab) => {
    if ((nuevoTab === 'gastos' || nuevoTab === 'presupuesto') && !isUnlocked) {
      const pin = prompt("Introduce el PIN de acceso:");
      if (pin === PIN_CORRECTO) {
        setIsUnlocked(true);
        setTab(nuevoTab); // Ahora sí cambiará la pestaña inmediatamente
      } else {
        alert("PIN Incorrecto.");
      }
    } else {
      setTab(nuevoTab);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-blue-900 text-white p-5 text-center shadow-lg">
        <h1 className="text-xl font-black uppercase">PROMO 2027</h1>
      </header>

      {/* Navegación */}
      <nav className="flex sticky top-0 z-20 bg-white border-b shadow-md overflow-x-auto">
        {['ingresos', 'libro', 'gastos', 'estudiantes', 'presupuesto', 'proyeccion'].map((id) => (
          <button
            key={id}
            onClick={() => manejarCambioTab(id)}
            className={`flex-1 min-w-[90px] py-4 text-[10px] font-black uppercase ${tab === id ? 'bg-blue-50 text-blue-700 border-b-4 border-blue-700' : 'text-gray-400'}`}
          >
            {id} {!isUnlocked && (id === 'gastos' || id === 'presupuesto') ? '🔒' : ''}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-4xl mx-auto">
        {loading && <div className="text-center font-bold p-10">CARGANDO...</div>}

        {/* --- PESTAÑA LIBRO (RESTAURADA CON IMÁGENES) --- */}
        {tab === 'libro' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="bg-blue-900 text-white p-6 rounded-2xl text-center shadow-xl">
              <p className="text-[10px] uppercase font-bold">Saldo en Caja</p>
              <h3 className="text-4xl font-black italic">
                ${(ingresos.reduce((s, i) => s + Number(i.valor), 0) - gastos.reduce((s, g) => s + Number(g.valor), 0)).toLocaleString()}
              </h3>
            </div>
            <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
              <table className="w-full text-[10px]">
                <tbody className="divide-y">
                  {[...ingresos, ...gastos]
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                    .map((mov, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="text-gray-400">{mov.fecha}</div>
                          <div className="font-black uppercase text-blue-900">{mov.estudiante || mov.concepto}</div>
                        </td>
                        <td className={`p-3 text-right font-black ${mov.estudiante ? 'text-green-600' : 'text-red-600'}`}>
                          {mov.estudiante ? '+' : '-'}${Number(mov.valor).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          {(mov.fotoUrl || mov.soporte) && (
                            <a href={mov.fotoUrl || mov.soporte} target="_blank" rel="noreferrer">
                              <img src={mov.fotoUrl || mov.soporte} alt="Soporte" className="h-10 w-10 object-cover rounded-md border shadow-sm inline-block" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- PESTAÑA GASTOS --- */}
        {tab === 'gastos' && isUnlocked && (
           <div className="animate-fadeIn">
              {/* Aquí va tu formulario de gastos original que ya funcionaba */}
              <h2 className="text-center font-black text-red-600">FORMULARIO DE GASTOS ACTIVO</h2>
              {/* ... (resto del formulario de gastos) */}
           </div>
        )}

        {/* --- PESTAÑA PRESUPUESTO --- */}
        {tab === 'presupuesto' && isUnlocked && (
           <div className="animate-fadeIn">
              <h2 className="text-center font-black text-blue-900">PRESUPUESTO DETALLADO</h2>
              {/* ... (resto de la tabla de presupuesto) */}
           </div>
        )}
      </main>
    </div>
  );
}
