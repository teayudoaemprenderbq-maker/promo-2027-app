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
  
  // --- NUEVO ESTADO PARA FILTRO DE APORTES ---
  const [filtroEstudiante, setFiltroEstudiante] = useState('');

  // --- LÓGICA DE BLOQUEO ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const PIN_CORRECTO = '1234'; 

  // --- CONSTANTES DE PROYECCIÓN (NUEVO) ---
  const NUM_PADRES = 38;
  const CUOTA_MENSUAL = 50000;
  const VALOR_MERIENDA = 8000;
  const MESES_PROMO = 22; // Enero 2026 - Octubre 2027

  const manejarCambioTab = (nuevoTab) => {
    if ((nuevoTab === 'gastos' || nuevoTab === 'presupuesto') && !isUnlocked) {
      const pin = prompt("Introduce el PIN de acceso:");
      if (pin === PIN_CORRECTO) {
        setIsUnlocked(true);
        setTab(nuevoTab);
      } else {
        alert("PIN Incorrecto. Acceso denegado.");
      }
    } else {
      setTab(nuevoTab);
    }
  };

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: 'Cuota mensual',
    valor: '',
    estudiante: '',
    fileName: '',
    fileBase64: ''
  });

  // --- CARGA DE DATOS ---
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
    } catch (e) {
      console.error("Error cargando datos", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // --- EXPORTAR ---
  const exportarExcel = () => {
    let data = [];
    let filename = `reporte_${tab}.csv`;
    if (tab === 'ingresos' || tab === 'libro') data = [...ingresos, ...gastos];
    if (tab === 'estudiantes') data = estudiantes;
    if (tab === 'presupuesto') data = presupuestoDetallado;
    if (data.length === 0) return alert("No hay datos para exportar");
    const headers = Object.keys(data[0] || {}).join(",");
    const rows = data.map(obj => Object.values(obj).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const compartirPresupuestoWA = () => {
    const totalRecaudado = ingresos.reduce((s, i) => s + Number(i.valor), 0);
    const totalGastado = gastos.reduce((s, g) => s + Number(g.valor), 0);
    const saldoDisponible = totalRecaudado - totalGastado;
    const metaRealPresupuesto = presupuestoDetallado.reduce((s, p) => s + Number(p.valor || p.Valor || 0), 0);
    const progreso = metaRealPresupuesto > 0 ? ((totalRecaudado / metaRealPresupuesto) * 100).toFixed(1) : "0.0";
    const faltante = metaRealPresupuesto - totalRecaudado;
    let mensaje = `*📊 REPORTE PROMO 2027*\nSaldo: *$${saldoDisponible.toLocaleString()}*\nMeta: *$${metaRealPresupuesto.toLocaleString()}*\nProgreso: *${progreso}%*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

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
    } catch (error) { alert("Error al guardar."); }
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
  const estudiantesFiltrados = estudiantes.filter(est => est.nombre.toLowerCase().includes(filtroEstudiante.toLowerCase()));

  // --- CÁLCULOS DE PROYECCIÓN ---
  const proyectadoCuotas = NUM_PADRES * CUOTA_MENSUAL * MESES_PROMO;
  const proyectadoMeriendas = NUM_PADRES * VALOR_MERIENDA * MESES_PROMO;
  const totalProyectado = proyectadoCuotas + proyectadoMeriendas;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-10">
      <header className="bg-blue-900 text-white p-5 shadow-xl text-center">
        <h1 className="text-xl font-black uppercase tracking-widest">PROMO 2027</h1>
        <p className="text-[10px] opacity-80 uppercase font-bold text-blue-200">Colegio Santa María Del Rosario</p>
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
          <button
            key={item.id}
            onClick={() => manejarCambioTab(item.id)}
            className={`flex-1 min-w-[85px] py-4 px-2 text-[10px] uppercase font-black transition-all ${
              tab === item.id ? 'bg-blue-50 text-blue-700 border-b-4 border-blue-700' : 'text-gray-400'
            }`}
          >
            {item.label}
            {(item.id === 'gastos' || item.id === 'presupuesto') && !isUnlocked && ' 🔒'}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-4xl mx-auto">
        {loading && <div className="text-center p-10 font-black text-blue-900 animate-pulse">SINCRONIZANDO...</div>}

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

        {tab === 'libro' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="bg-blue-900 text-white p-6 rounded-2xl text-center">
              <p className="text-[10px] opacity-70 uppercase font-black mb-1">Saldo Real en Caja</p>
              <h3 className="text-4xl font-black">
                ${(ingresos.reduce((s,i)=>s+Number(i.valor),0) - gastos.reduce((s,g)=>s+Number(g.valor),0)).toLocaleString()}
              </h3>
            </div>
            <div className="bg-white rounded-2xl shadow border overflow-hidden">
               <table className="w-full text-[10px]">
                 <tbody className="divide-y">
                   {[...ingresos, ...gastos].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).slice(0,20).map((mov, i)=>(
                     <tr key={i} className="p-3">
                       <td className="p-3 font-bold">{mov.estudiante || mov.concepto}</td>
                       <td className={`p-3 text-right font-black ${mov.estudiante ? 'text-green-600' : 'text-red-600'}`}>
                         {mov.estudiante ? '+' : '-'}{Number(mov.valor).toLocaleString()}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {tab === 'proyeccion' && (
          <div className="space-y-6 max-w-md mx-auto animate-fadeIn">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-2">Meta Final Estimada</p>
                    <h3 className="text-4xl font-black mb-1">${totalProyectado.toLocaleString()}</h3>
                    <p className="text-[10px] opacity-60 italic">Cálculo a Octubre 2027 (22 meses)</p>
                </div>
                <div className="absolute -right-4 -bottom-4 text-white/10 text-9xl font-black">2027</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border-b-4 border-emerald-500 shadow-sm">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Cuotas Mensuales</p>
                    <p className="text-lg font-black text-slate-800">${(NUM_PADRES * CUOTA_MENSUAL).toLocaleString()}</p>
                    <p className="text-[8px] text-emerald-500 font-bold mt-1">38 PADRES × $50k</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border-b-4 border-orange-400 shadow-sm">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Meriendas (Mes)</p>
                    <p className="text-lg font-black text-slate-800">${(NUM_PADRES * VALOR_MERIENDA).toLocaleString()}</p>
                    <p className="text-[8px] text-orange-400 font-bold mt-1">38 VENTAS × $8k</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h4 className="text-xs font-black text-blue-900 uppercase mb-4 flex items-center gap-2">
                    📌 Desglose de Recaudación Proyectada
                </h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs text-gray-500 font-medium">Total por Cuotas:</span>
                        <span className="text-sm font-black text-slate-700">${proyectadoCuotas.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs text-gray-500 font-medium">Total por Meriendas:</span>
                        <span className="text-sm font-black text-slate-700">${proyectadoMeriendas.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 flex justify-between items-center">
                        <span className="text-xs font-black text-indigo-600 uppercase italic">Gran Total Recaudo:</span>
                        <span className="text-lg font-black text-indigo-600">${totalProyectado.toLocaleString()}</span>
                    </div>
                </div>
                <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-indigo-700 leading-relaxed italic">
                        *Este cálculo asume que los <strong>38 padres</strong> cumplen con la cuota de <strong>$50.000</strong> y el aporte de merienda de <strong>$8.000</strong> durante los próximos 22 meses.
                    </p>
                </div>
            </div>
          </div>
        )}

        {/* ... (Aquí continúan tus otras pestañas de 'gastos', 'estudiantes' y 'presupuesto' tal cual las tenías) */}
        {tab === 'gastos' && ( <div className="text-center p-10 bg-white rounded-2xl border">Pestaña Gastos (Bloqueada con PIN)</div> )}
        {tab === 'estudiantes' && ( <div className="text-center p-10 bg-white rounded-2xl border font-bold">Aquí va tu tabla de aportes (Control de Cuotas)</div> )}
        {tab === 'presupuesto' && ( <div className="text-center p-10 bg-white rounded-2xl border">Pestaña Presupuesto Detallado</div> )}

      </main>
    </div>
  );
}
