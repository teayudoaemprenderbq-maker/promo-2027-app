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
  const [presupuestoDetallado, setPresupuestoDetallado] = useState([]);
  const [formPresupuesto, setFormPresupuesto] = useState({ concepto: '', valor: '' }); 
  
  const [filtroEstudiante, setFiltroEstudiante] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const PIN_CORRECTO = '1234'; 

  // --- CONSTANTES DE PROYECCIÓN ---
  const NUM_PADRES = 38;
  const CUOTA_MENSUAL = 50000;
  const VALOR_MERIENDA = 8000;
  const MESES_PROMO = 22; 

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: 'Cuota mensual',
    valor: '',
    estudiante: '',
    fileName: '',
    fileBase64: ''
  });

  const manejarCambioTab = (nuevoTab) => {
    if ((nuevoTab === 'gastos' || nuevoTab === 'presupuesto') && !isUnlocked) {
      const pin = prompt("Introduce el PIN de acceso:");
      if (pin === PIN_CORRECTO) {
        setIsUnlocked(true);
        setTab(nuevoTab);
      } else {
        alert("PIN Incorrecto.");
      }
    } else {
      setTab(nuevoTab);
    }
  };

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
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { cargarTodo(); }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setFormData({ ...formData, fileBase64: reader.result, fileName: file.name }); };
    reader.readAsDataURL(file);
  };

  const handleSubmitIngreso = async (e) => {
    e.preventDefault();
    if (!formData.estudiante || !formData.valor) return alert("Faltan datos.");
    setLoading(true);
    try {
      await postData('addIngreso', formData);
      setFormData({ ...formData, valor: '', estudiante: '', fileBase64: '', fileName: '' });
      await cargarTodo();
      setTab('libro'); 
    } catch (error) { alert("Error."); }
    setLoading(false);
  };

  const handleSubmitGasto = async (e) => {
    e.preventDefault();
    if (!formData.valor || !formData.concepto) return alert("Faltan datos.");
    setLoading(true);
    try {
      await postData('addGasto', formData);
      setFormData({ ...formData, valor: '', concepto: 'Evento', fileBase64: '', fileName: '' });
      await cargarTodo();
      setTab('libro');
    } catch (e) { alert("Error."); }
    setLoading(false);
  };

  const mesesNombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const proyectadoTotal = (NUM_PADRES * (CUOTA_MENSUAL + VALOR_MERIENDA)) * MESES_PROMO;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-10">
      <header className="bg-blue-900 text-white p-5 shadow-xl text-center">
        <h1 className="text-xl font-black uppercase tracking-widest">PROMO 2027</h1>
        <p className="text-[10px] opacity-80 uppercase font-bold text-blue-200">Control Financiero v2.0</p>
      </header>

      <nav className="flex sticky top-0 z-20 bg-white border-b shadow-md overflow-x-auto">
        {[
          {id: 'ingresos', label: 'Recaudo'},
          {id: 'libro', label: 'Libro'},
          {id: 'gastos', label: 'Gastos'},
          {id: 'estudiantes', label: 'Aportes'},
          {id: 'presupuesto', label: 'Presupuesto'},
          {id: 'proyeccion', label: 'Proyección 📈'}
        ].map((item) => (
          <button key={item.id} onClick={() => manejarCambioTab(item.id)}
            className={`flex-1 min-w-[85px] py-4 px-2 text-[10px] uppercase font-black transition-all ${tab === item.id ? 'bg-blue-50 text-blue-700 border-b-4 border-blue-700' : 'text-gray-400'}`}>
            {item.label} {(item.id === 'gastos' || item.id === 'presupuesto') && !isUnlocked && '🔒'}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-4xl mx-auto">
        {loading && <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center font-black text-blue-900">SINCRONIZANDO...</div>}

        {/* --- TAB RECAUDO --- */}
        {tab === 'ingresos' && (
          <form onSubmit={handleSubmitIngreso} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border max-w-md mx-auto">
            <h2 className="text-lg font-black text-blue-900 border-b pb-2 uppercase italic">Nuevo Recaudo</h2>
            <select className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.estudiante} onChange={e => setFormData({...formData, estudiante: e.target.value})}>
              <option value="">-- Seleccionar Estudiante --</option>
              {estudiantes.map((est) => <option key={est.id} value={est.nombre}>{est.nombre}</option>)}
            </select>
            <select className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})}>
              <option>Cuota mensual</option><option>Merienda</option><option>Evento</option><option>Otro</option>
            </select>
            <input type="number" placeholder="Valor $" className="w-full p-3 bg-gray-50 border rounded-xl font-black text-xl text-blue-800" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} />
            <input type="file" accept="image/*" onChange={handleFile} className="w-full text-[10px]" />
            <button type="submit" className="w-full py-4 rounded-xl font-black text-white bg-blue-600 shadow-lg uppercase">Guardar Recaudo</button>
          </form>
        )}

        {/* --- TAB LIBRO DIARIO --- */}
        {tab === 'libro' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="bg-blue-900 text-white p-6 rounded-2xl text-center shadow-lg">
              <p className="text-[10px] opacity-70 uppercase font-black mb-1">Saldo Real en Caja</p>
              <h3 className="text-4xl font-black italic">
                ${(ingresos.reduce((s,i)=>s+Number(i.valor),0) - gastos.reduce((s,g)=>s+Number(g.valor),0)).toLocaleString()}
              </h3>
            </div>
            <div className="bg-white rounded-2xl shadow border overflow-hidden">
               <table className="w-full text-[10px]">
                 <tbody className="divide-y">
                   {[...ingresos, ...gastos].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).slice(0,30).map((mov, i)=>(
                     <tr key={i} className="hover:bg-gray-50">
                       <td className="p-3">
                        <div className="text-[8px] text-gray-400 font-bold">{new Date(mov.fecha).toLocaleDateString()}</div>
                        <div className="font-bold text-blue-900 uppercase">{mov.estudiante || mov.concepto}</div>
                       </td>
                       <td className={`p-3 text-right font-black ${mov.estudiante ? 'text-green-600' : 'text-red-600'}`}>
                         {mov.estudiante ? '+' : '-'}${Number(mov.valor).toLocaleString()}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* --- TAB GASTOS (CON PIN) --- */}
        {tab === 'gastos' && isUnlocked && (
          <form onSubmit={handleSubmitGasto} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border-t-4 border-red-600 max-w-md mx-auto">
            <h2 className="text-lg font-black text-red-900 uppercase italic">Registrar Egreso</h2>
            <select className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})}>
                <option value="Evento">Evento / Fiesta</option>
                <option value="Papelería">Papelería</option>
                <option value="Alimentación">Alimentación</option>
                <option value="Otro">Otro</option>
            </select>
            <input type="number" placeholder="Valor $" className="w-full p-3 bg-red-50 border rounded-xl font-black text-red-700 text-xl" value={formData.valor} onChange={e=>setFormData({...formData, valor: e.target.value})} />
            <input type="file" accept="image/*" onChange={handleFile} className="w-full text-[10px]" />
            <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase">Registrar Gasto</button>
          </form>
        )}

        {/* --- TAB APORTES (CONTROL CUOTAS) --- */}
        {tab === 'estudiantes' && (
          <div className="bg-white p-4 rounded-2xl shadow-lg border overflow-hidden">
            <div className="flex justify-between mb-4">
                <input type="text" placeholder="🔍 Buscar..." className="p-2 text-xs border rounded-lg w-full mr-2" onChange={(e) => setFiltroEstudiante(e.target.value)} />
                <select className="text-[10px] font-bold border rounded p-1" value={anioVista} onChange={(e)=>setAnioVista(Number(e.target.value))}>
                    <option value={2026}>2026</option><option value={2027}>2027</option>
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-[9px] border-collapse">
                    <thead className="bg-blue-900 text-white uppercase">
                        <tr><th className="p-2 text-left sticky left-0 bg-blue-900">Nombre</th>{mesesNombres.map(m=><th key={m} className="p-1">{m}</th>)}<th className="p-2">Total</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {estudiantes.filter(e=>e.nombre.toLowerCase().includes(filtroEstudiante.toLowerCase())).map(est => {
                            let sumaTotal = 0;
                            return (
                                <tr key={est.id}>
                                    <td className="p-2 font-bold sticky left-0 bg-white border-r">{est.nombre}</td>
                                    {Array.from({length:12}, (_,i)=>i+1).map(m=>{
                                        const pMes = ingresos.filter(ing => ing.estudiante === est.nombre && new Date(ing.fecha).getUTCMonth()+1 === m && new Date(ing.fecha).getUTCFullYear() === anioVista);
                                        const totalM = pMes.reduce((s,p)=>s+Number(p.valor),0);
                                        sumaTotal += totalM;
                                        return <td key={m} className={`p-1 text-center ${totalM > 0 ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-300'}`}>{totalM > 0 ? `$${(totalM/1000)}k` : '-'}</td>
                                    })}
                                    <td className="p-2 font-black text-blue-900 bg-gray-50">${sumaTotal.toLocaleString()}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* --- TAB PROYECTO 2027 --- */}
        {tab === 'proyeccion' && (
          <div className="space-y-6 max-w-md mx-auto animate-fadeIn">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-800 text-white p-8 rounded-[2rem] shadow-xl text-center">
                <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Meta a Octubre 2027</p>
                <h3 className="text-4xl font-black">${proyectadoTotal.toLocaleString()}</h3>
                <p className="text-[10px] opacity-60 mt-2">Basado en 38 padres activos</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border-b-4 border-emerald-500 shadow-sm text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Cuotas (Mes)</p>
                    <p className="text-lg font-black text-slate-800">$1,900,000</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border-b-4 border-orange-400 shadow-sm text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Meriendas (Mes)</p>
                    <p className="text-lg font-black text-slate-800">$304,000</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <div className="space-y-3">
                    <div className="flex justify-between text-sm border-b pb-2"><span>Total Cuotas (22m):</span><span className="font-black">$41.8M</span></div>
                    <div className="flex justify-between text-sm border-b pb-2"><span>Total Meriendas (22m):</span><span className="font-black">$6.6M</span></div>
                    <div className="flex justify-between text-indigo-700 font-black pt-2"><span>GRAN TOTAL:</span><span>$48,488,000</span></div>
                </div>
            </div>
          </div>
        )}

        {/* --- TAB PRESUPUESTO (CON PIN) --- */}
        {tab === 'presupuesto' && isUnlocked && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-900">
              <h2 className="text-xs font-black text-blue-900 uppercase mb-4">Añadir Item Planeado</h2>
              <div className="space-y-3">
                <input type="text" placeholder="Concepto" className="w-full p-3 border rounded-xl text-sm" value={formPresupuesto.concepto} onChange={e => setFormPresupuesto({...formPresupuesto, concepto: e.target.value})} />
                <input type="number" placeholder="Valor Estimado $" className="w-full p-3 border rounded-xl text-sm font-bold" value={formPresupuesto.valor} onChange={e => setFormPresupuesto({...formPresupuesto, valor: e.target.value})} />
                <button onClick={async () => {
                    setLoading(true);
                    try { await postData('addPresupuesto', formPresupuesto); setFormPresupuesto({ concepto: '', valor: '' }); await cargarTodo(); } catch (e) { alert("Error."); }
                    setLoading(false);
                }} className="w-full py-3 bg-blue-900 text-white rounded-xl font-black uppercase text-[10px]">Guardar en Plan</button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow border overflow-hidden">
                <div className="p-3 bg-gray-800 text-white text-[10px] font-black flex justify-between uppercase"><span>Concepto</span><span>Valor</span></div>
                {presupuestoDetallado.map((p, i)=>(
                    <div key={i} className="p-3 text-[10px] flex justify-between border-b uppercase font-bold text-gray-600">
                        <span>{p.concepto || p.Concepto}</span>
                        <span className="text-blue-700">${Number(p.valor || p.Valor || 0).toLocaleString()}</span>
                    </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
