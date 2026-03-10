import React, { useState, useEffect } from 'react';
import { fetchSheetData, postData } from './googleService';

export default function App() {
  // --- ESTADOS GLOBALES ---
  const [tab, setTab] = useState('ingresos');
  const [estudiantes, setEstudiantes] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [anioVista, setAnioVista] = useState(2026);
  const [metaFinal, setMetaFinal] = useState(30000000); 
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [presupuestoDetallado, setPresupuestoDetallado] = useState([]);
  const [formPresupuesto, setFormPresupuesto] = useState({ 
    concepto: '', 
    valor: '', 
    tipo: 'ingreso', 
    mesInicio: 1, 
    mesFin: 1, 
    anio: 2026,
    esRango: false 
  });
  
  const [filtroEstudiante, setFiltroEstudiante] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const PIN_CORRECTO = '1234';

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [e, i, g, p] = await Promise.all([
        fetchSheetData('getEstudiantes'),
        fetchSheetData('getIngresos'),
        fetchSheetData('getGastos'),
        fetchSheetData('getPresupuesto')
      ]);
      setEstudiantes(e || []);
      setIngresos(i || []);
      setGastos(g || []);
      setPresupuestoDetallado(p || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // --- LÓGICA DE ELIMINAR ---
  const eliminarConceptoPresupuesto = async (concepto, tipo) => {
    const confirmacion = window.confirm(`¿Seguro que quieres borrar "${concepto}"?`);
    if (!confirmacion) return;

    setLoading(true);
    try {
      await postData('deletePresupuesto', { 
        concepto: concepto, 
        tipo: tipo, 
        anio: Number(anioVista) 
      });
      alert("Eliminado con éxito");
      await cargarTodo(); 
    } catch (e) {
      alert("Error al eliminar del servidor");
    }
    setLoading(false);
  };

  const manejarCambioTab = (nuevoTab) => {
    if ((nuevoTab === 'gastos' || nuevoTab === 'presupuesto') && !isUnlocked) {
      const pin = prompt("Introduce el PIN de acceso:");
      if (pin === PIN_CORRECTO) {
        setIsUnlocked(true);
        setTab(nuevoTab);
      } else {
        alert("PIN incorrecto");
      }
    } else {
      setTab(nuevoTab);
    }
  };

  const agregarPresupuesto = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const meses = formPresupuesto.esRango 
        ? Array.from({length: formPresupuesto.mesFin - formPresupuesto.mesInicio + 1}, (_, i) => i + Number(formPresupuesto.mesInicio))
        : [Number(formPresupuesto.mesInicio)];

      for (const m of meses) {
        await postData('addPresupuesto', {
          concepto: formPresupuesto.concepto,
          valor: Number(formPresupuesto.valor),
          tipo: formPresupuesto.tipo,
          mes: m,
          anio: Number(formPresupuesto.anio)
        });
      }
      setFormPresupuesto({...formPresupuesto, concepto: '', valor: ''});
      await cargarTodo();
      alert("Presupuesto guardado");
    } catch (err) {
      alert("Error al guardar presupuesto");
    }
    setLoading(false);
  };

  const compartirPresupuestoWA = () => {
    const totalI = presupuestoDetallado
      .filter(p => (p.tipo === 'ingreso' || p.Tipo === 'ingreso') && Number(p.anio || p.Año) === anioVista)
      .reduce((s, it) => s + Number(it.valor || it.Valor || 0), 0);
    const totalG = presupuestoDetallado
      .filter(p => (p.tipo === 'gasto' || p.Tipo === 'gasto') && Number(p.anio || p.Año) === anioVista)
      .reduce((s, it) => s + Number(it.valor || it.Valor || 0), 0);
    
    const mensaje = `📊 *RESUMEN PLAN PROMO ${anioVista}*%0A%0A🟢 Proyección Ingresos: $${totalI.toLocaleString()}%0A🔴 Proyección Gastos: $${totalG.toLocaleString()}%0A💰 *SALDO ESTIMADO: $${(totalI - totalG).toLocaleString()}*`;
    window.open(`https://wa.me/?text=${mensaje}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20 font-sans">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-blue-900 tracking-tighter italic">PROMO 2027</h1>
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm">
          <button onClick={() => setAnioVista(2026)} className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${anioVista === 2026 ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}>2026</button>
          <button onClick={() => setAnioVista(2027)} className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${anioVista === 2027 ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}>2027</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        {/* Pestañas */}
        <div className="grid grid-cols-3 gap-2 sticky top-2 z-50 bg-gray-100/80 backdrop-blur-md py-2">
          <button onClick={() => manejarCambioTab('ingresos')} className={`p-3 rounded-2xl font-bold text-sm flex flex-col items-center gap-1 transition-all ${tab === 'ingresos' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white text-gray-500'}`}>
            <span>💰</span> Aportes
          </button>
          <button onClick={() => manejarCambioTab('gastos')} className={`p-3 rounded-2xl font-bold text-sm flex flex-col items-center gap-1 transition-all ${tab === 'gastos' ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-white text-gray-500'}`}>
            <span>💸</span> Gastos
          </button>
          <button onClick={() => manejarCambioTab('presupuesto')} className={`p-3 rounded-2xl font-bold text-sm flex flex-col items-center gap-1 transition-all ${tab === 'presupuesto' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-white text-gray-500'}`}>
            <span>📊</span> Plan
          </button>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-blue-900 animate-pulse">ACTUALIZANDO...</p>
            </div>
          </div>
        )}

        {tab === 'ingresos' && (
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <h2 className="text-xl font-black mb-4">Aportes Recibidos</h2>
            <p className="text-gray-500 italic">Módulo de aportes activo. Revisa tu Excel para ver el detalle por estudiante.</p>
          </div>
        )}

        {tab === 'gastos' && (
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <h2 className="text-xl font-black mb-4">Gastos Registrados</h2>
            <p className="text-gray-500 italic">Módulo de gastos activo. Revisa tu Excel para ver comprobantes.</p>
          </div>
        )}

        {tab === 'presupuesto' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Formulario */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
              <h2 className="text-xl font-black text-gray-800 mb-4">📝 Proyectar Flujo {anioVista}</h2>
              <form onSubmit={agregarPresupuesto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Ej: Jean Day, Rifas..." 
                  className="p-4 bg-gray-50 rounded-2xl border-none font-bold"
                  value={formPresupuesto.concepto}
                  onChange={e => setFormPresupuesto({...formPresupuesto, concepto: e.target.value})}
                  required
                />
                <input 
                  type="number" 
                  placeholder="Valor total" 
                  className="p-4 bg-gray-50 rounded-2xl border-none font-bold"
                  value={formPresupuesto.valor}
                  onChange={e => setFormPresupuesto({...formPresupuesto, valor: e.target.value})}
                  required
                />
                <select 
                  className="p-4 bg-gray-50 rounded-2xl border-none font-bold"
                  value={formPresupuesto.tipo}
                  onChange={e => setFormPresupuesto({...formPresupuesto, tipo: e.target.value})}
                >
                  <option value="ingreso">🟢 Ingreso</option>
                  <option value="gasto">🔴 Gasto</option>
                </select>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-4 bg-gray-50 rounded-2xl border-none font-bold"
                    value={formPresupuesto.mesInicio}
                    onChange={e => setFormPresupuesto({...formPresupuesto, mesInicio: e.target.value})}
                  >
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={i+1}>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="md:col-span-2 bg-purple-600 text-white font-black py-4 rounded-2xl shadow-lg">
                  REGISTRAR EN PLAN
                </button>
              </form>
            </div>

            {/* Tabla Detallada */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                      <th className="p-4 sticky left-0 bg-gray-50 z-10 border-r w-[180px]">Concepto</th>
                      {['E','F','M','A','M','J','J','A','S','O','N','D'].map(m => (
                        <th key={m} className="p-4 text-center border-l">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...new Set(presupuestoDetallado.filter(p => Number(p.anio || p.Año) === anioVista).map(p => `${p.concepto || p.Concepto}|${p.tipo || p.Tipo}`))].map(key => {
                      const [concepto, tipo] = key.split('|');
                      const items = presupuestoDetallado.filter(p => 
                        (p.concepto === concepto || p.Concepto === concepto) && 
                        (p.tipo === tipo || p.Tipo === tipo) && 
                        Number(p.anio || p.Año) === anioVista
                      );
                      const esIngreso = tipo.toLowerCase() === 'ingreso';

                      return (
                        <tr key={key} className="hover:bg-gray-50 group transition-colors">
                          <td className="p-4 font-bold sticky left-0 bg-white border-r min-w-[180px]">
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">{esIngreso ? '🟢' : '🔴'} {concepto}</span>
                              <button 
                                onClick={() => eliminarConceptoPresupuesto(concepto, tipo)}
                                className="ml-2 p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                          {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                            const mesData = items.find(it => Number(it.mes || it.Mes) === m);
                            const val = mesData ? Number(mesData.valor || mesData.Valor || 0) : 0;
                            return (
                              <td key={m} className={`p-4 text-center border-l text-[11px] font-bold ${val > 0 ? (esIngreso ? 'text-green-600 bg-green-50/30' : 'text-red-600 bg-red-50/30') : 'text-gray-200'}`}>
                                {val > 0 ? `${(val/1000).toFixed(0)}k` : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen Final */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-3xl p-6 text-white shadow-2xl">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                    <p className="text-[10px] uppercase opacity-60 font-black">Ingresos Plan</p>
                    <p className="text-xl font-black">
                      ${presupuestoDetallado.filter(p => (p.tipo === 'ingreso' || p.Tipo === 'ingreso') && Number(p.anio || p.Año) === anioVista).reduce((s, it) => s + Number(it.valor || it.Valor || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                    <p className="text-[10px] uppercase opacity-60 font-black">Gastos Plan</p>
                    <p className="text-xl font-black">
                      ${presupuestoDetallado.filter(p => (p.tipo === 'gasto' || p.Tipo === 'gasto') && Number(p.anio || p.Año) === anioVista).reduce((s, it) => s + Number(it.valor || it.Valor || 0), 0).toLocaleString()}
                    </p>
                  </div>
               </div>
               <div className="mt-4 flex justify-between items-center border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[10px] uppercase opacity-60 font-black">Saldo Neto Estimado</p>
                    <p className="text-3xl font-black text-yellow-400">
                      ${(presupuestoDetallado.filter(p => (p.tipo === 'ingreso' || p.Tipo === 'ingreso') && Number(p.anio || p.Año) === anioVista).reduce((s, it) => s + Number(it.valor || it.Valor || 0), 0) - presupuestoDetallado.filter(p => (p.tipo === 'gasto' || p.Tipo === 'gasto') && Number(p.anio || p.Año) === anioVista).reduce((s, it) => s + Number(it.valor || it.Valor || 0), 0)).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={compartirPresupuestoWA} className="bg-green-500 p-4 rounded-2xl font-black">💬 Compartir</button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
